import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ManualConsumptionLogModal from '../../components/ManualConsumptionLogModal';
import type { ConsumptionLog } from '../../types';

const mockOnClose = jest.fn();
const mockOnSubmit = jest.fn();

const mockLog: ConsumptionLog = {
  id: 'log-1',
  date: '2024-01-15T12:00:00.000Z',
  itemName: 'Potatissallad',
  cost: 25,
  quantityUsed: 200,
  unit: 'g',
  reason: 'cooked',
  dishName: 'Middag med lax',
  notes: 'Mycket god'
};

describe('ManualConsumptionLogModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    render(
      <ManualConsumptionLogModal
        isOpen={false}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.queryByText('Logga förbrukning')).not.toBeInTheDocument();
  });

  it('renders modal when isOpen is true', () => {
    render(
      <ManualConsumptionLogModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByText('Logga förbrukning')).toBeInTheDocument();
    expect(screen.getByText('Spara logg')).toBeInTheDocument();
    expect(screen.getByText('Avbryt')).toBeInTheDocument();
  });

  it('renders edit mode when initialValues provided', () => {
    render(
      <ManualConsumptionLogModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        initialValues={mockLog}
      />
    );

    expect(screen.getByText('Redigera logg')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Potatissallad')).toBeInTheDocument();
    expect(screen.getByDisplayValue('25')).toBeInTheDocument();
    expect(screen.getByDisplayValue('200')).toBeInTheDocument();
    expect(screen.getByDisplayValue('g')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Middag med lax')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Mycket god')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <ManualConsumptionLogModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const closeButton = screen.getByText('✕');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when cancel button is clicked', () => {
    render(
      <ManualConsumptionLogModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const cancelButton = screen.getByText('Avbryt');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('updates form values when inputs change', () => {
    render(
      <ManualConsumptionLogModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const itemNameInput = screen.getByPlaceholderText('Ex. Potatissallad');
    fireEvent.change(itemNameInput, { target: { value: 'Test Item' } });
    expect(itemNameInput).toHaveValue('Test Item');

    const costInput = screen.getByLabelText('Kostnad (kr)');
    fireEvent.change(costInput, { target: { value: '15.5' } });
    expect(costInput).toHaveValue(15.5);

    const quantityInput = screen.getByLabelText('Mängd');
    fireEvent.change(quantityInput, { target: { value: '100' } });
    expect(quantityInput).toHaveValue(100);

    const unitInput = screen.getByPlaceholderText('Ex. g, st');
    fireEvent.change(unitInput, { target: { value: 'kg' } });
    expect(unitInput).toHaveValue('kg');

    const dishNameInput = screen.getByPlaceholderText('Ex. Middag med lax');
    fireEvent.change(dishNameInput, { target: { value: 'Test Dish' } });
    expect(dishNameInput).toHaveValue('Test Dish');

    const notesTextarea = screen.getByDisplayValue('');
    fireEvent.change(notesTextarea, { target: { value: 'Test notes' } });
    expect(notesTextarea).toHaveValue('Test notes');
  });

  it('updates reason when select changes', () => {
    render(
      <ManualConsumptionLogModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const reasonSelect = screen.getByDisplayValue('Annat');
    fireEvent.change(reasonSelect, { target: { value: 'expired' } });
    expect(reasonSelect).toHaveValue('expired');
  });

  it('shows validation error when item name is empty', async () => {
    render(
      <ManualConsumptionLogModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    // Fill with whitespace to trigger our custom validation
    const itemNameInput = screen.getByPlaceholderText('Ex. Potatissallad');
    fireEvent.change(itemNameInput, { target: { value: '   ' } });

    const submitButton = screen.getByText('Spara logg');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Ange ett namn.')).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('submits form successfully and closes modal', async () => {
    mockOnSubmit.mockResolvedValueOnce(undefined);

    render(
      <ManualConsumptionLogModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    // Fill required field
    const itemNameInput = screen.getByPlaceholderText('Ex. Potatissallad');
    fireEvent.change(itemNameInput, { target: { value: 'Test Item' } });

    // Fill other fields
    const costInput = screen.getByLabelText('Kostnad (kr)');
    fireEvent.change(costInput, { target: { value: '10' } });

    const quantityInput = screen.getByLabelText('Mängd');
    fireEvent.change(quantityInput, { target: { value: '50' } });

    const unitInput = screen.getByPlaceholderText('Ex. g, st');
    fireEvent.change(unitInput, { target: { value: 'g' } });

    const reasonSelect = screen.getByDisplayValue('Annat');
    fireEvent.change(reasonSelect, { target: { value: 'cooked' } });

    const dishNameInput = screen.getByPlaceholderText('Ex. Middag med lax');
    fireEvent.change(dishNameInput, { target: { value: 'Test Dish' } });

    const notesTextarea = screen.getByDisplayValue('');
    fireEvent.change(notesTextarea, { target: { value: 'Test notes' } });

    const submitButton = screen.getByText('Spara logg');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        date: expect.any(String),
        itemName: 'Test Item',
        cost: 10,
        quantityUsed: 50,
        unit: 'g',
        reason: 'cooked',
        dishName: 'Test Dish',
        notes: 'Test notes'
      });
    });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('shows error when submission fails', async () => {
    mockOnSubmit.mockRejectedValueOnce(new Error('Network error'));

    render(
      <ManualConsumptionLogModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    // Fill required field
    const itemNameInput = screen.getByPlaceholderText('Ex. Potatissallad');
    fireEvent.change(itemNameInput, { target: { value: 'Test Item' } });

    const submitButton = screen.getByText('Spara logg');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('shows loading state during submission', async () => {
    mockOnSubmit.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <ManualConsumptionLogModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    // Fill required field
    const itemNameInput = screen.getByPlaceholderText('Ex. Potatissallad');
    fireEvent.change(itemNameInput, { target: { value: 'Test Item' } });

    const submitButton = screen.getByText('Spara logg');
    fireEvent.click(submitButton);

    expect(screen.getByText('Sparar...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });

  it('resets form after successful submission', async () => {
    mockOnSubmit.mockResolvedValueOnce(undefined);

    render(
      <ManualConsumptionLogModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    // Fill form
    const itemNameInput = screen.getByPlaceholderText('Ex. Potatissallad');
    fireEvent.change(itemNameInput, { target: { value: 'Test Item' } });

    const costInput = screen.getByLabelText('Kostnad (kr)');
    fireEvent.change(costInput, { target: { value: '10' } });

    const submitButton = screen.getByText('Spara logg');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });

    // Check that form is reset (component resets form values after successful submission)
    expect(screen.getByPlaceholderText('Ex. Potatissallad')).toHaveValue('');
    expect(screen.getByLabelText('Kostnad (kr)')).toHaveValue(0);
  });
});