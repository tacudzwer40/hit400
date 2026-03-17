const L = require('leaflet');

L.heatLayer = jest.fn(() => ({
  addTo: jest.fn(),
  remove: jest.fn(),
  setLatLngs: jest.fn(),
  setOptions: jest.fn()
}));

module.exports = L.heatLayer;