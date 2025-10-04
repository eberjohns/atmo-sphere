from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict

# Import the function from your service file
from nasa_service import get_climatological_analysis
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

# --- 2. Create the FastAPI App Instance ---
app = FastAPI()

# Allow cross origin requests from the frontend dev server(s)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
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

@app.get("/")
def read_root():
    return {"status": "AtmoSphere Backend v2 is running!"}
