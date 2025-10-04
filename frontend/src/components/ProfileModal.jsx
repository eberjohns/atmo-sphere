import React from 'react';
import styles from './ProfileModal.module.css';

const ProfileModal = ({ isOpen, onClose, profile, setProfile, weights, setWeights }) => {
    if (!isOpen) return null;

    const handleProfileChange = (e) => {
        setProfile({ ...profile, [e.target.name]: parseInt(e.target.value, 10) });
    };

    const handleWeightChange = (e) => {
        setWeights({ ...weights, [e.target.name]: parseFloat(e.target.value) });
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.content}>
                <h3 className={styles.title}>My Comfort Profile</h3>
                
                <div className={styles.grid}>
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

                <button onClick={onClose} className={styles.closeButton}>
                    Save and Close
                </button>
            </div>
        </div>
    );
};

export default ProfileModal;
