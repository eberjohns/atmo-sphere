import os
import httpx
import asyncio
import numpy as np
from datetime import datetime
from dotenv import load_dotenv

# --- Configuration ---
load_dotenv()
NASA_API_KEY = os.getenv("NASA_API_KEY")
POWER_CLIMATOLOGY_API_URL = "https://power.larc.nasa.gov/api/temporal/climatology/point"

# --- Helper Functions ---

def calculate_heat_index(T, RH):
    """
    Calculates Heat Index in Celsius. A simplified version of the NOAA formula for broader applicability.
    This gives an indication of perceived temperature.
    """
    # Formula is based on Fahrenheit, so we convert back and forth.
    T_F = T * 9/5 + 32
    
    # Simple formula for lower temperatures
    if T_F < 80:
        HI_F = 0.5 * (T_F + 61.0 + ((T_F - 68.0) * 1.2) + (RH * 0.094))
    # More complex formula for higher temperatures
    else:
        HI_F = -42.379 + 2.04901523*T_F + 10.14333127*RH - .22475541*T_F*RH - .00683783*T_F*T_F - .05481717*RH*RH + .00122874*T_F*T_F*RH + .00085282*T_F*RH*RH - .00000199*T_F*T_F*RH*RH
    
    return (HI_F - 32) * 5/9 # Convert final result back to Celsius

# --- Main Service Function ---

