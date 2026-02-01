import { describe, it, expect } from 'vitest';
import { uid, isoNow } from './ids';

describe('ids', () => {
    it('uid should generate a 7-character string', () => {
        const id = uid();
        expect(id).toBeTypeOf('string');
        expect(id.length).toBeGreaterThan(0);
        // Usually 7-11 chars depending on browser logic for toString(36), 
        // but slice(2, 9) ensures max 7 chars.
        expect(id.length).toBeLessThanOrEqual(7);
    });

    it('uid should be unique enough for repeated calls', () => {
        const ids = new Set();
        for (let i = 0; i < 100; i++) {
            ids.add(uid());
        }
        expect(ids.size).toBe(100);
    });

    it('isoNow should return a valid ISO date string', () => {
        const now = isoNow();
        expect(new Date(now).toISOString()).toBe(now);
    });
});
