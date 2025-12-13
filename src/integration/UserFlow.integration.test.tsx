import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import { useCookingSessions } from '../../hooks/useCookingSessions';
import { useConsumptionLogs } from '../../hooks/useConsumptionLogs';
import { supabase } from '../../services/supabaseClient';
import { suggestIngredientsToDeduct } from '../../services/geminiService';

jest.mock('../../hooks/useCookingSessions');
jest.mock('../../hooks/useConsumptionLogs');
jest.mock('../../services/geminiService');
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
      subscribe: jest.fn(),
      unsubscribe: jest.fn()
    })),
    removeChannel: jest.fn()
  }
}));

const mockSupabase = supabase as any;
const mockUseCookingSessions = useCookingSessions as jest.MockedFunction<typeof useCookingSessions>;
const mockUseConsumptionLogs = useConsumptionLogs as jest.MockedFunction<typeof useConsumptionLogs>;
const mockSuggestIngredientsToDeduct = suggestIngredientsToDeduct as jest.MockedFunction<typeof suggestIngredientsToDeduct>;

describe('Complete User Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null
    });
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'test-user-id', email: 'test@example.com' } } },
      error: null
    });

    // Mutable variables for mock data
    let currentLogs: any[] = [];
    let currentSessions: any[] = [];

    mockUseCookingSessions.mockReturnValue({
      sessions: currentSessions,
      loading: false,
      error: null,
      refresh: jest.fn(),
      createSession: jest.fn().mockResolvedValue('session-1'),
      addSessionItem: jest.fn().mockResolvedValue(undefined),
      getSessionWithItems: jest.fn()
    });

    mockUseConsumptionLogs.mockReturnValue({
      logs: currentLogs,
      loading: false,
      error: null,
      refresh: jest.fn(),
      addLog: jest.fn().mockImplementation(async (log) => {
        currentLogs.push({
          id: `log-${Date.now()}`,
          ...log,
          date: log.date || new Date().toISOString()
        });
      }),
      updateLog: jest.fn(),
      deleteLog: jest.fn()
    });

    // Mock Gemini service
    mockSuggestIngredientsToDeduct.mockResolvedValue([
      {
        itemId: '1',
        name: 'Mjölk',
        currentQuantity: 1,
        deductAmount: 0.2,
        unit: 'l'
      }
    ]);
  });

  it('handles cooking workflow with existing inventory', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      const baseMock = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
      };

      if (table === 'inventory_items') {
        baseMock.select.mockReturnThis();
        baseMock.order.mockResolvedValue({
          data: [{
            id: '1',
            name: 'Mjölk',
            quantity: 1,
            unit: 'l',
            category: 'Mejeri',
            expiryDate: '2024-12-20',
            priceInfo: 15,
            addedDate: '2024-12-10',
            source: 'manual'
          }],
          error: null
        });
        baseMock.update.mockReturnThis();
        baseMock.eq.mockReturnThis();
      } else if (table === 'consumption_logs') {
        baseMock.select.mockReturnThis();
        baseMock.order.mockResolvedValue({ data: [], error: null });
        baseMock.insert.mockResolvedValue({ data: null, error: null });
      } else if (table === 'cooking_sessions') {
        baseMock.insert.mockResolvedValue({ data: { id: 'session-1' }, error: null });
      } else if (table === 'cooking_session_items') {
        baseMock.insert.mockResolvedValue({ data: null, error: null });
      }

      return baseMock;
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Mjölk')).toBeInTheDocument();
    });

    // Navigate to cooking tab
    const cookingTab = screen.getByRole('button', { name: /laga mat/i });
    await userEvent.click(cookingTab);
    expect(screen.getByText('Vad har du lagat?')).toBeInTheDocument();

    // Start cooking session
    const dishInput = screen.getByPlaceholderText('T.ex. Spagetti och köttfärssås, 4 portioner');
    await userEvent.type(dishInput, 'Pannkakor');

    // Click analyze to get AI suggestions
    const analyzeButton = screen.getByRole('button', { name: /analysera/i });
    await userEvent.click(analyzeButton);

    // Wait for suggestions to appear
    await waitFor(() => {
      expect(screen.getByText('Föreslagna ändringar')).toBeInTheDocument();
    });

    // Confirm the deduction
    const confirmButton = screen.getByRole('button', { name: /bekräfta & uppdatera/i });
    await userEvent.click(confirmButton);

    // Wait for cooking to complete and return to inventory tab
    await waitFor(() => {
      expect(screen.getByText('Mjölk')).toBeInTheDocument();
    });

    // Navigate to stats tab
    const statsTab = screen.getByRole('button', { name: /ekonomi/i });
    await userEvent.click(statsTab);

    // Should show stats
    await waitFor(() => {
      expect(screen.getByText('Kostnad per dag (Senaste veckan)')).toBeInTheDocument();
    });

    // Wait for consumption logs to be updated
    await waitFor(() => {
      expect(screen.getByText('Pannkakor')).toBeInTheDocument();
    });
  });

  it('handles manual consumption logging', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      const baseMock = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
      };

      if (table === 'inventory_items') {
        baseMock.select.mockReturnThis();
        baseMock.order.mockResolvedValue({
          data: [{
            id: '1',
            name: 'Mjölk',
            quantity: 1,
            unit: 'l',
            category: 'Mejeri',
            expiryDate: '2024-12-20',
            priceInfo: 15,
            addedDate: '2024-12-10',
            source: 'manual'
          }],
          error: null
        });
      } else if (table === 'consumption_logs') {
        baseMock.select.mockReturnThis();
        baseMock.order.mockResolvedValue({ data: [], error: null });
        baseMock.insert.mockResolvedValue({ data: null, error: null });
      }

      return baseMock;
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Mjölk')).toBeInTheDocument();
    });

    // Navigate to stats tab to access manual log button
    const statsTab = screen.getByRole('button', { name: /ekonomi/i });
    await userEvent.click(statsTab);

    await waitFor(() => {
      expect(screen.getByText('Kostnad per dag (Senaste veckan)')).toBeInTheDocument();
    });

    // Open manual log modal
    const manualLogButton = screen.getByText('Lägg till logg');
    fireEvent.click(manualLogButton);

    await waitFor(() => {
      expect(screen.getByText('Logga förbrukning')).toBeInTheDocument();
    });

    // Fill out the form
    const itemInput = screen.getByLabelText('Namn på vara eller rätt');
    fireEvent.change(itemInput, { target: { value: 'Mjölk' } });

    const quantityInput = screen.getByLabelText('Mängd');
    fireEvent.change(quantityInput, { target: { value: '0.2' } });

    const reasonSelect = screen.getByLabelText('Anledning');
    fireEvent.change(reasonSelect, { target: { value: 'cooked' } });

    // Submit the log
    const submitButton = screen.getByText('Spara logg');
    fireEvent.click(submitButton);

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByText('Logga förbrukning')).not.toBeInTheDocument();
    });

    // Check consumption appears in stats
    await waitFor(() => {
      expect(screen.getByText('Mjölk')).toBeInTheDocument();
    });
  });
});