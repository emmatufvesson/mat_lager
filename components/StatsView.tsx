import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ConsumptionLog } from '../types';

interface Props {
  logs: ConsumptionLog[];
  inventoryValue: number;
  onAddLogClick?: () => void;
}

const StatsView: React.FC<Props> = ({ logs, inventoryValue, onAddLogClick }) => {
  const getReasonLabel = (reason: ConsumptionLog['reason']) => {
    switch (reason) {
      case 'cooked':
        return 'Matlagning';
      case 'expired':
        return 'Utgånget';
      default:
        return 'Annat';
    }
  };
  // Aggregate costs by date (last 7 days for demo simplicity)
  const getChartData = () => {
    const data: Record<string, number> = {};
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      data[dateStr] = 0;
    }

    logs.forEach(log => {
      const dateStr = log.date.split('T')[0];
      if (data[dateStr] !== undefined) {
        data[dateStr] += log.cost;
      }
    });

    return Object.keys(data).map(key => ({
      name: key.slice(5), // MM-DD
      kostnad: Math.round(data[key])
    }));
  };

  const chartData = getChartData();
  const totalSpent = logs.reduce((acc, curr) => acc + curr.cost, 0);

  return (
    <div className="p-4 pb-24 space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-100">
          <p className="text-gray-500 text-sm mb-1">Totalt lagervärde</p>
          <p className="text-2xl font-bold text-emerald-800">{Math.round(inventoryValue)} kr</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-blue-100">
          <p className="text-gray-500 text-sm mb-1">Förbrukad mat</p>
          <p className="text-2xl font-bold text-blue-800">{Math.round(totalSpent)} kr</p>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 h-80">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Kostnad per dag (Senaste veckan)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value} kr`} />
            <Tooltip
                cursor={{fill: '#f0fdf4'}}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Bar dataKey="kostnad" fill="#059669" radius={[4, 4, 0, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Senaste händelser</h3>
          {onAddLogClick && (
            <button
              onClick={onAddLogClick}
              className="text-sm font-medium text-emerald-600 hover:text-emerald-500"
            >
              Lägg till logg
            </button>
          )}
        </div>
        <div className="space-y-4">
          {logs.slice().reverse().slice(0, 5).map(log => (
            <div key={log.id} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2 last:border-0 last:pb-0">
              <div>
                <p className="font-medium text-gray-800">{log.dishName || log.itemName}</p>
                <p className="text-gray-500 text-xs">{new Date(log.date).toLocaleDateString()} - {getReasonLabel(log.reason)}</p>
              </div>
              <span className="font-medium text-gray-600">-{Math.round(log.cost)} kr</span>
            </div>
          ))}
          {logs.length === 0 && <p className="text-gray-400 text-sm">Ingen historik än.</p>}
        </div>
      </div>
    </div>
  );
};

export default StatsView;