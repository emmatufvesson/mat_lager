import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from '../../App';

// Mock hooks
jest.mock('../../hooks/useSupabaseSession', () => ({
  useSupabaseSession: jest.fn()
}));
jest.mock('../../hooks/useInventory', () => ({
  useInventory: jest.fn()
}));
jest.mock('../../hooks/useConsumptionLogs', () => ({
  useConsumptionLogs: jest.fn()
}));
jest.mock('../../hooks/useCookingSessions', () => ({
  useCookingSessions: jest.fn()
}));

// Mock Gemini service
jest.mock('../../services/geminiService', () => ({
  analyzeImage: jest.fn(),
  lookupBarcode: jest.fn(),
  suggestIngredientsToDeduct: jest.fn(),
}));

import { useSupabaseSession } from '../../hooks/useSupabaseSession';
import { useInventory } from '../../hooks/useInventory';
import { useConsumptionLogs } from '../../hooks/useConsumptionLogs';
import { useCookingSessions } from '../../hooks/useCookingSessions';
import { suggestIngredientsToDeduct } from '../../services/geminiService';

const mockUseSupabaseSession = useSupabaseSession as jest.MockedFunction<typeof useSupabaseSession>;
const mockUseInventory = useInventory as jest.MockedFunction<typeof useInventory>;
const mockUseConsumptionLogs = useConsumptionLogs as jest.MockedFunction<typeof useConsumptionLogs>;
const mockUseCookingSessions = useCookingSessions as jest.MockedFunction<typeof useCookingSessions>;
const mockSuggestIngredientsToDeduct = suggestIngredientsToDeduct as jest.MockedFunction<typeof suggestIngredientsToDeduct>;

describe('App Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks - no auth state set here, let individual tests set their own
    mockUseSupabaseSession.mockReturnValue({
      session: null,
      initializing: false
    });
    mockUseInventory.mockReturnValue({
      items: [],
      loading: false,
      error: null,
      refresh: jest.fn()
    });
    mockUseConsumptionLogs.mockReturnValue({
      logs: [],
      loading: false,
      error: null,
      refresh: jest.fn(),
      addLog: jest.fn(),
      updateLog: jest.fn(),
      deleteLog: jest.fn()
    });
    mockUseCookingSessions.mockReturnValue({
      sessions: [],
      loading: false,
      error: null,
      refresh: jest.fn(),
      createSession: jest.fn().mockResolvedValue('session-1'),
      addSessionItem: jest.fn().mockResolvedValue(undefined),
      getSessionWithItems: jest.fn()
    });
  });

  it('renders login form when not authenticated', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Logga in')).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText('namn@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /skicka magisk länk/i })).toBeInTheDocument();
  });

  it('renders app with inventory tab after authentication', async () => {
    // Set up authenticated state
    mockUseSupabaseSession.mockReturnValue({
      session: { user: { id: 'test-user-id', email: 'test@example.com' } },
      initializing: false
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Lager')).toBeInTheDocument();
    });

    // Check main navigation tabs
    expect(screen.getByText('Lager')).toBeInTheDocument();
    expect(screen.getByText('Laga mat')).toBeInTheDocument();
    expect(screen.getByText('Ekonomi')).toBeInTheDocument();
    expect(screen.getByText('Recept')).toBeInTheDocument();
    expect(screen.getByText('Historik')).toBeInTheDocument();

    // Check inventory view is active and empty
    expect(screen.getByText('Lagret är tomt.')).toBeInTheDocument();
  });

  it('allows navigation between tabs', async () => {
    // Set up authenticated state
    mockUseSupabaseSession.mockReturnValue({
      session: { 
        user: { id: 'test-user-id', email: 'test@example.com', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '2023-01-01' },
        access_token: 'token',
        refresh_token: 'refresh',
        expires_in: 3600,
        token_type: 'bearer'
      },
      initializing: false
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Lager')).toBeInTheDocument();
    });

    // Navigate to cooking tab
    fireEvent.click(screen.getByText('Laga mat'));
    expect(screen.getByText('Vad har du lagat?')).toBeInTheDocument();

    // Navigate to stats tab
    fireEvent.click(screen.getByText('Ekonomi'));
    expect(screen.getByText('Kostnad per dag (Senaste veckan)')).toBeInTheDocument();

    // Navigate to recipes tab
    fireEvent.click(screen.getByText('Recept'));
    expect(screen.getByText('Middagsförslag')).toBeInTheDocument();

    // Navigate to history tab
    fireEvent.click(screen.getByText('Historik'));
    expect(screen.getByText('Förbrukningshistorik')).toBeInTheDocument();

    // Navigate back to inventory
    fireEvent.click(screen.getByText('Lager'));
    expect(screen.getByText('All')).toBeInTheDocument();
  });

  it('handles data loading errors gracefully', async () => {
    // Set up authenticated state
    mockUseSupabaseSession.mockReturnValue({
      session: { 
        user: { id: 'test-user-id', email: 'test@example.com', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '2023-01-01' },
        access_token: 'token',
        refresh_token: 'refresh',
        expires_in: 3600,
        token_type: 'bearer'
      },
      initializing: false
    });

    // Mock hooks to return errors
    mockUseInventory.mockReturnValue({
      items: [],
      loading: false,
      error: 'Database connection failed',
      refresh: jest.fn()
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Lager')).toBeInTheDocument();
    });

    // Should show error message
    expect(screen.getByText('Database connection failed')).toBeInTheDocument();
  });
});