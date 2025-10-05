import React, { useRef, useEffect } from 'react';
import { MapContainer, TileLayer, FeatureGroup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-control-geocoder/dist/Control.Geocoder.css';
import styles from './MapPicker.module.css';

// Helper to fit map to given polygon
function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length) {
      map.fitBounds(bounds);
    }
  }, [bounds, map]);
  return null;
}

export default function MapPicker({ initialCenter = [20, 0], initialZoom = 2, onSave, onClose }) {
  const featureGroupRef = useRef(null);

  // create draw control after map initialized
  function DrawControl() {
    const map = useMap();
    useEffect(() => {
      if (!map) return;
      // Add a geocoder (search box) so users can quickly find/zoom to places
      // Keep a reference so we can remove it during cleanup and avoid duplicates
      let geocoderControl = null;
      (async () => {
        try {
          // Ensure the geocoder plugin registers its control on the global L
          await import('leaflet-control-geocoder');
          // Invalidate map size first so controls are placed correctly inside the modal
          setTimeout(() => { map.invalidateSize(); }, 120);

          // Avoid adding another geocoder if one already exists in this map container
          const container = map.getContainer && map.getContainer();
          if (container && container.querySelector && container.querySelector('.leaflet-control-geocoder')) {
            return;
          }

          // Add the geocoder control to the map on the top-left so it doesn't collide with draw controls
          geocoderControl = L.Control.geocoder({ position: 'topleft', defaultMarkGeocode: false }).addTo(map);
          geocoderControl.on('markgeocode', function(e) {
            const bbox = e.geocode.bbox; // may be a LatLngBounds
            if (bbox && bbox.getSouth && bbox.getWest) {
              map.fitBounds([[bbox.getSouth(), bbox.getWest()], [bbox.getNorth(), bbox.getEast()]]);
            } else if (e.geocode.center) {
              map.setView([e.geocode.center.lat, e.geocode.center.lng], 12);
            }
          });
        } catch {
          // silently continue if geocoder can't be loaded
        }
      })();
      const drawnItems = featureGroupRef.current;
      const options = {
        draw: {
          rectangle: true,
          polygon: true,
          circle: false,
          circlemarker: false,
          marker: false,
          polyline: false,
        },
        edit: {
          featureGroup: drawnItems,
        }
      };

      const drawControl = new L.Control.Draw(options);
      map.addControl(drawControl);

      map.on(L.Draw.Event.CREATED, function (e) {
        const layer = e.layer;
        drawnItems.clearLayers();
        drawnItems.addLayer(layer);
        const geojson = layer.toGeoJSON();
        if (onSave) onSave(geojson);
      });

      map.on(L.Draw.Event.EDITED, function (e) {
        e.layers.eachLayer((layer) => {
          const geojson = layer.toGeoJSON();
          if (onSave) onSave(geojson);
        });
      });

      map.on(L.Draw.Event.DELETED, function () {
        drawnItems.clearLayers();
        if (onSave) onSave(null);
      });

      return () => {
        try { map.removeControl(drawControl); } catch { /* ignore */ }
        try { if (geocoderControl) map.removeControl(geocoderControl); } catch { /* ignore */ }
      };
    }, [map]);

    return null;
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>Select an area</h3>
          <button onClick={onClose} className={styles.closeBtn}>Close</button>
        </div>
        <MapContainer center={initialCenter} zoom={initialZoom} className={styles.map}>
          <TileLayer
            attribution='Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
            url={'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'}
          />
          <FeatureGroup ref={featureGroupRef}>
            <DrawControl />
          </FeatureGroup>
        </MapContainer>
      </div>
    </div>
  );
}
