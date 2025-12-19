# Unit Testing Setup

This project now has comprehensive unit tests for all components and hooks.

## Test Framework

- **Vitest**: Fast unit test framework
- **React Testing Library**: For testing React components
- **happy-dom**: Lightweight DOM implementation for testing

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Test Structure

### Component Tests
All components have test files in `src/components/__tests__/`:
- `Login.test.jsx` - Tests login component
- `Profile.test.jsx` - Tests profile dropdown
- `Player.test.jsx` - Tests music player controls
- `Search.test.jsx` - Tests search functionality
- `SearchResults.test.jsx` - Tests search results display
- `Playlist.test.jsx` - Tests playlist display and interactions
- `HomeView.test.jsx` - Tests home view with featured content
- `HomeButton.test.jsx` - Tests home button
- `OAuthInfo.test.jsx` - Tests OAuth info display
- `LoggedIn.test.jsx` - Tests logged in user display

### Hook Tests
All hooks have test files in `src/hooks/__tests__/`:
- `useSpotifyAuth.test.js` - Tests authentication hook
- `useSpotifyPlayer.test.js` - Tests Spotify player hook

### App Tests
- `src/__tests__/App.test.jsx` - Tests main App component

## Test Coverage

The tests cover:
- Component rendering
- User interactions (clicks, form submissions)
- Props handling
- Conditional rendering
- Error states
- Hook functionality
- API interactions (mocked)

## Configuration

Test configuration is in:
- `vite.config.js` - Vitest configuration
- `src/test/setup.js` - Test setup and mocks

