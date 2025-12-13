import { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';

export interface MealPlanItem {
  id: string;
  user_id: string;
  date: string;
  meal_type: 'frukost' | 'lunch' | 'middag';
  person: 'Emma' | 'David';
  recipe_id: string | null;
  custom_dish: string | null;
  extra_servings: number;
  leftover_name: string | null;
  notes: string | null;
}

interface UseMealPlanResult {
  meals: MealPlanItem[];
  loading: boolean;
  error: string | null;
  addMeal: (meal: Omit<MealPlanItem, 'id' | 'user_id'>) => Promise<void>;
  updateMeal: (id: string, updates: Partial<MealPlanItem>) => Promise<void>;
  deleteMeal: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useMealPlan(userId: string | null, startDate: string, endDate: string): UseMealPlanResult {
  const [meals, setMeals] = useState<MealPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMeals = async () => {
    if (!userId) {
      setMeals([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('meal_plan')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (err) throw err;
      setMeals(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte hämta måltidsplan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeals();
  }, [userId, startDate, endDate]);

  const addMeal = async (meal: Omit<MealPlanItem, 'id' | 'user_id'>) => {
    if (!userId) return;

    try {
      const { error: err } = await supabase
        .from('meal_plan')
        .insert([{ ...meal, user_id: userId }]);

      if (err) throw err;
      await fetchMeals();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte lägga till måltid');
    }
  };

  const updateMeal = async (id: string, updates: Partial<MealPlanItem>) => {
    try {
      const { error: err } = await supabase
        .from('meal_plan')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId);

      if (err) throw err;
      await fetchMeals();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte uppdatera måltid');
    }
  };

  const deleteMeal = async (id: string) => {
    try {
      const { error: err } = await supabase
        .from('meal_plan')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (err) throw err;
      await fetchMeals();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte ta bort måltid');
    }
  };

  const refresh = fetchMeals;

  return { meals, loading, error, addMeal, updateMeal, deleteMeal, refresh };
}
