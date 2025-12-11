import { renderHook, waitFor } from '@testing-library/react';
import { useInventory } from '../../hooks/useInventory';

// Mock supabaseClient
jest.mock('../../services/supabaseClient', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(),
        })),
      })),
    })),
    channel: jest.fn(() => ({
      on: jest.fn(() => ({
        subscribe: jest.fn(),
      })),
    })),
    removeChannel: jest.fn(),
  },
}));

import { supabase } from '../../services/supabaseClient';

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('useInventory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty items when no userId', () => {
    const { result } = renderHook(() => useInventory(null));

    expect(result.current.items).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should fetch inventory when userId provided', async () => {
    const mockData = [
      {
        id: '1',
        user_id: 'user1',
        name: 'Mjölk',
        quantity: 1,
        unit: 'l',
        category: 'Mejeri',
        expiry_date: '2025-12-20',
        price_info: 15,
        added_at: '2025-12-10',
        source: 'manual' as const,
      },
    ];

    const mockSelect = jest.fn().mockResolvedValue({ data: mockData, error: null });
    mockSupabase.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: mockSelect,
        })),
      })),
    } as any);

    const { result } = renderHook(() => useInventory('user1'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].name).toBe('Mjölk');
    expect(result.current.error).toBe(null);
  });

  it('should handle fetch error', async () => {
    const mockSelect = jest.fn().mockResolvedValue({ data: null, error: { message: 'Fetch error' } });
    mockSupabase.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: mockSelect,
        })),
      })),
    } as any);

    const { result } = renderHook(() => useInventory('user1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.items).toEqual([]);
    expect(result.current.error).toBe('Fetch error');
  });
});