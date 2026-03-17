import React from 'react';
import { render, act, fireEvent } from '@testing-library/react';
import { AppProvider, useAppContext } from '../context/AppContext';

// Mock Firebase
jest.mock('../firebase', () => ({
  db: {}
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  onSnapshot: jest.fn((query, options, callback) => {
    // Mock callback with empty data
    callback({
      docs: []
    });
    return jest.fn(); // unsubscribe function
  }),
  query: jest.fn(),
  orderBy: jest.fn(),
  setDoc: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(() => Promise.resolve({ docs: [] })),
  writeBatch: jest.fn(() => ({
    set: jest.fn(),
    delete: jest.fn(),
    commit: jest.fn()
  }))
}));

// Mock AI verification
jest.mock('../utils/aiVerification', () => ({
  trainFraudModel: jest.fn(),
  scoreFraudRisk: jest.fn()
}));

// Mock privacy utils
jest.mock('../utils/privacy', () => ({
  clearPersonalStorage: jest.fn()
}));

describe('AppContext', () => {
  const TestComponent = () => {
    const { user, login, logout, deeds } = useAppContext();
    return (
      <div>
        <div data-testid="user">{user ? user.username : 'no-user'}</div>
        <div data-testid="deeds-count">{deeds.length}</div>
        <button onClick={() => login('user', 'testuser')}>Login</button>
        <button onClick={logout}>Logout</button>
      </div>
    );
  };

  it('provides initial context values', () => {
    let contextValue;
    const TestConsumer = () => {
      contextValue = useAppContext();
      return null;
    };

    render(
      <AppProvider>
        <TestConsumer />
      </AppProvider>
    );

    expect(contextValue.user).toBeNull();
    expect(contextValue.deeds).toEqual([]);
    expect(contextValue.isOffline).toBe(!navigator.onLine);
    expect(typeof contextValue.login).toBe('function');
    expect(typeof contextValue.logout).toBe('function');
  });

  it('handles user login and logout', () => {
    const { getByText, getByTestId } = render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    // Initially no user
    expect(getByTestId('user')).toHaveTextContent('no-user');

    // Login
    act(() => {
      fireEvent.click(getByText('Login'));
    });

    expect(getByTestId('user')).toHaveTextContent('testuser');

    // Logout
    act(() => {
      fireEvent.click(getByText('Logout'));
    });

    expect(getByTestId('user')).toHaveTextContent('no-user');
  });

  it('loads user from localStorage on mount', () => {
    const mockUser = { username: 'storeduser', role: 'user' };
    Storage.prototype.getItem = jest.fn(() => JSON.stringify(mockUser));

    const { getByTestId } = render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    expect(getByTestId('user')).toHaveTextContent('storeduser');
  });

  it('handles deeds data from Firestore', () => {
    const mockDeeds = [
      { id: '1', title: 'Deed 1', synced: true },
      { id: '2', title: 'Deed 2', synced: false }
    ];

    // Mock Firestore to return deeds
    require('firebase/firestore').onSnapshot.mockImplementation((query, options, callback) => {
      callback({
        docs: mockDeeds.map(deed => ({
          id: deed.id,
          data: () => deed,
          metadata: { hasPendingWrites: !deed.synced }
        }))
      });
      return jest.fn();
    });

    const { getByTestId } = render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    expect(getByTestId('deeds-count')).toHaveTextContent('2');
  });
});