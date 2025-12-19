import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import useSpotifyPlayer from '../useSpotifyPlayer';

// Mock fetch globally
global.fetch = vi.fn();

// Helper to create a mock Response
function createMockResponse(data, options = {}) {
  return {
    ok: options.ok !== false,
    status: options.status || 200,
    headers: {
      get: vi.fn((name) => options.headers?.[name] || null)
    },
    json: vi.fn(async () => data),
    ...options
  };
}

describe('useSpotifyPlayer', () => {
  let mockPlayer;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Store listeners for later invocation
    const listeners = new Map();
    
    // Mock Spotify Player
    mockPlayer = {
      connect: vi.fn(() => Promise.resolve(true)),
      disconnect: vi.fn(),
      togglePlay: vi.fn(() => Promise.resolve()),
      nextTrack: vi.fn(() => Promise.resolve()),
      previousTrack: vi.fn(() => Promise.resolve()),
      setVolume: vi.fn(() => Promise.resolve()),
      seek: vi.fn(() => Promise.resolve()),
      addListener: vi.fn((event, callback) => {
        listeners.set(event, callback);
        return mockPlayer;
      }),
      getCurrentState: vi.fn(() => Promise.resolve(null)),
      // Helper to get listeners
      _getListener: (event) => listeners.get(event)
    };

    if (typeof window !== 'undefined') {
      // Create a proper constructor function that returns the mock player
      function MockPlayerConstructor() {
        // Return the mock player instance directly
        return mockPlayer;
      }
      
      // Make it work with 'new' keyword
      MockPlayerConstructor.prototype = {};
      
      window.Spotify = {
        Player: MockPlayerConstructor
      };

      window.onSpotifyWebPlaybackSDKReady = null;

      // Mock document.createElement for script
      const originalCreateElement = document.createElement.bind(document);
      document.createElement = vi.fn((tagName) => {
        if (tagName === 'script') {
          const script = originalCreateElement('script');
          script.appendChild = vi.fn();
          return script;
        }
        return originalCreateElement(tagName);
      });
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Initialization', () => {
    it('initializes with not ready state', () => {
      const { result } = renderHook(() => useSpotifyPlayer('test_token'));
      
      expect(result.current.isReady).toBe(false);
      expect(result.current.track).toBeNull();
      expect(result.current.paused).toBe(true);
      expect(result.current.volume).toBe(50);
    });

  });

});

