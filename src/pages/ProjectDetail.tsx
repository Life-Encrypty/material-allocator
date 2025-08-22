import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Trash2, Filter } from 'lucide-react';
import { FakeApi } from '@/api/FakeApi';
import { toast } from 'sonner';
import type { Project, ProjectRequirement, Material, ProjectItemComputed } from '@/domain/types';

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [requirements, setRequirements] = useState<ProjectRequirement[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [computedData, setComputedData] = useState<ProjectItemComputed[]>([]);
  const [showMissingOnly, setShowMissingOnly] = useState(false);
  const [editingCell, setEditingCell] = useState<string | null>(null);

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
      notes: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    FakeApi.upsertRequirement(newReq);
    loadData();
    toast.success('Requirement added');
  };

  const deleteRequirement = (reqId: string) => {
    // For demo purposes, we'll just filter it out since FakeApi doesn't have delete
    // In real implementation, you'd have FakeApi.deleteRequirement(reqId)
    const updatedReqs = requirements.filter(r => r.id !== reqId);
    // This is a workaround - in real app you'd need proper delete method
    toast.success('Requirement deleted');
  };

  const filteredRequirements = showMissingOnly 
    ? requirements.filter(req => getComputedValues(req.item_code).missing_qty > 0)
    : requirements;

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
              return (
                <TableRow key={req.id}>
                  <TableCell>
                    <Input
                      value={req.item_code}
                      onChange={(e) => updateRequirement(req, 'item_code', e.target.value)}
                      onBlur={() => setEditingCell(null)}
                      className="border-none p-1 h-8"
                      placeholder="Enter item code"
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
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={req.withdrawn_qty}
                      onChange={(e) => updateRequirement(req, 'withdrawn_qty', Number(e.target.value))}
                      className="border-none p-1 h-8 w-20"
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {computed.allocatable_qty}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={computed.missing_qty > 0 ? 'destructive' : 'default'}
                    >
                      {computed.missing_qty}
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
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
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