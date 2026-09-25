import { jest } from '@jest/globals';

// Bridge allowing Vitest-authored test suites to execute natively under Jest ESM
export const vi = {
  fn: (...args: any[]) => (jest.fn as any)(...args),
  spyOn: (...args: any[]) => (jest.spyOn as any)(...args),
  mock: (...args: any[]) => (jest.mock as any)(...args),
  restoreAllMocks: () => jest.restoreAllMocks(),
  clearAllMocks: () => jest.clearAllMocks(),
  resetAllMocks: () => jest.resetAllMocks(),
};

export const describe = (globalThis as any).describe;
export const it = (globalThis as any).it;
export const test = (globalThis as any).test;
export const expect = (globalThis as any).expect;
export const beforeEach = (globalThis as any).beforeEach;
export const afterEach = (globalThis as any).afterEach;
export const beforeAll = (globalThis as any).beforeAll;
export const afterAll = (globalThis as any).afterAll;
