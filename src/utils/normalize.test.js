import { normalizeStr } from './normalize';

describe('String Normalization Unit Tests', () => {
    test('Valid input (standard name)', () => {
        const input = "TONDERAI MUSHORIWA";
        const expected = "tonderaimushoriwa";
        expect(normalizeStr(input)).toBe(expected);
    });

    test('Valid input (standard deed number)', () => {
        const input = "14/89/2021";
        const expected = "14892021";
        expect(normalizeStr(input)).toBe(expected);
    });

    test('Invalid character input (punctuation included)', () => {
        const input = "Stand 123, Harare!";
        const expected = "stand123harare";
        expect(normalizeStr(input)).toBe(expected);
    });

    test('Missing data input (null or undefined)', () => {
        expect(normalizeStr(null)).toBe("");
        expect(normalizeStr(undefined)).toBe("");
    });
});
