import React, { useState } from 'react';
import InventoryView from './components/InventoryView';
import Scanner from './components/Scanner';
import CookingView from './components/CookingView';
import StatsView from './components/StatsView';
import RecipeView from './components/RecipeView';
import HistoryView from './components/HistoryView';
import { InventoryItem, ConsumptionLog, DeductionSuggestion, CookingSessionItem } from './types';
import { supabase } from './services/supabaseClient';
import { useSupabaseSession } from './hooks/useSupabaseSession';
import { useInventory } from './hooks/useInventory';
import { useConsumptionLogs } from './hooks/useConsumptionLogs';
import ManualConsumptionLogModal from './components/ManualConsumptionLogModal';
import { useCookingSessions } from './hooks/useCookingSessions';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'cook' | 'stats' | 'recipes' | 'history'>('inventory');
  const [showScanner, setShowScanner] = useState(false);
  const [showManualLogModal, setShowManualLogModal] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [loginMessage, setLoginMessage] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSendingLink, setIsSendingLink] = useState(false);

  const { session, initializing } = useSupabaseSession();
  const userId = session?.user?.id ?? null;
  const {
    items: inventory,
    loading: inventoryLoading,
    error: inventoryError,
    refresh: refreshInventory
  } = useInventory(userId);
  const {
    logs,
    loading: logsLoading,
    error: logsError,
    addLog
  } = useConsumptionLogs(userId);
  const {
    createSession,
    addSessionItem,
    error: sessionError
  } = useCookingSessions(userId);

  const handleEmailLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError(null);
    setLoginMessage(null);

    if (!email) {
      setLoginError('Fyll i en e-postadress.');
      return;
    }

    setIsSendingLink(true);
    const redirectUrl = import.meta.env.PROD 
      ? 'https://mat-lager-fv1cj4uc5-emmatufvessons-projects.vercel.app'
      : window.location.origin;
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    setIsSendingLink(false);

    if (error) {
      setLoginError(error.message);
    } else {
      setLoginMessage('Kolla din inkorg för en magisk inloggningslänk.');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleItemsIdentified = async (
    newItems: Omit<InventoryItem, 'id' | 'addedDate' | 'source'>[]
  ) => {
    if (!userId) {
      setGlobalError('Du måste vara inloggad för att lägga till varor.');
      return;
    }

    const now = new Date().toISOString();
    const itemsToInsert = newItems.map(item => ({
      user_id: userId,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      expiry_date: item.expiryDate || null,
      price_info: item.priceInfo ?? null,
      added_at: now,
      source: 'scan' as const
    }));

    const { error } = await supabase.from('inventory_items').insert(itemsToInsert);
    if (error) {
      setGlobalError(error.message);
    } else {
      setGlobalError(null);
      await refreshInventory();
      setShowScanner(false);
    }
  };

  const handleRemoveItem = async (id: string) => {
    if (!userId) return;

    const { error } = await supabase
      .from('inventory_items')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      setGlobalError(error.message);
    } else {
      setGlobalError(null);
      await refreshInventory();
    }
  };

  const handleDeduction = async (suggestions: DeductionSuggestion[], dishName: string) => {
    if (!userId) return;

    try {
      // Calculate total cost
      let totalCost = 0;
      const sessionItems: Omit<CookingSessionItem, 'id'>[] = [];
      const logEntries: Omit<ConsumptionLog, 'id'>[] = [];

      for (const suggestion of suggestions) {
        const item = inventory.find(i => i.id === suggestion.itemId);
        if (!item) continue;

        let costUsed = 0;
        if (item.priceInfo) {
          const ratio = suggestion.deductAmount / item.quantity;
          costUsed = item.priceInfo * ratio;
        }
        totalCost += costUsed;

        sessionItems.push({
          sessionId: '', // Will be set after session creation
          itemName: item.name,
          quantityUsed: suggestion.deductAmount,
          unit: item.unit,
          cost: costUsed,
        });

        logEntries.push({
          date: new Date().toISOString(),
          itemName: item.name,
          cost: costUsed,
          quantityUsed: suggestion.deductAmount,
          reason: 'cooked',
          dishName,
          unit: item.unit,
        });
      }

      // Create session
      const sessionId = await createSession({
        userId,
        dishName,
        totalCost,
      });

      // Add session items
      for (const item of sessionItems) {
        await addSessionItem({ ...item, sessionId });
      }

      // Update inventory
      for (const suggestion of suggestions) {
        const item = inventory.find(i => i.id === suggestion.itemId);
        if (!item) continue;

        const newQty = item.quantity - suggestion.deductAmount;
        if (newQty <= 0) {
          const { error } = await supabase
            .from('inventory_items')
            .delete()
            .eq('id', item.id)
            .eq('user_id', userId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('inventory_items')
            .update({
              quantity: newQty,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id)
            .eq('user_id', userId);
          if (error) throw error;
        }
      }

      // Add consumption logs
      for (const logEntry of logEntries) {
        await addLog(logEntry);
      }

      await refreshInventory();
      setActiveTab('inventory');
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Kunde inte spara matlagningssession.');
    }
  };

  const handleManualLog = async (log: Omit<ConsumptionLog, 'id'>) => {
    await addLog(log);
  };

  // Calculate total inventory value
  const inventoryValue = inventory.reduce((sum, item) => sum + (item.priceInfo || 0), 0);

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-600">
        <span>Laddar...</span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm bg-white shadow-lg rounded-2xl p-6 space-y-4">
          <h1 className="text-xl font-semibold text-gray-800">Logga in</h1>
          <p className="text-sm text-gray-500">Skriv din e-postadress så skickar vi en magisk länk.</p>
          <form className="space-y-3" onSubmit={handleEmailLogin}>
            <label className="block text-sm font-medium text-gray-700">
              E-post
              <input
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="namn@example.com"
                required
              />
            </label>
            <button
              type="submit"
              disabled={isSendingLink}
              className="w-full rounded-md bg-emerald-600 py-2 text-white font-semibold hover:bg-emerald-500 disabled:opacity-60"
            >
              {isSendingLink ? 'Skickar...' : 'Skicka magisk länk'}
            </button>
          </form>
          {loginMessage && <p className="text-sm text-emerald-600">{loginMessage}</p>}
          {loginError && <p className="text-sm text-red-600">{loginError}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Header */}
      <header className="bg-emerald-600 text-white p-4 pt-8 sticky top-0 z-20 shadow-md">
        <div className="flex justify-between items-center max-w-3xl mx-auto">
          <div>
            <h1 className="text-xl font-bold tracking-tight">MatSmart Lager</h1>
            <p className="text-emerald-100 text-sm">Du har {inventory.length} varor hemma</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-100 text-xs sm:text-sm">{session.user?.email}</span>
            <button
              onClick={handleSignOut}
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-medium px-3 py-1.5 rounded-full"
            >
              Logga ut
            </button>
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
        {globalError && (
          <div className="mx-4 my-3 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {globalError}
          </div>
        )}
        {inventoryError && (
          <div className="mx-4 my-3 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {inventoryError}
          </div>
        )}
        {logsError && (
          <div className="mx-4 my-3 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {logsError}
          </div>
        )}
        {inventoryLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-500">
            Hämtar lagret...
          </div>
        ) : (
          <>
            {activeTab === 'inventory' && (
              <InventoryView items={inventory} onRemove={handleRemoveItem} />
            )}
            {activeTab === 'recipes' && (
              <RecipeView inventory={inventory} />
            )}
            {activeTab === 'history' && (
              <HistoryView userId={userId} />
            )}
            {activeTab === 'cook' && (
              <CookingView inventory={inventory} onConfirmDeduction={handleDeduction} />
            )}
            {activeTab === 'stats' && (
              logsLoading ? (
                <div className="flex items-center justify-center py-16 text-gray-500">
                  Hämtar historik...
                </div>
              ) : (
                <StatsView
                  logs={logs}
                  inventoryValue={inventoryValue}
                  onAddLogClick={() => setShowManualLogModal(true)}
                />
              )
            )}
          </>
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
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center p-3 flex-1 ${activeTab === 'history' ? 'text-emerald-600' : 'text-gray-400'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-medium">Historik</span>
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
      <ManualConsumptionLogModal
        isOpen={showManualLogModal}
        onClose={() => setShowManualLogModal(false)}
        onSubmit={handleManualLog}
      />
    </div>
  );
};

export default App;
