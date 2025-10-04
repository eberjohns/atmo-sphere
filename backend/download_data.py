import os
import asyncio
import httpx
from dotenv import load_dotenv
from pathlib import Path

# --- Configuration ---
load_dotenv()
TARGET_MONTH = 8
TARGET_DAY = 15
START_YEAR = 1980
END_YEAR = 2023
OUTPUT_DIR = "data"
NASA_TOKEN = os.getenv("NASA_TOKEN")
BASE_DOWNLOAD_URL = "https://goldsmr4.gesdisc.eosdis.nasa.gov/data/MERRA2/M2T1NXSLV.5.12.4/"

def get_merra_stream_id(year: int) -> int:
    """
    Determines the correct MERRA-2 stream number based on the year.
    These numbers correspond to different processing streams in the MERRA-2 project.
    """
    if 1980 <= year <= 1991:
        return 100
    elif 1992 <= year <= 2000:
        return 200
    elif 2001 <= year <= 2010:
        return 300
    elif year >= 2011:
        return 400
    else:
        raise ValueError("Year is out of the valid MERRA-2 range.")

async def download_file(client, year, month, day, output_path):
    s_month, s_day = str(month).zfill(2), str(day).zfill(2)
    stream_id = get_merra_stream_id(year) # <-- GET THE CORRECT STREAM ID

    file_name = f"MERRA2_{stream_id}.tavg1_2d_slv_Nx.{year}{s_month}{s_day}.nc4"
    file_url = f"{BASE_DOWNLOAD_URL}{year}/{s_month}/{file_name}"
    
    if output_path.exists():
        print(f"✅ SKIPPED: '{output_path.name}' already exists.")
        return

    print(f"🔽 DOWNLOADING: '{file_name}'...")
    try:
        headers = {"Authorization": f"Bearer {NASA_TOKEN}"}
        async with client.stream("GET", file_url, headers=headers, timeout=60.0) as response:
            response.raise_for_status()
            with open(output_path, "wb") as f:
                async for chunk in response.aiter_bytes():
                    f.write(chunk)
            print(f"✅ SUCCESS: Saved '{output_path.name}'")
    except httpx.HTTPStatusError as e:
        print(f"❌ FAILED: HTTP error for {year}-{s_month}-{s_day}: {e}")
    except Exception as e:
        print(f"❌ FAILED: An unexpected error for {year}-{s_month}-{s_day}: {e}")

async def main():
    if not NASA_TOKEN:
        print("❌ ERROR: NASA_TOKEN not found in .env file.")
        return
    
    output_dir_path = Path(OUTPUT_DIR)
    output_dir_path.mkdir(exist_ok=True)
    
    print("--- Starting MERRA-2 Data Download ---")
    async with httpx.AsyncClient() as client:
        for year in range(START_YEAR, END_YEAR + 1):
            try:
                stream_id = get_merra_stream_id(year)
                file_name = f"MERRA2_{stream_id}.tavg1_2d_slv_Nx.{year}{str(TARGET_MONTH).zfill(2)}{str(TARGET_DAY).zfill(2)}.nc4"
                output_file_path = output_dir_path / file_name
                await download_file(client, year, TARGET_MONTH, TARGET_DAY, output_file_path)
                await asyncio.sleep(1) # Be polite to the server
            except ValueError:
                print(f"⚠️  WARNING: Skipping invalid date for year {year}.")
                continue
    print("\n--- Download process complete. ---")

if __name__ == "__main__":
    asyncio.run(main())

