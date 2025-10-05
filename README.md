# AtmoSphere - Your Personal Climate Compass
A project for the NASA Space Apps Challenge 2025.

## The Problem
Planning outdoor activities, vacations, or events months in advance comes with a major uncertainty: the weather. A simple "average temperature" doesn't tell the whole story. Will it be uncomfortably humid? Is there a high chance of disruptive wind? For many, these environmental factors are not just about comfort, but about health and safety.

## Our Solution
**AtmoSphere** is a web application that transforms how we plan for the future by providing a personalized climate analysis for any location on Earth, powered by over 40 years of NASA's historical Earth-observation data.

Instead of a generic weather forecast, Solas delivers a personalized **"Comfort Score"**. Users can define their ideal conditions for temperature, wind, humidity, and rain, and even weight which factors are most important to them. Using our interactive map, users can select a specific point or an entire region—like a hiking trail or a national park—and instantly receive a detailed "Atmospheric Signature" that shows the historical likelihood of that location matching their personal comfort profile for any day of the year.

### Key Features
- Personalized Comfort Profile: Users can define and save their ideal weather conditions.
- Interactive Area Analysis: Use the map to draw a region of interest and get a detailed analysis for the entire zone.
- Weighted Scoring: Tell the app what matters most to you, and the overall score will adapt to your priorities.
- Specialty Scores: Get unique insights like "Golden Hour Quality" for photographers or an "Outdoor Activity Index."
- Powered by NASA: All analyses are derived from the robust and reliable NASA POWER project's climatology data.

## Tech Stack
- Frontend: React (with Vite), Leaflet.js for interactive maps, CSS Modules for styling.
- Backend: Python with FastAPI, providing a high-performance API for data analysis.
- NASA Data Source: [NASA POWER API](https://power.larc.nasa.gov/) for 40+ years of global climatological data.

## How to Run

### Backend
1. Navigate to the ```backend``` directory.
2. Create a virtual environment and install dependencies: ```pip install -r requirements.txt```.
3. Create a ```.env``` file from the ```.env.example``` and add your NASA API Key.

Run the server: ```uvicorn main:app --reload```.

### Frontend
1. Navigate to the ```frontend``` directory.
2. Install dependencies: ```npm install```.
3. Run the development server: ```npm run dev```.
4. Open your browser to ```http://localhost:5173```.

Developed by **Team: Rain Watchers**.
