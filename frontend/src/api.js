// The URL where your FastAPI backend is running.
const API_URL = "http://127.0.0.1:8000/api/analyze/point";

/**
 * Fetches the analysis from the backend API.
 * @param {object} searchParams - The latitude, longitude, and date.
 * @param {object} profile - The user's comfort profile.
 * @param {object} weights - The user's importance weights.
 * @returns {Promise<object>} - The analysis result from the API.
 */
export const fetchAnalysis = async (searchParams, profile, weights) => {
  const requestBody = {
    lat: parseFloat(searchParams.lat),
    lon: parseFloat(searchParams.lon),
    month: parseInt(searchParams.month),
    day: parseInt(searchParams.day),
    profile,
    weights,
  };

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};
