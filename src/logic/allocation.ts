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
  
  // Create inventory balance map by item_code and batch_number
  const inventoryMap = new Map<string, number>();
  inventory.forEach(row => {
    const key = `${row.item_code}_${row.batch_number}`;
    const current = inventoryMap.get(key) || 0;
    inventoryMap.set(key, current + row.current_balance);
  });
  
  // Filter out excluded requirements for allocation calculation
  const nonExcludedRequirements = requirements.filter(req => !req.exclude_from_allocation);
  
  // Group non-excluded requirements by item_code
  const itemGroups = new Map<string, ProjectRequirement[]>();
  nonExcludedRequirements.forEach(req => {
    const existing = itemGroups.get(req.item_code) || [];
    existing.push(req);
    itemGroups.set(req.item_code, existing);
  });
  
  // Process each item_code group
  itemGroups.forEach((itemRequirements, itemCode) => {
    // Sort projects by priority (0 = highest priority), then project_id asc
    const sortedRequirements = itemRequirements.sort((a, b) => {
      const priorityA = projectPriorityMap.get(a.project_id) ?? 999;
      const priorityB = projectPriorityMap.get(b.project_id) ?? 999;
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB; // Lower number = higher priority (0 is highest)
      }
      
      return a.project_id.localeCompare(b.project_id); // Then by project_id asc
    });
    
    // Group requirements by project budget item for batch filtering
    const projectBatches = new Map<string, string>();
    sortedRequirements.forEach(req => {
      const project = projects.find(p => p.project_id === req.project_id);
      const budgetItem = project?.meta?.['بند الميزانية'] || '';
      projectBatches.set(req.project_id, budgetItem);
    });
    
    // Calculate available balance per batch for this item
    const batchBalances = new Map<string, number>();
    projectBatches.forEach((budgetItem, projectId) => {
      if (budgetItem) {
        const inventoryKey = `${itemCode}_${budgetItem}`;
        const balance = inventoryMap.get(inventoryKey) || 0;
        batchBalances.set(budgetItem, balance);
      }
    });
    
    // Distribute available balance to projects in priority order
    sortedRequirements.forEach(req => {
      const priority = projectPriorityMap.get(req.project_id) ?? 999;
      const netRequired = Math.max(0, req.required_qty - req.withdrawn_qty);
      const projectBudgetItem = projectBatches.get(req.project_id) || '';
      
      // Get available balance for this project's budget batch
      let availableBatchBalance = 0;
      if (projectBudgetItem) {
        availableBatchBalance = batchBalances.get(projectBudgetItem) || 0;
      }
      
      // Allocate what we can from available batch balance
      const allocatable = Math.min(netRequired, availableBatchBalance);
      
      // Update remaining batch balance
      if (projectBudgetItem) {
        batchBalances.set(projectBudgetItem, availableBatchBalance - allocatable);
      }
      
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
  
  // Add excluded requirements with zero allocatable/missing quantities
  const excludedRequirements = requirements.filter(req => req.exclude_from_allocation);
  excludedRequirements.forEach(req => {
    const priority = projectPriorityMap.get(req.project_id) ?? 999;
    result.push({
      project_id: req.project_id,
      item_code: req.item_code,
      required_qty: req.required_qty,
      withdrawn_qty: req.withdrawn_qty,
      allocatable_qty: 0,
      missing_qty: 0,
      priority
    });
  });
  
  return result;
}