import { render, screen } from '@testing-library/react';
import InventoryView from '../../components/InventoryView';

const mockItems = [
  {
    id: '1',
    name: 'Mjölk',
    quantity: 1,
    unit: 'l',
    category: 'Mejeri',
    expiryDate: '2025-12-15',
    priceInfo: 15,
    addedDate: '2025-12-01',
    source: 'scan' as const,
  },
];

describe('InventoryView', () => {
  it('renders inventory items', () => {
    render(<InventoryView items={mockItems} onRemove={() => {}} />);
    expect(screen.getByText('Mjölk')).toBeInTheDocument();
    expect(screen.getByText('1 l')).toBeInTheDocument();
  });

  it('shows empty state when no items', () => {
    render(<InventoryView items={[]} onRemove={() => {}} />);
    expect(screen.getByText('Lagret är tomt.')).toBeInTheDocument();
  });
});