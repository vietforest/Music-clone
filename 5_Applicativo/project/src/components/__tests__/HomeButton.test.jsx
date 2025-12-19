import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HomeButton from '../HomeButton';

describe('HomeButton', () => {
  it('renders home button with text', () => {
    const mockGoHome = vi.fn();
    render(<HomeButton goHome={mockGoHome} />);
    
    expect(screen.getByText('🏠 Home')).toBeInTheDocument();
  });

  it('calls goHome when clicked', () => {
    const mockGoHome = vi.fn();
    render(<HomeButton goHome={mockGoHome} />);
    
    const button = screen.getByText('🏠 Home');
    fireEvent.click(button);
    
    expect(mockGoHome).toHaveBeenCalledTimes(1);
  });

  it('has correct styling and cursor pointer', () => {
    const mockGoHome = vi.fn();
    render(<HomeButton goHome={mockGoHome} />);
    
    const button = screen.getByText('🏠 Home').parentElement;
    expect(button).toHaveStyle({ cursor: 'pointer' });
  });
});
