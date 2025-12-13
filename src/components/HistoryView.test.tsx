import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HistoryView from '../../components/HistoryView';
import { ConsumptionLog, CookingSession } from '../../types';

// Mock the hooks
jest.mock('../../hooks/useConsumptionLogs', () => ({
  useConsumptionLogs: jest.fn(),
}));

jest.mock('../../hooks/useCookingSessions', () => ({
  useCookingSessions: jest.fn(),
}));

// Mock the modal component
jest.mock('../../components/ManualConsumptionLogModal', () => ({
  __esModule: true,
  default: ({ isOpen, onClose, onSubmit }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="edit-modal">
        <button onClick={onClose} data-testid="close-modal">Close</button>
        <button onClick={() => onSubmit({ itemName: 'Updated Item' })} data-testid="submit-modal">Submit</button>
      </div>
    );
  },
}));

// Mock window.confirm
const mockConfirm = jest.fn();
global.confirm = mockConfirm;

const mockUseConsumptionLogs = require('../../hooks/useConsumptionLogs').useConsumptionLogs;
const mockUseCookingSessions = require('../../hooks/useCookingSessions').useCookingSessions;

describe('HistoryView', () => {
  const mockUserId = 'user-123';

  const mockLogs: ConsumptionLog[] = [
    {
      id: 'log-1',
      date: '2024-01-15T12:00:00Z',
      itemName: 'Pasta',
      cost: 15.00,
      quantityUsed: 200,
      reason: 'cooked',
      dishName: 'Pasta Carbonara',
      unit: 'g',
      notes: 'Delicious pasta',
    },
  ];

  const mockSessions: CookingSession[] = [
    {
      id: 'session-1',
      userId: mockUserId,
      dishName: 'Chicken Curry',
      createdAt: '2024-01-15T12:00:00Z',
      totalCost: 65.00,
      notes: 'Spicy dish',
      items: [
        {
          id: 'item-1',
          sessionId: 'session-1',
          itemName: 'Chicken',
          quantityUsed: 500,
          unit: 'g',
          cost: 40.00,
        },
      ],
    },
  ];

  const mockDeleteLog = jest.fn();
  const mockUpdateLog = jest.fn();
  const mockGetSessionWithItems = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfirm.mockReturnValue(true);

    mockUseConsumptionLogs.mockReturnValue({
      logs: mockLogs,
      loading: false,
      error: null,
      deleteLog: mockDeleteLog,
      updateLog: mockUpdateLog,
    });

    mockUseCookingSessions.mockReturnValue({
      sessions: mockSessions,
      loading: false,
      error: null,
      getSessionWithItems: mockGetSessionWithItems,
    });
  });

  it('renders loading state', () => {
    mockUseConsumptionLogs.mockReturnValue({
      logs: [],
      loading: true,
      error: null,
      deleteLog: mockDeleteLog,
      updateLog: mockUpdateLog,
    });

    render(<HistoryView userId={mockUserId} />);

    expect(screen.getByText('Hämtar historik...')).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockUseConsumptionLogs.mockReturnValue({
      logs: [],
      loading: false,
      error: 'Database error',
      deleteLog: mockDeleteLog,
      updateLog: mockUpdateLog,
    });

    render(<HistoryView userId={mockUserId} />);

    expect(screen.getByText('Database error')).toBeInTheDocument();
  });

  it('renders empty state when no logs or sessions', () => {
    mockUseConsumptionLogs.mockReturnValue({
      logs: [],
      loading: false,
      error: null,
      deleteLog: mockDeleteLog,
      updateLog: mockUpdateLog,
    });

    mockUseCookingSessions.mockReturnValue({
      sessions: [],
      loading: false,
      error: null,
      getSessionWithItems: mockGetSessionWithItems,
    });

    render(<HistoryView userId={mockUserId} />);

    expect(screen.getByText('Ingen historik än.')).toBeInTheDocument();
  });

  it('renders consumption logs and cooking sessions', () => {
    render(<HistoryView userId={mockUserId} />);

    expect(screen.getByText('Förbrukningshistorik')).toBeInTheDocument();
    expect(screen.getByText('Pasta')).toBeInTheDocument();
    expect(screen.getByText('Chicken Curry')).toBeInTheDocument();
    expect(screen.getByText('Rätt: Pasta Carbonara')).toBeInTheDocument();
    expect(screen.getByText(/Matlagning/)).toBeInTheDocument();
  });

  it('expands and collapses cooking session details', () => {
    render(<HistoryView userId={mockUserId} />);

    const expandButton = screen.getByText('Visa detaljer');
    fireEvent.click(expandButton);

    expect(screen.getByText('Chicken: 500 g • 40 kr')).toBeInTheDocument();

    const collapseButton = screen.getByText('Dölj detaljer');
    fireEvent.click(collapseButton);

    expect(screen.queryByText('Chicken: 500 g • 40 kr')).not.toBeInTheDocument();
  });

  it('opens edit modal when edit button is clicked', () => {
    render(<HistoryView userId={mockUserId} />);

    const editButton = screen.getByText('Redigera');
    fireEvent.click(editButton);

    expect(screen.getByTestId('edit-modal')).toBeInTheDocument();
  });

  it('deletes log when delete button is clicked and confirmed', async () => {
    render(<HistoryView userId={mockUserId} />);

    const deleteButton = screen.getByText('Ta bort');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledWith('Är du säker på att du vill ta bort denna logg?');
      expect(mockDeleteLog).toHaveBeenCalledWith('log-1');
    });
  });

  it('does not delete log when delete is not confirmed', () => {
    mockConfirm.mockReturnValue(false);

    render(<HistoryView userId={mockUserId} />);

    const deleteButton = screen.getByText('Ta bort');
    fireEvent.click(deleteButton);

    expect(mockDeleteLog).not.toHaveBeenCalled();
  });

  it('updates log when edit modal is submitted', async () => {
    render(<HistoryView userId={mockUserId} />);

    // Open edit modal
    const editButton = screen.getByText('Redigera');
    fireEvent.click(editButton);

    // Submit the modal
    const submitButton = screen.getByTestId('submit-modal');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockUpdateLog).toHaveBeenCalledWith('log-1', { itemName: 'Updated Item' });
    });

    // Modal should be closed after submission
    await waitFor(() => {
      expect(screen.queryByTestId('edit-modal')).not.toBeInTheDocument();
    });
  });

  it('closes edit modal when close button is clicked', () => {
    render(<HistoryView userId={mockUserId} />);

    // Open edit modal
    const editButton = screen.getByText('Redigera');
    fireEvent.click(editButton);

    // Close the modal
    const closeButton = screen.getByTestId('close-modal');
    fireEvent.click(closeButton);

    expect(screen.queryByTestId('edit-modal')).not.toBeInTheDocument();
  });
});