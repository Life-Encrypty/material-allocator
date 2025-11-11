import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { Plus, Search, Package, AlertTriangle, TrendingUp, TrendingDown, Upload, FileSpreadsheet, Trash2, Download, Check, X } from 'lucide-react'
import { SupabaseApi } from '@/api/SupabaseApi'
import { useRealtimeInventory } from '@/hooks/useRealtimeInventory'
import { supabase } from '@/integrations/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'
import type { InventorySnapshot, InventoryRow, Material } from '@/domain/types'

const Inventory = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [snapshots, setSnapshots] = useState<InventorySnapshot[]>([])
  const [activeSnapshotId, setActiveSnapshotId] = useState<string | null>(null)
  const [currentInventory, setCurrentInventory] = useState<InventoryRow[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingSnapshotId, setPendingSnapshotId] = useState<string | null>(null)
  const [editingRow, setEditingRow] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ batch_number: string; current_balance: string }>({ batch_number: '', current_balance: '' })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Realtime inventory updates
  useRealtimeInventory({
    snapshotId: activeSnapshotId,
    onInsert: (row) => {
      setCurrentInventory(prev => [...prev, row]);
    },
    onUpdate: (row) => {
      setCurrentInventory(prev => prev.map(r => r.id === row.id ? row : r));
    },
    onDelete: (rowId) => {
      setCurrentInventory(prev => prev.filter(r => r.id !== rowId));
    }
  });

  // Load data on component mount
  useEffect(() => {
    loadInventoryData()
  }, [])

  const loadInventoryData = async () => {
    setIsLoading(true);
    try {
      const snapshotsList = await SupabaseApi.listSnapshots();
      const activeId = await SupabaseApi.getActiveSnapshotId();
      const inventory = await SupabaseApi.getCurrentInventory();
      
      setSnapshots(snapshotsList);
      setActiveSnapshotId(activeId);
      setCurrentInventory(inventory);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadInventoryFile = async () => {
    const materials = await SupabaseApi.listMaterials();
    
    const csvData = currentInventory.map(item => {
      const material = materials.find(m => m.item_code === item.item_code)
      return {
        'Item Code': item.item_code,
        'Batch Number': item.batch_number,
        'Description': material?.name || material?.description || '',
        'Unit': material?.unit || '',
        'Current Balance': item.current_balance,
        'Location': item.location || '',
        'Notes': item.notes || ''
      }
    })

    const headers = Object.keys(csvData[0] || {})
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => 
        `"${row[header as keyof typeof row]}"`.replace(/"/g, '""')
      ).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `inventory_${activeSnapshotId || 'current'}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast({
      title: "Inventory exported",
      description: `Downloaded ${currentInventory.length} inventory items as CSV`,
    })
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
      // Upload file to edge function
      const formData = new FormData()
      formData.append('file', file)
      
      const { data, error } = await supabase.functions.invoke('import-inventory', {
        body: formData
      })
      
      if (error) {
        throw new Error(error.message)
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Import failed')
      }
      
      // Reload data
      await loadInventoryData()
      
      toast({
        title: "Import successful",
        description: `Imported ${data.snapshot.item_count} inventory items from ${file.name}`,
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
    setPendingSnapshotId(snapshotId)
    setShowConfirmDialog(true)
  }

  const confirmSnapshotChange = async () => {
    if (pendingSnapshotId) {
      const snapshot = snapshots.find(s => s.snapshot_id === pendingSnapshotId)
      if (snapshot) {
        await SupabaseApi.setActiveSnapshot(snapshot)
        await loadInventoryData()
        
        toast({
          title: "Active snapshot changed",
          description: `Switched to snapshot: ${snapshot.name}`,
        })
      }
    }
    setShowConfirmDialog(false)
    setPendingSnapshotId(null)
  }

  const handleEditRow = (row: InventoryRow) => {
    setEditingRow(row.id);
    setEditValues({
      batch_number: row.batch_number,
      current_balance: row.current_balance.toString()
    });
  };

  const handleSaveEdit = async (rowId: string) => {
    const row = currentInventory.find(r => r.id === rowId);
    if (!row) return;

    try {
      await SupabaseApi.upsertInventoryRow({
        ...row,
        batch_number: editValues.batch_number,
        current_balance: parseFloat(editValues.current_balance) || 0
      });

      toast({
        title: "Updated",
        description: "Inventory row updated successfully"
      });

      setEditingRow(null);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update row",
        variant: "destructive"
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditValues({ batch_number: '', current_balance: '' });
  };

  const handleDeleteRow = async (rowId: string) => {
    if (!confirm('Are you sure you want to delete this inventory row?')) return;

    try {
      const { error } = await supabase
        .from('inventory_rows')
        .delete()
        .eq('id', rowId);

      if (error) throw error;

      toast({
        title: "Deleted",
        description: "Inventory row deleted successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete row",
        variant: "destructive"
      });
    }
  };

  const getStockStatus = (current: number) => {
    if (current <= 10) return { status: 'Critical', color: 'bg-destructive text-destructive-foreground' }
    if (current <= 50) return { status: 'Low', color: 'bg-warning text-warning-foreground' }
    if (current <= 100) return { status: 'Normal', color: 'bg-success text-success-foreground' }
    return { status: 'High', color: 'bg-primary text-primary-foreground' }
  }

  const filteredInventory = currentInventory.filter(item =>
    item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
        <div className="flex space-x-2">
          <Button className="bg-primary hover:bg-primary-hover">
            <Plus className="h-4 w-4 mr-2" />
            Add Material
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={downloadInventoryFile}
            disabled={currentInventory.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Download Inventory
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{totalItems}</div>
                <p className="text-xs text-muted-foreground">Active materials</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Current inventory value</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <>
                <div className="text-2xl font-bold">{lowStockItems}</div>
                <p className="text-xs text-muted-foreground">Items need restocking</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <>
                <div className="text-2xl font-bold">{criticalItems}</div>
                <p className="text-xs text-muted-foreground">Urgent attention needed</p>
              </>
            )}
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
              Supports columns: Item Code, Batch Number, Description, Unit, Current Balance (English/Arabic)
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
              placeholder="Search by item code, batch number, or notes..."
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
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-4 border rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                      <div className="md:col-span-2">
                        <Skeleton className="h-5 w-32 mb-2" />
                        <Skeleton className="h-4 w-48" />
                      </div>
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-24" />
                      <div className="flex space-x-2">
                        <Skeleton className="h-9 w-16" />
                        <Skeleton className="h-9 w-16" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredInventory.length === 0 ? (
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
                const stockStatus = getStockStatus(item.current_balance);
                const isEditing = editingRow === item.id;
                
                return (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                      <div className="md:col-span-2">
                        <h3 className="font-medium">{item.item_code}</h3>
                        <p className="text-sm text-muted-foreground">{item.notes || 'No description'}</p>
                      </div>
                      
                      <div className="text-center">
                        {isEditing ? (
                          <Input 
                            value={editValues.batch_number}
                            onChange={(e) => setEditValues(prev => ({ ...prev, batch_number: e.target.value }))}
                            className="h-8 text-sm"
                          />
                        ) : (
                          <>
                            <div className="text-sm font-medium">{item.batch_number}</div>
                            <div className="text-xs text-muted-foreground">Batch</div>
                          </>
                        )}
                      </div>
                      
                      <div className="text-center">
                        {isEditing ? (
                          <Input 
                            type="number"
                            value={editValues.current_balance}
                            onChange={(e) => setEditValues(prev => ({ ...prev, current_balance: e.target.value }))}
                            className="h-8 text-sm"
                          />
                        ) : (
                          <>
                            <div className="font-medium">{item.current_balance.toLocaleString()}</div>
                            <div className="flex items-center justify-center mt-1">
                              <Badge className={stockStatus.color} variant="secondary">
                                {stockStatus.status}
                              </Badge>
                            </div>
                          </>
                        )}
                      </div>
                      
                      <div className="text-center">
                        <div className="text-sm">{item.location || 'Not specified'}</div>
                        <div className="text-xs text-muted-foreground">Location</div>
                      </div>
                      
                      <div className="flex space-x-2 justify-end">
                        {isEditing ? (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleSaveEdit(item.id)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={handleCancelEdit}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditRow(item)}
                            >
                              Edit
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => handleDeleteRow(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialogs */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch Active Snapshot</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to switch to snapshot "{pendingSnapshotId}"? This will change the active inventory data used for all calculations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSnapshotChange}>
              Confirm Switch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default Inventory