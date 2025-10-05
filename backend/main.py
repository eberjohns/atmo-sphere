from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict
import asyncio

# Import the function from your service file
from nasa_service import get_climatological_analysis
from nasa_service import get_profile_from_climatology
from fastapi.middleware.cors import CORSMiddleware

# --- 1. Define the Upgraded Data Models (The API Contract) ---

# Users can now specify their preferences for more conditions
class ComfortProfile(BaseModel):
    temp_min: int = 10
    temp_max: int = 25
    wind_max: int = 15
    rain_chance_max: int = 20 # Max acceptable probability of rain (e.g., 20%)
    humidity_max: int = 80    # Max acceptable relative humidity (e.g., 80%)

# Users can tell the app what's most important to them
class ScoreWeights(BaseModel):
    temperature: float = 1.0
    wind: float = 1.0
    rain: float = 1.0
    humidity: float = 1.0

# The main request body, now including weights
class AnalysisRequest(BaseModel):
    lat: float
    lon: float
    month: int
    day: int
    profile: ComfortProfile
    weights: ScoreWeights = ScoreWeights() # Use default weights if not provided


class PolygonAnalysisRequest(BaseModel):
    polygon: Dict
    month: int
    day: int
    profile: ComfortProfile
    weights: ScoreWeights = ScoreWeights()
    # approximate number of sample points to use across the polygon (max 36)
    sample_count: int = 9

# --- 2. Create the FastAPI App Instance ---
app = FastAPI()

# Allow cross origin requests from the frontend dev server(s)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5175"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 3. Update the API Endpoint to use the new models ---

@app.post("/api/analyze/point")
async def analyze_point(request: AnalysisRequest):
    """
    Accepts a location, date, and an expanded user profile, and returns
    a full "Atmospheric Signature" analysis based on NASA POWER data.
    """
    analysis_result = await get_climatological_analysis(
        lat=request.lat,
        lon=request.lon,
        month=request.month,
        day=request.day,
        profile=request.profile,
        weights=request.weights
    )
    
    if "error" in analysis_result:
        raise HTTPException(status_code=500, detail=analysis_result["error"])

    return analysis_result


