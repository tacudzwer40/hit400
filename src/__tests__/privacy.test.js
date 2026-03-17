import { hashPersonalData, clearPersonalStorage } from '../utils/privacy';

// Mock crypto for consistent testing
Object.defineProperty(window, 'crypto', {
  value: {
    subtle: {
      digest: jest.fn(() =>
        Promise.resolve(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]))
      )
    }
  }
});

describe('Privacy Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('hashPersonalData', () => {
    it('generates consistent hash for same input', async () => {
      const input = 'test data';
      const hash1 = await hashPersonalData(input);
      const hash2 = await hashPersonalData(input);

      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('string');
      expect(hash1.length).toBeGreaterThan(0);
    });

    it('generates different hashes for different inputs', async () => {
      const hash1 = await hashPersonalData('data1');
      const hash2 = await hashPersonalData('data2');

      expect(hash1).not.toBe(hash2);
    });

    it('handles empty input', async () => {
      const hash = await hashPersonalData('');
      expect(typeof hash).toBe('string');
    });

    it('handles special characters', async () => {
      const input = 'special@chars#123!@#';
      const hash = await hashPersonalData(input);
      expect(typeof hash).toBe('string');
    });
  });

  describe('clearPersonalStorage', () => {
    it('clears user-related localStorage items', () => {
      // Set up some data
      localStorage.setItem('dg_user', 'user data');
      localStorage.setItem('other_data', 'should remain');
      localStorage.setItem('dg_session', 'session data');

      clearPersonalStorage();

      expect(localStorage.getItem('dg_user')).toBeNull();
      expect(localStorage.getItem('dg_session')).toBeNull();
      expect(localStorage.getItem('other_data')).toBe('should remain');
    });

    it('handles empty localStorage', () => {
      expect(() => clearPersonalStorage()).not.toThrow();
    });
  });
});