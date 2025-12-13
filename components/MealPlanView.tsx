import React, { useState, useMemo } from 'react';
import { useMealPlan } from '../hooks/useMealPlan';
import { supabase } from '../services/supabaseClient';
import AddMealModal from './AddMealModal';

interface Recipe {
  id: string;
  title: string;
}

interface MealPlanViewProps {
  userId: string | null;
  recipes: Recipe[];
}

const MEAL_TYPES = ['frukost', 'lunch', 'middag'] as const;
const PEOPLE = ['Emma', 'David'] as const;

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export default function MealPlanView({ userId, recipes }: MealPlanViewProps) {
  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    const dayOfWeek = today.getDay() || 7;
    const diff = today.getDate() - dayOfWeek + 1;
    const monday = new Date(today.setDate(diff));
    return monday.toISOString().split('T')[0];
  });

  const weekEnd = useMemo(() => {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return end.toISOString().split('T')[0];
  }, [weekStart]);

  const { meals, loading, error, addMeal, updateMeal, deleteMeal, refresh } =
    useMealPlan(userId, weekStart, weekEnd);

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    date: string | null;
    person: 'Emma' | 'David' | null;
    mealType: 'frukost' | 'lunch' | 'middag' | null;
  }>({ isOpen: false, date: null, person: null, mealType: null });

  const [showLeftoverModal, setShowLeftoverModal] = useState<{
    isOpen: boolean;
    mealId: string | null;
    mealName: string | null;
  }>({ isOpen: false, mealId: null, mealName: null });

  const [leftoverName, setLeftoverName] = useState('');
  const [leftoverQuantity, setLeftoverQuantity] = useState(1);
  const [leftoverUnit, setLeftoverUnit] = useState('portions');

  // Get days in week
  const daysInWeek = useMemo(() => {
    const start = new Date(weekStart);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      days.push(date.toISOString().split('T')[0]);
    }
    return days;
  }, [weekStart]);

  const getMeal = (date: string, person: 'Emma' | 'David', mealType: string) => {
    return meals.find((m) => m.date === date && m.person === person && m.meal_type === mealType);
  };

  const handleAddMeal = (date: string, person: 'Emma' | 'David', mealType: 'frukost' | 'lunch' | 'middag') => {
    setModalState({ isOpen: true, date, person, mealType });
  };

  const handleSubmitMeal = async (meal: {
    date: string;
    meal_type: 'frukost' | 'lunch' | 'middag';
    person: 'Emma' | 'David';
    recipe_id: string | null;
    custom_dish: string | null;
    extra_servings: number;
    leftover_name: string | null;
    notes: string | null;
  }) => {
    await addMeal(meal);
    setModalState({ isOpen: false, date: null, person: null, mealType: null });
  };

  const handleSaveAsLeftover = async (mealId: string, mealName: string) => {
    if (!userId || !leftoverName) return;

    try {
      // Add to inventory
      const { error } = await supabase.from('inventory_items').insert([
        {
          user_id: userId,
          name: leftoverName,
          quantity: leftoverQuantity,
          unit: leftoverUnit,
          source: `Matlåda - ${mealName}`,
          category: 'Matlådor',
        },
      ]);

      if (error) throw error;

      // Update meal plan with leftover name
      await updateMeal(mealId, { leftover_name: leftoverName });

      setShowLeftoverModal({ isOpen: false, mealId: null, mealName: null });
      setLeftoverName('');
      setLeftoverQuantity(1);
      setLeftoverUnit('portions');
      await refresh();
    } catch (err) {
      console.error('Fel vid sparning av matlåda:', err);
    }
  };

  const handlePrevWeek = () => {
    const prev = new Date(weekStart);
    prev.setDate(prev.getDate() - 7);
    setWeekStart(prev.toISOString().split('T')[0]);
  };

  const handleNextWeek = () => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + 7);
    setWeekStart(next.toISOString().split('T')[0]);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-gray-500">Hämtar måltidsplan...</div>;
  }

  return (
    <div className="p-4 pb-20">
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handlePrevWeek}
          className="px-3 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
        >
          ← Föregående vecka
        </button>
        <h2 className="font-semibold text-center">
          Vecka {getWeekNumber(new Date(weekStart))} {new Date(weekStart).getFullYear()}
        </h2>
        <button
          onClick={handleNextWeek}
          className="px-3 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
        >
          Nästa vecka →
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Calendar grid */}
      <div className="space-y-6">
        {daysInWeek.map((date) => {
          const dateObj = new Date(date);
          const dayName = dateObj.toLocaleDateString('sv-SE', { weekday: 'long', month: 'short', day: 'numeric' });

          return (
            <div key={date} className="border rounded-lg p-4 bg-white">
              <h3 className="font-semibold text-lg mb-4 capitalize">{dayName}</h3>

              {/* Two-column layout for Emma and David */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PEOPLE.map((person) => (
                  <div key={person} className="border rounded p-3 bg-gray-50">
                    <h4 className="font-medium mb-3 text-emerald-700">{person}</h4>

                    <div className="space-y-3">
                      {MEAL_TYPES.map((mealType) => {
                        const meal = getMeal(date, person, mealType);

                        return (
                          <div key={mealType} className="text-sm">
                            <div className="font-medium text-gray-700 capitalize mb-1">{mealType}</div>

                            {meal ? (
                              <div className="bg-white p-2 rounded border-l-4 border-emerald-500">
                                <p className="font-medium text-gray-800">
                                  {meal.custom_dish || recipes.find((r) => r.id === meal.recipe_id)?.title || 'Okänd måltid'}
                                </p>
                                {meal.extra_servings > 0 && (
                                  <p className="text-xs text-gray-600">Extra: {meal.extra_servings} portioner</p>
                                )}
                                {meal.notes && <p className="text-xs text-gray-600 italic">{meal.notes}</p>}
                                {meal.leftover_name && (
                                  <p className="text-xs text-blue-600 font-medium">✓ Sparad: {meal.leftover_name}</p>
                                )}

                                <div className="flex gap-2 mt-2">
                                  {meal.extra_servings > 0 && !meal.leftover_name && (
                                    <button
                                      onClick={() =>
                                        setShowLeftoverModal({
                                          isOpen: true,
                                          mealId: meal.id,
                                          mealName: meal.custom_dish || recipes.find((r) => r.id === meal.recipe_id)?.title || 'Måltid',
                                        })
                                      }
                                      className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                                    >
                                      Spara matlåda
                                    </button>
                                  )}
                                  <button
                                    onClick={() => deleteMeal(meal.id)}
                                    className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                                  >
                                    Ta bort
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleAddMeal(date, person, mealType)}
                                className="w-full px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                              >
                                + Lägg till
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add meal modal */}
      {modalState.isOpen && modalState.date && modalState.person && modalState.mealType && (
        <AddMealModal
          isOpen={modalState.isOpen}
          date={modalState.date}
          person={modalState.person}
          mealType={modalState.mealType}
          onClose={() => setModalState({ isOpen: false, date: null, person: null, mealType: null })}
          onSubmit={handleSubmitMeal}
          recipes={recipes}
        />
      )}

      {/* Save leftover modal */}
      {showLeftoverModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-semibold mb-4">Spara som matlåda</h2>
            <p className="text-sm text-gray-600 mb-4">{showLeftoverModal.mealName}</p>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Namn på matlåda</label>
                <input
                  type="text"
                  value={leftoverName}
                  onChange={(e) => setLeftoverName(e.target.value)}
                  placeholder="t.ex. Hamburgare-matlåda"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Antal</label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    value={leftoverQuantity}
                    onChange={(e) => setLeftoverQuantity(parseFloat(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Enhet</label>
                  <select
                    value={leftoverUnit}
                    onChange={(e) => setLeftoverUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-emerald-500"
                  >
                    <option>portions</option>
                    <option>st</option>
                    <option>gram</option>
                    <option>ml</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowLeftoverModal({ isOpen: false, mealId: null, mealName: null })}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Avbryt
              </button>
              <button
                onClick={() =>
                  showLeftoverModal.mealId &&
                  handleSaveAsLeftover(showLeftoverModal.mealId, showLeftoverModal.mealName || '')
                }
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
              >
                Spara
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
