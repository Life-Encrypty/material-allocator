import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Zap, CheckCircle } from 'lucide-react';

interface AllocationPreview {
  item_code: string;
  description: string;
  current_withdrawn: number;
  allocatable_qty: number;
  new_withdrawn: number;
  change: number;
}

interface AutoAllocationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (allocations: AllocationPreview[]) => void;
  allocations: AllocationPreview[];
  projectName: string;
}

export const AutoAllocationDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  allocations,
  projectName 
}: AutoAllocationDialogProps) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm(allocations);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const totalItems = allocations.length;
  const itemsWithChanges = allocations.filter(a => a.change > 0).length;
  const totalAllocation = allocations.reduce((sum, a) => sum + a.change, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Auto Allocation Preview - {projectName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto">
          {/* Summary */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Allocation Summary</p>
                <p className="text-xs text-muted-foreground">
                  Preview of changes that will be applied to withdrawn quantities
                </p>
              </div>
              <div className="flex gap-4 text-right">
                <div>
                  <Badge variant="outline" className="mb-1">
                    {itemsWithChanges} of {totalItems} items
                  </Badge>
                  <p className="text-xs text-muted-foreground">Will be updated</p>
                </div>
                <div>
                  <Badge variant="secondary" className="mb-1">
                    {totalAllocation} units
                  </Badge>
                  <p className="text-xs text-muted-foreground">Total allocation</p>
                </div>
              </div>
            </div>
          </div>

          {/* Allocations Table */}
          {allocations.length > 0 ? (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Current Withdrawn</TableHead>
                    <TableHead className="text-right">Allocatable</TableHead>
                    <TableHead className="text-right">New Withdrawn</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allocations.map((allocation) => (
                    <TableRow 
                      key={allocation.item_code}
                      className={allocation.change > 0 ? 'bg-primary/5' : ''}
                    >
                      <TableCell className="font-mono text-sm">
                        {allocation.item_code}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {allocation.description || 'No description'}
                      </TableCell>
                      <TableCell className="text-right">
                        {allocation.current_withdrawn}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">
                          {allocation.allocatable_qty}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={allocation.change > 0 ? 'font-medium text-primary' : ''}>
                          {allocation.new_withdrawn}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {allocation.change > 0 ? (
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-green-600 font-medium">
                              +{allocation.change}
                            </span>
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No allocatable items found</p>
              <p className="text-xs">
                All items are either excluded, fully allocated, or have no inventory available
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={isProcessing || itemsWithChanges === 0}
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                Applying...
              </div>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Apply Allocation ({itemsWithChanges} items)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};