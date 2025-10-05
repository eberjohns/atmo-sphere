import React, { useState } from 'react';
import { fetchAnalysis } from './api.js';
import SearchForm from './components/SearchForm.jsx';
import ResultsDisplay from './components/ResultsDisplay.jsx';
import ProfileModal from './components/ProfileModal.jsx';
import MapPicker from './components/MapPicker.jsx';

export default function App() {
  const [searchParams, setSearchParams] = useState({
    lat: '51.5072', // Default to London for demo
    lon: '-0.1276',
    year: new Date().getFullYear() + 1, // Default to next year
    month: 7, // Default to July
    day: 15,
  });

  const [profile, setProfile] = useState({
    temp_min: 15, temp_max: 25,
    wind_max: 10, rain_chance_max: 20, humidity_max: 70,
  });

  const [weights, setWeights] = useState({
    temperature: 1.5, wind: 1.0, rain: 2.0, humidity: 1.0,
  });

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const data = await fetchAnalysis(searchParams, profile, weights);
      setResults(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePolygonSave = (geojson) => {
    if (!geojson) {
      setSearchParams({ ...searchParams, polygon: null });
      return;
    }

    // Extract coordinates and compute centroid fallback
    const coords = geojson.geometry.coordinates;
    // For polygons: coords[0] is the outer ring
    const ring = Array.isArray(coords[0]) ? coords[0] : coords;
  // ring is an array of [lon, lat] points
  const lats = ring.map((pt) => pt[1]);
  const lons = ring.map((pt) => pt[0]);
  const centroidLat = lats.reduce((a, b) => a + b, 0) / lats.length;
  const centroidLon = lons.reduce((a, b) => a + b, 0) / lons.length;

    setSearchParams({ ...searchParams, polygon: geojson, lat: centroidLat.toFixed(6), lon: centroidLon.toFixed(6) });
    setIsMapOpen(false);
  };

  const handleReset = () => {
    setResults(null);
    setError(null);
    setSearchParams({
      ...searchParams,
      lat: '',
      lon: '',
    });
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="container">
        <header className="header">
          <h1>AtmoSphere</h1>
          <p style={{ color: 'var(--accent)' }}>Your Personal Weather Compass, Powered by NASA</p>
        </header>

        <main>
          {loading && (
            <div className="text-center loadingSpinner">
              <div className="spinner"></div>
              <p style={{ marginTop: '1rem' }}>Analyzing 40+ years of NASA data...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-900 bg-opacity-50 text-red-200 p-6 rounded-lg text-center">
              <h3 className="font-bold text-lg mb-2">Analysis Failed</h3>
              <p>{error}</p>
              <button onClick={handleReset} className="mt-4 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-500 transition">
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && !results && (
            <SearchForm
              onSearch={handleSearch}
              onProfileOpen={() => setIsProfileOpen(true)}
              searchParams={searchParams}
              setSearchParams={setSearchParams}
              isLoading={loading}
              onOpenMap={() => setIsMapOpen(true)}
            />
          )}

          {!loading && !error && results && (
            <ResultsDisplay results={results} onReset={handleReset} polygon={searchParams.polygon} />
          )}
        </main>
      </div>

      {isMapOpen && (
        <MapPicker
          initialCenter={[parseFloat(searchParams.lat) || 20, parseFloat(searchParams.lon) || 0]}
          onSave={handlePolygonSave}
          onClose={() => setIsMapOpen(false)}
        />
      )}

      <ProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)}
        profile={profile}
        setProfile={setProfile}
        weights={weights}
        setWeights={setWeights}
        searchParams={searchParams}
        setSearchParams={setSearchParams}
      />

      <footer className="footer" style={{ textAlign: 'center' }}>
        <p>A NASA Space Apps Challenge Project. All climatological data provided by the NASA POWER Project.</p>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-medium)', marginTop: '0.25rem' }}>NASA/POWER Source Native Resolution Climatology Climatologies</p>
      </footer>
    </div>
  );
}

