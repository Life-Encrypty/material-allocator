import type { Project, InventoryRow, ProjectRequirement, ProjectItemComputed } from '@/domain/types';

interface AllocationInput {
  projects: Project[];
  inventory: InventoryRow[];
  requirements: ProjectRequirement[];
}

export function allocateAll({ projects, inventory, requirements }: AllocationInput): ProjectItemComputed[] {
  const result: ProjectItemComputed[] = [];
  
  // Create project priority map for fast lookup
  const projectPriorityMap = new Map<string, number>();
  projects.forEach(p => projectPriorityMap.set(p.project_id, p.priority));
  
  // Create inventory balance map by item_code
  const inventoryMap = new Map<string, number>();
  inventory.forEach(row => {
    const current = inventoryMap.get(row.item_code) || 0;
    inventoryMap.set(row.item_code, current + row.current_balance);
  });
  
  // Group requirements by item_code
  const itemGroups = new Map<string, ProjectRequirement[]>();
  requirements.forEach(req => {
    const existing = itemGroups.get(req.item_code) || [];
    existing.push(req);
    itemGroups.set(req.item_code, existing);
  });
  
  // Process each item_code group
  itemGroups.forEach((itemRequirements, itemCode) => {
    // Sort projects by priority desc, then project_id asc
    const sortedRequirements = itemRequirements.sort((a, b) => {
      const priorityA = projectPriorityMap.get(a.project_id) || 0;
      const priorityB = projectPriorityMap.get(b.project_id) || 0;
      
      if (priorityA !== priorityB) {
        return priorityB - priorityA; // Higher priority first
      }
      
      return a.project_id.localeCompare(b.project_id); // Then by project_id asc
    });
    
    // Available inventory for this item
    let availableBalance = inventoryMap.get(itemCode) || 0;
    
    // Distribute available balance to projects in priority order
    sortedRequirements.forEach(req => {
      const priority = projectPriorityMap.get(req.project_id) || 0;
      const netRequired = Math.max(0, req.required_qty - req.withdrawn_qty);
      
      // Allocate what we can from available balance
      const allocatable = Math.min(netRequired, availableBalance);
      availableBalance -= allocatable;
      
      // Calculate missing quantity
      const missing = Math.max(0, netRequired - allocatable);
      
      result.push({
        project_id: req.project_id,
        item_code: req.item_code,
        required_qty: req.required_qty,
        withdrawn_qty: req.withdrawn_qty,
        allocatable_qty: allocatable,
        missing_qty: missing,
        priority
      });
    });
  });
  
  return result;
}