/**
 * Sanitizes and normalizes strings for consistent blockchain matching.
 * Removes whitespace, special characters, and converts to lowercase.
 */
export const normalizeStr = (str) => {
    return (str || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
};
