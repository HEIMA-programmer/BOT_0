import { describe, it, expect } from 'vitest';

describe('Basic test', () => {
  it('should pass a simple test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle string operations', () => {
    const str = 'Academic English';
    expect(str).toContain('English');
  });
});
