import CryptoJS from 'crypto-js';

/**
 * Create a deterministic hash for privacy-preserving matching.
 * This allows you to compare values without storing or sharing the raw data.
 */
export const hashPersonalData = (value, salt = 'deedguard') => {
  if (!value) return '';
  const normalized = value.toString().trim().toLowerCase();
  const salted = `${salt}:${normalized}`;
  return CryptoJS.SHA256(salted).toString();
};

/**
 * Right-to-be-forgotten helper: remove local storage and (optionally) any related backend records.
 * This should be called after the user explicitly requests data removal.
 */
export const clearPersonalStorage = () => {
  localStorage.removeItem('dg_user');
  localStorage.removeItem('dg_session');
  localStorage.removeItem('gemini_api_key');
};

/**
 * Reduce deed data to the minimum fields needed for verification (privacy first).
 */
export const minimalDeedPayload = (deed) => {
  if (!deed) return null;
  return {
    deedNumber: deed.deedNumber,
    hash: deed.hash,
    timestamp: deed.timestamp
  };
};
