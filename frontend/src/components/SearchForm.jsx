import React from 'react';
import styles from './SearchForm.module.css';

const SearchForm = ({ onSearch, onProfileOpen, searchParams, setSearchParams, isLoading, onOpenMap }) => {
    const handleSubmit = (e) => {
        e.preventDefault();
        onSearch();
    };
    
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear + i);

    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            <h2 className={styles.title}>Plan Your Adventure</h2>
            <div className={`${styles.inputGrid} ${'gridCols2'}`}>
                <input
                    type="number" step="0.0001"
                    className={styles.input}
                    placeholder="Latitude (e.g., 51.5072)"
                    value={searchParams.lat}
                    onChange={(e) => setSearchParams({ ...searchParams, lat: e.target.value })}
                    required
                    disabled={isLoading}
                />
                <input
                    type="number" step="0.0001"
                    className={styles.input}
                    placeholder="Longitude (e.g., -0.1276)"
                    value={searchParams.lon}
                    onChange={(e) => setSearchParams({ ...searchParams, lon: e.target.value })}
                    required
                    disabled={isLoading}
                />
            </div>
            <div className={`${styles.inputGrid} ${'gridCols3'}`}>
                 <select
                    className={styles.select}
                    value={searchParams.year}
                    onChange={(e) => setSearchParams({ ...searchParams, year: e.target.value })}
                    disabled={isLoading}
                >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select
                    className={styles.select}
                    value={searchParams.month}
                    onChange={(e) => setSearchParams({ ...searchParams, month: e.target.value })}
                    disabled={isLoading}
                >
                    {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}</option>)}
                </select>
                 <select
                    className={styles.select}
                    value={searchParams.day}
                    onChange={(e) => setSearchParams({ ...searchParams, day: e.target.value })}
                    disabled={isLoading}
                >
                    {Array.from({length: 31}, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
            </div>
            <div className={styles.buttonGroup}>
                <button type="button" onClick={onProfileOpen} className={`${styles.btn} ${styles.btnSecondary}`} disabled={isLoading}>
                    Set Comfort Profile
                </button>
                <button type="button" onClick={onOpenMap} className={`${styles.btn} ${styles.btnSecondary}`} disabled={isLoading}>
                    Pick Area on Map
                </button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={isLoading}>
                    {isLoading ? 'Analyzing...' : 'Analyze Conditions'}
                </button>
            </div>
        </form>
    );
};

export default SearchForm;
