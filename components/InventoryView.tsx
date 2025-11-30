import React, { useState } from 'react';
import { InventoryItem, Category } from '../types';

interface Props {
  items: InventoryItem[];
  onRemove: (id: string) => void;
}

const InventoryView: React.FC<Props> = ({ items, onRemove }) => {
  const [filter, setFilter] = useState<string>('All');

  const getDaysUntilExpiry = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  };

  const sortedItems = [...items].sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  const filteredItems = filter === 'All' ? sortedItems : sortedItems.filter(i => i.category === filter);

  const categories = ['All', ...Object.values(Category)];

  return (
    <div className="pb-20">
      <div className="flex overflow-x-auto gap-2 p-4 bg-white sticky top-0 z-10 shadow-sm scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === cat
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-3">
        {filteredItems.length === 0 ? (
          <div className="text-center text-gray-400 mt-10">
            <p>Lagret är tomt.</p>
            <p className="text-sm">Börja scanna matvaror eller kvitton!</p>
          </div>
        ) : (
          filteredItems.map(item => {
            const daysLeft = getDaysUntilExpiry(item.expiryDate);
            let statusColor = "bg-green-100 text-green-800";
            if (daysLeft < 0) statusColor = "bg-red-100 text-red-800";
            else if (daysLeft <= 3) statusColor = "bg-yellow-100 text-yellow-800";

            return (
              <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex justify-between items-center">
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-gray-800 capitalize">{item.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor}`}>
                      {daysLeft < 0 ? `Utgick för ${Math.abs(daysLeft)} dagar sen` : `${daysLeft} dagar kvar`}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mt-1 flex gap-3">
                    <span>{item.quantity} {item.unit}</span>
                    <span>•</span>
                    <span>{item.category}</span>
                    {item.priceInfo && (
                      <>
                        <span>•</span>
                        <span>{item.priceInfo} kr</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onRemove(item.id)}
                  className="ml-4 p-2 text-gray-400 hover:text-red-500 transition-colors"
                  aria-label="Remove item"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default InventoryView;