import React, { useState } from 'react';
import { suggestIngredientsToDeduct } from '../services/geminiService';
import { InventoryItem, DeductionSuggestion } from '../types';

interface Props {
  inventory: InventoryItem[];
  onConfirmDeduction: (suggestions: DeductionSuggestion[], dishName: string) => void;
}

const CookingView: React.FC<Props> = ({ inventory, onConfirmDeduction }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<DeductionSuggestion[] | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    setSuggestions(null);

    try {
      const result = await suggestIngredientsToDeduct(input, inventory);
      setSuggestions(result);
    } catch (err) {
      console.error(err);
      alert("Något gick fel vid analysen.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (suggestions) {
      onConfirmDeduction(suggestions, input);
      setSuggestions(null);
      setInput('');
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto pb-24">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Vad har du lagat?</h2>

      <form onSubmit={handleAnalyze} className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Maträtt och antal portioner
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="T.ex. Spagetti och köttfärssås, 4 portioner"
            className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input}
            className="bg-emerald-600 text-white px-6 rounded-xl font-medium disabled:opacity-50"
          >
            {loading ? '...' : 'Analysera'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          AI:n kollar ditt lager och föreslår vad som ska tas bort.
        </p>
      </form>

      {suggestions && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 animate-fade-in">
          <h3 className="font-semibold text-lg mb-4">Föreslagna ändringar</h3>
          {suggestions.length === 0 ? (
            <p className="text-gray-500 italic mb-4">Inga matchande varor hittades i ditt lager att dra av.</p>
          ) : (
            <div className="space-y-3 mb-6">
              {suggestions.map((s) => (
                <div key={s.itemId} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <span className="font-medium text-gray-800">{s.name}</span>
                    <div className="text-xs text-gray-500">
                      Lager: {s.currentQuantity} {s.unit}
                    </div>
                  </div>
                  <div className="text-red-600 font-bold bg-red-50 px-2 py-1 rounded">
                    -{s.deductAmount} {s.unit}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setSuggestions(null)}
              className="flex-1 py-3 text-gray-600 bg-gray-100 rounded-xl font-medium"
            >
              Avbryt
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-medium shadow-md hover:bg-emerald-700"
            >
              Bekräfta & Uppdatera
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CookingView;