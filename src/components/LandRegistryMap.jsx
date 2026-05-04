import React, { useState, useEffect } from 'react';
import { ArrowLeft, LocateFixed, Focus, RefreshCw } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leafet icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const MapController = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 15);
  }, [center, map]);
  return null;
};

const LandRegistryMap = ({ latitude = -17.8248, longitude = 31.0530, address = "Target Property", onBack }) => {
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  
  // Hardcoded for demo
  const targetLocation = [-17.9045, 31.0763];
  const formattedAddress = "Stand 89 OLD ARLINGTON ESTATE, AIRPORT AVENUE";

  const handleCenter = () => {
    // In a real app, this would get the user's current GPS location
    alert("Centering on current location...");
  };

  const handleRefresh = () => {
    alert("Refreshing map data...");
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', backgroundColor: '#f8fafc', position: 'relative' }}>
      {/* Top App Bar */}
      <div style={{ 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
        padding: '16px', backgroundColor: '#ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', zIndex: 1000,
        position: 'relative'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={onBack} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
            <ArrowLeft size={24} color="#0f172a" />
          </button>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
            Land Registry Map
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => setIsLocationEnabled(!isLocationEnabled)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px' }}>
            <LocateFixed size={24} color={isLocationEnabled ? '#10b981' : '#64748b'} />
          </button>
          <button onClick={handleCenter} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px' }}>
            <Focus size={24} color="#0f172a" />
          </button>
          <button onClick={handleRefresh} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px' }}>
            <RefreshCw size={24} color="#0f172a" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <MapContainer center={targetLocation} zoom={15} style={{ height: '100%', width: '100%', zIndex: 10 }}>
            <TileLayer
              attribution='&copy; Google Maps'
              url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
              subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
            />
            <Marker position={targetLocation}>
              <Popup>
                <b>{formattedAddress}</b><br/>
                Coordinates: {targetLocation[0].toFixed(5)}, {targetLocation[1].toFixed(5)}
              </Popup>
            </Marker>
            <MapController center={targetLocation} />
          </MapContainer>
        </div>

        {/* Location Details Card */}
        <div style={{ padding: '16px', backgroundColor: '#f8fafc', zIndex: 20 }}>
          <div style={{ 
            backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px', 
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            width: '100%'
          }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', margin: '0 0 8px 0', color: '#0f172a' }}>
              Location Details
            </h2>
            <p style={{ margin: '0 0 4px 0', color: '#334155', fontSize: '0.95rem' }}>Location: {formattedAddress}</p>
            <p style={{ margin: '0 0 4px 0', color: '#334155', fontSize: '0.95rem' }}>Lat: {targetLocation[0]}</p>
            <p style={{ margin: 0, color: '#334155', fontSize: '0.95rem' }}>Lng: {targetLocation[1]}</p>
            <p style={{ margin: '8px 0 0 0', color: '#10b981', fontSize: '0.8rem', fontWeight: 'bold' }}>✓ Demo Location Override</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandRegistryMap;
