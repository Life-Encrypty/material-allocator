import { read, write } from './store';
import { K } from './keys';
import { USERS } from '@/auth/session';
import type { Project, UserProject, Material, InventorySnapshot, InventoryRow } from '@/domain/types';

export function seedDatabase(): void {
  // Initialize empty data structures if they don't exist
  const existingProjects = read<Project[]>(K.projects, []);
  const existingMaterials = read<Material[]>(K.materials, []);
  const existingSnapshots = read<InventorySnapshot[]>(K.invSnapshots, []);
  
  // Only initialize empty arrays if data doesn't exist
  if (existingProjects.length === 0) {
    write(K.projects, []);
    write(K.memberships, []);
  }
  
  if (existingMaterials.length === 0) {
    write(K.materials, []);
  }
  
  write(K.requirements, []); // Always start with empty requirements
  
  if (existingSnapshots.length === 0) {
    write(K.invSnapshots, []);
    write(K.invActiveId, null);
  }

  console.log('Database initialized with empty data structures');
}