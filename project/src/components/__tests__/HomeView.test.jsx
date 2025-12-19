import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HomeView from '../HomeView';

describe('HomeView', () => {
  const mockOnPlaylistClick = vi.fn();
  const mockOnAlbumClick = vi.fn();

  const mockPlaylist = {
    id: 'playlist1',
    name: 'Test Playlist',
    images: [{ url: 'https://example.com/playlist.jpg' }]
  };

  const mockAlbum = {
    id: 'album1',
    name: 'Test Album',
    images: [{ url: 'https://example.com/album.jpg' }]
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading message when no content', () => {
    render(
      <HomeView
        featuredPlaylists={[]}
        newReleases={[]}
        recentAlbums={[]}
        onPlaylistClick={mockOnPlaylistClick}
        onAlbumClick={mockOnAlbumClick}
      />
    );
    
    expect(screen.getByText('Loading content...')).toBeInTheDocument();
  });

  it('renders featured playlists section', () => {
    render(
      <HomeView
        featuredPlaylists={[mockPlaylist]}
        newReleases={[]}
        recentAlbums={[]}
        onPlaylistClick={mockOnPlaylistClick}
        onAlbumClick={mockOnAlbumClick}
      />
    );
    
    expect(screen.getByText('Browse')).toBeInTheDocument();
    expect(screen.getByText('Test Playlist')).toBeInTheDocument();
  });

  it('calls onPlaylistClick when playlist is clicked', () => {
    render(
      <HomeView
        featuredPlaylists={[mockPlaylist]}
        newReleases={[]}
        recentAlbums={[]}
        onPlaylistClick={mockOnPlaylistClick}
        onAlbumClick={mockOnAlbumClick}
      />
    );
    
    const playlistItem = screen.getByText('Test Playlist');
    fireEvent.click(playlistItem.closest('div'));
    
    expect(mockOnPlaylistClick).toHaveBeenCalledWith('playlist1');
  });

  it('renders new releases section', () => {
    render(
      <HomeView
        featuredPlaylists={[]}
        newReleases={[mockAlbum]}
        recentAlbums={[]}
        onPlaylistClick={mockOnPlaylistClick}
        onAlbumClick={mockOnAlbumClick}
      />
    );
    
    expect(screen.getByText('New Releases')).toBeInTheDocument();
    expect(screen.getByText('Test Album')).toBeInTheDocument();
  });

  it('calls onAlbumClick when album is clicked', () => {
    render(
      <HomeView
        featuredPlaylists={[]}
        newReleases={[mockAlbum]}
        recentAlbums={[]}
        onPlaylistClick={mockOnPlaylistClick}
        onAlbumClick={mockOnAlbumClick}
      />
    );
    
    const albumItem = screen.getByText('Test Album');
    fireEvent.click(albumItem.closest('div'));
    
    expect(mockOnAlbumClick).toHaveBeenCalledWith(mockAlbum);
  });

  it('renders recently played section', () => {
    render(
      <HomeView
        featuredPlaylists={[]}
        newReleases={[]}
        recentAlbums={[mockAlbum]}
        onPlaylistClick={mockOnPlaylistClick}
        onAlbumClick={mockOnAlbumClick}
      />
    );
    
    expect(screen.getByText('Recently Played')).toBeInTheDocument();
    expect(screen.getByText('Test Album')).toBeInTheDocument();
  });

  it('renders multiple items in each section', () => {
    const playlists = [mockPlaylist, { ...mockPlaylist, id: 'playlist2', name: 'Playlist 2' }];
    const albums = [mockAlbum, { ...mockAlbum, id: 'album2', name: 'Album 2' }];
    
    render(
      <HomeView
        featuredPlaylists={playlists}
        newReleases={albums}
        recentAlbums={[]}
        onPlaylistClick={mockOnPlaylistClick}
        onAlbumClick={mockOnAlbumClick}
      />
    );
    
    expect(screen.getByText('Test Playlist')).toBeInTheDocument();
    expect(screen.getByText('Playlist 2')).toBeInTheDocument();
    expect(screen.getByText('Test Album')).toBeInTheDocument();
    expect(screen.getByText('Album 2')).toBeInTheDocument();
  });

  it('handles items without images gracefully', () => {
    const playlistWithoutImage = {
      id: 'playlist3',
      name: 'No Image Playlist',
      images: []
    };
    
    render(
      <HomeView
        featuredPlaylists={[playlistWithoutImage]}
        newReleases={[]}
        recentAlbums={[]}
        onPlaylistClick={mockOnPlaylistClick}
        onAlbumClick={mockOnAlbumClick}
      />
    );
    
    expect(screen.getByText('No Image Playlist')).toBeInTheDocument();
  });
});
