// The URL where your FastAPI backend is running.
const POINT_API_URL = "http://127.0.0.1:8000/api/analyze/point";
const POLYGON_API_URL = "http://127.0.0.1:8000/api/analyze/polygon";
const PROFILE_FROM_DATE_URL = "http://127.0.0.1:8000/api/profile/from_date";

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

/**
 * Fetch a suggested comfort profile and default weights for a given location and date
 * @param {{lat:number, lon:number, month:number, day:number}} params
 * @returns {Promise<object>} { profile: {...}, weights: {...}, location: string }
 */
export const fetchProfileFromDate = async ({ lat, lon, month, day }) => {
  const response = await fetch(PROFILE_FROM_DATE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat: parseFloat(lat), lon: parseFloat(lon), month: parseInt(month), day: parseInt(day) }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};
