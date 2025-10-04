import os
import httpx
import asyncio
import numpy as np
from datetime import datetime
from dotenv import load_dotenv
from tqdm import tqdm

# --- Configuration ---
load_dotenv()
NASA_API_KEY = os.getenv("NASA_API_KEY")
POWER_DAILY_API_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
POWER_CLIMATOLOGY_API_URL = "https://power.larc.nasa.gov/api/temporal/climatology/point"

# --- This is the key line that imports your list from the other file ---
# from world_locations import LOCATIONS_TO_TEST
from india_locations import LOCATIONS_TO_TEST

TEST_MONTH = 8  # August
TEST_DAY = 15   # Day of the month to test

# Define the period for our "ground truth" actuals
RECENT_YEARS_START = 2020
RECENT_YEARS_END = 2024

# Define the tolerance for a "correct" prediction (e.g., +/- 2.5 degrees Celsius)
ACCURACY_TOLERANCE_C = 2.5

# --- API Fetching Functions ---

async def get_climatology_prediction(session, lat: float, lon: float, month: int):
    """
    Fetches the 40-year climatological average. This is our 'prediction'.
    """
    params = {
        "latitude": lat, "longitude": lon, "community": "RE",
        "parameters": "T2M", "format": "JSON", "header": "false"
    }
    try:
        response = await session.get(POWER_CLIMATOLOGY_API_URL, params=params)
        response.raise_for_status()
        data = response.json()
        month_key = datetime(2000, month, 1).strftime('%b').upper()
        return data["properties"]["parameter"]["T2M"][month_key]
    except Exception as e:
        print(f"Error fetching climatology: {e}")
        return None

async def get_recent_actuals(session, lat: float, lon: float, month: int, day: int, start_year: int, end_year: int):
    """
    Fetches the actual daily temperature for a range of recent years. This is our 'ground truth'.
    """
    params = {
        "latitude": lat, "longitude": lon, "community": "RE",
        "parameters": "T2M", "format": "JSON",
        "start": f"{start_year}0101", # We fetch the whole period at once
        "end": f"{end_year}1231"
    }
    try:
        response = await session.get(POWER_DAILY_API_URL, params=params)
        response.raise_for_status()
        data = response.json()
        
        # Filter the results to get only the specific day we care about
        actuals = []
        for date_str, temp in data["properties"]["parameter"]["T2M"].items():
            date_obj = datetime.strptime(date_str, "%Y%m%d")
            if date_obj.month == month and date_obj.day == day:
                actuals.append(temp)
        return actuals
    except Exception as e:
        print(f"Error fetching daily actuals: {e}")
        return []

# --- Main Validation Logic ---

async def run_validation_for_location(session, location):
    """
    Runs the full validation process for a single location.
    """
    lat, lon = location["lat"], location["lon"]
    print(f"\n--- Validating for {location['name']} ---")

    # 1. Get the "Prediction" (long-term historical average)
    predicted_temp = await get_climatology_prediction(session, lat, lon, TEST_MONTH)
    if predicted_temp is None:
        return {"name": location["name"], "error": "Failed to get prediction."}
    
    print(f"Historical Average (Prediction): {predicted_temp:.1f}°C")

    # 2. Get the "Actuals" (real daily data from recent years)
    actual_temps = await get_recent_actuals(session, lat, lon, TEST_MONTH, TEST_DAY, RECENT_YEARS_START, RECENT_YEARS_END)
    if not actual_temps:
        return {"name": location["name"], "error": "Failed to get actuals."}
        
    print(f"Recent Actual Temps ({RECENT_YEARS_START}-{RECENT_YEARS_END}): {[f'{t:.1f}' for t in actual_temps]}")

    # 3. Check the difference and calculate accuracy
    correct_predictions = 0
    for temp in actual_temps:
        if abs(temp - predicted_temp) <= ACCURACY_TOLERANCE_C:
            correct_predictions += 1
            
    accuracy = (correct_predictions / len(actual_temps)) * 100
    print(f"Accuracy within +/- {ACCURACY_TOLERANCE_C}°C: {accuracy:.0f}%")
    
    return {"name": location["name"], "accuracy": accuracy}

async def main():
    """
    Main function to orchestrate the validation for all test locations.
    """
    if not NASA_API_KEY:
        print("FATAL ERROR: NASA_API_KEY not found in .env file.")
        return

    async with httpx.AsyncClient(timeout=45.0) as session:
        tasks = [run_validation_for_location(session, loc) for loc in LOCATIONS_TO_TEST]
        results = await asyncio.gather(*tasks)

    print("\n\n--- VALIDATION SUMMARY ---")
    total_accuracy = 0
    valid_results = 0
    for res in results:
        if "accuracy" in res:
            print(f"{res['name']:<20} | Accuracy: {res['accuracy']:.0f}%")
            total_accuracy += res['accuracy']
            valid_results += 1
    
    if valid_results > 0:
        overall_avg_accuracy = total_accuracy / valid_results
        print("---------------------------------")
        print(f"{'Overall Average':<20} | Accuracy: {overall_avg_accuracy:.0f}%")
        print("\nConclusion: This shows how well the 40-year climate average represents the weather of the last few years.")

if __name__ == "__main__":
    asyncio.run(main())

