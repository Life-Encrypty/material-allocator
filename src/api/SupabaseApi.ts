import { supabase } from '@/integrations/supabase/client';
import { allocateAll } from '@/logic/allocation';
import type { 
  Project, 
  Material, 
  InventoryRow, 
  InventorySnapshot, 
  ProjectRequirement, 
  ProjectItemComputed 
} from '@/domain/types';

class SupabaseApiService {
  // Projects
  async listProjects(): Promise<Project[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('priority', { ascending: true });
    
    if (error) {
      console.error('Error fetching projects:', error);
      return [];
    }
    
    return (data || []) as Project[];
  }

  async upsertProject(project: Project): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .upsert(project, { onConflict: 'project_id' });
    
    if (error) {
      console.error('Error upserting project:', error);
      throw error;
    }
  }

  async deleteProject(projectId: string): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('project_id', projectId);
    
    if (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  }

  // Materials
  async listMaterials(): Promise<Material[]> {
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .order('item_code', { ascending: true });
    
    if (error) {
      console.error('Error fetching materials:', error);
      return [];
    }
    
    return data || [];
  }

  async upsertMaterial(material: Material): Promise<void> {
    const { error } = await supabase
      .from('materials')
      .upsert(material, { onConflict: 'item_code' });
    
    if (error) {
      console.error('Error upserting material:', error);
      throw error;
    }
  }

  // Requirements
  async listRequirements(): Promise<ProjectRequirement[]> {
    const { data, error } = await supabase
      .from('project_requirements')
      .select('*');
    
    if (error) {
      console.error('Error fetching requirements:', error);
      return [];
    }
    
    return data || [];
  }

  async upsertRequirement(requirement: ProjectRequirement): Promise<void> {
    const { error } = await supabase
      .from('project_requirements')
      .upsert(requirement, { onConflict: 'id' });
    
    if (error) {
      console.error('Error upserting requirement:', error);
      throw error;
    }
  }

  async deleteRequirement(requirementId: string): Promise<void> {
    const { error } = await supabase
      .from('project_requirements')
      .delete()
      .eq('id', requirementId);
    
    if (error) {
      console.error('Error deleting requirement:', error);
      throw error;
    }
  }

  // Inventory Snapshots
  async listSnapshots(): Promise<InventorySnapshot[]> {
    const { data, error } = await supabase
      .from('inventory_snapshots')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching snapshots:', error);
      return [];
    }
    
    return data || [];
  }

  async getSnapshotRows(snapshotId: string): Promise<InventoryRow[]> {
    const { data, error } = await supabase
      .from('inventory_rows')
      .select('*')
      .eq('snapshot_id', snapshotId);
    
    if (error) {
      console.error('Error fetching snapshot rows:', error);
      return [];
    }
    
    return data || [];
  }

  async getActiveSnapshotId(): Promise<string | null> {
    const { data, error } = await supabase
      .from('inventory_snapshots')
      .select('snapshot_id')
      .eq('is_active', true)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No active snapshot found
        return null;
      }
      console.error('Error fetching active snapshot:', error);
      return null;
    }
    
    return data?.snapshot_id || null;
  }

  async setActiveSnapshot(snapshot: InventorySnapshot): Promise<void> {
    // The database trigger will handle deactivating other snapshots
    const { error } = await supabase
      .from('inventory_snapshots')
      .upsert({ ...snapshot, is_active: true }, { onConflict: 'snapshot_id' });
    
    if (error) {
      console.error('Error setting active snapshot:', error);
      throw error;
    }
  }

  async upsertInventoryRow(row: InventoryRow): Promise<void> {
    const { error } = await supabase
      .from('inventory_rows')
      .upsert(row, { onConflict: 'id' });
    
    if (error) {
      console.error('Error upserting inventory row:', error);
      throw error;
    }
  }

  async upsertInventoryRows(rows: InventoryRow[]): Promise<void> {
    if (rows.length === 0) return;
    
    const { error } = await supabase
      .from('inventory_rows')
      .upsert(rows);
    
    if (error) {
      console.error('Error upserting inventory rows:', error);
      throw error;
    }
  }

  // Computed allocation results
  async getComputedPerProject(): Promise<ProjectItemComputed[]> {
    const projects = await this.listProjects();
    const requirements = await this.listRequirements();
    const inventory = await this.getCurrentInventory();
    
    return allocateAll({
      projects,
      inventory,
      requirements
    });
  }

  // Helper method to get current inventory for all items
  async getCurrentInventory(): Promise<InventoryRow[]> {
    const activeSnapshotId = await this.getActiveSnapshotId();
    return activeSnapshotId ? await this.getSnapshotRows(activeSnapshotId) : [];
  }

  // Search projects by name, id, or metadata
  async searchProjects(query: string): Promise<Project[]> {
    if (!query.trim()) return this.listProjects();
    
    const searchTerm = `%${query.toLowerCase()}%`;
    
    // Search in name and project_id
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .or(`name.ilike.${searchTerm},project_id.ilike.${searchTerm}`)
      .order('priority', { ascending: true });
    
    if (error) {
      console.error('Error searching projects:', error);
      return [];
    }
    
    // Also search in metadata fields (client-side)
    const allProjects = await this.listProjects();
    const metaMatches = allProjects.filter(project => {
      if (project.meta) {
        return Object.values(project.meta).some(value => 
          value && value.toLowerCase().includes(query.toLowerCase())
        );
      }
      return false;
    });
    
    // Combine and deduplicate results
    const combined = [...((data || []) as Project[]), ...metaMatches];
    const uniqueProjects = Array.from(
      new Map(combined.map(p => [p.project_id, p])).values()
    );
    
    return uniqueProjects;
  }

  // Get item availability in other batches (excluding specified batch)
  async getItemAvailabilityInOtherBatches(
    itemCode: string, 
    excludeBatch: string
  ): Promise<InventoryRow[]> {
    const inventory = await this.getCurrentInventory();
    return inventory.filter(row => 
      row.item_code === itemCode && 
      row.batch_number !== excludeBatch &&
      row.current_balance > 0
    );
  }
}

export const SupabaseApi = new SupabaseApiService();
