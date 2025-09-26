import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, GripVertical, Eye, Trash2, FolderOpen, Download } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FakeApi } from '@/api/FakeApi';
import AddProjectModal from '@/components/AddProjectModal';
import { ProjectSearchForm } from '@/components/ProjectSearchForm';
import { BulkProjectImporter } from '@/components/BulkProjectImporter';
import { toast } from 'sonner';
import type { Project } from '@/domain/types';
import * as XLSX from 'xlsx';

interface SortableProjectProps {
  project: Project;
  onView: (projectId: string) => void;
  onDelete: (projectId: string) => void;
}

const SortableProject = ({ project, onView, onDelete }: SortableProjectProps) => {
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
              {project.meta?.['اسم المشروع'] && (
                <CardDescription className="mt-1 text-sm text-accent">
                  {project.meta['اسم المشروع']}
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
          <div className="flex items-center space-x-2">
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
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Project</AlertDialogTitle>
                  <AlertDialogDescription>
                    Delete project {project.project_id} ({project.name})? This will also remove its requirements and memberships.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => onDelete(project.project_id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const Projects = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkImporter, setShowBulkImporter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
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
    // Sort by priority ascending (0 = highest), then by project_id ascending
    const sortedProjects = [...projectList].sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.project_id.localeCompare(b.project_id);
    });
    setAllProjects(sortedProjects);
    setProjects(sortedProjects);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = projects.findIndex(p => p.project_id === active.id);
      const newIndex = projects.findIndex(p => p.project_id === over.id);
      
      const newProjects = arrayMove(projects, oldIndex, newIndex);
      
      // Update priorities based on new order (lower index = higher priority, 0 = highest)
      const updatedProjects = newProjects.map((project, index) => ({
        ...project,
        priority: index
      }));
      
      // Save each project with new priority
      updatedProjects.forEach(project => {
        FakeApi.upsertProject(project);
      });
      
      setProjects(updatedProjects);
      loadProjects(); // Reload to sync with all projects
      toast.success('Project order updated');
    }
  };

  const handleViewProject = (projectId: string) => {
    navigate(`/projects/${projectId}`);
  };

  const handleDeleteProject = (projectId: string) => {
    FakeApi.deleteProject(projectId);
    loadProjects();
    toast.success('Project deleted successfully');
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      const filtered = FakeApi.searchProjects(query);
      setProjects(filtered);
    } else {
      setProjects(allProjects);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setProjects(allProjects);
  };

  const getProjectStats = () => {
    const total = allProjects.length;
    const completed = allProjects.filter(p => p.status === 'Completed').length;
    const planning = allProjects.filter(p => p.status === 'Planning').length;
    const onHold = allProjects.filter(p => p.status === 'On Hold').length;
    const inProgress = allProjects.filter(p => p.status === 'In Progress').length;
    
    return { total, completed, planning, onHold, inProgress };
  };

  const stats = getProjectStats();

  const handleDownloadTemplate = () => {
    // Create empty requirements template with only headers
    const requirementsTemplate = Array(15).fill(null).map(() => ({
      'Item Code': '',
      'Description': '',
      'Required Qty': '',
      'Withdrawn Qty': '',
      'Exclude': '',
      'Notes': ''
    }));

    // Create empty project metadata template with only headers
    const metadataTemplate = Array(10).fill(null).map(() => ({
      'اسم المشروع': '',
      'رقم الرسم': '',
      'تاريخ الرسم': '',
      'رقم الحساب': '',
      'بند الميزانية': '',
      'رقم الاستثمارى': '',
      'تاريخ الفتح': '',
      'الاشراف الهندسى': '',
      'الاشراف الفنى': '',
      'الإدارة الطالبة': '',
      'الشركة المنفذة': '',
      'نسبة صرف المهمات': '',
      'نسبة التنفيذ': '',
      'PO': '',
      'PR': ''
    }));

    // Create workbook with two worksheets
    const wb = XLSX.utils.book_new();
    
    // Add requirements worksheet
    const requirementsWs = XLSX.utils.json_to_sheet(requirementsTemplate);
    XLSX.utils.book_append_sheet(wb, requirementsWs, 'Requirements');
    
    // Add metadata worksheet
    const metadataWs = XLSX.utils.json_to_sheet(metadataTemplate);
    XLSX.utils.book_append_sheet(wb, metadataWs, 'Metadata');
    
    // Generate and download the file
    XLSX.writeFile(wb, 'project-requirements-template.xlsx');
    toast.success('Empty project template downloaded');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-2">
            Manage and track project progress • Drag to reorder by priority (0 = highest)
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={handleDownloadTemplate}
          >
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
          <Button 
            variant="outline"
            onClick={() => setShowBulkImporter(true)}
          >
            <FolderOpen className="h-4 w-4 mr-2" />
            Bulk Import
          </Button>
          <Button onClick={() => setShowAddModal(true)} className="bg-primary hover:bg-primary-hover">
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>
      </div>

      {/* Search Form */}
      <ProjectSearchForm 
        onSearch={handleSearch}
        hasActiveFilter={!!searchQuery}
        onClear={handleClearSearch}
      />

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
                onDelete={handleDeleteProject}
              />
            ))}
          </SortableContext>
        </DndContext>
        
        {projects.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground text-lg mb-4">
                {searchQuery ? 'No projects found matching your search' : 'No projects found'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first project
                </Button>
              )}
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

      {/* Bulk Project Importer */}
      <BulkProjectImporter
        isOpen={showBulkImporter}
        onClose={() => setShowBulkImporter(false)}
        onImportComplete={loadProjects}
      />
    </div>
  );
};

export default Projects;