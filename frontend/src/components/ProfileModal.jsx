import React, { useState } from 'react';
import styles from './ProfileModal.module.css';
import { fetchProfileFromDate } from '../api.js';

const ProfileModal = ({ isOpen, onClose, profile, setProfile, weights, setWeights, searchParams, setSearchParams }) => {
    // Location search state
    const [locationQuery, setLocationQuery] = useState('');
    const [resolvedLat, setResolvedLat] = useState(searchParams?.lat || '');
    const [resolvedLon, setResolvedLon] = useState(searchParams?.lon || '');

    // Date input: full date (YYYY-MM-DD)
    const todayISO = new Date().toISOString().slice(0, 10);
    const [dateISO, setDateISO] = useState(todayISO);

    const [loadingProfile, setLoadingProfile] = useState(false);
    const [loadError, setLoadError] = useState(null);
    const [geocoding, setGeocoding] = useState(false);
    const [geoResults, setGeoResults] = useState([]);

    

    if (!isOpen) return null;

    const handleProfileChange = (e) => {
        setProfile({ ...profile, [e.target.name]: parseInt(e.target.value, 10) });
    };

    const handleWeightChange = (e) => {
        setWeights({ ...weights, [e.target.name]: parseFloat(e.target.value) });
    };

    const handleGeocode = async () => {
        if (!locationQuery) return;
        setGeocoding(true);
        setLoadError(null);
        try {
            // Use Nominatim public API for free geocoding
            const q = encodeURIComponent(locationQuery);
            const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=5`;
            const resp = await fetch(url, { headers: { 'Accept-Language': 'en' } });
            if (!resp.ok) throw new Error('Geocoding failed');
            const data = await resp.json();
            setGeoResults(data || []);
        } catch (e) {
            setLoadError(e.message || 'Failed to geocode location');
        } finally {
            setGeocoding(false);
        }
    };

    const pickGeoResult = (item) => {
        setResolvedLat(item.lat);
        setResolvedLon(item.lon);
        setGeoResults([]);
        setLocationQuery(item.display_name || `${item.lat}, ${item.lon}`);
    };

    const handleLoadFromDate = async () => {
        setLoadError(null);
        setLoadingProfile(true);
        try {
            if (!resolvedLat || !resolvedLon) throw new Error('Please search and pick a location before loading');
            const d = new Date(dateISO);
            if (isNaN(d)) throw new Error('Please select a valid date');
            const month = d.getMonth() + 1;
            const day = d.getDate();
            const res = await fetchProfileFromDate({ lat: parseFloat(resolvedLat), lon: parseFloat(resolvedLon), month, day });
            if (res.error) throw new Error(res.error);
            if (res.profile) {
                setProfile(res.profile);
            }
            if (res.weights) {
                setWeights(res.weights);
            }
        } catch (e) {
            setLoadError(e.message || 'Failed to load profile');
        } finally {
            setLoadingProfile(false);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.content}>
                <h3 className={styles.title}>My Comfort Profile</h3>
                
                <div className={styles.grid}>
                    <div style={{ gridColumn: '1 / -1', marginBottom: '0.5rem' }}>
                        <h4 className={styles.subtitle}>Load Profile From Location & Date</h4>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                                <input placeholder="Search for a location (city, address)" value={locationQuery} onChange={(e) => setLocationQuery(e.target.value)} className={styles.smallInput} style={{ flex: 1 }} />
                                <button onClick={handleGeocode} className={styles.btn} disabled={geocoding}>{geocoding ? 'Searching...' : 'Search'}</button>
                            </div>
                            {geoResults && geoResults.length > 0 && (
                                <div style={{ maxHeight: 160, overflow: 'auto', width: '100%', border: '1px solid var(--muted)', borderRadius: 6, marginTop: '0.25rem' }}>
                                    {geoResults.map(g => (
                                        <div key={g.place_id} style={{ padding: '0.4rem', cursor: 'pointer' }} onClick={() => pickGeoResult(g)}>
                                            <div style={{ fontSize: '0.9rem' }}>{g.display_name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-medium)' }}>{parseFloat(g.lat).toFixed(4)}, {parseFloat(g.lon).toFixed(4)}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '0.5rem', width: '100%', alignItems: 'center' }}>
                                <input type="date" value={dateISO} max={todayISO} onChange={(e) => setDateISO(e.target.value)} className={styles.smallInput} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-medium)' }}>Selected coords: {resolvedLat ? `${parseFloat(resolvedLat).toFixed(6)}, ${parseFloat(resolvedLon).toFixed(6)}` : 'None'}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-medium)', marginTop: '0.25rem' }}>
                                        Note: Profiles are computed from NASA POWER climatology (multi-year monthly averages). The backend uses the month/day only — the year is ignored. Future dates are not allowed here.
                                    </div>
                                </div>
                                <button onClick={handleLoadFromDate} className={styles.btn} disabled={loadingProfile}>{loadingProfile ? 'Loading...' : 'Load profile'}</button>
                            </div>
                        </div>
                        {loadError && <div style={{ color: 'var(--error)', marginTop: '0.25rem' }}>{loadError}</div>}
                    </div>
                    <div>
                        <h4 className={styles.subtitle}>Preferences</h4>
                        <div className={styles.controlGroup}>
                            <label className={styles.label}>
                                <span className={styles.labelText}>Temp (°C): {profile.temp_min} to {profile.temp_max}</span>
                                <div className={styles.rangeGroup}>
                                    <input type="range" name="temp_min" min="-20" max="50" value={profile.temp_min} onChange={handleProfileChange} className={styles.range} />
                                    <input type="range" name="temp_max" min="-20" max="50" value={profile.temp_max} onChange={handleProfileChange} className={styles.range} />
                                </div>
                            </label>
                            <label className={styles.label}>
                                <span className={styles.labelText}>Max Wind (m/s): {profile.wind_max}</span>
                                <input type="range" name="wind_max" min="0" max="30" value={profile.wind_max} onChange={handleProfileChange} className={styles.range} />
                            </label>
                            <label className={styles.label}>
                                <span className={styles.labelText}>Max Rain Chance (%): {profile.rain_chance_max}</span>
                                <input type="range" name="rain_chance_max" min="0" max="100" value={profile.rain_chance_max} onChange={handleProfileChange} className={styles.range} />
                            </label>
                            <label className={styles.label}>
                                <span className={styles.labelText}>Max Humidity (%): {profile.humidity_max}</span>
                                <input type="range" name="humidity_max" min="0" max="100" value={profile.humidity_max} onChange={handleProfileChange} className={styles.range} />
                            </label>
                        </div>
                    </div>

                    <div>
                        <h4 className={styles.subtitle}>Importance (Weights)</h4>
                         <div className={styles.controlGroup}>
                            <label className={styles.label}>
                                <span className={styles.labelText}>Temperature: {weights.temperature.toFixed(1)}</span>
                                <input type="range" name="temperature" min="0" max="3" step="0.1" value={weights.temperature} onChange={handleWeightChange} className={styles.range} />
                            </label>
                            <label className={styles.label}>
                                <span className={styles.labelText}>Wind: {weights.wind.toFixed(1)}</span>
                                <input type="range" name="wind" min="0" max="3" step="0.1" value={weights.wind} onChange={handleWeightChange} className={styles.range} />
                            </label>
                            <label className={styles.label}>
                                <span className={styles.labelText}>Rain: {weights.rain.toFixed(1)}</span>
                                <input type="range" name="rain" min="0" max="3" step="0.1" value={weights.rain} onChange={handleWeightChange} className={styles.range} />
                            </label>
                            <label className={styles.label}>
                                <span className={styles.labelText}>Humidity: {weights.humidity.toFixed(1)}</span>
                                <input type="range" name="humidity" min="0" max="3" step="0.1" value={weights.humidity} onChange={handleWeightChange} className={styles.range} />
                            </label>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button onClick={() => { setLocationQuery(''); setResolvedLat(''); setResolvedLon(''); setLoadError(null); }} className={styles.secondaryButton}>Clear</button>
                    <button onClick={() => {
                        // If parent provided setSearchParams, update the main search form with chosen location/date
                        if (setSearchParams && resolvedLat && resolvedLon) {
                            const d = new Date(dateISO);
                            const month = d.getMonth() + 1;
                            const day = d.getDate();
                            const year = d.getFullYear();
                            setSearchParams({ ...searchParams, lat: resolvedLat, lon: resolvedLon, year, month, day });
                        }
                        onClose();
                    }} className={styles.closeButton}>Save and Close</button>
                </div>
            </div>
        </div>
    );
};

export default ProfileModal;
