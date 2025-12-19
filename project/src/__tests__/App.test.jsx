import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';
import useSpotifyAuth from '../hooks/useSpotifyAuth';
import useSpotifyPlayer from '../hooks/useSpotifyPlayer';

// Mock Bootstrap to prevent document access errors
vi.mock('bootstrap/dist/js/bootstrap.js', () => ({}));

// Mock the hooks
vi.mock('../hooks/useSpotifyAuth', () => ({
  default: vi.fn()
}));

vi.mock('../hooks/useSpotifyPlayer', () => ({
  default: vi.fn()
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window methods
    window.confirm = vi.fn(() => true);
    window.prompt = vi.fn(() => 'Test Playlist');
    window.alert = vi.fn();
  });

  it('renders loading message when loading', () => {
    vi.mocked(useSpotifyAuth).mockReturnValue({
      loading: true,
      token: null,
      user: null,
      login: vi.fn(),
      refresh: vi.fn(),
      logout: vi.fn(),
      searchSpotify: vi.fn(),
      getUserPlaylists: vi.fn(),
      getPlaylistTracks: vi.fn(),
      getRecentlyPlayed: vi.fn()
    });

    vi.mocked(useSpotifyPlayer).mockReturnValue({
      track: null,
      paused: true,
      isReady: false,
      play: vi.fn(),
      togglePlay: vi.fn(),
      nextTrack: vi.fn(),
      previousTrack: vi.fn(),
      changeVolume: vi.fn(),
      volume: 50,
      position: 0,
      duration: 0,
      seek: vi.fn()
    });

    render(<App />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('renders Login component when no token', () => {
    vi.mocked(useSpotifyAuth).mockReturnValue({
      loading: false,
      token: null,
      user: null,
      login: vi.fn(),
      refresh: vi.fn(),
      logout: vi.fn(),
      searchSpotify: vi.fn(),
      getUserPlaylists: vi.fn(),
      getPlaylistTracks: vi.fn(),
      getRecentlyPlayed: vi.fn()
    });

    vi.mocked(useSpotifyPlayer).mockReturnValue({
      track: null,
      paused: true,
      isReady: false,
      play: vi.fn(),
      togglePlay: vi.fn(),
      nextTrack: vi.fn(),
      previousTrack: vi.fn(),
      changeVolume: vi.fn(),
      volume: 50,
      position: 0,
      duration: 0,
      seek: vi.fn()
    });

    render(<App />);
    expect(screen.getByText('Welcome to the OAuth2 PKCE Example')).toBeInTheDocument();
  });

  it('renders main app when token exists', async () => {
    vi.mocked(useSpotifyAuth).mockReturnValue({
      loading: false,
      token: { access_token: 'test_token' },
      user: { id: 'user123', display_name: 'Test User' },
      login: vi.fn(),
      refresh: vi.fn(),
      logout: vi.fn(),
      searchSpotify: vi.fn(() => Promise.resolve({ tracks: { items: [] } })),
      getUserPlaylists: vi.fn(() => Promise.resolve([])),
      getPlaylistTracks: vi.fn(() => Promise.resolve([])),
      getRecentlyPlayed: vi.fn(() => Promise.resolve([]))
    });

    vi.mocked(useSpotifyPlayer).mockReturnValue({
      track: null,
      paused: true,
      isReady: true,
      play: vi.fn(),
      togglePlay: vi.fn(),
      nextTrack: vi.fn(),
      previousTrack: vi.fn(),
      changeVolume: vi.fn(),
      volume: 50,
      position: 0,
      duration: 0,
      seek: vi.fn()
    });

    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('renders search input and button', async () => {
    vi.mocked(useSpotifyAuth).mockReturnValue({
      loading: false,
      token: { access_token: 'test_token' },
      user: { id: 'user123', display_name: 'Test User' },
      login: vi.fn(),
      refresh: vi.fn(),
      logout: vi.fn(),
      searchSpotify: vi.fn(() => Promise.resolve({ tracks: { items: [] } })),
      getUserPlaylists: vi.fn(() => Promise.resolve([])),
      getPlaylistTracks: vi.fn(() => Promise.resolve([])),
      getRecentlyPlayed: vi.fn(() => Promise.resolve([]))
    });

    vi.mocked(useSpotifyPlayer).mockReturnValue({
      track: null,
      paused: true,
      isReady: true,
      play: vi.fn(),
      togglePlay: vi.fn(),
      nextTrack: vi.fn(),
      previousTrack: vi.fn(),
      changeVolume: vi.fn(),
      volume: 50,
      position: 0,
      duration: 0,
      seek: vi.fn()
    });

    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  it('renders player when ready', async () => {
    vi.mocked(useSpotifyAuth).mockReturnValue({
      loading: false,
      token: { access_token: 'test_token' },
      user: { id: 'user123', display_name: 'Test User' },
      login: vi.fn(),
      refresh: vi.fn(),
      logout: vi.fn(),
      searchSpotify: vi.fn(() => Promise.resolve({ tracks: { items: [] } })),
      getUserPlaylists: vi.fn(() => Promise.resolve([])),
      getPlaylistTracks: vi.fn(() => Promise.resolve([])),
      getRecentlyPlayed: vi.fn(() => Promise.resolve([]))
    });

    vi.mocked(useSpotifyPlayer).mockReturnValue({
      track: {
        id: '1',
        name: 'Test Track',
        artists: [{ name: 'Artist' }],
        album: { images: [{ url: 'test.jpg' }] }
      },
      paused: true,
      isReady: true,
      play: vi.fn(),
      togglePlay: vi.fn(),
      nextTrack: vi.fn(),
      previousTrack: vi.fn(),
      changeVolume: vi.fn(),
      volume: 50,
      position: 0,
      duration: 180000,
      seek: vi.fn()
    });

    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Track')).toBeInTheDocument();
    });
  });

  it('renders initializing message when player is not ready', async () => {
    vi.mocked(useSpotifyAuth).mockReturnValue({
      loading: false,
      token: { access_token: 'test_token' },
      user: { id: 'user123', display_name: 'Test User' },
      login: vi.fn(),
      refresh: vi.fn(),
      logout: vi.fn(),
      searchSpotify: vi.fn(() => Promise.resolve({ tracks: { items: [] } })),
      getUserPlaylists: vi.fn(() => Promise.resolve([])),
      getPlaylistTracks: vi.fn(() => Promise.resolve([])),
      getRecentlyPlayed: vi.fn(() => Promise.resolve([]))
    });

    vi.mocked(useSpotifyPlayer).mockReturnValue({
      track: null,
      paused: true,
      isReady: false,
      play: vi.fn(),
      togglePlay: vi.fn(),
      nextTrack: vi.fn(),
      previousTrack: vi.fn(),
      changeVolume: vi.fn(),
      volume: 50,
      position: 0,
      duration: 0,
      seek: vi.fn()
    });

    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('Initializing Spotify Player…')).toBeInTheDocument();
    });
  });
});

