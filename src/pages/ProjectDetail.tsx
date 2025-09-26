import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox } from '@/components/ui/combobox';
import { ArrowLeft, Plus, Trash2, Filter, Download, Upload, FileDown, AlertTriangle } from 'lucide-react';
import { FakeApi } from '@/api/FakeApi';
import { ProjectMetadataPanel } from '@/components/ProjectMetadataPanel';
import { ImportProjectModal } from '@/components/ImportProjectModal';
import { SearchableCombobox } from '@/components/SearchableCombobox';
import { OtherBatchesDialog } from '@/components/OtherBatchesDialog';
import { toast } from 'sonner';
import { exportProjectTemplate, type ProjectWorkbookResult } from '@/utils/xlsx';
import type { Project, ProjectRequirement, Material, ProjectItemComputed, InventoryRow } from '@/domain/types';

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [requirements, setRequirements] = useState<ProjectRequirement[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [computedData, setComputedData] = useState<ProjectItemComputed[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [showMissingOnly, setShowMissingOnly] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showOtherBatchesModal, setShowOtherBatchesModal] = useState(false);
  const [selectedItemForBatches, setSelectedItemForBatches] = useState<{
    itemCode: string;
    otherBatches: InventoryRow[];
  } | null>(null);

  useEffect(() => {
    if (!id) return;
    
    // Load project
    const projects = FakeApi.listProjects();
    const foundProject = projects.find(p => p.project_id === id);
    if (!foundProject) {
      navigate('/projects');
      return;
    }
    setProject(foundProject);

    // Load data
    loadData();
  }, [id, navigate]);

  const loadData = () => {
    if (!id) return;
    
    const reqs = FakeApi.listRequirements().filter(r => r.project_id === id);
    setRequirements(reqs);
    
    const mats = FakeApi.listMaterials();
    setMaterials(mats);
    
    const inv = FakeApi.getCurrentInventory();
    setInventory(inv);
    
    const computed = FakeApi.getComputedPerProject().filter(c => c.project_id === id);
    setComputedData(computed);
  };

  const getMaterialDescription = (itemCode: string): string => {
    const material = materials.find(m => m.item_code === itemCode);
    return material?.description || '';
  };

  const getComputedValues = (itemCode: string) => {
    const computed = computedData.find(c => c.item_code === itemCode);
    return {
      allocatable_qty: computed?.allocatable_qty || 0,
      missing_qty: computed?.missing_qty || 0
    };
  };

  const updateRequirement = (requirement: ProjectRequirement, field: keyof ProjectRequirement, value: any) => {
    const updated = { ...requirement, [field]: value };
    
    // Clamp withdrawn_qty to 0..required_qty and show warning if clamped
    if (field === 'withdrawn_qty' || field === 'required_qty') {
      const requiredQty = field === 'required_qty' ? value : updated.required_qty;
      const withdrawnQty = field === 'withdrawn_qty' ? value : updated.withdrawn_qty;
      
      const clampedWithdrawn = Math.max(0, Math.min(withdrawnQty, requiredQty));
      
      if (field === 'withdrawn_qty' && withdrawnQty > requiredQty) {
        toast.error(`Withdrawn quantity cannot exceed required quantity (${requiredQty}). Value clamped to ${requiredQty}.`);
      }
      
      updated.withdrawn_qty = clampedWithdrawn;
    }
    
    FakeApi.upsertRequirement(updated);
    loadData();
    toast.success('Requirement updated');
  };

  const addRequirement = () => {
    if (!project) return;
    
    const newReq: ProjectRequirement = {
      id: `req_${Date.now()}`,
      project_id: project.project_id,
      item_code: '',
      required_qty: 0,
      withdrawn_qty: 0,
      exclude_from_allocation: false,
      notes: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    FakeApi.upsertRequirement(newReq);
    loadData();
    toast.success('Requirement added');
  };

  const deleteRequirement = (reqId: string) => {
    FakeApi.deleteRequirement(reqId);
    loadData();
    toast.success('Requirement deleted');
  };

  const filteredRequirements = showMissingOnly 
    ? requirements.filter(req => !req.exclude_from_allocation && getComputedValues(req.item_code).missing_qty > 0)
    : requirements;

  const getInventoryOptions = () => {
    const options: Array<{ value: string; label: string; subtitle?: string }> = [];
    
    // Add items from current inventory only (active snapshot)
    inventory.forEach(row => {
      const material = materials.find(m => m.item_code === row.item_code);
      const description = material?.description || material?.name || '';
      
      options.push({
        value: row.item_code,
        label: row.item_code,
        subtitle: description
      });
    });
    
    return options;
  };

  const getDescriptionOptions = () => {
    const descriptionMap = new Map<string, { description: string; item_codes: string[] }>();
    
    // Group by description
    inventory.forEach(row => {
      const material = materials.find(m => m.item_code === row.item_code);
      const description = material?.description || material?.name || '';
      
      if (description) {
        if (descriptionMap.has(description)) {
          descriptionMap.get(description)!.item_codes.push(row.item_code);
        } else {
          descriptionMap.set(description, { description, item_codes: [row.item_code] });
        }
      }
    });
    
    return Array.from(descriptionMap.values()).map(({ description, item_codes }) => ({
      value: description,
      label: description,
      subtitle: item_codes.length > 1 ? `Multiple codes: ${item_codes.join(', ')}` : item_codes[0]
    }));
  };

  const handleDescriptionSelect = (description: string, requirement: ProjectRequirement) => {
    // Find the item_code(s) associated with this description
    const material = materials.find(m => 
      (m.description || m.name || '') === description
    );
    
    if (material) {
      // Update both description and item_code
      updateRequirement(requirement, 'item_code', material.item_code);
    }
  };

  const handleItemCodeSelect = (item_code: string, requirement: ProjectRequirement) => {
    // Auto-fill description when item_code is selected
    updateRequirement(requirement, 'item_code', item_code);
  };

  const getOtherBatchesQuantity = (itemCode: string): number => {
    if (!itemCode || !project?.meta?.['بند الميزانية']) return 0;
    
    const otherBatches = FakeApi.getItemAvailabilityInOtherBatches(
      itemCode, 
      project.meta['بند الميزانية']
    );
    
    return otherBatches.reduce((sum, batch) => sum + batch.current_balance, 0);
  };

  const handleShowOtherBatches = (itemCode: string) => {
    if (!itemCode || !project?.meta?.['بند الميزانية']) return;
    
    const otherBatches = FakeApi.getItemAvailabilityInOtherBatches(
      itemCode, 
      project.meta['بند الميزانية']
    );
    
    setSelectedItemForBatches({ itemCode, otherBatches });
    setShowOtherBatchesModal(true);
  };

  const exportToCSV = () => {
    if (!project) return;
    
    const csvData = filteredRequirements.map(req => {
      const computed = getComputedValues(req.item_code);
      return {
        'Complete/Exclude': req.exclude_from_allocation ? 'Yes' : 'No',
        'Item Code': req.item_code,
        'Description': getMaterialDescription(req.item_code),
        'Required Qty': req.required_qty,
        'Withdrawn Qty': req.withdrawn_qty,
        'Allocatable Qty': req.exclude_from_allocation ? 0 : computed.allocatable_qty,
        'Missing Qty': req.exclude_from_allocation ? 0 : computed.missing_qty,
        'Notes': req.notes || ''
      };
    });

    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => 
        `"${row[header as keyof typeof row]}"`.replace(/"/g, '""')
      ).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `project_${project.project_id}_requirements.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Requirements exported to CSV');
  };

  const handleImportProject = (result: ProjectWorkbookResult) => {
    if (!project) return;

    // Import requirements
    result.requirements.forEach(reqData => {
      const existing = requirements.find(r => r.item_code === reqData.item_code);
      const timestamp = new Date().toISOString();
      
      const requirement: ProjectRequirement = {
        id: existing?.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...reqData,
        created_at: existing?.created_at || timestamp,
        updated_at: timestamp
      };
      
      FakeApi.upsertRequirement(requirement);
    });

    // Import metadata (handle [CLEAR] markers)
    const updatedProject = { ...project };
    if (!updatedProject.meta) updatedProject.meta = {};

    Object.entries(result.metadata).forEach(([key, value]) => {
      if (key.startsWith('[CLEAR]')) {
        const fieldName = key.replace('[CLEAR]', '');
        delete updatedProject.meta![fieldName as keyof typeof updatedProject.meta];
      } else {
        (updatedProject.meta as any)[key] = value;
      }
    });

    FakeApi.upsertProject(updatedProject);
    
    // Refresh data
    loadData();
    onProjectUpdated();
    
    toast.success(`Imported ${result.requirements.length} requirements and updated metadata`);
  };

  const handleExportTemplate = async () => {
    if (!project) return;
    
    try {
      await exportProjectTemplate(project, requirements);
      toast.success('Project template exported');
    } catch (error) {
      toast.error('Failed to export template');
    }
  };

  const onProjectUpdated = () => {
    if (!id) return;
    const projects = FakeApi.listProjects();
    const updatedProject = projects.find(p => p.project_id === id);
    if (updatedProject) {
      setProject(updatedProject);
    }
  };

  if (!project) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/projects')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <div className="flex items-center space-x-4 mt-2">
              <Badge variant="outline">ID: {project.project_id}</Badge>
              <Badge variant="secondary">Priority: {project.priority}</Badge>
              <Badge 
                variant={project.status === 'Completed' ? 'default' : 'outline'}
              >
                {project.status}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Project Metadata Panel */}
      <ProjectMetadataPanel project={project} onProjectUpdated={onProjectUpdated} />

      {/* Budget Item Warning */}
      {!project.meta?.['بند الميزانية'] && (
        <div className="bg-warning/10 border-l-4 border-l-warning p-4 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-warning mr-2" />
            <div>
              <h3 className="font-medium text-warning">Budget Item Required</h3>
              <p className="text-sm text-muted-foreground">
                Set a budget item in project metadata to enable inventory allocation based on batch numbers.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button onClick={addRequirement} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Row
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowMissingOnly(!showMissingOnly)}
            className={showMissingOnly ? 'bg-primary/10' : ''}
          >
            <Filter className="h-4 w-4 mr-2" />
            {showMissingOnly ? 'Show All' : 'Only Missing > 0'}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={exportToCSV}
            disabled={filteredRequirements.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowImportModal(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import XLSX
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleExportTemplate}
          >
            <FileDown className="h-4 w-4 mr-2" />
            Download Template
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredRequirements.length} requirement(s) • Budget Item: <span className="font-medium">{project.meta?.['بند الميزانية'] || 'Not set'}</span>
        </div>
      </div>

      {/* Requirements Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Complete/Exclude</TableHead>
              <TableHead>Item Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Available Batch</TableHead>
              <TableHead>Other Batches</TableHead>
              <TableHead>Required Qty</TableHead>
              <TableHead>Withdrawn Qty</TableHead>
              <TableHead>Allocatable Qty</TableHead>
              <TableHead>Missing Qty</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequirements.map((req) => {
              const computed = getComputedValues(req.item_code);
              const isExcluded = req.exclude_from_allocation;
              const hasMissingQty = !isExcluded && computed.missing_qty > 0;
              
              return (
                <TableRow 
                  key={req.id} 
                  className={`${isExcluded ? 'opacity-60 bg-muted/50' : ''} ${hasMissingQty ? 'bg-destructive/10 border-l-4 border-l-destructive' : ''}`}
                >
                  <TableCell>
                    <Checkbox
                      checked={isExcluded || false}
                      onCheckedChange={(checked) => updateRequirement(req, 'exclude_from_allocation', checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <SearchableCombobox
                      options={getInventoryOptions()}
                      value={req.item_code}
                      onValueChange={(value) => handleItemCodeSelect(value, req)}
                      placeholder="Select item code..."
                      emptyText="No items found in active inventory."
                      className="border-none p-1 h-auto min-w-[200px]"
                      disabled={isExcluded}
                    />
                  </TableCell>
                  <TableCell>
                    <SearchableCombobox
                      options={getDescriptionOptions()}
                      value={getMaterialDescription(req.item_code)}
                      onValueChange={(value) => handleDescriptionSelect(value, req)}
                      placeholder="Select description..."
                      emptyText="No descriptions found."
                      className="border-none p-1 h-auto min-w-[200px]"
                      disabled={isExcluded}
                    />
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const projectBudgetItem = project?.meta?.['بند الميزانية'];
                      const matchingInventory = inventory.filter(inv => 
                        inv.item_code === req.item_code && inv.batch_number === projectBudgetItem
                      );
                      const totalAvailable = matchingInventory.reduce((sum, inv) => sum + inv.current_balance, 0);
                      
                      return (
                        <div className="text-sm">
                          {projectBudgetItem ? (
                            <div>
                              <div className="font-medium">{projectBudgetItem}</div>
                              <div className="text-xs text-muted-foreground">
                                Available: {totalAvailable}
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">No budget item set</div>
                          )}
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const otherBatchesQty = getOtherBatchesQuantity(req.item_code);
                      
                      if (!req.item_code || otherBatchesQty === 0) {
                        return <div className="text-xs text-muted-foreground">-</div>;
                      }

                      return (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleShowOtherBatches(req.item_code)}
                          className="h-7 px-2 text-xs"
                          disabled={isExcluded}
                        >
                          Check ({otherBatchesQty})
                        </Button>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={req.required_qty}
                      onChange={(e) => updateRequirement(req, 'required_qty', Number(e.target.value))}
                      className="border-none p-1 h-8 w-20"
                      disabled={isExcluded}
                      min="0"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={req.withdrawn_qty}
                      onChange={(e) => updateRequirement(req, 'withdrawn_qty', Number(e.target.value))}
                      className="border-none p-1 h-8 w-20"
                      disabled={isExcluded}
                      min="0"
                      max={req.required_qty}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant={isExcluded ? 'outline' : 'secondary'}>
                      {isExcluded ? 'Excluded' : computed.allocatable_qty}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={isExcluded ? 'outline' : (computed.missing_qty > 0 ? 'destructive' : 'default')}
                    >
                      {isExcluded ? 'Excluded' : computed.missing_qty}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={req.notes || ''}
                      onChange={(e) => updateRequirement(req, 'notes', e.target.value)}
                      className="border-none p-1 h-8"
                      placeholder="Add notes..."
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteRequirement(req.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredRequirements.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  {showMissingOnly ? 'No requirements with missing quantities' : 'No requirements found'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Import Modal */}
      <ImportProjectModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportProject}
        projectId={project.project_id}
      />

      {/* Other Batches Dialog */}
      <OtherBatchesDialog
        isOpen={showOtherBatchesModal}
        onClose={() => setShowOtherBatchesModal(false)}
        itemCode={selectedItemForBatches?.itemCode || ''}
        otherBatches={selectedItemForBatches?.otherBatches || []}
      />
    </div>
  );
};

export default ProjectDetail;