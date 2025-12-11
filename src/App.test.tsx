import { render, screen } from '@testing-library/react';
import App from '../App';
import { useSupabaseSession } from '../hooks/useSupabaseSession';

// Mock the hook
jest.mock('../hooks/useSupabaseSession');
const mockUseSupabaseSession = useSupabaseSession as jest.MockedFunction<typeof useSupabaseSession>;

describe('App', () => {
  beforeEach(() => {
    mockUseSupabaseSession.mockReturnValue({
      session: null,
      initializing: false,
    });
  });

  it('shows login form when not authenticated', () => {
    render(<App />);
    expect(screen.getByText('Logga in')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('namn@example.com')).toBeInTheDocument();
  });
});