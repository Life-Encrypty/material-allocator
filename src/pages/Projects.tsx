import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, Calendar, Users, Package } from 'lucide-react'

const Projects = () => {
  const projects = [
    {
      id: 1,
      name: 'Building A Foundation',
      status: 'In Progress',
      progress: 75,
      deadline: '2024-03-15',
      team: 4,
      materials: 156,
      description: 'Foundation work for new residential building'
    },
    {
      id: 2,
      name: 'Roofing Phase 1',
      status: 'Planning',
      progress: 25,
      deadline: '2024-04-01',
      team: 3,
      materials: 89,
      description: 'Initial roofing installation and materials setup'
    },
    {
      id: 3,
      name: 'Electrical Installation',
      status: 'Completed',
      progress: 100,
      deadline: '2024-02-28',
      team: 2,
      materials: 234,
      description: 'Complete electrical system installation'
    },
    {
      id: 4,
      name: 'Interior Finishing',
      status: 'On Hold',
      progress: 10,
      deadline: '2024-05-15',
      team: 5,
      materials: 78,
      description: 'Interior walls, flooring, and finishing work'
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Progress':
        return 'bg-primary text-primary-foreground'
      case 'Planning':
        return 'bg-warning text-warning-foreground'
      case 'Completed':
        return 'bg-success text-success-foreground'
      case 'On Hold':
        return 'bg-secondary text-secondary-foreground'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-2">
            Manage and track project progress
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary-hover">
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Projects Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {projects.map((project) => (
          <Card key={project.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {project.description}
                  </CardDescription>
                </div>
                <Badge className={getStatusColor(project.status)}>
                  {project.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress</span>
                    <span>{project.progress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary rounded-full h-2 transition-all" 
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>

                {/* Project Stats */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{new Date(project.deadline).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{project.team} members</span>
                  </div>
                  <div className="flex items-center">
                    <Package className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{project.materials} items</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    View Details
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    Allocate Materials
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">4</div>
              <div className="text-sm text-muted-foreground">Total Projects</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">1</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning">1</div>
              <div className="text-sm text-muted-foreground">In Planning</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-secondary">1</div>
              <div className="text-sm text-muted-foreground">On Hold</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Projects