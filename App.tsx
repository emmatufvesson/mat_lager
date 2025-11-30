import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import InventoryView from './components/InventoryView';
import Scanner from './components/Scanner';
import CookingView from './components/CookingView';
import StatsView from './components/StatsView';
import RecipeView from './components/RecipeView';
import { InventoryItem, ConsumptionLog, DeductionSuggestion } from './types';

// Mock initial data
const INITIAL_INVENTORY: InventoryItem[] = [
  { id: '1', name: 'Mjölk', quantity: 1, unit: 'l', category: 'Mejeri', expiryDate: '2023-11-20', addedDate: '2023-11-01', source: 'manual', priceInfo: 15 },
  { id: '2', name: 'Pasta', quantity: 500, unit: 'g', category: 'Skafferi', expiryDate: '2025-01-01', addedDate: '2023-10-01', source: 'manual', priceInfo: 20 },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'cook' | 'stats' | 'recipes'>('inventory');
  const [showScanner, setShowScanner] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('inventory');
    return saved ? JSON.parse(saved) : INITIAL_INVENTORY;
  });
  const [logs, setLogs] = useState<ConsumptionLog[]>(() => {
    const saved = localStorage.getItem('logs');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('inventory', JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem('logs', JSON.stringify(logs));
  }, [logs]);

  const handleItemsIdentified = (newItems: Omit<InventoryItem, 'id' | 'addedDate' | 'source'>[]) => {
    const itemsToAdd: InventoryItem[] = newItems.map(item => ({
      ...item,
      id: uuidv4(),
      addedDate: new Date().toISOString(),
      source: 'scan'
    }));
    setInventory(prev => [...prev, ...itemsToAdd]);
    setShowScanner(false);
  };

  const handleRemoveItem = (id: string) => {
    setInventory(prev => prev.filter(item => item.id !== id));
  };

  const handleDeduction = (suggestions: DeductionSuggestion[], dishName: string) => {
    const newLogs: ConsumptionLog[] = [];
    const updatedInventory = inventory.map(item => {
      const suggestion = suggestions.find(s => s.itemId === item.id);
      if (suggestion) {
        // Calculate cost of used portion
        let costUsed = 0;
        if (item.priceInfo) {
          const ratio = suggestion.deductAmount / item.quantity;
          costUsed = item.priceInfo * ratio;
        }

        newLogs.push({
          id: uuidv4(),
          date: new Date().toISOString(),
          itemName: item.name,
          cost: costUsed,
          quantityUsed: suggestion.deductAmount,
          reason: 'cooked',
          dishName: dishName
        });

        const newQty = item.quantity - suggestion.deductAmount;
        return { ...item, quantity: Math.max(0, newQty) };
      }
      return item;
    }).filter(item => item.quantity > 0); // Remove items if quantity is 0 (optional design choice)

    setInventory(updatedInventory);
    setLogs(prev => [...prev, ...newLogs]);
    setActiveTab('inventory'); // Go back to inventory to see changes
  };

  // Calculate total inventory value
  const inventoryValue = inventory.reduce((sum, item) => sum + (item.priceInfo || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Header */}
      <header className="bg-emerald-600 text-white p-4 pt-8 sticky top-0 z-20 shadow-md">
        <div className="flex justify-between items-center max-w-3xl mx-auto">
          <div>
            <h1 className="text-xl font-bold tracking-tight">MatSmart Lager</h1>
            <p className="text-emerald-100 text-sm">Du har {inventory.length} varor hemma</p>
          </div>
          <button
            onClick={() => setShowScanner(true)}
            className="bg-white text-emerald-600 rounded-full p-2 shadow-lg active:scale-90 transition-transform"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto min-h-[80vh]">
        {activeTab === 'inventory' && (
          <InventoryView items={inventory} onRemove={handleRemoveItem} />
        )}
        {activeTab === 'recipes' && (
          <RecipeView inventory={inventory} />
        )}
        {activeTab === 'cook' && (
          <CookingView inventory={inventory} onConfirmDeduction={handleDeduction} />
        )}
        {activeTab === 'stats' && (
          <StatsView logs={logs} inventoryValue={inventoryValue} />
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 shadow-lg z-30 pb-safe">
        <div className="max-w-3xl mx-auto flex justify-around">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex flex-col items-center p-3 flex-1 ${activeTab === 'inventory' ? 'text-emerald-600' : 'text-gray-400'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="text-xs font-medium">Lager</span>
          </button>

          <button
            onClick={() => setActiveTab('recipes')}
            className={`flex flex-col items-center p-3 flex-1 ${activeTab === 'recipes' ? 'text-emerald-600' : 'text-gray-400'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="text-xs font-medium">Recept</span>
          </button>
          
          <button
            onClick={() => setActiveTab('cook')}
            className={`flex flex-col items-center p-3 flex-1 ${activeTab === 'cook' ? 'text-emerald-600' : 'text-gray-400'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs font-medium">Laga mat</span>
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`flex flex-col items-center p-3 flex-1 ${activeTab === 'stats' ? 'text-emerald-600' : 'text-gray-400'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs font-medium">Ekonomi</span>
          </button>
        </div>
      </nav>

      {/* Overlays */}
      {showScanner && (
        <Scanner
          onItemsIdentified={handleItemsIdentified}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
};

export default App;