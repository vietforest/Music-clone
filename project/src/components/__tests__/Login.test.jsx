import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Login from '../Login';

describe('Login', () => {
  it('renders welcome message and login button', () => {
    const mockLogin = vi.fn();
    render(<Login login={mockLogin} />);
    
    expect(screen.getByText('Welcome to the OAuth2 PKCE Example')).toBeInTheDocument();
    expect(screen.getByText('Log in with Spotify')).toBeInTheDocument();
  });

  it('calls login function when button is clicked', () => {
    const mockLogin = vi.fn();
    render(<Login login={mockLogin} />);
    
    const loginButton = screen.getByText('Log in with Spotify');
    fireEvent.click(loginButton);
    
    expect(mockLogin).toHaveBeenCalledTimes(1);
  });
});

