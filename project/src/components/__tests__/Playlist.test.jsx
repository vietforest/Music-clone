import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Playlist from '../Playlist';

describe('Playlist', () => {
  const mockTracks = [
    {
      id: 'track1',
      name: 'Track 1',
      artists: [{ name: 'Artist 1' }],
      album: {
        name: 'Album 1',
        images: [{ url: 'album1.jpg' }, { url: 'album1-small.jpg' }]
      },
      duration_ms: 180000,
      uri: 'spotify:track:track1'
    },
    {
      id: 'track2',
      name: 'Track 2',
      artists: [{ name: 'Artist 2' }],
      album: {
        name: 'Album 2',
        images: [{ url: 'album2.jpg' }]
      },
      duration_ms: 200000,
      uri: 'spotify:track:track2'
    }
  ];

  const mockPlayTrack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "No songs" message when tracks array is empty', () => {
    render(<Playlist title="Test Playlist" tracks={[]} playTrack={mockPlayTrack} />);
    
    expect(screen.getByText('No songs in this playlist.')).toBeInTheDocument();
  });

  it('renders "No songs" message when tracks is null', () => {
    render(<Playlist title="Test Playlist" tracks={null} playTrack={mockPlayTrack} />);
    
    expect(screen.getByText('No songs in this playlist.')).toBeInTheDocument();
  });

  it('renders playlist title', () => {
    render(<Playlist title="My Playlist" tracks={mockTracks} playTrack={mockPlayTrack} />);
    
    expect(screen.getByText('My Playlist')).toBeInTheDocument();
  });

  it('renders playlist image when provided', () => {
    render(
      <Playlist 
        title="My Playlist" 
        tracks={mockTracks} 
        playTrack={mockPlayTrack}
        playlistImage="https://example.com/playlist.jpg"
      />
    );
    
    const image = screen.getByAltText('playlist cover');
    expect(image).toHaveAttribute('src', 'https://example.com/playlist.jpg');
  });

  it('renders all tracks in the playlist', () => {
    render(<Playlist title="My Playlist" tracks={mockTracks} playTrack={mockPlayTrack} />);
    
    expect(screen.getByText('Track 1')).toBeInTheDocument();
    expect(screen.getByText('Track 2')).toBeInTheDocument();
    expect(screen.getByText('Album 1')).toBeInTheDocument();
    expect(screen.getByText('Album 2')).toBeInTheDocument();
    expect(screen.getByText('Artist 1')).toBeInTheDocument();
    expect(screen.getByText('Artist 2')).toBeInTheDocument();
  });

  it('displays formatted track duration', () => {
    render(<Playlist title="My Playlist" tracks={mockTracks} playTrack={mockPlayTrack} />);
    
    expect(screen.getByText('3:00')).toBeInTheDocument(); // 180000ms = 3:00
    expect(screen.getByText('3:20')).toBeInTheDocument(); // 200000ms = 3:20
  });

  it('calls playTrack when a track is clicked', () => {
    render(<Playlist title="My Playlist" tracks={mockTracks} playTrack={mockPlayTrack} />);
    
    const trackRow = screen.getByText('Track 1').closest('div');
    fireEvent.click(trackRow);
    
    expect(mockPlayTrack).toHaveBeenCalledWith(
      'spotify:track:track1',
      0,
      mockTracks
    );
  });

  it('calls playTrack with correct index when using allTracks', () => {
    const allTracks = [...mockTracks, {
      id: 'track3',
      name: 'Track 3',
      artists: [{ name: 'Artist 3' }],
      album: { name: 'Album 3', images: [] },
      duration_ms: 150000,
      uri: 'spotify:track:track3'
    }];
    
    render(
      <Playlist 
        title="My Playlist" 
        tracks={mockTracks} 
        playTrack={mockPlayTrack}
        allTracks={allTracks}
      />
    );
    
    const track2Row = screen.getByText('Track 2').closest('div');
    fireEvent.click(track2Row);
    
    expect(mockPlayTrack).toHaveBeenCalledWith(
      'spotify:track:track2',
      1,
      allTracks
    );
  });

  it('renders remove button when onRemoveTrack is provided', () => {
    const mockOnRemoveTrack = vi.fn();
    render(
      <Playlist 
        title="My Playlist" 
        tracks={mockTracks} 
        playTrack={mockPlayTrack}
        onRemoveTrack={mockOnRemoveTrack}
      />
    );
    
    const removeButtons = screen.getAllByText('×');
    expect(removeButtons.length).toBeGreaterThan(0);
  });

  it('calls onRemoveTrack when remove button is clicked', () => {
    const mockOnRemoveTrack = vi.fn();
    render(
      <Playlist 
        title="My Playlist" 
        tracks={mockTracks} 
        playTrack={mockPlayTrack}
        onRemoveTrack={mockOnRemoveTrack}
      />
    );
    
    const removeButtons = screen.getAllByText('×');
    fireEvent.click(removeButtons[0]);
    
    expect(mockOnRemoveTrack).toHaveBeenCalledWith('spotify:track:track1');
  });

  it('does not call playTrack when remove button is clicked', () => {
    const mockOnRemoveTrack = vi.fn();
    render(
      <Playlist 
        title="My Playlist" 
        tracks={mockTracks} 
        playTrack={mockPlayTrack}
        onRemoveTrack={mockOnRemoveTrack}
      />
    );
    
    const removeButtons = screen.getAllByText('×');
    fireEvent.click(removeButtons[0]);
    
    expect(mockOnRemoveTrack).toHaveBeenCalled();
    expect(mockPlayTrack).not.toHaveBeenCalled();
  });

  it('handles tracks with multiple artists', () => {
    const trackWithMultipleArtists = {
      id: 'track3',
      name: 'Track 3',
      artists: [{ name: 'Artist 1' }, { name: 'Artist 2' }],
      album: { name: 'Album 3', images: [] },
      duration_ms: 150000,
      uri: 'spotify:track:track3'
    };
    
    render(
      <Playlist 
        title="My Playlist" 
        tracks={[trackWithMultipleArtists]} 
        playTrack={mockPlayTrack}
      />
    );
    
    expect(screen.getByText('Artist 1, Artist 2')).toBeInTheDocument();
  });

  it('handles tracks without album images gracefully', () => {
    const trackWithoutImage = {
      id: 'track4',
      name: 'Track 4',
      artists: [{ name: 'Artist 4' }],
      album: { name: 'Album 4', images: [] },
      duration_ms: 120000,
      uri: 'spotify:track:track4'
    };
    
    render(
      <Playlist 
        title="My Playlist" 
        tracks={[trackWithoutImage]} 
        playTrack={mockPlayTrack}
      />
    );
    
    expect(screen.getByText('Track 4')).toBeInTheDocument();
  });

  it('filters out null tracks', () => {
    const tracksWithNull = [
      mockTracks[0],
      null,
      mockTracks[1]
    ];
    
    render(
      <Playlist 
        title="My Playlist" 
        tracks={tracksWithNull} 
        playTrack={mockPlayTrack}
      />
    );
    
    expect(screen.getByText('Track 1')).toBeInTheDocument();
    expect(screen.getByText('Track 2')).toBeInTheDocument();
  });
});
