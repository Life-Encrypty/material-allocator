import { read, write } from './store';
import { K } from './keys';
import { USERS } from '@/auth/session';
import type { Project, UserProject, Material, InventorySnapshot, InventoryRow } from '@/domain/types';

export function seedDatabase(): void {
  // Only seed if data doesn't exist
  const existingProjects = read<Project[]>(K.projects, []);
  if (existingProjects.length > 0) {
    return; // Already seeded
  }

  console.log('Seeding database with initial data...');

  const now = new Date().toISOString();

  // Seed projects
  const projects: Project[] = [
    {
      project_id: 'P1',
      name: 'Building A Foundation',
      priority: 10,
      status: 'In Progress',
      description: 'Foundation work for new residential building',
      deadline: '2024-03-15',
      created_at: now,
      updated_at: now,
    },
    {
      project_id: 'P2',
      name: 'Roofing Phase 1',
      priority: 5,
      status: 'Planning',
      description: 'Initial roofing installation and materials setup',
      deadline: '2024-04-01',
      created_at: now,
      updated_at: now,
    }
  ];

  // Seed memberships
  const memberships: UserProject[] = [
    {
      user_id: 'u1',
      project_id: 'P1',
      role: 'member',
      joined_at: now
    },
    {
      user_id: 'u2',
      project_id: 'P2',
      role: 'member',
      joined_at: now
    }
  ];

  // Seed materials
  const materials: Material[] = [
    {
      item_code: 'STL-001',
      name: 'Steel Beams - Grade 50',
      category: 'Structural',
      unit: 'pieces',
      description: 'High-grade structural steel beams',
      created_at: now,
      updated_at: now,
    },
    {
      item_code: 'CON-001',
      name: 'Concrete Mix - Premium',
      category: 'Materials',
      unit: 'tons',
      description: 'Premium concrete mix for foundations',
      created_at: now,
      updated_at: now,
    },
    {
      item_code: 'ELE-001',
      name: 'Electrical Wire - 12 AWG',
      category: 'Electrical',
      unit: 'meters',
      description: '12 AWG electrical wiring',
      created_at: now,
      updated_at: now,
    },
    {
      item_code: 'ROF-001',
      name: 'Roofing Tiles - Clay',
      category: 'Roofing',
      unit: 'pieces',
      description: 'Premium clay roofing tiles',
      created_at: now,
      updated_at: now,
    },
    {
      item_code: 'INS-001',
      name: 'Insulation Foam',
      category: 'Insulation',
      unit: 'rolls',
      description: 'High-performance insulation foam',
      created_at: now,
      updated_at: now,
    }
  ];

  // Create initial inventory snapshot
  const snapshot: InventorySnapshot = {
    snapshot_id: 'snap-initial',
    name: 'Initial Inventory',
    created_at: now,
    created_by: 'admin',
    is_active: true
  };

  // Seed inventory rows
  const inventoryRows: InventoryRow[] = [
    {
      id: 'inv-1',
      snapshot_id: 'snap-initial',
      item_code: 'STL-001',
      current_balance: 45,
      location: 'Warehouse A-1',
      notes: 'Good condition'
    },
    {
      id: 'inv-2',
      snapshot_id: 'snap-initial',
      item_code: 'CON-001',
      current_balance: 8,
      location: 'Storage B-3',
      notes: 'Low stock - reorder soon'
    },
    {
      id: 'inv-3',
      snapshot_id: 'snap-initial',
      item_code: 'ELE-001',
      current_balance: 156,
      location: 'Warehouse C-2',
      notes: 'Recently restocked'
    },
    {
      id: 'inv-4',
      snapshot_id: 'snap-initial',
      item_code: 'ROF-001',
      current_balance: 2340,
      location: 'Yard D-1',
      notes: 'Weather protected'
    },
    {
      id: 'inv-5',
      snapshot_id: 'snap-initial',
      item_code: 'INS-001',
      current_balance: 12,
      location: 'Storage A-4',
      notes: 'Temperature controlled'
    }
  ];

  // Write all data to localStorage
  write(K.projects, projects);
  write(K.memberships, memberships);
  write(K.materials, materials);
  write(K.requirements, []); // Start with empty requirements
  write(K.invSnapshots, [snapshot]);
  write(K.invActiveId, snapshot.snapshot_id);
  write(K.invRows(snapshot.snapshot_id), inventoryRows);

  console.log('Database seeded successfully');
}