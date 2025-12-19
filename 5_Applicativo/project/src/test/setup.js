import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Ensure globals are available (happy-dom should provide these)
// This is a safety check in case happy-dom hasn't initialized yet
if (typeof globalThis.window === 'undefined' && typeof globalThis.document === 'undefined') {
  // If we're here, happy-dom hasn't initialized - this shouldn't happen
  // but we'll create minimal mocks as fallback
  console.warn('happy-dom environment not detected - tests may fail');
}

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  // Reset localStorage if it exists
  if (typeof localStorage !== 'undefined') {
    localStorage.clear();
  }
});

