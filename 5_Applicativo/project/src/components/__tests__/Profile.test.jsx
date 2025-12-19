import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Profile from '../Profile';

describe('Profile', () => {
  it('renders loading message when user is not provided', () => {
    render(<Profile user={null} refresh={() => {}} logout={() => {}} />);
    expect(screen.getByText('Loading profile…')).toBeInTheDocument();
  });

  it('renders profile dropdown when user is provided', () => {
    const mockUser = {
      display_name: 'Test User',
      images: [{ url: 'https://example.com/image.jpg' }]
    };
    
    render(<Profile user={mockUser} refresh={() => {}} logout={() => {}} />);
    
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('renders profile without image when images array is empty', () => {
    const mockUser = {
      display_name: 'Test User',
      images: []
    };
    
    render(<Profile user={mockUser} refresh={() => {}} logout={() => {}} />);
    
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });
});

