import { renderHook, waitFor } from '@testing-library/react';
import { useSupabaseSession } from '../../hooks/useSupabaseSession';

// Mock supabaseClient
jest.mock('../../services/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
  },
}));

import { supabase } from '../../services/supabaseClient';

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('useSupabaseSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return initializing true initially', () => {
    (mockSupabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });
    (mockSupabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });

    const { result } = renderHook(() => useSupabaseSession());

    expect(result.current.initializing).toBe(true);
    expect(result.current.session).toBe(null);
  });

  it('should set session and initializing false after getSession resolves', async () => {
    const mockSession = { user: { id: '123' } };
    (mockSupabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: mockSession } });
    (mockSupabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });

    const { result } = renderHook(() => useSupabaseSession());

    await waitFor(() => {
      expect(result.current.initializing).toBe(false);
    });

    expect(result.current.session).toEqual(mockSession);
  });

  it('should update session on auth state change', async () => {
    const mockSession = { user: { id: '123' } };
    (mockSupabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });

    const mockListener = jest.fn();
    (mockSupabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
      mockListener.mockImplementation(callback);
      return {
        data: { subscription: { unsubscribe: jest.fn() } },
      };
    });

    const { result } = renderHook(() => useSupabaseSession());

    await waitFor(() => {
      expect(result.current.initializing).toBe(false);
    });

    // Simulate auth state change
    mockListener('SIGNED_IN', mockSession);

    await waitFor(() => {
      expect(result.current.session).toEqual(mockSession);
    });
  });
});