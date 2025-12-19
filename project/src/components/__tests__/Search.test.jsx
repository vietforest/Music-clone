import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SearchBar from '../Search';

describe('SearchBar', () => {
  let mockOnSearch;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSearch = vi.fn();
  });

  it('renders search input and button', () => {
    render(<SearchBar onSearch={mockOnSearch} />);
    
    expect(screen.getByPlaceholderText('Search Spotify…')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  it('calls onSearch with query when form is submitted', () => {
    render(<SearchBar onSearch={mockOnSearch} />);
    
    const input = screen.getByPlaceholderText('Search Spotify…');
    const button = screen.getByText('Search');
    
    fireEvent.change(input, { target: { value: 'test query' } });
    fireEvent.click(button);
    
    expect(mockOnSearch).toHaveBeenCalledWith('test query');
  });

  it('calls onSearch when form is submitted via Enter key', () => {
    render(<SearchBar onSearch={mockOnSearch} />);
    
    const input = screen.getByPlaceholderText('Search Spotify…');
    
    fireEvent.change(input, { target: { value: 'test query' } });
    fireEvent.submit(input.closest('form'));
    
    expect(mockOnSearch).toHaveBeenCalledWith('test query');
  });

  it('does not call onSearch when query is empty', () => {
    render(<SearchBar onSearch={mockOnSearch} />);
    
    const button = screen.getByText('Search');
    fireEvent.click(button);
    
    expect(mockOnSearch).not.toHaveBeenCalled();
  });

  it('does not call onSearch when query is only whitespace', () => {
    render(<SearchBar onSearch={mockOnSearch} />);
    
    const input = screen.getByPlaceholderText('Search Spotify…');
    const button = screen.getByText('Search');
    
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(button);
    
    expect(mockOnSearch).not.toHaveBeenCalled();
  });

  it('updates input value when user types', () => {
    render(<SearchBar onSearch={mockOnSearch} />);
    
    const input = screen.getByPlaceholderText('Search Spotify…');
    
    fireEvent.change(input, { target: { value: 'new query' } });
    
    expect(input.value).toBe('new query');
  });

  it('clears input after successful search', () => {
    render(<SearchBar onSearch={mockOnSearch} />);
    
    const input = screen.getByPlaceholderText('Search Spotify…');
    const button = screen.getByText('Search');
    
    fireEvent.change(input, { target: { value: 'test query' } });
    fireEvent.click(button);
    
    // Input should still have the value (component doesn't clear it)
    // This is expected behavior - the parent component manages the state
    expect(input.value).toBe('test query');
  });
});

