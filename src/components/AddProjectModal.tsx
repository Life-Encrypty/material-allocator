import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FakeApi } from '@/api/FakeApi';
import { toast } from 'sonner';
import type { Project } from '@/domain/types';

interface AddProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectAdded: () => void;
}

const AddProjectModal = ({ open, onOpenChange, onProjectAdded }: AddProjectModalProps) => {
  const [formData, setFormData] = useState({
    project_id: '',
    name: '',
    description: '',
    priority: 0,
    status: 'Planning' as const
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.project_id.trim() || !formData.name.trim()) {
      toast.error('Please fill in required fields');
      return;
    }

    // Check if project ID already exists
    const existingProjects = FakeApi.listProjects();
    if (existingProjects.some(p => p.project_id === formData.project_id)) {
      toast.error('Project ID already exists');
      return;
    }

    setLoading(true);
    
    try {
      const newProject: Project = {
        project_id: formData.project_id,
        name: formData.name,
        description: formData.description,
        priority: formData.priority,
        status: formData.status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      FakeApi.upsertProject(newProject);
      
      toast.success('Project created successfully');
      onProjectAdded();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        project_id: '',
        name: '',
        description: '',
        priority: 0,
        status: 'Planning'
      });
    } catch (error) {
      toast.error('Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Project</DialogTitle>
          <DialogDescription>
            Create a new project to manage materials and requirements.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project_id">Project ID *</Label>
            <Input
              id="project_id"
              value={formData.project_id}
              onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
              placeholder="e.g., P001, PRJ-2024-001"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter project name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter project description"
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Input
              id="priority"
              type="number"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
              placeholder="0"
              min="0"
              max="100"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value: any) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Planning">Planning</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="On Hold">On Hold</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddProjectModal;