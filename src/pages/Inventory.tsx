import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, Package, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'

const Inventory = () => {
  const [searchTerm, setSearchTerm] = useState('')

  const inventory = [
    {
      id: 1,
      name: 'Steel Beams - Grade 50',
      category: 'Structural',
      stock: 45,
      minStock: 20,
      unit: 'pieces',
      location: 'Warehouse A-1',
      lastUpdated: '2024-01-15',
      trend: 'down',
      value: 15750
    },
    {
      id: 2,
      name: 'Concrete Mix - Premium',
      category: 'Materials',
      stock: 8,
      minStock: 15,
      unit: 'tons',
      location: 'Storage B-3',
      lastUpdated: '2024-01-14',
      trend: 'down',
      value: 2400
    },
    {
      id: 3,
      name: 'Electrical Wire - 12 AWG',
      category: 'Electrical',
      stock: 156,
      minStock: 50,
      unit: 'meters',
      location: 'Warehouse C-2',
      lastUpdated: '2024-01-16',
      trend: 'up',
      value: 780
    },
    {
      id: 4,
      name: 'Roofing Tiles - Clay',
      category: 'Roofing',
      stock: 2340,
      minStock: 500,
      unit: 'pieces',
      location: 'Yard D-1',
      lastUpdated: '2024-01-13',
      trend: 'up',
      value: 9360
    },
    {
      id: 5,
      name: 'Insulation Foam',
      category: 'Insulation',
      stock: 12,
      minStock: 25,
      unit: 'rolls',
      location: 'Storage A-4',
      lastUpdated: '2024-01-15',
      trend: 'down',
      value: 960
    }
  ]

  const getStockStatus = (current: number, min: number) => {
    if (current <= min * 0.5) return { status: 'Critical', color: 'bg-destructive text-destructive-foreground' }
    if (current <= min) return { status: 'Low', color: 'bg-warning text-warning-foreground' }
    if (current <= min * 2) return { status: 'Normal', color: 'bg-success text-success-foreground' }
    return { status: 'High', color: 'bg-primary text-primary-foreground' }
  }

  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalValue = inventory.reduce((sum, item) => sum + item.value, 0)
  const lowStockItems = inventory.filter(item => item.stock <= item.minStock).length
  const criticalItems = inventory.filter(item => item.stock <= item.minStock * 0.5).length

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Inventory</h1>
          <p className="text-muted-foreground mt-2">
            Track and manage material stock levels
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary-hover">
          <Plus className="h-4 w-4 mr-2" />
          Add Material
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventory.length}</div>
            <p className="text-xs text-muted-foreground">Active materials</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Current inventory value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockItems}</div>
            <p className="text-xs text-muted-foreground">Items need restocking</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{criticalItems}</div>
            <p className="text-xs text-muted-foreground">Urgent attention needed</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search materials..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Material Inventory</CardTitle>
          <CardDescription>
            Current stock levels and material details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredInventory.map((item) => {
              const stockStatus = getStockStatus(item.stock, item.minStock)
              return (
                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                    <div className="md:col-span-2">
                      <h3 className="font-medium">{item.name}</h3>
                      <p className="text-sm text-muted-foreground">{item.category}</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="font-medium">{item.stock} {item.unit}</div>
                      <div className="flex items-center justify-center mt-1">
                        {item.trend === 'up' ? (
                          <TrendingUp className="h-3 w-3 text-success mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-destructive mr-1" />
                        )}
                        <Badge className={stockStatus.color} variant="secondary">
                          {stockStatus.status}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">Min: {item.minStock}</div>
                      <div className="text-sm">{item.location}</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="font-medium">${item.value}</div>
                      <div className="text-xs text-muted-foreground">{item.lastUpdated}</div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">Edit</Button>
                      <Button variant="outline" size="sm">Allocate</Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Inventory