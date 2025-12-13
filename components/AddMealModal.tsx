import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';

interface AddMealModalProps {
  isOpen: boolean;
  date: string;
  person: 'Emma' | 'David';
  onClose: () => void;
  onSubmit: (meal: {
    date: string;
    meal_type: 'frukost' | 'lunch' | 'middag';
    person: 'Emma' | 'David';
    recipe_id: string | null;
    custom_dish: string | null;
    extra_servings: number;
    notes: string | null;
  }) => Promise<void>;
  recipes: Array<{ id: string; title: string }>;
  mealType: 'frukost' | 'lunch' | 'middag';
}

export default function AddMealModal({
  isOpen,
  date,
  person,
  onClose,
  onSubmit,
  recipes,
  mealType,
}: AddMealModalProps) {
  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [customDish, setCustomDish] = useState('');
  const [extraServings, setExtraServings] = useState(0);
  const [notes, setNotes] = useState('');
  const [showRecipePrompt, setShowRecipePrompt] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // If no recipe and no custom dish, show recipe prompt
    if (!recipeId && !customDish && !showRecipePrompt) {
      setShowRecipePrompt(true);
      return;
    }

    try {
      setLoading(true);
      await onSubmit({
        date,
        meal_type: mealType,
        person,
        recipe_id: recipeId,
        custom_dish: customDish || null,
        extra_servings: extraServings,
        notes: notes || null,
      });

      // Reset form
      setRecipeId(null);
      setCustomDish('');
      setExtraServings(0);
      setNotes('');
      setShowRecipePrompt(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Något gick fel');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-lg font-semibold mb-4">
          Lägg till måltid för {person} - {mealType}
        </h2>
        {date && <p className="text-sm text-gray-600 mb-4">{date}</p>}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}

        {showRecipePrompt && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-700 mb-3">
              Vill du lägga till ett recept för denna måltid?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowRecipePrompt(false);
                  setRecipeId(null);
                }}
                className="flex-1 px-3 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm"
              >
                Nej
              </button>
              <button
                onClick={() => setShowRecipePrompt(false)}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                Ja, välj recept
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Recipe select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recept (valfritt)
            </label>
            <select
              value={recipeId || ''}
              onChange={(e) => setRecipeId(e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">-- Välj recept --</option>
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          </div>

          {/* Custom dish */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Eget namn på rätt (om inget recept)
            </label>
            <input
              type="text"
              value={customDish}
              onChange={(e) => setCustomDish(e.target.value)}
              placeholder="t.ex. Hamburgare"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Extra servings */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Extra portioner (för matlådor)
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={extraServings}
              onChange={(e) => setExtraServings(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Anteckningar
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="t.ex. Utan socker"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-60"
            >
              {loading ? 'Sparar...' : 'Spara'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
