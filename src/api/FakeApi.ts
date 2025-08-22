import { read, write } from '@/storage/store';
import { K } from '@/storage/keys';
import { allocateAll } from '@/logic/allocation';
import type { 
  Project, 
  UserProject, 
  Material, 
  InventoryRow, 
  InventorySnapshot, 
  ProjectRequirement, 
  ProjectItemComputed 
} from '@/domain/types';

class FakeApiService {
  // Projects
  listProjects(): Project[] {
    return read<Project[]>(K.projects, []);
  }

  upsertProject(project: Project): void {
    const projects = this.listProjects();
    const existingIndex = projects.findIndex(p => p.project_id === project.project_id);
    
    const updatedProject = {
      ...project,
      updated_at: new Date().toISOString()
    };
    
    if (existingIndex >= 0) {
      projects[existingIndex] = updatedProject;
    } else {
      projects.push({
        ...updatedProject,
        created_at: new Date().toISOString()
      });
    }
    
    write(K.projects, projects);
  }

  // Memberships
  listMemberships(): UserProject[] {
    return read<UserProject[]>(K.memberships, []);
  }

  setMemberships(memberships: UserProject[]): void {
    write(K.memberships, memberships);
  }

  // Materials
  listMaterials(): Material[] {
    return read<Material[]>(K.materials, []);
  }

  upsertMaterial(material: Material): void {
    const materials = this.listMaterials();
    const existingIndex = materials.findIndex(m => m.item_code === material.item_code);
    
    const updatedMaterial = {
      ...material,
      updated_at: new Date().toISOString()
    };
    
    if (existingIndex >= 0) {
      materials[existingIndex] = updatedMaterial;
    } else {
      materials.push({
        ...updatedMaterial,
        created_at: new Date().toISOString()
      });
    }
    
    write(K.materials, materials);
  }

  // Requirements
  listRequirements(): ProjectRequirement[] {
    return read<ProjectRequirement[]>(K.requirements, []);
  }

  upsertRequirement(requirement: ProjectRequirement): void {
    const requirements = this.listRequirements();
    const existingIndex = requirements.findIndex(r => r.id === requirement.id);
    
    const updatedRequirement = {
      ...requirement,
      updated_at: new Date().toISOString()
    };
    
    if (existingIndex >= 0) {
      requirements[existingIndex] = updatedRequirement;
    } else {
      requirements.push({
        ...updatedRequirement,
        created_at: new Date().toISOString()
      });
    }
    
    write(K.requirements, requirements);
  }

  // Inventory Snapshots
  listSnapshots(): InventorySnapshot[] {
    return read<InventorySnapshot[]>(K.invSnapshots, []);
  }

  getSnapshotRows(snapshotId: string): InventoryRow[] {
    return read<InventoryRow[]>(K.invRows(snapshotId), []);
  }

  getActiveSnapshotId(): string | null {
    return read<string | null>(K.invActiveId, null);
  }

  setActiveSnapshot(snapshot: InventorySnapshot): void {
    // Update or create snapshot
    const snapshots = this.listSnapshots();
    const existingIndex = snapshots.findIndex(s => s.snapshot_id === snapshot.snapshot_id);
    
    // Deactivate all other snapshots
    snapshots.forEach(s => s.is_active = false);
    
    const activeSnapshot = { ...snapshot, is_active: true };
    
    if (existingIndex >= 0) {
      snapshots[existingIndex] = activeSnapshot;
    } else {
      snapshots.push(activeSnapshot);
    }
    
    write(K.invSnapshots, snapshots);
    write(K.invActiveId, snapshot.snapshot_id);
  }

  upsertInventoryRow(row: InventoryRow): void {
    const rows = this.getSnapshotRows(row.snapshot_id);
    const existingIndex = rows.findIndex(r => r.id === row.id);
    
    if (existingIndex >= 0) {
      rows[existingIndex] = row;
    } else {
      rows.push(row);
    }
    
    write(K.invRows(row.snapshot_id), rows);
  }

  // Computed allocation results
  getComputedPerProject(): ProjectItemComputed[] {
    const projects = this.listProjects();
    const requirements = this.listRequirements();
    const activeSnapshotId = this.getActiveSnapshotId();
    
    const inventory = activeSnapshotId ? this.getSnapshotRows(activeSnapshotId) : [];
    
    return allocateAll({
      projects,
      inventory,
      requirements
    });
  }

  // Helper method to get current inventory for all items
  getCurrentInventory(): InventoryRow[] {
    const activeSnapshotId = this.getActiveSnapshotId();
    return activeSnapshotId ? this.getSnapshotRows(activeSnapshotId) : [];
  }

  // Get projects for a specific user
  getUserProjects(userId: string): Project[] {
    const memberships = this.listMemberships();
    const projects = this.listProjects();
    const userProjectIds = memberships
      .filter(m => m.user_id === userId)
      .map(m => m.project_id);
    
    return projects.filter(p => userProjectIds.includes(p.project_id));
  }
}

export const FakeApi = new FakeApiService();