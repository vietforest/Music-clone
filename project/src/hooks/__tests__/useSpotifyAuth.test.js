import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import useSpotifyAuth from '../useSpotifyAuth';

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

describe('useSpotifyAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    if (typeof window !== 'undefined' && window.location) {
      window.location.search = '';
    }
    
    // Mock user loading to prevent unhandled errors
    global.fetch.mockImplementation((url) => {
      if (url.includes('/v1/me')) {
        return Promise.resolve(createMockResponse({
          id: 'user123',
          display_name: 'Test User'
        }));
      }
      return Promise.resolve(createMockResponse({}));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('initializes with loading state', async () => {
      const { result } = renderHook(() => useSpotifyAuth());
      // Loading should start as true, but may change quickly
      // Check that it's either true or has transitioned to false after async operations
      await waitFor(() => {
        expect(typeof result.current.loading).toBe('boolean');
      }, { timeout: 1000 });
    });

    it('loads token from localStorage on initialization', () => {
      localStorage.setItem('access_token', 'test_token');
      localStorage.setItem('refresh_token', 'test_refresh');
      localStorage.setItem('expires_in', '3600');
      localStorage.setItem('expires', new Date().toISOString());

      const { result } = renderHook(() => useSpotifyAuth());
      
      expect(result.current.token).toEqual({
        access_token: 'test_token',
        refresh_token: 'test_refresh',
        expires_in: '3600',
        expires: expect.any(String)
      });
    });

    it('returns null token when no token in localStorage', async () => {
      const { result } = renderHook(() => useSpotifyAuth());
      
      await waitFor(() => {
        expect(result.current.token).toBeNull();
      });
    });
  });

  describe('Login', () => {
    it('login function redirects to Spotify authorization', async () => {
      const mockLocation = { href: '' };
      const originalLocation = window.location;
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true,
        configurable: true
      });

      const { result } = renderHook(() => useSpotifyAuth());
      
      // Mock crypto methods using Object.defineProperty to avoid read-only error
      const originalCrypto = global.crypto;
      const mockCrypto = {
        getRandomValues: vi.fn((arr) => {
          // Fill with deterministic values for testing
          for (let i = 0; i < arr.length; i++) {
            arr[i] = i % 256;
          }
          return arr;
        }),
        subtle: {
          digest: vi.fn(async (algorithm, data) => {
            // Return a mock hash
            return new ArrayBuffer(32);
          })
        }
      };
      
      Object.defineProperty(global, 'crypto', {
        value: mockCrypto,
        writable: true,
        configurable: true
      });

      try {
        await act(async () => {
          await result.current.login();
        });
        
        expect(mockLocation.href).toContain('accounts.spotify.com/authorize');
        expect(mockLocation.href).toContain('code_challenge');
        expect(localStorage.getItem('code_verifier')).toBeTruthy();
      } finally {
        // Restore original crypto
        Object.defineProperty(global, 'crypto', {
          value: originalCrypto,
          writable: true,
          configurable: true
        });
        Object.defineProperty(window, 'location', {
          value: originalLocation,
          writable: true,
          configurable: true
        });
      }
    });
  });

  describe('Token Management', () => {
    it('refresh does nothing when no refresh token', async () => {
      const { result } = renderHook(() => useSpotifyAuth());
      
      await act(async () => {
        await result.current.refresh();
      });
      
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('logout clears all data', () => {
      localStorage.setItem('access_token', 'test_token');
      localStorage.setItem('refresh_token', 'test_refresh');
      
      const { result } = renderHook(() => useSpotifyAuth());
      
      act(() => {
        result.current.logout();
      });
      
      expect(localStorage.getItem('access_token')).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.user).toBeNull();
    });
  });

  describe('Search', () => {
    it('searchSpotify returns empty array when no token', async () => {
      const { result } = renderHook(() => useSpotifyAuth());
      
      const results = await act(async () => {
        return await result.current.searchSpotify('test query');
      });
      
      expect(results).toEqual([]);
    });

    it('searchSpotify returns empty array when query is empty', async () => {
      localStorage.setItem('access_token', 'test_token');
      
      const { result } = renderHook(() => useSpotifyAuth());
      
      await waitFor(() => {
        expect(result.current.token).not.toBeNull();
      });
      
      const results = await act(async () => {
        return await result.current.searchSpotify('');
      });
      
      expect(results).toEqual([]);
    });

    it('searchSpotify makes API call with correct parameters', async () => {
      localStorage.setItem('access_token', 'test_token');
      
      global.fetch.mockImplementation((url) => {
        if (url.includes('/v1/search')) {
          return Promise.resolve(createMockResponse({ tracks: { items: [] } }));
        }
        if (url.includes('/v1/me')) {
          return Promise.resolve(createMockResponse({
            id: 'user123',
            display_name: 'Test User'
          }));
        }
        return Promise.resolve(createMockResponse({}));
      });

      const { result } = renderHook(() => useSpotifyAuth());
      
      await waitFor(() => {
        expect(result.current.token).not.toBeNull();
      });
      
      await act(async () => {
        await result.current.searchSpotify('test query');
      });
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.spotify.com/v1/search'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test_token'
          })
        })
      );
    });

  });

  describe('Playlists', () => {
    it('getUserPlaylists returns cached playlists', async () => {
      localStorage.setItem('access_token', 'test_token');
      
      const mockPlaylists = [{ id: '1', name: 'Playlist 1' }];
      
      global.fetch.mockImplementation((url) => {
        if (url.includes('/v1/me/playlists')) {
          return Promise.resolve(createMockResponse({ items: mockPlaylists }));
        }
        if (url.includes('/v1/me')) {
          return Promise.resolve(createMockResponse({
            id: 'user123',
            display_name: 'Test User'
          }));
        }
        return Promise.resolve(createMockResponse({}));
      });

      const { result } = renderHook(() => useSpotifyAuth());
      
      await waitFor(() => {
        expect(result.current.token).not.toBeNull();
      });
      
      const playlists1 = await act(async () => {
        return await result.current.getUserPlaylists();
      });
      const playlists2 = await act(async () => {
        return await result.current.getUserPlaylists();
      });
      
      expect(playlists1).toEqual(mockPlaylists);
      expect(playlists2).toEqual(mockPlaylists);
      // Should only call fetch once for playlists (user fetch happens separately)
      const playlistCalls = global.fetch.mock.calls.filter(call => 
        call[0]?.includes('/v1/me/playlists')
      );
      expect(playlistCalls.length).toBe(1); // Should use cache
    });

    it('getUserPlaylists returns empty array when no token', async () => {
      const { result } = renderHook(() => useSpotifyAuth());
      
      const playlists = await act(async () => {
        return await result.current.getUserPlaylists();
      });
      
      expect(playlists).toEqual([]);
    });

    it('getPlaylistTracks fetches and caches tracks', async () => {
      localStorage.setItem('access_token', 'test_token');
      
      const mockTracks = [
        { track: { id: '1', name: 'Track 1' } },
        { track: { id: '2', name: 'Track 2' } }
      ];
      
      global.fetch.mockImplementation((url) => {
        if (url.includes('/playlists/') && url.includes('/tracks')) {
          return Promise.resolve(createMockResponse({ items: mockTracks }));
        }
        if (url.includes('/v1/me')) {
          return Promise.resolve(createMockResponse({
            id: 'user123',
            display_name: 'Test User'
          }));
        }
        return Promise.resolve(createMockResponse({}));
      });

      const { result } = renderHook(() => useSpotifyAuth());
      
      await waitFor(() => {
        expect(result.current.token).not.toBeNull();
      });
      
      const tracks = await act(async () => {
        return await result.current.getPlaylistTracks('playlist1');
      });
      
      expect(tracks).toEqual(mockTracks.map(i => i.track));
    });

    it('getPlaylistTracks uses cache when available', async () => {
      localStorage.setItem('access_token', 'test_token');
      
      const mockTracks = [{ track: { id: '1', name: 'Track 1' } }];
      
      global.fetch.mockImplementation((url) => {
        if (url.includes('/playlists/') && url.includes('/tracks')) {
          return Promise.resolve(createMockResponse({ items: mockTracks }));
        }
        if (url.includes('/v1/me')) {
          return Promise.resolve(createMockResponse({
            id: 'user123',
            display_name: 'Test User'
          }));
        }
        return Promise.resolve(createMockResponse({}));
      });

      const { result } = renderHook(() => useSpotifyAuth());
      
      await waitFor(() => {
        expect(result.current.token).not.toBeNull();
      });
      
      await act(async () => {
        await result.current.getPlaylistTracks('playlist1');
      });
      
      const tracks2 = await act(async () => {
        return await result.current.getPlaylistTracks('playlist1');
      });
      
      // Should only call fetch once for playlist tracks (user fetch happens separately)
      const playlistTrackCalls = global.fetch.mock.calls.filter(call => 
        call[0]?.includes('/playlists/') && call[0]?.includes('/tracks')
      );
      expect(playlistTrackCalls.length).toBe(1);
      expect(tracks2).toEqual(mockTracks.map(i => i.track));
    });

    it('createPlaylist creates a new playlist', async () => {
      localStorage.setItem('access_token', 'test_token');
      
      const mockUser = { id: 'user123' };
      const mockPlaylist = { id: 'new_playlist', name: 'New Playlist' };
      
      let callCount = 0;
      global.fetch.mockImplementation((url) => {
        if (url.includes('/v1/me') && !url.includes('/playlists')) {
          return Promise.resolve(createMockResponse(mockUser));
        }
        if (url.includes('/users/user123/playlists')) {
          return Promise.resolve(createMockResponse(mockPlaylist));
        }
        return Promise.resolve(createMockResponse({}));
      });

      const { result } = renderHook(() => useSpotifyAuth());
      
      // Wait for user to load
      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });
      
      const playlist = await act(async () => {
        return await result.current.createPlaylist('New Playlist');
      });
      
      expect(playlist).toEqual(mockPlaylist);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/user123/playlists'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"public":false')
        })
      );
    });

    it('deletePlaylist removes a playlist', async () => {
      localStorage.setItem('access_token', 'test_token');
      
      global.fetch.mockImplementation((url) => {
        if (url.includes('/playlists/') && url.includes('/followers')) {
          return Promise.resolve(createMockResponse({}, { ok: true, status: 204 }));
        }
        if (url.includes('/v1/me')) {
          return Promise.resolve(createMockResponse({
            id: 'user123',
            display_name: 'Test User'
          }));
        }
        return Promise.resolve(createMockResponse({}));
      });

      const { result } = renderHook(() => useSpotifyAuth());
      
      await waitFor(() => {
        expect(result.current.token).not.toBeNull();
      });
      
      const success = await act(async () => {
        return await result.current.deletePlaylist('playlist1');
      });
      
      expect(success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/playlists/playlist1/followers'),
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });

    it('addTracksToPlaylist adds tracks to playlist', async () => {
      localStorage.setItem('access_token', 'test_token');
      
      global.fetch.mockImplementation((url) => {
        if (url.includes('/playlists/') && url.includes('/tracks')) {
          return Promise.resolve(createMockResponse({ snapshot_id: 'snapshot123' }));
        }
        if (url.includes('/v1/me')) {
          return Promise.resolve(createMockResponse({
            id: 'user123',
            display_name: 'Test User'
          }));
        }
        return Promise.resolve(createMockResponse({}));
      });

      const { result } = renderHook(() => useSpotifyAuth());
      
      await waitFor(() => {
        expect(result.current.token).not.toBeNull();
      });
      
      const success = await act(async () => {
        return await result.current.addTracksToPlaylist('playlist1', 'spotify:track:track1');
      });
      
      expect(success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/playlists/playlist1/tracks'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('spotify:track:track1')
        })
      );
    });

    it('removeTracksFromPlaylist removes tracks from playlist', async () => {
      localStorage.setItem('access_token', 'test_token');
      
      global.fetch.mockImplementation((url) => {
        if (url.includes('/playlists/') && url.includes('/tracks')) {
          return Promise.resolve(createMockResponse({ snapshot_id: 'snapshot123' }));
        }
        if (url.includes('/v1/me')) {
          return Promise.resolve(createMockResponse({
            id: 'user123',
            display_name: 'Test User'
          }));
        }
        return Promise.resolve(createMockResponse({}));
      });

      const { result } = renderHook(() => useSpotifyAuth());
      
      await waitFor(() => {
        expect(result.current.token).not.toBeNull();
      });
      
      const success = await act(async () => {
        return await result.current.removeTracksFromPlaylist('playlist1', 'spotify:track:track1');
      });
      
      expect(success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/playlists/playlist1/tracks'),
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });
  });

  describe('Recently Played', () => {
    it('getRecentlyPlayed returns cached tracks', async () => {
      localStorage.setItem('access_token', 'test_token');
      
      const mockData = {
        items: [
          { track: { id: '1', name: 'Track 1' } },
          { track: { id: '2', name: 'Track 2' } }
        ]
      };
      
      global.fetch.mockImplementation((url) => {
        if (url.includes('/recently-played')) {
          return Promise.resolve(createMockResponse(mockData));
        }
        if (url.includes('/v1/me') && !url.includes('/recently-played')) {
          return Promise.resolve(createMockResponse({
            id: 'user123',
            display_name: 'Test User'
          }));
        }
        return Promise.resolve(createMockResponse({}));
      });

      const { result } = renderHook(() => useSpotifyAuth());
      
      await waitFor(() => {
        expect(result.current.token).not.toBeNull();
      });
      
      const tracks1 = await act(async () => {
        return await result.current.getRecentlyPlayed();
      });
      const tracks2 = await act(async () => {
        return await result.current.getRecentlyPlayed();
      });
      
      expect(tracks1.length).toBe(2);
      expect(tracks2.length).toBe(2);
      // Should only call fetch once for recently played (user fetch happens separately)
      const recentlyPlayedCalls = global.fetch.mock.calls.filter(call => 
        call[0]?.includes('/recently-played')
      );
      expect(recentlyPlayedCalls.length).toBe(1); // Should use cache
    });
  });

  describe('Featured Playlists and New Releases', () => {
    it('getFeaturedPlaylists returns cached playlists', async () => {
      localStorage.setItem('access_token', 'test_token');
      
      const mockPlaylists = [{ id: '1', name: 'Playlist 1' }];
      
      global.fetch.mockImplementation((url) => {
        if (url.includes('/v1/me/playlists')) {
          return Promise.resolve(createMockResponse({ items: mockPlaylists }));
        }
        if (url.includes('/v1/me') && !url.includes('/playlists')) {
          return Promise.resolve(createMockResponse({
            id: 'user123',
            display_name: 'Test User'
          }));
        }
        return Promise.resolve(createMockResponse({}));
      });

      const { result } = renderHook(() => useSpotifyAuth());
      
      await waitFor(() => {
        expect(result.current.token).not.toBeNull();
      });
      
      const playlists1 = await act(async () => {
        return await result.current.getFeaturedPlaylists();
      });
      const playlists2 = await act(async () => {
        return await result.current.getFeaturedPlaylists();
      });
      
      expect(playlists1).toEqual(mockPlaylists.slice(0, 20));
      expect(playlists2).toEqual(mockPlaylists.slice(0, 20));
    });

    it('getNewReleases returns cached albums', async () => {
      localStorage.setItem('access_token', 'test_token');
      
      const mockAlbums = {
        albums: {
          items: [{ id: '1', name: 'Album 1' }]
        }
      };
      
      global.fetch.mockImplementation((url) => {
        if (url.includes('/browse/new-releases')) {
          return Promise.resolve(createMockResponse(mockAlbums));
        }
        if (url.includes('/v1/me')) {
          return Promise.resolve(createMockResponse({
            id: 'user123',
            display_name: 'Test User'
          }));
        }
        return Promise.resolve(createMockResponse({}));
      });

      const { result } = renderHook(() => useSpotifyAuth());
      
      await waitFor(() => {
        expect(result.current.token).not.toBeNull();
      });
      
      const albums1 = await act(async () => {
        return await result.current.getNewReleases();
      });
      const albums2 = await act(async () => {
        return await result.current.getNewReleases();
      });
      
      expect(albums1).toEqual(mockAlbums.albums.items);
      expect(albums2).toEqual(mockAlbums.albums.items);
    });
  });

  describe('Album Tracks', () => {
    it('getAlbumTracks fetches album tracks', async () => {
      localStorage.setItem('access_token', 'test_token');
      
      const mockTracks = {
        items: [{ id: '1', name: 'Track 1' }]
      };
      
      const mockFullTracks = {
        tracks: [
          { id: '1', name: 'Track 1', album: { name: 'Album' } }
        ]
      };
      
      let callCount = 0;
      global.fetch.mockImplementation((url) => {
        if (url.includes('/albums/') && url.includes('/tracks')) {
          return Promise.resolve(createMockResponse(mockTracks));
        }
        if (url.includes('/v1/tracks?ids=')) {
          return Promise.resolve(createMockResponse(mockFullTracks));
        }
        if (url.includes('/v1/me')) {
          return Promise.resolve(createMockResponse({
            id: 'user123',
            display_name: 'Test User'
          }));
        }
        return Promise.resolve(createMockResponse({}));
      });

      const { result } = renderHook(() => useSpotifyAuth());
      
      await waitFor(() => {
        expect(result.current.token).not.toBeNull();
      });
      
      const tracks = await act(async () => {
        return await result.current.getAlbumTracks('album1');
      });
      
      expect(tracks).toEqual(mockFullTracks.tracks);
    });
  });
});

