import { render, screen } from '@testing-library/react';
import StatsView from '../../components/StatsView';

const mockLogs = [
  {
    id: '1',
    date: '2025-12-10T12:00:00Z',
    itemName: 'Potatis',
    cost: 5,
    quantityUsed: 0.5,
    reason: 'cooked' as const,
    dishName: 'Middag',
    unit: 'kg',
  },
];

describe('StatsView', () => {
  it('renders consumption logs', () => {
    render(<StatsView logs={mockLogs} inventoryValue={100} />);
    expect(screen.getByText('Middag')).toBeInTheDocument();
    expect(screen.getByText(/Matlagning/)).toBeInTheDocument();
    expect(screen.getByText('-5 kr')).toBeInTheDocument();
  });

  it('shows empty state when no logs', () => {
    render(<StatsView logs={[]} inventoryValue={0} />);
    expect(screen.getByText('Ingen historik än.')).toBeInTheDocument();
  });
});