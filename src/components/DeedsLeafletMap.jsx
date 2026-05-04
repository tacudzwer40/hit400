import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';

// Geocoding helper for Zimbabwean locations
const geocodeZimbabweLocation = (locationString) => {
  const location = locationString?.toLowerCase() || '';

  // Major cities and towns in Zimbabwe with coordinates
  const locationMap = {
    'harare': [-17.8252, 31.0335],
    'bulawayo': [-20.1325, 28.6265],
    'gweru': [-19.4500, 29.8167],
    'mutare': [-18.9667, 32.6667],
    'kwekwe': [-18.9167, 29.8167],
    'kadoma': [-18.3333, 29.9167],
    'masvingo': [-20.0667, 30.8333],
    'chitungwiza': [-18.0127, 31.0756],
    'epworth': [-17.8833, 31.1333],
    'ruwa': [-17.8833, 31.2500],
    ' Norton': [-17.8833, 30.7000],
    'chegutu': [-18.1333, 30.1500],
    'bindura': [-17.3000, 31.3333],
    'marondera': [-18.1833, 31.5500],
    'hwange': [-18.3667, 26.4833],
    'victoria falls': [-17.9333, 25.8333],
    'kariba': [-16.5167, 28.8000]
  };

  // Check for city names in the location string
  for (const [city, coords] of Object.entries(locationMap)) {
    if (location.includes(city)) {
      // Add some random variation to avoid all markers being exactly at the city center
      const variation = 0.01; // ~1km variation
      return [
        coords[0] + (Math.random() - 0.5) * variation,
        coords[1] + (Math.random() - 0.5) * variation
      ];
    }
  }

  // Default to Harare if no match found
  return [-17.8252 + (Math.random() - 0.5) * 0.1, 31.0335 + (Math.random() - 0.5) * 0.1];
};

// Custom icons
const verifiedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const disputeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const HeatmapLayer = ({ data, visible, dateRange }) => {
  const map = useMap();

  useEffect(() => {
    if (!visible || !data.length) return;

    let filteredData = data;
    if (dateRange) {
      filteredData = data.filter(deed => {
        const deedDate = new Date(deed.date || deed.timestamp);
        return deedDate >= dateRange.start && deedDate <= dateRange.end;
      });
    }

    const heatData = filteredData.map(deed => {
      const [lat, lng] = geocodeZimbabweLocation(deed.location);
      return [
        lat,
        lng,
        deed.riskScore || deed.fraudRisk || 0.5 // Use risk score for intensity
      ];
    });

    const heatLayer = L.heatLayer(heatData, {
      radius: 25,
      blur: 15,
      maxZoom: 10,
      max: 1.0
    });

    heatLayer.addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, data, visible, dateRange]);

  return null;
};

const MarkerClusterLayer = ({ deeds, showClusters, dateRange }) => {
  const map = useMap();

  useEffect(() => {
    if (!showClusters || !deeds.length) return;

    // Configure marker cluster group for large datasets
    const markers = L.markerClusterGroup({
      chunkedLoading: true,
      chunkSize: 100, // Process markers in chunks for better performance
      maxClusterRadius: 50, // Maximum radius of a cluster in pixels
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      removeOutsideVisibleBounds: true, // Remove markers outside viewport for performance
      animate: true
    });

    let filteredDeeds = deeds;
    if (dateRange) {
      filteredDeeds = deeds.filter(deed => {
        const deedDate = new Date(deed.date || deed.timestamp);
        return deedDate >= dateRange.start && deedDate <= dateRange.end;
      });
    }

    filteredDeeds.forEach(deed => {
      const [lat, lng] = geocodeZimbabweLocation(deed.location);
      const icon = deed.status === 'disputed' || deed.fraudRisk > 0.7 ? disputeIcon : verifiedIcon;
      const marker = L.marker([lat, lng], { icon });

      marker.bindPopup(`
        <b>${deed.title || deed.deedNumber || 'Deed'}</b><br>
        Status: ${deed.status || 'Verified'}<br>
        Risk Score: ${deed.riskScore || deed.fraudRisk ? (deed.riskScore || deed.fraudRisk).toFixed(2) : 'N/A'}<br>
        Date: ${deed.date || deed.timestamp || 'N/A'}
      `);

      markers.addLayer(marker);
    });

    map.addLayer(markers);

    return () => {
      map.removeLayer(markers);
    };
  }, [map, deeds, showClusters, dateRange]);

  return null;
};

