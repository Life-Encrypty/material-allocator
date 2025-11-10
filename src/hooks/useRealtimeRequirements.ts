import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ProjectRequirement } from '@/domain/types';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UseRealtimeRequirementsProps {
  projectId?: string;
  onInsert?: (requirement: ProjectRequirement) => void;
  onUpdate?: (requirement: ProjectRequirement) => void;
  onDelete?: (requirementId: string) => void;
}

export const useRealtimeRequirements = ({
  projectId,
  onInsert,
  onUpdate,
  onDelete,
}: UseRealtimeRequirementsProps) => {
  useEffect(() => {
    const filter = projectId ? `project_id=eq.${projectId}` : undefined;

    const channel = supabase
      .channel('requirements-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_requirements',
          ...(filter && { filter }),
        },
        (payload: RealtimePostgresChangesPayload<ProjectRequirement>) => {
          if (onInsert && payload.new) {
            onInsert(payload.new as ProjectRequirement);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'project_requirements',
          ...(filter && { filter }),
        },
        (payload: RealtimePostgresChangesPayload<ProjectRequirement>) => {
          if (onUpdate && payload.new) {
            onUpdate(payload.new as ProjectRequirement);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'project_requirements',
          ...(filter && { filter }),
        },
        (payload: RealtimePostgresChangesPayload<ProjectRequirement>) => {
          if (onDelete && payload.old) {
            onDelete((payload.old as ProjectRequirement).id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, onInsert, onUpdate, onDelete]);
};
