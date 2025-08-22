import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox } from '@/components/ui/combobox';
import { ArrowLeft, Plus, Trash2, Filter, Download } from 'lucide-react';
import { FakeApi } from '@/api/FakeApi';
import { ProjectMetadataPanel } from '@/components/ProjectMetadataPanel';
import { toast } from 'sonner';
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
    const uniqueItems = new Map<string, string>();
    
    // Add items from current inventory only (active snapshot)
    inventory.forEach(row => {
      const material = materials.find(m => m.item_code === row.item_code);
      const label = material ? `${row.item_code} - ${material.name}` : row.item_code;
      uniqueItems.set(row.item_code, label);
    });
    
    return Array.from(uniqueItems.entries()).map(([value, label]) => ({ value, label }));
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
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredRequirements.length} requirement(s)
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
                    <Combobox
                      options={getInventoryOptions()}
                      value={req.item_code}
                      onValueChange={(value) => updateRequirement(req, 'item_code', value)}
                      placeholder="Select item..."
                      searchPlaceholder="Search inventory items..."
                      emptyText="No items found in active inventory."
                      className="border-none p-1 h-8 min-w-[200px]"
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {getMaterialDescription(req.item_code)}
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
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  {showMissingOnly ? 'No requirements with missing quantities' : 'No requirements found'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ProjectDetail;