import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, GripVertical, Eye } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FakeApi } from '@/api/FakeApi';
import AddProjectModal from '@/components/AddProjectModal';
import { toast } from 'sonner';
import type { Project } from '@/domain/types';

interface SortableProjectProps {
  project: Project;
  onView: (projectId: string) => void;
}

const SortableProject = ({ project, onView }: SortableProjectProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.project_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Progress':
        return 'bg-primary text-primary-foreground';
      case 'Planning':
        return 'bg-warning text-warning-foreground';
      case 'Completed':
        return 'bg-success text-success-foreground';
      case 'On Hold':
        return 'bg-secondary text-secondary-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card 
      ref={setNodeRef} 
      style={style} 
      className="hover:shadow-md transition-shadow cursor-pointer"
    >
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-3 flex-1">
            <div 
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">{project.name}</CardTitle>
              <CardDescription className="mt-1">
                ID: {project.project_id} • Priority: {project.priority}
              </CardDescription>
              {project.description && (
                <CardDescription className="mt-1 text-sm">
                  {project.description}
                </CardDescription>
              )}
            </div>
          </div>
          <Badge className={getStatusColor(project.status)}>
            {project.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Created: {new Date(project.created_at).toLocaleDateString()}
          </div>
          <Button 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation();
              onView(project.project_id);
            }}
          >
            <Eye className="h-4 w-4 mr-2" />
            View
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const Projects = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = () => {
    const projectList = FakeApi.listProjects();
    // Sort by priority descending, then by project_id ascending
    const sortedProjects = [...projectList].sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.project_id.localeCompare(b.project_id);
    });
    setProjects(sortedProjects);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = projects.findIndex(p => p.project_id === active.id);
      const newIndex = projects.findIndex(p => p.project_id === over.id);
      
      const newProjects = arrayMove(projects, oldIndex, newIndex);
      
      // Update priorities based on new order (higher index = higher priority)
      const updatedProjects = newProjects.map((project, index) => ({
        ...project,
        priority: newProjects.length - index
      }));
      
      // Save each project with new priority
      updatedProjects.forEach(project => {
        FakeApi.upsertProject(project);
      });
      
      setProjects(updatedProjects);
      toast.success('Project order updated');
    }
  };

  const handleViewProject = (projectId: string) => {
    navigate(`/projects/${projectId}`);
  };

  const getProjectStats = () => {
    const total = projects.length;
    const completed = projects.filter(p => p.status === 'Completed').length;
    const planning = projects.filter(p => p.status === 'Planning').length;
    const onHold = projects.filter(p => p.status === 'On Hold').length;
    const inProgress = projects.filter(p => p.status === 'In Progress').length;
    
    return { total, completed, planning, onHold, inProgress };
  };

  const stats = getProjectStats();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-2">
            Manage and track project progress • Drag to reorder by priority
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="bg-primary hover:bg-primary-hover">
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Projects List - Draggable */}
      <div className="space-y-4">
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={projects.map(p => p.project_id)} strategy={verticalListSortingStrategy}>
            {projects.map((project) => (
              <SortableProject 
                key={project.project_id} 
                project={project} 
                onView={handleViewProject}
              />
            ))}
          </SortableContext>
        </DndContext>
        
        {projects.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground text-lg mb-4">No projects found</p>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create your first project
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Project Summary</CardTitle>
          <CardDescription>
            Overview of all projects and their current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total Projects</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">{stats.completed}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning">{stats.planning}</div>
              <div className="text-sm text-muted-foreground">Planning</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.inProgress}</div>
              <div className="text-sm text-muted-foreground">In Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-secondary">{stats.onHold}</div>
              <div className="text-sm text-muted-foreground">On Hold</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Project Modal */}
      <AddProjectModal 
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onProjectAdded={loadProjects}
      />
    </div>
  )
}

export default Projects