const DeedsLeafletMap = ({ deeds = [], history = [], hideControls = false, defaultHeatmap = false }) => {
  const [showHeatmap, setShowHeatmap] = useState(defaultHeatmap);
  const [showClusters, setShowClusters] = useState(true);
  const [dateRange, setDateRange] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleDateFilter = () => {
    if (startDate && endDate) {
      setDateRange({ start: new Date(startDate), end: new Date(endDate) });
    } else {
      setDateRange(null);
    }
  };

  // Update date range when inputs change
  useEffect(() => {
    handleDateFilter();
  }, [startDate, endDate]);

  // Use deeds if provided, otherwise fall back to history for backward compatibility
  const dataToShow = deeds.length > 0 ? deeds : history;

  return (
    <div style={{ height: '500px', position: 'relative' }}>
      {!hideControls && (
        <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button
          onClick={() => setShowHeatmap(!showHeatmap)}
          className={`btn ${showHeatmap ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.8rem', padding: '0.5rem' }}
        >
          {showHeatmap ? 'Hide Heatmap' : 'Show Fraud Heatmap'}
        </button>
        <button
          onClick={() => setShowClusters(!showClusters)}
          className={`btn ${showClusters ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.8rem', padding: '0.5rem' }}
        >
          {showClusters ? 'Hide Clusters' : 'Show Clusters'}
        </button>
        <div style={{ background: 'white', padding: '0.5rem', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Temporal Filter:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="Start date"
            style={{ fontSize: '0.7rem', marginBottom: '0.25rem', width: '100%', padding: '0.25rem' }}
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            placeholder="End date"
            style={{ fontSize: '0.7rem', marginBottom: '0.25rem', width: '100%', padding: '0.25rem' }}
          />
          <button
            onClick={() => { setStartDate(''); setEndDate(''); }}
            className="btn btn-secondary"
            style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', width: '100%' }}
          >
            Clear Filter
          </button>
          {dateRange && (
            <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.25rem' }}>
              Showing {dataToShow.filter(deed => {
                const deedDate = new Date(deed.date || deed.timestamp);
                return deedDate >= dateRange.start && deedDate <= dateRange.end;
              }).length} of {dataToShow.length} deeds
            </div>
          )}
        </div>
      </div>
      )}
      <MapContainer center={[-17.8252, 31.0335]} zoom={6} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
          subdomains={['mt0','mt1','mt2','mt3']}
          attribution="&copy; Google Maps"
        />
        <HeatmapLayer data={dataToShow} visible={showHeatmap} dateRange={dateRange} />
        <MarkerClusterLayer deeds={dataToShow} showClusters={showClusters} dateRange={dateRange} />
      </MapContainer>
      <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'white', padding: '0.75rem', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: '0.85rem', maxWidth: '200px' }}>
        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: 'bold', color: '#333' }}>Legend</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png" alt="Verified" style={{ width: '18px', height: '29px' }} />
          <span>Verified Deed</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png" alt="Disputed" style={{ width: '18px', height: '29px' }} />
          <span>Disputed/Fraud Risk</span>
        </div>
        <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #eee', fontSize: '0.8rem', color: '#666' }}>
          <div>Heatmap: Fraud Risk Intensity</div>
          <div>Clusters: Group nearby markers</div>
        </div>
      </div>
    </div>
  );
};

export default DeedsLeafletMap;
