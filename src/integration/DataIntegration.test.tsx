import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../../App';
import { useInventory } from '../../hooks/useInventory';
import { useConsumptionLogs } from '../../hooks/useConsumptionLogs';
import { useCookingSessions } from '../../hooks/useCookingSessions';
import { supabase } from '../../services/supabaseClient';
import { suggestIngredientsToDeduct } from '../../services/geminiService';

jest.mock('../../hooks/useInventory');
jest.mock('../../hooks/useConsumptionLogs');
jest.mock('../../hooks/useCookingSessions');
jest.mock('../../services/geminiService');

const mockSupabase = supabase as any;
const mockSuggestIngredientsToDeduct = suggestIngredientsToDeduct as jest.MockedFunction<typeof suggestIngredientsToDeduct>;
const mockUseInventory = useInventory as jest.MockedFunction<typeof useInventory>;
const mockUseConsumptionLogs = useConsumptionLogs as jest.MockedFunction<typeof useConsumptionLogs>;
const mockUseCookingSessions = useCookingSessions as jest.MockedFunction<typeof useCookingSessions>;

jest.mock('../../services/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithOtp: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      }))
    },
    from: jest.fn(),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn()
    }))
  }
}));

jest.mock('../../services/geminiService', () => ({
  suggestIngredientsToDeduct: jest.fn(),
}));

