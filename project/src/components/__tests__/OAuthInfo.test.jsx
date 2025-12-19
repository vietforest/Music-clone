import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import OAuthInfo from '../OAuthInfo';

describe('OAuthInfo', () => {
  it('renders nothing when token is null', () => {
    const { container } = render(<OAuthInfo token={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when token is undefined', () => {
    const { container } = render(<OAuthInfo token={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders OAuth info when token is provided', () => {
    const mockToken = {
      access_token: 'test_access_token',
      refresh_token: 'test_refresh_token',
      expires: new Date('2024-12-31')
    };
    
    render(<OAuthInfo token={mockToken} />);
    
    expect(screen.getByText('OAuth Info')).toBeInTheDocument();
    expect(screen.getByText('Access Token')).toBeInTheDocument();
    expect(screen.getByText('Refresh Token')).toBeInTheDocument();
    expect(screen.getByText('Expires At')).toBeInTheDocument();
    expect(screen.getByText('test_access_token')).toBeInTheDocument();
    expect(screen.getByText('test_refresh_token')).toBeInTheDocument();
  });

  it('renders token with all properties', () => {
    const mockToken = {
      access_token: 'access123',
      refresh_token: 'refresh456',
      expires: new Date('2024-12-31T23:59:59Z')
    };
    
    render(<OAuthInfo token={mockToken} />);
    
    expect(screen.getByText('access123')).toBeInTheDocument();
    expect(screen.getByText('refresh456')).toBeInTheDocument();
  });

  it('handles token without expires property', () => {
    const mockToken = {
      access_token: 'access123',
      refresh_token: 'refresh456'
    };
    
    render(<OAuthInfo token={mockToken} />);
    
    expect(screen.getByText('access123')).toBeInTheDocument();
    expect(screen.getByText('refresh456')).toBeInTheDocument();
  });
});
