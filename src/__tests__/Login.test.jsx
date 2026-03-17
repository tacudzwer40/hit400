import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../pages/Login';

// Mock the context
const mockLogin = jest.fn();
const mockNavigate = jest.fn();

jest.mock('../context/AppContext', () => ({
  useAppContext: () => ({
    login: mockLogin
  })
}));

jest.mock('../firebase', () => ({
  requestNotificationPermission: jest.fn()
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

const renderLogin = () => {
  return render(
    <BrowserRouter>
      <Login />
    </BrowserRouter>
  );
};

describe('Login Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login form with DeedGuard branding', () => {
    renderLogin();
    expect(screen.getByText('DeedGuard')).toBeInTheDocument();
    expect(screen.getByText('Zimbabwe Land Authentication')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in securely/i })).toBeInTheDocument();
  });

  it('shows user role by default', () => {
    renderLogin();
    expect(screen.getByText('Citizen')).toBeInTheDocument();
    expect(screen.getByText('Registrar')).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/national id/i)).toBeInTheDocument();
  });

  it('switches to admin role when registrar button is clicked', () => {
    renderLogin();
    const registrarButton = screen.getByText('Registrar');
    fireEvent.click(registrarButton);

    expect(screen.getByLabelText(/registrar id/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/email address/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/national id/i)).not.toBeInTheDocument();
  });

  it('validates user login form submission', async () => {
    renderLogin();

    // Fill out the form
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText(/national id/i), { target: { value: '63-1234567-A-89' } });
    fireEvent.change(screen.getByLabelText(/pin \/ password/i), { target: { value: 'password123' } });

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /sign in securely/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('user', 'John Doe', {
        email: 'john@example.com',
        nationalId: '63-1234567-A-89'
      });
      expect(mockNavigate).toHaveBeenCalledWith('/user');
    });
  });

  it('validates admin login form submission', async () => {
    renderLogin();

    // Switch to admin role
    fireEvent.click(screen.getByText('Registrar'));

    // Fill out admin form
    fireEvent.change(screen.getByLabelText(/registrar id/i), { target: { value: 'REG001' } });
    fireEvent.change(screen.getByLabelText(/pin \/ password/i), { target: { value: 'admin123' } });

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /sign in securely/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin', 'REG001');
      expect(mockNavigate).toHaveBeenCalledWith('/admin');
    });
  });

  it('requires all user fields for submission', () => {
    renderLogin();

    // Try to submit without filling fields
    fireEvent.click(screen.getByRole('button', { name: /sign in securely/i }));

    // Form should not submit due to required fields
    expect(mockLogin).not.toHaveBeenCalled();
  });
});