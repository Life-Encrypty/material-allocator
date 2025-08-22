export interface Project {
  project_id: string;
  name: string;
  priority: number;
  status: 'Planning' | 'In Progress' | 'Completed' | 'On Hold';
  created_at: string;
  updated_at: string;
  description?: string;
  deadline?: string;
}

export interface UserProject {
  user_id: string;
  project_id: string;
  role: 'owner' | 'member';
  joined_at: string;
}

export interface Material {
  item_code: string;
  name: string;
  category: string;
  unit: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryRow {
  id: string;
  snapshot_id: string;
  item_code: string;
  current_balance: number;
  location?: string;
  notes?: string;
}

export interface InventorySnapshot {
  snapshot_id: string;
  name: string;
  created_at: string;
  created_by: string;
  is_active: boolean;
}

export interface ProjectRequirement {
  id: string;
  project_id: string;
  item_code: string;
  required_qty: number;
  withdrawn_qty: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectItemComputed {
  project_id: string;
  item_code: string;
  required_qty: number;
  withdrawn_qty: number;
  allocatable_qty: number;
  missing_qty: number;
  priority: number;
}