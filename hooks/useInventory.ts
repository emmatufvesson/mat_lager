import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../services/supabaseClient';
import type { InventoryItem } from '../types';

type InventoryRow = {
  id: string;
  user_id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string | null;
  expiry_date: string | null;
  price_info: number | null;
  added_at: string;
  source: InventoryItem['source'];
};

interface UseInventoryResult {
  items: InventoryItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const mapRowToInventory = (row: InventoryRow): InventoryItem => ({
  id: row.id,
  name: row.name,
  quantity: row.quantity,
  unit: row.unit,
  category: row.category ?? 'Övrigt',
  expiryDate: row.expiry_date ?? '',
  priceInfo: row.price_info ?? undefined,
  addedDate: row.added_at,
  source: row.source,
});

export function useInventory(userId: string | null): UseInventoryResult {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInventory = useCallback(async () => {
    if (!userId) {
      setItems([]);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('user_id', userId)
      .order('added_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setItems([]);
    } else {
      const mapped = (data as InventoryRow[]).map(mapRowToInventory);
      setItems(mapped);
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('inventory_items_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_items',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchInventory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchInventory, userId]);

  return { items, loading, error, refresh: fetchInventory };
}