@app.post("/api/analyze/polygon")
async def analyze_polygon(request: PolygonAnalysisRequest):
    """
    Accept a GeoJSON polygon, generate a small grid of sample points within the polygon,
    run the point analysis for each sample concurrently, and return an aggregated result.
    """
    try:
        coords = request.polygon.get('geometry', {}).get('coordinates', [])
        if not coords:
            raise ValueError('Invalid polygon payload')

        ring = coords[0] if isinstance(coords[0], list) else coords

        # Helper: point-in-polygon (ray casting), polygon defined as list of [lon, lat]
        def point_in_poly(lon, lat, poly):
            inside = False
            j = len(poly) - 1
            for i in range(len(poly)):
                xi, yi = poly[i][0], poly[i][1]
                xj, yj = poly[j][0], poly[j][1]
                intersect = ((yi > lat) != (yj > lat)) and (lon < (xj - xi) * (lat - yi) / (yj - yi + 1e-12) + xi)
                if intersect:
                    inside = not inside
                j = i
            return inside

        # Bounding box
        lons = [p[0] for p in ring]
        lats = [p[1] for p in ring]
        min_lon, max_lon = min(lons), max(lons)
        min_lat, max_lat = min(lats), max(lats)

        # Grid sampling: try to produce approximately sample_count points inside polygon
        import math
        target = max(1, min(36, int(request.sample_count)))
        side = max(1, int(math.ceil(math.sqrt(target))))
        samples = []
        if max_lon - min_lon <= 0 or max_lat - min_lat <= 0:
            # degenerate polygon: fallback to centroid
            centroid_lat = sum(lats) / len(lats)
            centroid_lon = sum(lons) / len(lons)
            samples = [(centroid_lat, centroid_lon)]
        else:
            lon_step = (max_lon - min_lon) / side
            lat_step = (max_lat - min_lat) / side
            for i in range(side):
                for j in range(side):
                    # use cell center
                    lon = min_lon + (i + 0.5) * lon_step
                    lat = min_lat + (j + 0.5) * lat_step
                    if point_in_poly(lon, lat, ring):
                        samples.append((lat, lon))
                    if len(samples) >= target:
                        break
                if len(samples) >= target:
                    break

            # If no samples found (e.g., very thin polygon), fall back to centroid
            if not samples:
                centroid_lat = sum(lats) / len(lats)
                centroid_lon = sum(lons) / len(lons)
                samples = [(centroid_lat, centroid_lon)]

        # Run analyses concurrently for each sample point
        tasks = [get_climatological_analysis(lat=lat, lon=lon, month=request.month, day=request.day, profile=request.profile, weights=request.weights) for (lat, lon) in samples]
        results = await asyncio.gather(*tasks)

        # Filter out failing results
        successful = [r for r in results if r and isinstance(r, dict) and 'overall_score' in r]
        if not successful:
            raise HTTPException(status_code=500, detail='All sample analyses failed')

        # Aggregation helpers
        def mean(values):
            return sum(values) / len(values) if values else 0

        n = len(successful)
        aggregated = {}

        # overall_score average
        aggregated['overall_score'] = round(mean([s.get('overall_score', 0) for s in successful]))

        # Location: use first result's location or indicate polygon
        aggregated['location'] = successful[0].get('location', 'Polygon region')

        # Aggregate atmospheric_signature
        atms = [s.get('atmospheric_signature', {}) for s in successful]
        # Temperature
        temps = [a.get('temperature', {}) for a in atms]
        aggregated_temp = {
            'avg': round(mean([t.get('avg', 0) for t in temps]), 1),
            'min': round(mean([t.get('min', 0) for t in temps]), 1),
            'max': round(mean([t.get('max', 0) for t in temps]), 1),
            'meets_profile': (sum(1 for t in temps if t.get('meets_profile')) / n) >= 0.5,
            'units': '°C'
        }

        # Wind
        winds = [a.get('wind', {}) for a in atms]
        aggregated_wind = {
            'avg': round(mean([w.get('avg', 0) for w in winds]), 1),
            'max': round(mean([w.get('max', 0) for w in winds]), 1),
            'meets_profile': (sum(1 for w in winds if w.get('meets_profile')) / n) >= 0.5,
            'units': 'm/s'
        }

        # Humidity
        hums = [a.get('humidity', {}) for a in atms]
        aggregated_humidity = {
            'avg': round(mean([h.get('avg', 0) for h in hums]), 1),
            'meets_profile': (sum(1 for h in hums if h.get('meets_profile')) / n) >= 0.5,
            'units': '%'
        }

        # Precipitation
        precs = [a.get('precipitation', {}) for a in atms]
        aggregated_precip = {
            'avg_daily_amount': round(mean([p.get('avg_daily_amount', p.get('avg_daily_amount', 0)) for p in precs]), 2),
            'estimated_daily_chance': round(mean([p.get('estimated_daily_chance', 0) for p in precs]), 1),
            'meets_profile': (sum(1 for p in precs if p.get('meets_profile')) / n) >= 0.5,
            'units': {'amount': 'mm/day', 'chance': '%'}
        }

        # Sunlight
        suns = [a.get('sunlight', {}) for a in atms]
        aggregated_sun = {
            'sunny_day_likelihood': round(mean([s.get('sunny_day_likelihood', 0) for s in suns])),
            'clearness_index': round(mean([s.get('clearness_index', 0) for s in suns]), 2),
            'units': '% likelihood'
        }

        aggregated['atmospheric_signature'] = {
            'temperature': aggregated_temp,
            'wind': aggregated_wind,
            'humidity': aggregated_humidity,
            'precipitation': aggregated_precip,
            'sunlight': aggregated_sun
        }

        # Specialty scores: average each numeric score
        spec = [s.get('specialty_scores', {}) for s in successful]
        keys = set().union(*(d.keys() for d in spec))
        aggregated_special = {k: round(mean([d.get(k, 0) for d in spec])) for k in keys}
        aggregated['specialty_scores'] = aggregated_special

        # Final verdict: percent of samples where all primary metrics meet profile
        def sample_meets(a):
            t = a.get('temperature', {}).get('meets_profile')
            w = a.get('wind', {}).get('meets_profile')
            p = a.get('precipitation', {}).get('meets_profile')
            h = a.get('humidity', {}).get('meets_profile')
            return bool(t and w and p and h)

        meet_count = sum(1 for s in successful if sample_meets(s.get('atmospheric_signature', {})))
        percent_meet = round((meet_count / n) * 100)
        aggregated['final_verdict'] = {
            'percent_meet_profile': percent_meet,
            'samples_evaluated': n
        }

        # include per-sample details for frontend layer rendering
        per_sample = []
        for (lat, lon), res in zip(samples, results):
            if res and isinstance(res, dict) and 'overall_score' in res:
                per_sample.append({
                    'lat': lat,
                    'lon': lon,
                    'overall_score': res.get('overall_score'),
                    'atmospheric_signature': res.get('atmospheric_signature', {}),
                    'specialty_scores': res.get('specialty_scores', {})
                })

        aggregated['samples'] = per_sample
        return aggregated
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/")
def read_root():
    return {"status": "AtmoSphere Backend v2 is running!"}


class ProfileFromDateRequest(BaseModel):
    lat: float
    lon: float
    month: int
    day: int


@app.post('/api/profile/from_date')
async def profile_from_date(request: ProfileFromDateRequest):
    """
    Returns a suggested comfort profile (and default weights) computed from the
    climatology at the requested lat/lon and month/day. Frontend can use this
    to prefill user preferences based on historical norms.
    """
    try:
        result = await get_profile_from_climatology(lat=request.lat, lon=request.lon, month=request.month, day=request.day)
        if not result or 'error' in result:
            raise Exception(result.get('error', 'Unknown error while computing profile'))
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