async def get_climatological_analysis(lat: float, lon: float, month: int, day: int, profile, weights):
    """
    Fetches and analyzes a full suite of climatological data from the NASA POWER API
    to generate a complete "Atmospheric Signature".
    """
    # We now request all the parameters needed for our advanced scores
    parameters = [
        "T2M", "T2M_MAX", "T2M_MIN",       # Temperature (Avg, Max, Min)
        "WS10M", "WS10M_MAX",              # Wind Speed (Avg, Max)
        "RH2M",                           # Relative Humidity
        "PRECTOTCORR",                    # Precipitation
        "ALLSKY_SFC_SW_DWN", "KT"          # All Sky Insolation and Clearness Index (for sunlight)
    ]

    params = {
        "latitude": lat,
        "longitude": lon,
        "community": "RE", # Renewable Energy community has a good set of parameters
        "parameters": ",".join(parameters),
        "format": "JSON",
        "header": "false", # We don't need the metadata header in the response
        "api_key": NASA_API_KEY
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(POWER_CLIMATOLOGY_API_URL, params=params)
            response.raise_for_status()
            data = response.json()
    except Exception as e:
        return {"error": f"Failed to fetch data from NASA POWER API: {e}"}

    # --- Process the Fetched Data ---
    try:
        # Extract the data for the specific month from the response
        month_key = datetime(2000, month, 1).strftime('%b').upper()
        raw_params = data.get("properties", {}).get("parameter", {})
        
        # --- 1. Temperature Analysis (with safe access) ---
        temp_avg = raw_params.get("T2M", {}).get(month_key, -999)
        if temp_avg < -900: # -999 is the POWER API's code for missing data
            raise KeyError("Core temperature data (T2M) is missing from the API response for this location.")
        temp_max = raw_params.get("T2M_MAX", {}).get(month_key, temp_avg)
        temp_min = raw_params.get("T2M_MIN", {}).get(month_key, temp_avg)
        temp_in_comfort = profile.temp_min <= temp_avg <= profile.temp_max

        # --- 2. Wind Analysis (with safe access) ---
        wind_avg = raw_params.get("WS10M", {}).get(month_key, 0)
        wind_max = raw_params.get("WS10M_MAX", {}).get(month_key, wind_avg)
        wind_in_comfort = wind_avg <= profile.wind_max
        
        # --- 3. Humidity Analysis (with safe access) ---
        humidity_avg = raw_params.get("RH2M", {}).get(month_key, 50) # Default to 50%
        humidity_in_comfort = humidity_avg <= profile.humidity_max
        
        # --- 4. Precipitation Analysis (with safe access) ---
        precip_avg_daily = raw_params.get("PRECTOTCORR", {}).get(month_key, 0)
        # Heuristic: A simple but effective model to estimate the chance of a rainy day.
        rain_probability = min(precip_avg_daily * 15, 100)
        rain_in_comfort = rain_probability <= profile.rain_chance_max

        # --- 5. "Wow" Factor Specialty Score Calculations (with safe access) ---
        
        # Uncomfortable Heat & Humidity Score
        heat_index_avg = calculate_heat_index(temp_avg, humidity_avg)
        uncomfortable_chance = 0
        if temp_avg > 27: # Only calculate if it's already warm
             uncomfortable_chance = min((heat_index_avg - 27) * 10, 100)
        
        # Golden Hour & Sunlight Score
        # THIS IS THE FIX: Use .get() with a default value for robustness.
        clearness_index = raw_params.get("KT", {}).get(month_key, 0.5) # Default to 0.5 (partly cloudy) if missing
        golden_hour_score = round(clearness_index * 10) # Convert to a simple 1-10 score
        sunny_day_likelihood = round(clearness_index * 100)

        # --- 6. Calculate Final Weighted Overall Score ---
        scores = {
            "temperature": 1 if temp_in_comfort else 0,
            "wind": 1 if wind_in_comfort else 0,
            "rain": 1 if rain_in_comfort else 0,
            "humidity": 1 if humidity_in_comfort else 0,
        }
        
        total_weight = sum(weights.dict().values())
        weighted_score = sum(scores[key] * weights.dict()[key] for key in scores)
        overall_score = round((weighted_score / total_weight) * 100) if total_weight > 0 else 0

        # --- 7. Construct the Final Rich JSON Response ---
        return {
            "overall_score": overall_score,
            "location": data.get("header", {}).get("title", "Unknown Location"),
            "atmospheric_signature": {
                "temperature": {
                    "avg": round(temp_avg, 1), "min": round(temp_min, 1), "max": round(temp_max, 1),
                    "meets_profile": temp_in_comfort, "units": "°C"
                },
                "wind": {
                    "avg": round(wind_avg, 1), "max": round(wind_max, 1),
                    "meets_profile": wind_in_comfort, "units": "m/s"
                },
                "humidity": {
                    "avg": round(humidity_avg, 1),
                    "meets_profile": humidity_in_comfort, "units": "%"
                },
                "precipitation": {
                    "avg_daily_amount": round(precip_avg_daily, 2), # mm/day
                    "estimated_daily_chance": round(rain_probability, 1),
                    "meets_profile": rain_in_comfort, "units": {"amount": "mm/day", "chance": "%"}
                },
                "sunlight": {
                    "sunny_day_likelihood": sunny_day_likelihood,
                    "clearness_index": clearness_index, "units": "% likelihood"
                }
            },
            "specialty_scores": {
                "uncomfortable_heat_chance": round(max(0, uncomfortable_chance)),
                "golden_hour_quality": golden_hour_score,
                # A simple blend of the main score and the likelihood of sun
                "outdoor_activity_index": round((overall_score + sunny_day_likelihood) / 2)
            }
        }

    except Exception as e:
        return {"error": f"Failed to process data: {e}"}


async def get_profile_from_climatology(lat: float, lon: float, month: int, day: int):
    """
    Fetches climatology for the given location and month, and returns a suggested
    comfort profile (ranges/thresholds) and default weights based on the typical
    conditions for that month.
    """
    params = {
        "latitude": lat,
        "longitude": lon,
        "community": "RE",
        "parameters": "T2M,T2M_MAX,T2M_MIN,WS10M,WS10M_MAX,RH2M,PRECTOTCORR,KT",
        "format": "JSON",
        "header": "false",
        "api_key": NASA_API_KEY
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(POWER_CLIMATOLOGY_API_URL, params=params)
            response.raise_for_status()
            data = response.json()
    except Exception as e:
        return {"error": f"Failed to fetch climatology data: {e}"}

    try:
        month_key = datetime(2000, month, 1).strftime('%b').upper()
        raw = data.get("properties", {}).get("parameter", {})

        temp_avg = raw.get("T2M", {}).get(month_key, None)
        temp_min = raw.get("T2M_MIN", {}).get(month_key, temp_avg if temp_avg is not None else None)
        temp_max = raw.get("T2M_MAX", {}).get(month_key, temp_avg if temp_avg is not None else None)

        wind_avg = raw.get("WS10M", {}).get(month_key, None)
        wind_max = raw.get("WS10M_MAX", {}).get(month_key, wind_avg if wind_avg is not None else None)

        humidity_avg = raw.get("RH2M", {}).get(month_key, None)

        precip_avg = raw.get("PRECTOTCORR", {}).get(month_key, 0)
        rain_probability = min(precip_avg * 15, 100)

        # Build a reasonable suggested profile around climatology
        if temp_avg is None:
            return {"error": "Missing temperature climatology for this location/month"}

        # Suggest a comfortable band +/- 4C around the monthly mean
        suggested = {
            "temp_min": int(round(temp_avg - 4)),
            "temp_max": int(round(temp_avg + 4)),
            "wind_max": int(round(wind_avg if wind_avg is not None else 10)),
            "rain_chance_max": int(round(min(100, max(5, rain_probability)))),
            "humidity_max": int(round(humidity_avg if humidity_avg is not None else 75)),
        }

        # Default weights: emphasize rain and temperature slightly
        default_weights = {
            "temperature": 1.5,
            "wind": 1.0,
            "rain": 2.0,
            "humidity": 1.0,
        }

        return {"profile": suggested, "weights": default_weights, "location": data.get("header", {}).get("title", "Unknown Location")}

    except Exception as e:
        return {"error": f"Failed to construct profile: {e}"}

