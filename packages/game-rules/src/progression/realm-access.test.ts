import { describe, expect, it } from 'vitest';
import { hasReachedLateQiRefining } from './realm-access.js';

describe('hasReachedLateQiRefining', () => {
  it('炼气九层为门槛：八层及以下不可用，九层及以上可用', () => {
    expect(hasReachedLateQiRefining('炼气', '一层')).toBe(false);
    expect(hasReachedLateQiRefining('炼气', '八层')).toBe(false);
    expect(hasReachedLateQiRefining('炼气', '九层')).toBe(true);
    expect(hasReachedLateQiRefining('炼气', '十三层')).toBe(true);
    expect(hasReachedLateQiRefining('筑基', '初期')).toBe(true);
    expect(hasReachedLateQiRefining('化神', '圆满')).toBe(true);
  });
});
