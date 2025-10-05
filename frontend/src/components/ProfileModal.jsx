import React, { useState } from 'react';
import styles from './ProfileModal.module.css';
import { fetchProfileFromDate } from '../api.js';

const ProfileModal = ({ isOpen, onClose, profile, setProfile, weights, setWeights, searchParams }) => {
    const [lat, setLat] = useState(searchParams?.lat || '');
    const [lon, setLon] = useState(searchParams?.lon || '');
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [day, setDay] = useState(new Date().getDate());
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [loadError, setLoadError] = useState(null);

    

    if (!isOpen) return null;

    const handleProfileChange = (e) => {
        setProfile({ ...profile, [e.target.name]: parseInt(e.target.value, 10) });
    };

    const handleWeightChange = (e) => {
        setWeights({ ...weights, [e.target.name]: parseFloat(e.target.value) });
    };

    const handleLoadFromDate = async () => {
        setLoadError(null);
        setLoadingProfile(true);
        try {
            if (!lat || !lon) throw new Error('Please enter latitude and longitude before loading');
            const res = await fetchProfileFromDate({ lat: parseFloat(lat), lon: parseFloat(lon), month, day });
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
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input placeholder="Lat" value={lat} onChange={(e) => setLat(e.target.value)} className={styles.smallInput} />
                            <input placeholder="Lon" value={lon} onChange={(e) => setLon(e.target.value)} className={styles.smallInput} />
                            <select value={month} onChange={(e) => setMonth(parseInt(e.target.value, 10))} className={styles.smallInput}>
                                {Array.from({ length: 12 }).map((_, i) => <option key={i} value={i+1}>{i+1}</option>)}
                            </select>
                            <select value={day} onChange={(e) => setDay(parseInt(e.target.value, 10))} className={styles.smallInput}>
                                {Array.from({ length: 31 }).map((_, i) => <option key={i} value={i+1}>{i+1}</option>)}
                            </select>
                            <button onClick={handleLoadFromDate} className={styles.btn} disabled={loadingProfile}>{loadingProfile ? 'Loading...' : 'Load from date'}</button>
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
                    <button onClick={() => { setLat(''); setLon(''); setLoadError(null); }} className={styles.secondaryButton}>Clear</button>
                    <button onClick={onClose} className={styles.closeButton}>Save and Close</button>
                </div>
            </div>
        </div>
    );
};

export default ProfileModal;
