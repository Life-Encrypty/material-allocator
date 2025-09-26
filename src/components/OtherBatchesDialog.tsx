import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { InventoryRow } from '@/domain/types';

interface OtherBatchesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  itemCode: string;
  otherBatches: InventoryRow[];
}

export const OtherBatchesDialog = ({ isOpen, onClose, itemCode, otherBatches }: OtherBatchesDialogProps) => {
  const totalQuantity = otherBatches.reduce((sum, batch) => sum + batch.current_balance, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            Other Batches for Item: {itemCode}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Found {otherBatches.length} other batch(es) with available inventory
            </p>
            <Badge variant="secondary">
              Total Available: {totalQuantity}
            </Badge>
          </div>

          {otherBatches.length > 0 ? (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch Number</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Available Quantity</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {otherBatches.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell>
                        <Badge variant="outline">
                          {batch.batch_number}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {batch.location || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {batch.current_balance}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {batch.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No other batches found for this item
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};