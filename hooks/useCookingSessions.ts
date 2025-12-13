import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../services/supabaseClient';
import type { CookingSession, CookingSessionItem } from '../types';

type CookingSessionRow = {
  id: string;
  user_id: string;
  dish_name: string;
  created_at: string;
  total_cost: number;
  notes: string | null;
};

type CookingSessionItemRow = {
  id: string;
  session_id: string;
  item_name: string;
  quantity_used: number;
  unit: string;
  cost: number;
};

interface UseCookingSessionsResult {
  sessions: CookingSession[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createSession: (session: Omit<CookingSession, 'id' | 'createdAt' | 'items'>) => Promise<string>;
  addSessionItem: (item: Omit<CookingSessionItem, 'id'>) => Promise<void>;
  getSessionWithItems: (sessionId: string) => Promise<CookingSession | null>;
}

const mapSessionRowToSession = (row: CookingSessionRow): Omit<CookingSession, 'items'> => ({
  id: row.id,
  userId: row.user_id,
  dishName: row.dish_name,
  createdAt: row.created_at,
  totalCost: row.total_cost,
  notes: row.notes ?? undefined,
});

const mapItemRowToItem = (row: CookingSessionItemRow): CookingSessionItem => ({
  id: row.id,
  sessionId: row.session_id,
  itemName: row.item_name,
  quantityUsed: row.quantity_used,
  unit: row.unit,
  cost: row.cost,
});

export function useCookingSessions(userId: string | null): UseCookingSessionsResult {
  const [sessions, setSessions] = useState<CookingSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    if (!userId) {
      setSessions([]);
      return;
    }

    setLoading(true);
    setError(null);

    const { data: sessionData, error: sessionError } = await supabase
      .from('cooking_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (sessionError) {
      setError(sessionError.message);
      setSessions([]);
      setLoading(false);
      return;
    }

    const sessionsWithItems = await Promise.all(
      (sessionData as CookingSessionRow[]).map(async (sessionRow) => {
        const { data: itemsData, error: itemsError } = await supabase
          .from('cooking_session_items')
          .select('*')
          .eq('session_id', sessionRow.id);

        const items = itemsError ? [] : (itemsData as CookingSessionItemRow[]).map(mapItemRowToItem);
        return { ...mapSessionRowToSession(sessionRow), items };
      })
    );

    setSessions(sessionsWithItems);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const createSession = useCallback(
    async (session: Omit<CookingSession, 'id' | 'createdAt' | 'items'>) => {
      if (!userId) throw new Error('Ingen användare inloggad.');

      const { data, error: insertError } = await supabase
        .from('cooking_sessions')
        .insert({
          user_id: userId,
          dish_name: session.dishName,
          total_cost: session.totalCost,
          notes: session.notes ?? null,
        })
        .select('id')
        .single();

      if (insertError) {
        setError(insertError.message);
        throw insertError;
      }

      setError(null);
      await fetchSessions();
      return data.id;
    },
    [userId, fetchSessions]
  );

  const addSessionItem = useCallback(async (item: Omit<CookingSessionItem, 'id'>) => {
    if (!userId) throw new Error('Ingen användare inloggad.');

    const { error: insertError } = await supabase.from('cooking_session_items').insert({
      session_id: item.sessionId,
      item_name: item.itemName,
      quantity_used: item.quantityUsed,
      unit: item.unit,
      cost: item.cost,
    });

    if (insertError) {
      setError(insertError.message);
      throw insertError;
    }

    setError(null);
  }, [userId]);

  const getSessionWithItems = useCallback(async (sessionId: string): Promise<CookingSession | null> => {
    const { data: sessionData, error: sessionError } = await supabase
      .from('cooking_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      setError(sessionError.message);
      return null;
    }

    const { data: itemsData, error: itemsError } = await supabase
      .from('cooking_session_items')
      .select('*')
      .eq('session_id', sessionId);

    if (itemsError) {
      setError(itemsError.message);
      return null;
    }

    const session = mapSessionRowToSession(sessionData as CookingSessionRow);
    const items = (itemsData as CookingSessionItemRow[]).map(mapItemRowToItem);

    return { ...session, items };
  }, []);

  return {
    sessions,
    loading,
    error,
    refresh: fetchSessions,
    createSession,
    addSessionItem,
    getSessionWithItems,
  };
}