describe('Data Integration Tests', () => {
  let currentInventory: any[] = [];
  let currentLogs: any[] = [];
  let inventoryError: string | null = null;
  let logsError: string | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    currentInventory = [];
    currentLogs = [];
    inventoryError = null;
    logsError = null;
    
    mockUseInventory.mockImplementation(() => ({
      items: currentInventory,
      loading: false,
      error: inventoryError,
      refresh: jest.fn()
    }));

    mockUseConsumptionLogs.mockImplementation(() => ({
      logs: currentLogs,
      loading: false,
      error: logsError,
      refresh: jest.fn(),
      addLog: jest.fn(),
      updateLog: jest.fn(),
      deleteLog: jest.fn()
    }));

    mockUseCookingSessions.mockReturnValue({
      sessions: [],
      loading: false,
      error: null,
      refresh: jest.fn(),
      createSession: jest.fn().mockResolvedValue('session-1'),
      addSessionItem: jest.fn().mockResolvedValue(undefined),
      getSessionWithItems: jest.fn()
    });

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null
    });
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'test-user-id', email: 'test@example.com' } } },
      error: null
    });
  });

  it('handles real-time inventory updates', async () => {
    currentInventory = [
      {
        id: '1',
        name: 'Mjölk',
        quantity: 1,
        unit: 'l',
        category: 'Mejeri',
        expiryDate: '2024-12-20',
        priceInfo: 15,
        addedDate: '2024-12-10',
        source: 'manual' as const
      }
    ];

    render(<App />);

    // Wait for initial inventory load
    await waitFor(() => {
      expect(screen.getByText('Mjölk')).toBeInTheDocument();
      expect(screen.getByText('1 l')).toBeInTheDocument();
    });

    // Simulate inventory update through cooking
    fireEvent.click(screen.getByText('Laga mat'));

    // Mock Gemini response for milk deduction
    mockSuggestIngredientsToDeduct.mockResolvedValue([{
      itemId: '1',
      name: 'Mjölk',
      currentQuantity: 1,
      deductAmount: 0.5,
      unit: 'l'
    }]);

    const dishInput = screen.getByPlaceholderText('T.ex. Spagetti och köttfärssås, 4 portioner');
    fireEvent.change(dishInput, { target: { value: 'Kaffe' } });

    const analyzeButton = screen.getByRole('button', { name: /analysera/i });
    fireEvent.click(analyzeButton);

    await waitFor(() => {
      expect(screen.getByText('Föreslagna ändringar')).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: /bekräfta & uppdatera/i });
    fireEvent.click(confirmButton);

    // Update the mock to return updated inventory
    currentInventory = [{ ...currentInventory[0], quantity: 0.5 }];

    // Navigate back to inventory to see the update
    fireEvent.click(screen.getByText('Lager'));

    // Check that inventory reflects the update
    await waitFor(() => {
      expect(screen.getByText('0.5 l')).toBeInTheDocument();
    });
  });

  it('maintains data consistency across tabs', async () => {
    const mockInventory = [{
      id: '1',
      name: 'Mjölk',
      quantity: 1,
      unit: 'l',
      category: 'Mejeri',
      expiryDate: '2024-12-20',
      priceInfo: 15,
      addedDate: '2024-12-10',
      source: 'manual' as const
    }];

    const mockLogs = [{
      id: '1',
      date: new Date().toISOString(),
      itemName: 'Mjölk',
      cost: 4.5,
      quantityUsed: 0.3,
      unit: 'l',
      reason: 'cooked' as const,
      dishName: 'Kaffe'
    }];

    currentInventory = mockInventory;
    currentLogs = mockLogs;

    mockUseCookingSessions.mockReturnValue({
      sessions: [],
      loading: false,
      error: null,
      refresh: jest.fn(),
      createSession: jest.fn().mockResolvedValue('session-1'),
      addSessionItem: jest.fn().mockResolvedValue(undefined),
      getSessionWithItems: jest.fn()
    });

    // Mock Gemini service to return milk deduction
    mockSuggestIngredientsToDeduct.mockResolvedValue([{
      itemId: '1',
      name: 'Mjölk',
      currentQuantity: 1,
      deductAmount: 0.3,
      unit: 'l'
    }]);

    render(<App />);

    // Check initial state
    await waitFor(() => {
      expect(screen.getByText('Mjölk')).toBeInTheDocument();
      expect(screen.getByText('1 l')).toBeInTheDocument();
    });

    // Navigate to cooking and cook with milk
    fireEvent.click(screen.getByText('Laga mat'));

    const dishInput = screen.getByPlaceholderText('T.ex. Spagetti och köttfärssås, 4 portioner');
    fireEvent.change(dishInput, { target: { value: 'Kaffe' } });

    // Click analyze to get AI suggestions
    const analyzeButton = screen.getByRole('button', { name: /analysera/i });
    fireEvent.click(analyzeButton);

    // Wait for suggestions to appear
    await waitFor(() => {
      expect(screen.getByText('Föreslagna ändringar')).toBeInTheDocument();
    });

    // Confirm the deduction
    const confirmButton = screen.getByRole('button', { name: /bekräfta & uppdatera/i });
    fireEvent.click(confirmButton);

    // Update mocks to reflect the cooking
    currentInventory = [{ ...mockInventory[0], quantity: 0.7 }];

    // Update consumption logs to include both coffee and milk entries
    currentLogs = [
      {
        id: '1',
        date: '2025-12-12T00:00:00.000Z',
        itemName: 'Kaffe',
        cost: 5,
        quantityUsed: 1,
        reason: 'cooked' as const,
        dishName: 'Kaffe',
        unit: 'portioner'
      },
      {
        id: '2',
        date: '2025-12-12T00:00:00.000Z',
        itemName: 'Mjölk',
        cost: 1.5,
        quantityUsed: 0.3,
        reason: 'cooked' as const,
        unit: 'l'
      }
    ];

    // Navigate to stats
    fireEvent.click(screen.getByText('Ekonomi'));

    await waitFor(() => {
      expect(screen.getByText('Kostnad per dag (Senaste veckan)')).toBeInTheDocument();
    });

    // Should show the consumption log
    expect(screen.getByText('Kaffe')).toBeInTheDocument(); // Coffee dish
    expect(screen.getByText('Mjölk')).toBeInTheDocument(); // Milk item

    // Navigate back to inventory and check consistency
    fireEvent.click(screen.getByText('Lager'));

    await waitFor(() => {
      expect(screen.getByText('Mjölk')).toBeInTheDocument();
      expect(screen.getByText('0.7 l')).toBeInTheDocument(); // 1 - 0.3 = 0.7
    });
  });

  it('handles offline/error states gracefully', async () => {
    currentInventory = [];
    currentLogs = [];
    inventoryError = 'Network error';
    logsError = 'Network error';

    mockUseCookingSessions.mockReturnValue({
      sessions: [],
      loading: false,
      error: 'Network error',
      refresh: jest.fn(),
      createSession: jest.fn().mockResolvedValue('session-1'),
      addSessionItem: jest.fn().mockResolvedValue(undefined),
      getSessionWithItems: jest.fn()
    });

    render(<App />);

    // Should still render the app structure despite errors
    await waitFor(() => {
      expect(screen.getByText('Lager')).toBeInTheDocument();
    });

    // Should show error messages
    await waitFor(() => {
      expect(screen.getAllByText('Network error')).toHaveLength(2); // One for inventory, one for logs
    });

    // Navigation should still work
    fireEvent.click(screen.getByText('Ekonomi'));
    expect(screen.getByText('Kostnad per dag (Senaste veckan)')).toBeInTheDocument();
  });
});