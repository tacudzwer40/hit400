export default {
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(png|jpg|jpeg|gif|svg)$': '<rootDir>/src/__mocks__/fileMock.js',
    '^react-leaflet$': '<rootDir>/src/__mocks__/react-leaflet.js',
    '^leaflet$': '<rootDir>/src/__mocks__/leaflet.js',
    '^leaflet.heat$': '<rootDir>/src/__mocks__/leaflet-heat.js',
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.{js,jsx}', '!src/main.jsx', '!src/vite-env.d.ts'],
  coverageReporters: ['text', 'lcov']
};
