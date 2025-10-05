// The URL where your FastAPI backend is running.
const POINT_API_URL = "http://127.0.0.1:8000/api/analyze/point";
const POLYGON_API_URL = "http://127.0.0.1:8000/api/analyze/polygon";

/**
 * Fetches the analysis from the backend API.
 * @param {object} searchParams - The latitude, longitude, and date.
 * @param {object} profile - The user's comfort profile.
 * @param {object} weights - The user's importance weights.
 * @returns {Promise<object>} - The analysis result from the API.
 */
export const fetchAnalysis = async (searchParams, profile, weights) => {
  const month = parseInt(searchParams.month);
  const day = parseInt(searchParams.day);

  // If a polygon (GeoJSON) is provided, post to polygon endpoint
  if (searchParams.polygon) {
    const response = await fetch(POLYGON_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ polygon: searchParams.polygon, month, day, profile, weights, sample_count: searchParams.sample_count || 9 }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  const requestBody = {
    lat: parseFloat(searchParams.lat),
    lon: parseFloat(searchParams.lon),
    month,
    day,
    profile,
    weights,
  };

  const response = await fetch(POINT_API_URL, {
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
