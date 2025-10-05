import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './SamplesMap.module.css';

// We will dynamically import leaflet.heat to avoid build issues when optional
function HeatLayer({ points = [] }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    let createdLayer = null;

    (async () => {
      if (!map) return;
      const heatPoints = points.map(p => [p.lat, p.lon, p.value || 0.5]);
      try {
        // Try to load the optional heat plugin
        const mod = await import('leaflet.heat');
        // Some bundlers export as default, others attach to the import itself
        const heatFactory = (mod && (mod.default || mod)) || null;
        if (heatFactory || L.heatLayer) {
          const heatLayer = L.heatLayer ? L.heatLayer(heatPoints, { radius: 25, blur: 15, maxZoom: 17, minOpacity: 0.5 }) : heatFactory(heatPoints, { radius: 25, blur: 15, maxZoom: 17, minOpacity: 0.5 });
          heatLayer.addTo(map);
          createdLayer = heatLayer;
        } else {
          throw new Error('no-heat-plugin');
        }
      } catch {
        // load or draw error - fall back to simple markers
        // Fallback: render a simple layerGroup of circle markers so overlays are visible
        const grp = L.layerGroup();
        heatPoints.forEach(([lat, lon, val]) => {
          const intensity = Math.max(0, Math.min(1, val || 0));
          const radius = 6 + Math.round(18 * intensity); // 6 - 24 px
          const color = intensity > 0.6 ? '#1e3a8a' : intensity > 0.3 ? '#2563eb' : 'rgba(37,99,235,0.7)';
          const circle = L.circleMarker([lat, lon], { radius, color, fillColor: color, fillOpacity: 0.6, weight: 1 });
          circle.addTo(grp);
        });
        grp.addTo(map);
        createdLayer = grp;
      }

      layerRef.current = createdLayer;
    })();

    return () => {
      if (layerRef.current && map) {
  try { map.removeLayer(layerRef.current); } catch { /* ignore cleanup errors */ }
      }
    };
  }, [map, points]);

  return null;
}

export default function SamplesMap({ samples = [], center = [20, 0], polygon = null }) {
  const [mode, setMode] = useState('rain'); // rain | wind | all
  const mapRef = useRef();
  const [mapReady, setMapReady] = useState(false);

  // Build heat points based on mode
  const buildPoints = () => {
    if (!samples || samples.length === 0) return [];
    return samples.map(s => {
      const rain = s.atmospheric_signature?.precipitation?.estimated_daily_chance || 0;
      const wind = s.atmospheric_signature?.wind?.avg || 0;
      // Normalize wind to 0-100 roughly (assuming 0-20 m/s typical)
      const windNorm = Math.max(0, Math.min(100, (wind / 20) * 100));
      const value = mode === 'rain' ? rain : mode === 'wind' ? windNorm : (rain + windNorm) / 2;
      return { lat: s.lat, lon: s.lon, value: value / 100 };
    });
  };

  // Compute bounds from samples
  const bounds = samples.length ? [[Math.min(...samples.map(s=>s.lat)), Math.min(...samples.map(s=>s.lon))], [Math.max(...samples.map(s=>s.lat)), Math.max(...samples.map(s=>s.lon))]] : null;

  // compute average rain for polygon shading
  const avgRain = samples.length ? Math.round((samples.reduce((acc, s) => acc + (s.atmospheric_signature?.precipitation?.estimated_daily_chance || 0), 0) / samples.length)) : 0;

  // attach polygon layer when polygon or mapRef changes
  useEffect(() => {
    const map = mapRef.current;
    if (!polygon || !map || !mapReady) return;
    let polyLayer = null;
    try {
      const coords = polygon.geometry?.coordinates?.[0] || polygon.coordinates || [];
      const latlngs = coords.map(c => [c[1], c[0]]);
      polyLayer = L.polygon(latlngs, { color: avgRain > 50 ? '#1e3a8a' : '#2563eb', fillColor: avgRain > 50 ? '#1e3a8a' : '#2563eb', fillOpacity: 0.35, weight: 2 });
      polyLayer.addTo(map);
      map.fitBounds(polyLayer.getBounds());
    } catch {
      // ignore errors
    }

    return () => {
      if (polyLayer && map) map.removeLayer(polyLayer);
    };
  }, [polygon, avgRain, mapRef, mapReady]);

  return (
    <div>
      <div className={styles.toggleRow}>
        <button onClick={() => setMode('rain')} className={`${styles.toggleBtn} ${mode === 'rain' ? styles.active : ''}`}>Rain</button>
        <button onClick={() => setMode('wind')} className={`${styles.toggleBtn} ${mode === 'wind' ? styles.active : ''}`}>Wind</button>
        <button onClick={() => setMode('all')} className={`${styles.toggleBtn} ${mode === 'all' ? styles.active : ''}`}>All</button>
      </div>

      <div className={styles.mapWrapper}>
        <div className={styles.mapInner} style={{ height: '320px', width: '100%', borderRadius: 8, overflow: 'hidden' }}>
          <MapContainer center={center} zoom={10} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false} dragging={false} doubleClickZoom={false} touchZoom={false} whenCreated={map => { mapRef.current = map; setMapReady(true); if (bounds) map.fitBounds(bounds); }} attributionControl={false} zoomControl={false}>
            <TileLayer url={'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'} />
            <HeatLayer points={buildPoints()} />
          </MapContainer>
          {mode === 'rain' && <div className={styles.rainOverlay} aria-hidden />}
        </div>
      </div>
    </div>
  );
}
