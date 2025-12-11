import { renderHook, waitFor } from '@testing-library/react';
import { useConsumptionLogs } from '../../hooks/useConsumptionLogs';

// Mock supabaseClient
jest.mock('../../services/supabaseClient', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(),
        })),
      })),
      insert: jest.fn(),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(),
        })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(),
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

describe('useConsumptionLogs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty logs when no userId', () => {
    const { result } = renderHook(() => useConsumptionLogs(null));

    expect(result.current.logs).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should fetch logs when userId provided', async () => {
    const mockData = [
      {
        id: '1',
        user_id: 'user1',
        logged_at: '2025-12-10T12:00:00Z',
        created_at: '2025-12-10T12:00:00Z',
        item_name: 'Potatis',
        cost: 5,
        quantity_used: 0.5,
        unit: 'kg',
        reason: 'cooked' as const,
        dish_name: 'Middag',
        notes: null,
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

    const { result } = renderHook(() => useConsumptionLogs('user1'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.logs).toHaveLength(1);
    expect(result.current.logs[0].itemName).toBe('Potatis');
    expect(result.current.error).toBe(null);
  });

  it('should add a log successfully', async () => {
    const mockInsert = jest.fn().mockResolvedValue({ error: null });
    const mockSelect = jest.fn().mockResolvedValue({ data: [], error: null });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'consumption_logs') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: mockSelect,
            })),
          })),
          insert: mockInsert,
        } as any;
      }
      return {} as any;
    });

    const { result } = renderHook(() => useConsumptionLogs('user1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const newLog = {
      date: '2025-12-10T12:00:00Z',
      itemName: 'Mjölk',
      cost: 10,
      quantityUsed: 1,
      reason: 'cooked' as const,
      dishName: 'Frukost',
    };

    await result.current.addLog(newLog);

    expect(mockInsert).toHaveBeenCalledWith({
      user_id: 'user1',
      logged_at: newLog.date,
      item_name: newLog.itemName,
      cost: newLog.cost,
      quantity_used: newLog.quantityUsed,
      unit: null,
      reason: newLog.reason,
      dish_name: newLog.dishName,
      notes: null,
    });
  });
});