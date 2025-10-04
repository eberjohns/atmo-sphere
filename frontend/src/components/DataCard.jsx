import React from 'react';
import styles from './DataCard.module.css';

const DataCard = ({ icon, title, value, unit, meetsProfile }) => {
    const borderClass = meetsProfile === true ? styles.cardGreen : meetsProfile === false ? styles.cardRed : '';
    return (
        <div className={`${styles.card} ${borderClass}`}>
            <div className={styles.icon}>{icon}</div>
            <div>
                <p className={styles.title}>{title}</p>
                <p className={styles.value}>
                    {value ?? 'N/A'}
                    {unit && <span className={styles.unit}>{unit}</span>}
                </p>
            </div>
        </div>
    );
};

export default DataCard;
