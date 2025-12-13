import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { useCookingSessions } from '../../hooks/useCookingSessions';
import type { CookingSession, CookingSessionItem } from '../../types';

// Mock the supabase client
jest.mock('../../services/supabaseClient', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const mockSupabase = require('../../services/supabaseClient').supabase;

describe('useCookingSessions', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty sessions when no userId', () => {
    const { result } = renderHook(() => useCookingSessions(null));

    expect(result.current.sessions).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('fetches sessions on mount when userId provided', async () => {
    const mockSessionData = [{
      id: 'session-1',
      user_id: mockUserId,
      dish_name: 'Pasta Carbonara',
      created_at: '2024-01-15T12:00:00Z',
      total_cost: 45.50,
      notes: 'Delicious Italian dish',
    }];

    const mockItemsData = [{
      id: 'item-1',
      session_id: 'session-1',
      item_name: 'Pasta',
      quantity_used: 200,
      unit: 'g',
      cost: 15.00,
    }];

    // Mock sessions fetch
    const sessionsOrderMock = jest.fn().mockResolvedValue({ data: mockSessionData, error: null });
    const sessionsEqMock = jest.fn().mockReturnValue({ order: sessionsOrderMock });
    const sessionsSelectMock = jest.fn().mockReturnValue({ eq: sessionsEqMock });
    const sessionsFromMock = jest.fn().mockReturnValue({ select: sessionsSelectMock });

    // Mock items fetch
    const itemsEqMock = jest.fn().mockResolvedValue({ data: mockItemsData, error: null });
    const itemsSelectMock = jest.fn().mockReturnValue({ eq: itemsEqMock });
    const itemsFromMock = jest.fn().mockReturnValue({ select: itemsSelectMock });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'cooking_sessions') {
        return sessionsFromMock();
      } else if (table === 'cooking_session_items') {
        return itemsFromMock();
      }
      return {};
    });

    const { result } = renderHook(() => useCookingSessions(mockUserId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0].dishName).toBe('Pasta Carbonara');
    expect(result.current.error).toBe(null);
  });

  it('creates a new session', async () => {
    const newSessionData = {
      userId: mockUserId,
      dishName: 'Chicken Curry',
      totalCost: 65.00,
      notes: 'Spicy dish',
    };

    // Mock initial fetch (empty)
    const fetchOrderMock = jest.fn().mockResolvedValue({ data: [], error: null });
    const fetchEqMock = jest.fn().mockReturnValue({ order: fetchOrderMock });
    const fetchSelectMock = jest.fn().mockReturnValue({ eq: fetchEqMock });
    const fetchFromMock = jest.fn().mockReturnValue({ select: fetchSelectMock });

    // Mock create session
    const createSingleMock = jest.fn().mockResolvedValue({ data: { id: 'new-session-id' }, error: null });
    const createSelectMock = jest.fn().mockReturnValue({ single: createSingleMock });
    const createInsertMock = jest.fn().mockReturnValue({ select: createSelectMock });
    const createFromMock = jest.fn().mockReturnValue({ insert: createInsertMock });

    // Mock refresh after create
    const refreshOrderMock = jest.fn().mockResolvedValue({ data: [], error: null });
    const refreshEqMock = jest.fn().mockReturnValue({ order: refreshOrderMock });
    const refreshSelectMock = jest.fn().mockReturnValue({ eq: refreshEqMock });
    const refreshFromMock = jest.fn().mockReturnValue({ select: refreshSelectMock });

    let callCount = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      callCount++;
      if (table === 'cooking_sessions') {
        if (callCount === 1) return fetchFromMock(); // Initial fetch
        if (callCount === 2) return createFromMock(); // Create session
        return refreshFromMock(); // Refresh after create
      }
      return {};
    });

    const { result } = renderHook(() => useCookingSessions(mockUserId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let sessionId: string;
    await act(async () => {
      sessionId = await result.current.createSession(newSessionData);
    });

    expect(sessionId).toBe('new-session-id');
    expect(result.current.error).toBe(null);
  });

  it('adds item to session', async () => {
    const newItem: Omit<CookingSessionItem, 'id'> = {
      sessionId: 'session-1',
      itemName: 'Tomatoes',
      quantityUsed: 3,
      unit: 'st',
      cost: 12.00,
    };

    // Mock initial fetch (empty)
    const fetchOrderMock = jest.fn().mockResolvedValue({ data: [], error: null });
    const fetchEqMock = jest.fn().mockReturnValue({ order: fetchOrderMock });
    const fetchSelectMock = jest.fn().mockReturnValue({ eq: fetchEqMock });
    const fetchFromMock = jest.fn().mockReturnValue({ select: fetchSelectMock });

    // Mock add item
    const addInsertMock = jest.fn().mockResolvedValue({ error: null });
    const addFromMock = jest.fn().mockReturnValue({ insert: addInsertMock });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'cooking_session_items') {
        return addFromMock();
      }
      return fetchFromMock();
    });

    const { result } = renderHook(() => useCookingSessions(mockUserId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.addSessionItem(newItem);
    });

    expect(result.current.error).toBe(null);
  });
});