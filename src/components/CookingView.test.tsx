import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CookingView from '../../components/CookingView';

// Mock the geminiService
jest.mock('../../services/geminiService', () => ({
  suggestIngredientsToDeduct: jest.fn(),
}));

import { suggestIngredientsToDeduct } from '../../services/geminiService';

const mockSuggestIngredientsToDeduct = suggestIngredientsToDeduct as jest.MockedFunction<typeof suggestIngredientsToDeduct>;

describe('CookingView', () => {
  const mockInventory = [
    { id: '1', name: 'Mjölk', quantity: 1, unit: 'l', category: 'Mejeri', expiryDate: '', addedDate: '', source: 'manual' as const },
  ];
  const mockOnConfirmDeduction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the form initially', () => {
    render(<CookingView inventory={mockInventory} onConfirmDeduction={mockOnConfirmDeduction} />);

    expect(screen.getByText('Vad har du lagat?')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('T.ex. Spagetti och köttfärssås, 4 portioner')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Analysera' })).toBeInTheDocument();
  });

  it('shows loading state when analyzing', async () => {
    mockSuggestIngredientsToDeduct.mockResolvedValue([]);

    render(<CookingView inventory={mockInventory} onConfirmDeduction={mockOnConfirmDeduction} />);

    const input = screen.getByPlaceholderText('T.ex. Spagetti och köttfärssås, 4 portioner');
    const button = screen.getByRole('button', { name: 'Analysera' });

    fireEvent.change(input, { target: { value: 'Pannkakor' } });
    fireEvent.click(button);

    expect(button).toHaveTextContent('...');
    expect(input).toBeDisabled();

    await waitFor(() => {
      expect(button).toHaveTextContent('Analysera');
    });
  });

  it('displays suggestions after analysis', async () => {
    const mockSuggestions = [
      { itemId: '1', name: 'Mjölk', currentQuantity: 1, unit: 'l', deductAmount: 0.5 },
    ];
    mockSuggestIngredientsToDeduct.mockResolvedValue(mockSuggestions);

    render(<CookingView inventory={mockInventory} onConfirmDeduction={mockOnConfirmDeduction} />);

    const input = screen.getByPlaceholderText('T.ex. Spagetti och köttfärssås, 4 portioner');
    const button = screen.getByRole('button', { name: 'Analysera' });

    fireEvent.change(input, { target: { value: 'Pannkakor' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Föreslagna ändringar')).toBeInTheDocument();
    });

    expect(screen.getByText('Mjölk')).toBeInTheDocument();
    expect(screen.getByText('-0.5 l')).toBeInTheDocument();
  });

  it('calls onConfirmDeduction when confirming', async () => {
    const mockSuggestions = [
      { itemId: '1', name: 'Mjölk', currentQuantity: 1, unit: 'l', deductAmount: 0.5 },
    ];
    mockSuggestIngredientsToDeduct.mockResolvedValue(mockSuggestions);

    render(<CookingView inventory={mockInventory} onConfirmDeduction={mockOnConfirmDeduction} />);

    const input = screen.getByPlaceholderText('T.ex. Spagetti och köttfärssås, 4 portioner');
    const analyzeButton = screen.getByRole('button', { name: 'Analysera' });

    fireEvent.change(input, { target: { value: 'Pannkakor' } });
    fireEvent.click(analyzeButton);

    await waitFor(() => {
      expect(screen.getByText('Föreslagna ändringar')).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: 'Bekräfta & Uppdatera' });
    fireEvent.click(confirmButton);

    expect(mockOnConfirmDeduction).toHaveBeenCalledWith(mockSuggestions, 'Pannkakor');
  });

  it('cancels suggestions when cancel is clicked', async () => {
    const mockSuggestions = [
      { itemId: '1', name: 'Mjölk', currentQuantity: 1, unit: 'l', deductAmount: 0.5 },
    ];
    mockSuggestIngredientsToDeduct.mockResolvedValue(mockSuggestions);

    render(<CookingView inventory={mockInventory} onConfirmDeduction={mockOnConfirmDeduction} />);

    const input = screen.getByPlaceholderText('T.ex. Spagetti och köttfärssås, 4 portioner');
    const analyzeButton = screen.getByRole('button', { name: 'Analysera' });

    fireEvent.change(input, { target: { value: 'Pannkakor' } });
    fireEvent.click(analyzeButton);

    await waitFor(() => {
      expect(screen.getByText('Föreslagna ändringar')).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole('button', { name: 'Avbryt' });
    fireEvent.click(cancelButton);

    expect(screen.queryByText('Föreslagna ändringar')).not.toBeInTheDocument();
  });
});