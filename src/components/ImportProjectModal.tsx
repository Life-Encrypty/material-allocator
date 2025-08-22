import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, AlertTriangle, CheckCircle } from 'lucide-react';
import { parseProjectWorkbook, type ProjectWorkbookResult } from '@/utils/xlsx';
import { toast } from 'sonner';

interface ImportProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (result: ProjectWorkbookResult) => void;
  projectId: string;
}

export const ImportProjectModal = ({ isOpen, onClose, onImport, projectId }: ImportProjectModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ProjectWorkbookResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('Please select an Excel file (.xlsx or .xls)');
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);

    try {
      const result = await parseProjectWorkbook(selectedFile, projectId);
      setPreview(result);
    } catch (error) {
      toast.error(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = () => {
    if (!preview) return;
    onImport(preview);
    handleClose();
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setIsProcessing(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Project XLSX</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file-upload">Select Excel File</Label>
            <div className="flex items-center space-x-4">
              <Input
                id="file-upload"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                disabled={isProcessing}
              />
              {isProcessing && (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                  <span className="text-sm">Processing...</span>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Expected sheets: "Requirements" or "المهمات" and "Metadata" or "بيانات المشروع"
            </p>
          </div>

          {/* Preview */}
          {preview && (
            <div className="space-y-4">
              {/* Warnings */}
              {preview.warnings.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">Warnings:</p>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {preview.warnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Requirements Preview */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <h3 className="font-medium">Requirements Summary</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {preview.requirements.length} requirements to import
                  </Badge>
                  <Badge variant="outline">
                    {preview.requirements.filter(r => r.exclude_from_allocation).length} excluded items
                  </Badge>
                  <Badge variant="outline">
                    {preview.requirements.filter(r => r.withdrawn_qty > 0).length} with withdrawals
                  </Badge>
                </div>

                {preview.requirements.length > 0 && (
                  <div className="border rounded p-3 max-h-48 overflow-y-auto">
                    <div className="space-y-1">
                      {preview.requirements.slice(0, 10).map((req, index) => (
                        <div key={index} className="text-sm flex justify-between">
                          <span>{req.item_code}</span>
                          <span>Req: {req.required_qty}, With: {req.withdrawn_qty}</span>
                        </div>
                      ))}
                      {preview.requirements.length > 10 && (
                        <p className="text-xs text-muted-foreground">
                          ... and {preview.requirements.length - 10} more
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Metadata Preview */}
              {Object.keys(preview.metadata).length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <h3 className="font-medium">Metadata Updates</h3>
                  </div>
                  <div className="border rounded p-3 max-h-48 overflow-y-auto">
                    <div className="space-y-1">
                      {Object.entries(preview.metadata).map(([key, value]) => (
                        <div key={key} className="text-sm flex justify-between">
                          <span className="font-medium">{key.replace('[CLEAR]', '(Clear) ')}:</span>
                          <span className={key.startsWith('[CLEAR]') ? 'text-red-500' : ''}>
                            {key.startsWith('[CLEAR]') ? '[WILL BE CLEARED]' : value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!preview || isProcessing}
          >
            <Upload className="h-4 w-4 mr-2" />
            Apply Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};