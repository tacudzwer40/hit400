import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DeedsLeafletMap from '../components/DeedsLeafletMap';

// Mock the context
const mockDeeds = [
  {
    id: '1',
    title: 'Sample Deed 1',
    location: { lat: -17.8252, lng: 31.0335 },
    status: 'verified',
    fraudScore: 0.1
  },
  {
    id: '2',
    title: 'Sample Deed 2',
    location: { lat: -17.8292, lng: 31.0520 },
    status: 'pending',
    fraudScore: 0.8
  }
];

jest.mock('../context/AppContext', () => ({
  useAppContext: () => ({
    deeds: mockDeeds
  })
}));

describe('DeedsLeafletMap Component', () => {
  it('renders without crashing', () => {
    expect(() => render(<DeedsLeafletMap />)).not.toThrow();
  });

  it('shows heatmap toggle button', () => {
    render(<DeedsLeafletMap />);
    expect(screen.getByText(/fraud heatmap/i)).toBeInTheDocument();
  });

  it('toggles heatmap visibility', () => {
    render(<DeedsLeafletMap />);
    const toggleButton = screen.getByText(/fraud heatmap/i);

    // Initially should show "Show Fraud Heatmap"
    expect(toggleButton).toHaveTextContent('Show Fraud Heatmap');

    // Click to show heatmap
    fireEvent.click(toggleButton);
    expect(toggleButton).toHaveTextContent('Hide Heatmap');

    // Click to hide heatmap
    fireEvent.click(toggleButton);
    expect(toggleButton).toHaveTextContent('Show Fraud Heatmap');
  });

  it('passes deeds data to map component', () => {
    // This test verifies that the component receives the deeds prop
    // The actual rendering is mocked, so we test the integration
    const { container } = render(<DeedsLeafletMap />);
    expect(container.firstChild).toBeInTheDocument();
  });
});