import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import { supabase } from '../../services/supabaseClient';

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

describe('MealPlan Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null,
    });
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'test-user-id', email: 'test@example.com' } } },
      error: null,
    });
  });

  it('can add, save leftover and delete a meal', async () => {
    const meals: any[] = [];
    const recipes = [{ id: 'r1', title: 'Pesto Pasta' }];

    mockSupabase.from.mockImplementation((table: string) => {
      const lastEq: Record<string, any> = {};
      const baseMock: any = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockImplementation((col: string, val: any) => {
          lastEq[col] = val;
          return baseMock;
        }),
        order: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
      };

      if (table === 'meal_plan') {
        baseMock.select.mockReturnThis();
        baseMock.gte.mockReturnThis();
        baseMock.lte.mockReturnThis();
        baseMock.order.mockResolvedValue({ data: meals, error: null });
        baseMock.insert.mockImplementation(async (payload: any) => {
          const created = { id: `m-${Date.now()}`, ...payload[0] };
          meals.push(created);
          return { data: [created], error: null };
        });
        baseMock.update.mockImplementation(async (updates: any) => {
          // Best-effort: apply updates to the first meal in mock list
          if (meals.length > 0) {
            meals[0] = { ...meals[0], ...updates };
          }
          return { data: null, error: null };
        });
        baseMock.delete.mockImplementation(async () => {
          meals.length = 0;
          return { data: null, error: null };
        });
      } else if (table === 'recipes') {
        baseMock.select.mockReturnThis();
        baseMock.eq.mockReturnThis();
        baseMock.order.mockResolvedValue({ data: recipes, error: null });
      } else if (table === 'inventory_items') {
        baseMock.select.mockReturnThis();
        baseMock.eq.mockReturnThis();
        baseMock.order.mockResolvedValue({ data: [], error: null });
        baseMock.insert.mockResolvedValue({ data: null, error: null });
        baseMock.update.mockResolvedValue({ data: null, error: null });
      } else if (table === 'consumption_logs') {
        baseMock.select.mockReturnThis();
        baseMock.eq.mockReturnThis();
        baseMock.order.mockResolvedValue({ data: [], error: null });
        baseMock.insert.mockResolvedValue({ data: null, error: null });
      } else if (table === 'cooking_sessions') {
        baseMock.select.mockReturnThis();
        baseMock.eq.mockReturnThis();
        baseMock.order.mockResolvedValue({ data: [], error: null });
        baseMock.insert.mockResolvedValue({ data: { id: 'session-x' }, error: null });
      } else if (table === 'cooking_session_items') {
        baseMock.insert.mockResolvedValue({ data: null, error: null });
      }

      return baseMock;
    });

    render(<App />);

    // Wait for app to show header (authenticated)
    await waitFor(() => {
      expect(screen.getByText('MatSmart Lager')).toBeInTheDocument();
    });

    // Open plan tab
    const planTab = screen.getByRole('button', { name: /plan/i });
    await userEvent.click(planTab);

    // Wait for week view
    await waitFor(() => {
      expect(screen.getByText(/Vecka/)).toBeInTheDocument();
    });

    // Click add on first day for Emma's lunch
    const addButtons = screen.getAllByRole('button', { name: '+ Lägg till' });
    await userEvent.click(addButtons[0]);

    // Modal should open
    await waitFor(() => expect(screen.getByText(/Lägg till måltid/)).toBeInTheDocument());

    // Select recipe
    const recipeSelect = screen.getByRole('combobox');
    await userEvent.selectOptions(recipeSelect, 'r1');

    // Extra servings
    const extraServingsInput = screen.getAllByRole('spinbutton')[0];
    await userEvent.type(extraServingsInput, '2');

    // Save
    const saveButton = screen.getByRole('button', { name: /Spara/i });
    await userEvent.click(saveButton);

    // Meal now present in UI
    await waitFor(() => expect(screen.getByText('Pesto Pasta')).toBeInTheDocument());

    // Click 'Spara matlåda' for the meal
    const saveLeftoverButtons = screen.getAllByRole('button', { name: 'Spara matlåda' });
    await userEvent.click(saveLeftoverButtons[0]);

    // Fill leftover modal name and save
    const leftoverNameInput = screen.getByPlaceholderText('t.ex. Hamburgare-matlåda');
    await userEvent.type(leftoverNameInput, 'Pesto Matlåda');
    const leftoverSaveButton = screen.getByRole('button', { name: 'Spara' });
    await userEvent.click(leftoverSaveButton);

    // Verify the server-side representation was updated
    // (debug log to inspect mock meals array if assertion fails)
    await waitFor(() => expect(meals.some((m: any) => m.leftover_name === 'Pesto Matlåda')).toBe(true));

    // Remove meal
    const deleteButtons = screen.getAllByRole('button', { name: 'Ta bort' });
    await userEvent.click(deleteButtons[0]);

    await waitFor(() => expect(screen.queryByText('Pesto Pasta')).not.toBeInTheDocument());
  });
});
