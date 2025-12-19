import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Player from '../Player';

describe('Player', () => {
  const mockTrack = {
    id: 'track1',
    name: 'Test Track',
    artists: [{ name: 'Artist 1' }, { name: 'Artist 2' }],
    album: {
      images: [
        { url: 'large.jpg', height: 640 },
        { url: 'medium.jpg', height: 300 },
        { url: 'small.jpg', height: 64 }
      ]
    }
  };

  const mockProps = {
    track: mockTrack,
    paused: true,
    togglePlay: vi.fn(),
    nextTrack: vi.fn(),
    previousTrack: vi.fn(),
    volume: 50,
    changeVolume: vi.fn(),
    position: 0,
    duration: 180000,
    seek: vi.fn(),
    repeatMode: 'off',
    toggleRepeat: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "No track playing" when track is null', () => {
    render(<Player {...mockProps} track={null} />);
    expect(screen.getByText('No track playing')).toBeInTheDocument();
  });

  it('renders track information', () => {
    render(<Player {...mockProps} />);
    
    expect(screen.getByText('Test Track')).toBeInTheDocument();
    expect(screen.getByText('Artist 1, Artist 2')).toBeInTheDocument();
  });

  it('renders album image', () => {
    render(<Player {...mockProps} />);
    
    const image = screen.getByAltText('Album art');
    expect(image).toHaveAttribute('src', 'small.jpg');
  });

  it('uses large image when small image is not available', () => {
    const trackWithoutSmall = {
      ...mockTrack,
      album: {
        images: [{ url: 'large.jpg', height: 640 }]
      }
    };
    
    render(<Player {...mockProps} track={trackWithoutSmall} />);
    
    const image = screen.getByAltText('Album art');
    expect(image).toHaveAttribute('src', 'large.jpg');
  });

  it('displays play button when paused', () => {
    render(<Player {...mockProps} paused={true} />);
    
    const playButton = screen.getByText('▶');
    expect(playButton).toBeInTheDocument();
  });

  it('displays pause button when playing', () => {
    render(<Player {...mockProps} paused={false} />);
    
    const pauseButton = screen.getByText('⏸');
    expect(pauseButton).toBeInTheDocument();
  });

  it('calls togglePlay when play/pause button is clicked', () => {
    render(<Player {...mockProps} />);
    
    const playButton = screen.getByText('▶');
    fireEvent.click(playButton);
    
    expect(mockProps.togglePlay).toHaveBeenCalledTimes(1);
  });

  it('calls nextTrack when next button is clicked', () => {
    render(<Player {...mockProps} />);
    
    const nextButton = screen.getByText('⏭');
    fireEvent.click(nextButton);
    
    expect(mockProps.nextTrack).toHaveBeenCalledTimes(1);
  });

  it('calls previousTrack when previous button is clicked', () => {
    render(<Player {...mockProps} />);
    
    const prevButton = screen.getByText('⏮');
    fireEvent.click(prevButton);
    
    expect(mockProps.previousTrack).toHaveBeenCalledTimes(1);
  });

  it('displays volume control', () => {
    render(<Player {...mockProps} />);
    
    const volumeInputs = screen.getAllByRole('slider');
    const volumeInput = volumeInputs.find(input => 
      input.getAttribute('min') === '0' && 
      input.getAttribute('max') === '100'
    );
    expect(volumeInput).toBeInTheDocument();
    expect(volumeInput).toHaveValue('50'); // HTML inputs return strings
  });

  it('calls changeVolume when volume slider is changed', () => {
    render(<Player {...mockProps} />);
    
    const volumeInputs = screen.getAllByRole('slider');
    const volumeInput = volumeInputs.find(input => 
      input.getAttribute('min') === '0' && 
      input.getAttribute('max') === '100'
    );
    
    if (volumeInput) {
      fireEvent.change(volumeInput, { target: { value: '75' } });
      expect(mockProps.changeVolume).toHaveBeenCalledWith(75);
    }
  });

  it('displays formatted time correctly', () => {
    render(<Player {...mockProps} position={65000} duration={180000} />);
    
    expect(screen.getByText('1:05')).toBeInTheDocument();
    expect(screen.getByText('3:00')).toBeInTheDocument();
  });

  it('calls seek when progress slider is changed', () => {
    render(<Player {...mockProps} />);
    
    const progressInputs = screen.getAllByRole('slider');
    const progressInput = progressInputs.find(input => 
      input.getAttribute('min') === '0' && 
      input.getAttribute('max') === '180000'
    );
    
    if (progressInput) {
      fireEvent.change(progressInput, { target: { value: '90000' } });
      expect(mockProps.seek).toHaveBeenCalledWith(90000);
    }
  });

  it('displays repeat button', () => {
    render(<Player {...mockProps} />);
    
    const repeatButton = screen.getByTitle('Enable repeat');
    expect(repeatButton).toBeInTheDocument();
  });

  it('calls toggleRepeat when repeat button is clicked', () => {
    render(<Player {...mockProps} />);
    
    const repeatButton = screen.getByTitle('Enable repeat');
    fireEvent.click(repeatButton);
    
    expect(mockProps.toggleRepeat).toHaveBeenCalledTimes(1);
  });

  it('displays repeat mode indicator when not off', () => {
    render(<Player {...mockProps} repeatMode="track" />);
    
    expect(screen.getByText('Looping Track')).toBeInTheDocument();
  });

  it('displays context repeat mode indicator', () => {
    render(<Player {...mockProps} repeatMode="context" />);
    
    expect(screen.getByText('Looping Playlist')).toBeInTheDocument();
  });

  it('shows correct repeat button icon for track mode', () => {
    render(<Player {...mockProps} repeatMode="track" />);
    
    expect(screen.getByText('🔂')).toBeInTheDocument();
  });

  it('shows correct repeat button icon for context mode', () => {
    render(<Player {...mockProps} repeatMode="context" />);
    
    expect(screen.getByText('🔁')).toBeInTheDocument();
  });

  it('updates local position when not paused', () => {
    const { rerender } = render(<Player {...mockProps} position={0} paused={false} />);
    
    rerender(<Player {...mockProps} position={1000} paused={false} />);
    
    const progressInputs = screen.getAllByRole('slider');
    const progressInput = progressInputs.find(input => 
      input.getAttribute('min') === '0' && 
      input.getAttribute('max') === '180000'
    );
    
    if (progressInput) {
      expect(progressInput.value).toBe('1000');
    }
  });
});

