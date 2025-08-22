import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Plus, Search, Package, AlertTriangle, TrendingUp, TrendingDown, Upload, FileSpreadsheet } from 'lucide-react'
import { FakeApi } from '@/api/FakeApi'
import { parseInventory } from '@/utils/xlsx'
import type { InventorySnapshot, InventoryRow } from '@/domain/types'

const Inventory = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [snapshots, setSnapshots] = useState<InventorySnapshot[]>([])
  const [activeSnapshotId, setActiveSnapshotId] = useState<string | null>(null)
  const [currentInventory, setCurrentInventory] = useState<InventoryRow[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Load data on component mount
  useEffect(() => {
    loadInventoryData()
  }, [])

  const loadInventoryData = () => {
    const snapshotsList = FakeApi.listSnapshots()
    const activeId = FakeApi.getActiveSnapshotId()
    const inventory = FakeApi.getCurrentInventory()
    
    setSnapshots(snapshotsList)
    setActiveSnapshotId(activeId)
    setCurrentInventory(inventory)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.match(/\.(xlsx|xls)$/)) {
      toast({
        title: "Invalid file type",
        description: "Please select an Excel file (.xlsx or .xls)",
        variant: "destructive"
      })
      return
    }

    setIsUploading(true)
    
    try {
      const snapshot = await parseInventory(file)
      
      // Save snapshot and rows to localStorage
      FakeApi.setActiveSnapshot(snapshot)
      
      // Save inventory rows
      const rows = (snapshot as any).rows as InventoryRow[]
      rows.forEach(row => {
        FakeApi.upsertInventoryRow(row)
      })
      
      // Reload data
      loadInventoryData()
      
      toast({
        title: "Import successful",
        description: `Imported ${rows.length} inventory items from ${file.name}`,
      })
      
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
    } catch (error) {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleSetActiveSnapshot = (snapshotId: string) => {
    const snapshot = snapshots.find(s => s.snapshot_id === snapshotId)
    if (snapshot) {
      FakeApi.setActiveSnapshot(snapshot)
      loadInventoryData()
      
      toast({
        title: "Active snapshot changed",
        description: `Switched to snapshot: ${snapshot.name}`,
      })
    }
  }

  const getStockStatus = (current: number) => {
    if (current <= 10) return { status: 'Critical', color: 'bg-destructive text-destructive-foreground' }
    if (current <= 50) return { status: 'Low', color: 'bg-warning text-warning-foreground' }
    if (current <= 100) return { status: 'Normal', color: 'bg-success text-success-foreground' }
    return { status: 'High', color: 'bg-primary text-primary-foreground' }
  }

  const filteredInventory = currentInventory.filter(item =>
    item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const totalItems = currentInventory.length
  const totalValue = currentInventory.reduce((sum, item) => sum + (item.current_balance * 10), 0) // Rough estimate
  const lowStockItems = currentInventory.filter(item => item.current_balance <= 50).length
  const criticalItems = currentInventory.filter(item => item.current_balance <= 10).length

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
            <div className="text-2xl font-bold">{totalItems}</div>
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

      {/* Current Active Snapshot */}
      {activeSnapshotId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <FileSpreadsheet className="h-5 w-5 mr-2" />
              Active Inventory Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{activeSnapshotId}</p>
                <p className="text-sm text-muted-foreground">
                  {snapshots.find(s => s.snapshot_id === activeSnapshotId)?.name || 'Current snapshot'}
                </p>
              </div>
              <Badge variant="outline" className="bg-success text-success-foreground">
                Active
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Upload className="h-5 w-5 mr-2" />
            Import Inventory
          </CardTitle>
          <CardDescription>
            Upload an Excel file (.xlsx or .xls) to create a new inventory snapshot
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="bg-primary hover:bg-primary-hover"
            >
              {isUploading ? 'Uploading...' : 'Choose Excel File'}
            </Button>
            <p className="text-sm text-muted-foreground">
              Supports columns: Item Code, Description, Unit, Current Balance (English/Arabic)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Snapshots List */}
      {snapshots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Inventory Snapshots</CardTitle>
            <CardDescription>
              Historical inventory snapshots - click "Set Active" to switch
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {snapshots.map((snapshot) => (
                <div key={snapshot.snapshot_id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{snapshot.snapshot_id}</h4>
                    <p className="text-sm text-muted-foreground">{snapshot.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Created: {new Date(snapshot.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {snapshot.snapshot_id === activeSnapshotId && (
                      <Badge variant="outline" className="bg-success text-success-foreground">
                        Active
                      </Badge>
                    )}
                    {snapshot.snapshot_id !== activeSnapshotId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetActiveSnapshot(snapshot.snapshot_id)}
                      >
                        Set Active
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by item code or notes..."
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
            {filteredInventory.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {currentInventory.length === 0 
                    ? "No inventory data available. Upload an Excel file to get started." 
                    : "No items match your search criteria."
                  }
                </p>
              </div>
            ) : (
              filteredInventory.map((item) => {
                const stockStatus = getStockStatus(item.current_balance)
                return (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                      <div className="md:col-span-2">
                        <h3 className="font-medium">{item.item_code}</h3>
                        <p className="text-sm text-muted-foreground">{item.notes || 'No description'}</p>
                      </div>
                      
                      <div className="text-center">
                        <div className="font-medium">{item.current_balance.toLocaleString()}</div>
                        <div className="flex items-center justify-center mt-1">
                          <Badge className={stockStatus.color} variant="secondary">
                            {stockStatus.status}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-sm">{item.location || 'Not specified'}</div>
                        <div className="text-xs text-muted-foreground">Location</div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">Edit</Button>
                        <Button variant="outline" size="sm">Allocate</Button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Inventory