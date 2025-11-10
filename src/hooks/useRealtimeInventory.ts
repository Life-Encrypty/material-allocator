import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { InventoryRow } from '@/domain/types';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UseRealtimeInventoryProps {
  snapshotId: string | null;
  onInsert?: (row: InventoryRow) => void;
  onUpdate?: (row: InventoryRow) => void;
  onDelete?: (rowId: string) => void;
}

export const useRealtimeInventory = ({
  snapshotId,
  onInsert,
  onUpdate,
  onDelete,
}: UseRealtimeInventoryProps) => {
  useEffect(() => {
    if (!snapshotId) return;

    const channel = supabase
      .channel('inventory-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'inventory_rows',
          filter: `snapshot_id=eq.${snapshotId}`,
        },
        (payload: RealtimePostgresChangesPayload<InventoryRow>) => {
          if (onInsert && payload.new) {
            onInsert(payload.new as InventoryRow);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'inventory_rows',
          filter: `snapshot_id=eq.${snapshotId}`,
        },
        (payload: RealtimePostgresChangesPayload<InventoryRow>) => {
          if (onUpdate && payload.new) {
            onUpdate(payload.new as InventoryRow);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'inventory_rows',
          filter: `snapshot_id=eq.${snapshotId}`,
        },
        (payload: RealtimePostgresChangesPayload<InventoryRow>) => {
          if (onDelete && payload.old) {
            onDelete((payload.old as InventoryRow).id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [snapshotId, onInsert, onUpdate, onDelete]);
};
