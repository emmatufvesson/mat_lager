import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../services/supabaseClient';
import type { ConsumptionLog } from '../types';

type ConsumptionLogRow = {
  id: string;
  user_id: string;
  logged_at: string | null;
  created_at: string;
  item_name: string;
  cost: number | null;
  quantity_used: number;
  unit: string | null;
  reason: 'cooked' | 'expired' | 'snack';
  dish_name: string | null;
  notes: string | null;
};

interface UseConsumptionLogsResult {
  logs: ConsumptionLog[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addLog: (log: Omit<ConsumptionLog, 'id'>) => Promise<void>;
  updateLog: (id: string, log: Partial<Omit<ConsumptionLog, 'id'>>) => Promise<void>;
  deleteLog: (id: string) => Promise<void>;
}

const mapRowToLog = (row: ConsumptionLogRow): ConsumptionLog => ({
  id: row.id,
  date: row.logged_at ?? row.created_at,
  itemName: row.item_name,
  cost: row.cost ?? 0,
  quantityUsed: row.quantity_used,
  reason: row.reason,
  dishName: row.dish_name ?? undefined,
  unit: row.unit ?? undefined,
  notes: row.notes ?? undefined
});

export function useConsumptionLogs(userId: string | null): UseConsumptionLogsResult {
  const [logs, setLogs] = useState<ConsumptionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!userId) {
      setLogs([]);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('consumption_logs')
      .select('*')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setLogs([]);
    } else {
      setLogs((data as ConsumptionLogRow[]).map(mapRowToLog));
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('consumption_logs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'consumption_logs',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLogs, userId]);

  const addLog = useCallback(
    async (log: Omit<ConsumptionLog, 'id'>) => {
      if (!userId) {
        const noUserError = new Error('Ingen användare inloggad.');
        setError(noUserError.message);
        throw noUserError;
      }

      const { error: insertError } = await supabase.from('consumption_logs').insert({
        user_id: userId,
        logged_at: log.date,
        item_name: log.itemName,
        cost: log.cost,
        quantity_used: log.quantityUsed,
        unit: log.unit ?? null,
        reason: log.reason,
        dish_name: log.dishName ?? null,
        notes: log.notes ?? null
      });

      if (insertError) {
        setError(insertError.message);
        throw insertError;
      } else {
        setError(null);
        await fetchLogs();
      }
    },
    [userId, fetchLogs]
  );

  const updateLog = useCallback(
    async (id: string, log: Partial<Omit<ConsumptionLog, 'id'>>) => {
      if (!userId) {
        const noUserError = new Error('Ingen användare inloggad.');
        setError(noUserError.message);
        throw noUserError;
      }

      const payload = {
        ...(log.date ? { logged_at: log.date } : {}),
        ...(log.itemName ? { item_name: log.itemName } : {}),
        ...(log.cost !== undefined ? { cost: log.cost } : {}),
        ...(log.quantityUsed !== undefined ? { quantity_used: log.quantityUsed } : {}),
        ...(log.unit !== undefined ? { unit: log.unit } : {}),
        ...(log.reason ? { reason: log.reason } : {}),
        ...(log.dishName !== undefined ? { dish_name: log.dishName } : {}),
        ...(log.notes !== undefined ? { notes: log.notes } : {})
      };

      const { error: updateError } = await supabase
        .from('consumption_logs')
        .update(payload)
        .eq('id', id)
        .eq('user_id', userId);

      if (updateError) {
        setError(updateError.message);
        throw updateError;
      } else {
        setError(null);
        await fetchLogs();
      }
    },
    [userId, fetchLogs]
  );

  const deleteLog = useCallback(
    async (id: string) => {
      if (!userId) {
        const noUserError = new Error('Ingen användare inloggad.');
        setError(noUserError.message);
        throw noUserError;
      }

      const { error: deleteError } = await supabase
        .from('consumption_logs')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (deleteError) {
        setError(deleteError.message);
        throw deleteError;
      } else {
        setError(null);
        await fetchLogs();
      }
    },
    [userId, fetchLogs]
  );

  return {
    logs,
    loading,
    error,
    refresh: fetchLogs,
    addLog,
    updateLog,
    deleteLog
  };
}
