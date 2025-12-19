import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LoggedIn from '../LoggedIn';

describe('LoggedIn', () => {
  const mockRefresh = vi.fn();
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading message when user is null', () => {
    render(<LoggedIn user={null} refresh={mockRefresh} logout={mockLogout} />);
    
    expect(screen.getByText('Loading profile…')).toBeInTheDocument();
  });

  it('renders user display name', () => {
    const mockUser = {
      display_name: 'Test User',
      id: 'user123',
      email: 'test@example.com',
      external_urls: { spotify: 'https://spotify.com/user123' },
      href: 'https://api.spotify.com/v1/users/user123',
      images: [{ url: 'https://example.com/image.jpg' }],
      country: 'US'
    };
    
    render(<LoggedIn user={mockUser} refresh={mockRefresh} logout={mockLogout} />);
    
    expect(screen.getByText('Logged in as Test User')).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('renders user image when available', () => {
    const mockUser = {
      display_name: 'Test User',
      id: 'user123',
      email: 'test@example.com',
      external_urls: { spotify: 'https://spotify.com/user123' },
      href: 'https://api.spotify.com/v1/users/user123',
      images: [{ url: 'https://example.com/image.jpg' }],
      country: 'US'
    };
    
    render(<LoggedIn user={mockUser} refresh={mockRefresh} logout={mockLogout} />);
    
    const image = screen.getByAltText('Test User');
    expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  it('renders user information table', () => {
    const mockUser = {
      display_name: 'Test User',
      id: 'user123',
      email: 'test@example.com',
      external_urls: { spotify: 'https://spotify.com/user123' },
      href: 'https://api.spotify.com/v1/users/user123',
      images: [{ url: 'https://example.com/image.jpg' }],
      country: 'US'
    };
    
    render(<LoggedIn user={mockUser} refresh={mockRefresh} logout={mockLogout} />);
    
    expect(screen.getByText('Display name')).toBeInTheDocument();
    expect(screen.getByText('Id')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Country')).toBeInTheDocument();
    expect(screen.getByText('user123')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('US')).toBeInTheDocument();
  });

  it('calls refresh when refresh button is clicked', () => {
    const mockUser = {
      display_name: 'Test User',
      id: 'user123',
      email: 'test@example.com',
      external_urls: { spotify: 'https://spotify.com/user123' },
      href: 'https://api.spotify.com/v1/users/user123',
      images: [],
      country: 'US'
    };
    
    render(<LoggedIn user={mockUser} refresh={mockRefresh} logout={mockLogout} />);
    
    const refreshButton = screen.getByText('Refresh Token');
    fireEvent.click(refreshButton);
    
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('calls logout when logout button is clicked', () => {
    const mockUser = {
      display_name: 'Test User',
      id: 'user123',
      email: 'test@example.com',
      external_urls: { spotify: 'https://spotify.com/user123' },
      href: 'https://api.spotify.com/v1/users/user123',
      images: [],
      country: 'US'
    };
    
    render(<LoggedIn user={mockUser} refresh={mockRefresh} logout={mockLogout} />);
    
    const logoutButton = screen.getByText('Log out');
    fireEvent.click(logoutButton);
    
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('handles user without image', () => {
    const mockUser = {
      display_name: 'Test User',
      id: 'user123',
      email: 'test@example.com',
      external_urls: { spotify: 'https://spotify.com/user123' },
      href: 'https://api.spotify.com/v1/users/user123',
      images: [],
      country: 'US'
    };
    
    render(<LoggedIn user={mockUser} refresh={mockRefresh} logout={mockLogout} />);
    
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.queryByAltText('Test User')).not.toBeInTheDocument();
  });
});
