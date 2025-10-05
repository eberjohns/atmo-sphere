import React, { useState, useEffect } from 'react';

const ScoreGauge = ({ value }) => {
  const size = 230;
  const strokeWidth = 18;
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;

  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    const val = Math.max(0, Math.min(100, Number(value) || 0));
    const progressOffset = ((100 - val) / 100) * circumference;
    setOffset(progressOffset);
  }, [value, circumference]);

  const getStrokeColor = () => {
    if (value >= 75) return '#34d399';
    if (value >= 50) return '#facc15';
    return '#fb7185';
  };

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} style={{ width: '100%', height: '100%' }}>
        <circle
          strokeWidth={strokeWidth}
          stroke="#0f172a"
          fill="transparent"
          r={radius}
          cx={center}
          cy={center}
        />
        <circle
          stroke={getStrokeColor()}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          fill="transparent"
          r={radius}
          cx={center}
          cy={center}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '2.6rem', fontWeight: 800, color: '#fff' }}>{Math.round(value)}</span>
        <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>SCORE</span>
      </div>
    </div>
  );
};

export default ScoreGauge;
