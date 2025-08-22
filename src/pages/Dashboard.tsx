import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart3, Package, Users, AlertTriangle } from 'lucide-react'

const Dashboard = () => {
  const stats = [
    {
      title: 'Active Projects',
      value: '12',
      change: '+2 this month',
      icon: BarChart3,
      color: 'text-primary'
    },
    {
      title: 'Total Materials',
      value: '1,847',
      change: '+94 this week',
      icon: Package,
      color: 'text-accent'
    },
    {
      title: 'Team Members',
      value: '8',
      change: '2 editors active',
      icon: Users,
      color: 'text-success'
    },
    {
      title: 'Low Stock Items',
      value: '23',
      change: 'Requires attention',
      icon: AlertTriangle,
      color: 'text-warning'
    }
  ]

  const recentActivity = [
    { action: 'Material allocated', project: 'Building A Foundation', time: '2 hours ago' },
    { action: 'Inventory updated', project: 'Roofing Materials', time: '4 hours ago' },
    { action: 'Project created', project: 'Electrical Phase 2', time: '1 day ago' },
    { action: 'Stock replenished', project: 'Steel Beams', time: '2 days ago' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Overview of your material allocation system
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest updates across all projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.project}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {activity.time}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks and workflows
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="p-3 rounded-md border hover:bg-muted cursor-pointer transition-colors">
                <p className="text-sm font-medium">Allocate Materials</p>
                <p className="text-xs text-muted-foreground">Assign materials to projects</p>
              </div>
              <div className="p-3 rounded-md border hover:bg-muted cursor-pointer transition-colors">
                <p className="text-sm font-medium">Update Inventory</p>
                <p className="text-xs text-muted-foreground">Manage stock levels</p>
              </div>
              <div className="p-3 rounded-md border hover:bg-muted cursor-pointer transition-colors">
                <p className="text-sm font-medium">Create Project</p>
                <p className="text-xs text-muted-foreground">Start a new project</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Dashboard