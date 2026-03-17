import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('App', () => {
  it('renders the login page by default', () => {
    render(<App />);
    expect(screen.getByText(/DeedGuard/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in securely/i })).toBeInTheDocument();
  });
});
