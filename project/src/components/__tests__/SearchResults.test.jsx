import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SearchResults from '../SearchResults';

describe('SearchResults', () => {
  const mockTracks = [
    {
      id: 'track1',
      name: 'Track 1',
      artists: [{ name: 'Artist 1' }],
      album: {
        images: [
          { url: 'large.jpg', height: 640 },
          { url: 'small.jpg', height: 64 }
        ]
      },
      uri: 'spotify:track:track1'
    },
    {
      id: 'track2',
      name: 'Track 2',
      artists: [{ name: 'Artist 2' }],
      album: {
        images: [{ url: 'album2.jpg' }]
      },
      uri: 'spotify:track:track2'
    }
  ];

  const mockPlayTrack = vi.fn();
  const mockOnAddToPlaylist = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "No results found" when results array is empty', () => {
    render(<SearchResults results={[]} playTrack={mockPlayTrack} />);
    
    expect(screen.getByText('No results found.')).toBeInTheDocument();
  });

  it('renders "No results found" when results is null', () => {
    render(<SearchResults results={null} playTrack={mockPlayTrack} />);
    
    expect(screen.getByText('No results found.')).toBeInTheDocument();
  });

  it('renders all search results', () => {
    render(<SearchResults results={mockTracks} playTrack={mockPlayTrack} />);
    
    expect(screen.getByText('Track 1')).toBeInTheDocument();
    expect(screen.getByText('Track 2')).toBeInTheDocument();
    expect(screen.getByText('Artist 1')).toBeInTheDocument();
    expect(screen.getByText('Artist 2')).toBeInTheDocument();
  });

  it('displays track images', () => {
    render(<SearchResults results={mockTracks} playTrack={mockPlayTrack} />);
    
    const images = screen.getAllByAltText(/Track/);
    expect(images.length).toBe(2);
    expect(images[0]).toHaveAttribute('src', 'small.jpg');
  });

  it('calls playTrack when track image is clicked', () => {
    render(<SearchResults results={mockTracks} playTrack={mockPlayTrack} />);
    
    const images = screen.getAllByAltText(/Track/);
    fireEvent.click(images[0]);
    
    expect(mockPlayTrack).toHaveBeenCalledWith('spotify:track:track1');
  });

  it('calls playTrack when track name/artist area is clicked', () => {
    render(<SearchResults results={mockTracks} playTrack={mockPlayTrack} />);
    
    const trackName = screen.getByText('Track 1');
    fireEvent.click(trackName.closest('div'));
    
    expect(mockPlayTrack).toHaveBeenCalledWith('spotify:track:track1');
  });

  it('renders add to playlist button when onAddToPlaylist is provided', () => {
    render(
      <SearchResults 
        results={mockTracks} 
        playTrack={mockPlayTrack}
        onAddToPlaylist={mockOnAddToPlaylist}
      />
    );
    
    const addButtons = screen.getAllByText('+');
    expect(addButtons.length).toBe(2);
  });

  it('calls onAddToPlaylist when add button is clicked', () => {
    render(
      <SearchResults 
        results={mockTracks} 
        playTrack={mockPlayTrack}
        onAddToPlaylist={mockOnAddToPlaylist}
      />
    );
    
    const addButtons = screen.getAllByText('+');
    fireEvent.click(addButtons[0]);
    
    expect(mockOnAddToPlaylist).toHaveBeenCalledWith('spotify:track:track1');
  });

  it('does not call playTrack when add button is clicked', () => {
    render(
      <SearchResults 
        results={mockTracks} 
        playTrack={mockPlayTrack}
        onAddToPlaylist={mockOnAddToPlaylist}
      />
    );
    
    const addButtons = screen.getAllByText('+');
    fireEvent.click(addButtons[0]);
    
    expect(mockOnAddToPlaylist).toHaveBeenCalled();
    expect(mockPlayTrack).not.toHaveBeenCalled();
  });

  it('handles tracks with multiple artists', () => {
    const trackWithMultipleArtists = {
      id: 'track3',
      name: 'Track 3',
      artists: [{ name: 'Artist 1' }, { name: 'Artist 2' }],
      album: { images: [{ url: 'album3.jpg' }] },
      uri: 'spotify:track:track3'
    };
    
    render(
      <SearchResults 
        results={[trackWithMultipleArtists]} 
        playTrack={mockPlayTrack}
      />
    );
    
    expect(screen.getByText('Artist 1, Artist 2')).toBeInTheDocument();
  });

  it('uses large image when small image is not available', () => {
    const trackWithoutSmall = {
      id: 'track4',
      name: 'Track 4',
      artists: [{ name: 'Artist 4' }],
      album: {
        images: [{ url: 'large.jpg', height: 640 }]
      },
      uri: 'spotify:track:track4'
    };
    
    render(
      <SearchResults 
        results={[trackWithoutSmall]} 
        playTrack={mockPlayTrack}
      />
    );
    
    const image = screen.getByAltText('Track 4');
    expect(image).toHaveAttribute('src', 'large.jpg');
  });

  it('does not render add button when onAddToPlaylist is not provided', () => {
    render(<SearchResults results={mockTracks} playTrack={mockPlayTrack} />);
    
    expect(screen.queryByText('+')).not.toBeInTheDocument();
  });
});
