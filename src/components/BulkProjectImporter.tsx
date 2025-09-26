import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, AlertTriangle, CheckCircle, FileText, X, FolderOpen } from 'lucide-react';
import { parseProjectWorkbook, type ProjectWorkbookResult } from '@/utils/xlsx';
import { FakeApi } from '@/api/FakeApi';
import { Project } from '@/domain/types';
import { toast } from 'sonner';

interface BulkProjectImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

interface ProjectImportResult {
  filename: string;
  projectName: string;
  projectId: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  data?: ProjectWorkbookResult;
  error?: string;
  warnings?: string[];
}

export const BulkProjectImporter = ({ isOpen, onClose, onImportComplete }: BulkProjectImporterProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<ProjectImportResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  const generateProjectId = useCallback((index: number) => {
    const now = new Date();
    const timestamp = now.getFullYear().toString().slice(-2) + 
                     (now.getMonth() + 1).toString().padStart(2, '0') + 
                     now.getDate().toString().padStart(2, '0');
    return `prj-${timestamp}-${(index + 1).toString().padStart(3, '0')}`;
  }, []);

  const extractProjectName = useCallback((filename: string) => {
    return filename.replace(/\.(xlsx|xls)$/i, '').trim();
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = Array.from(event.dataTransfer.files).filter(file => 
      file.name.match(/\.(xlsx|xls)$/i)
    );
    
    if (droppedFiles.length === 0) {
      toast.error('Please drop Excel files (.xlsx or .xls) only');
      return;
    }

    addFiles(droppedFiles);
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    addFiles(selectedFiles);
  };

  const addFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter(file => 
      file.name.match(/\.(xlsx|xls)$/i) && 
      !files.some(existingFile => existingFile.name === file.name)
    );

    setFiles(prev => [...prev, ...validFiles]);
    
    const newResults: ProjectImportResult[] = validFiles.map((file, index) => ({
      filename: file.name,
      projectName: extractProjectName(file.name),
      projectId: generateProjectId(files.length + index),
      status: 'pending'
    }));

    setResults(prev => [...prev, ...newResults]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setResults(prev => prev.filter((_, i) => i !== index));
  };

  const processFiles = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setProcessingProgress(0);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const resultIndex = i;

      setResults(prev => prev.map((result, idx) => 
        idx === resultIndex ? { ...result, status: 'processing' } : result
      ));

      try {
        const data = await parseProjectWorkbook(file, results[resultIndex].projectId);
        
        // Use project name from metadata sheet, fallback to filename
        const actualProjectName = data.metadata['اسم المشروع'] || results[resultIndex].projectName;
        
        console.log('BulkImport Debug:', {
          filename: file.name,
          metadataProjectName: data.metadata['اسم المشروع'],
          actualProjectName,
          filenameProjectName: results[resultIndex].projectName
        });
        
        // Check if project exists using the actual project name from metadata
        const existingProjects = FakeApi.listProjects();
        console.log('Existing projects:', existingProjects.map(p => ({ id: p.project_id, name: p.name })));
        
        const existingProject = existingProjects.find(p => 
          p.name.toLowerCase() === actualProjectName.toLowerCase()
        );
        
        console.log('Found existing project:', existingProject ? { id: existingProject.project_id, name: existingProject.name } : 'None');

        // Ensure new projects get a truly unique ID to avoid accidental overrides
        const projectIdToUse = existingProject?.project_id || `prj-${crypto.randomUUID()}`;
        if (!existingProject && results[resultIndex].projectId !== projectIdToUse) {
          setResults(prev => prev.map((r, idx) => idx === resultIndex ? { ...r, projectId: projectIdToUse, projectName: actualProjectName } : r));
        }

        const projectData: Project = {
          project_id: projectIdToUse,
          name: actualProjectName,
          priority: Math.floor(Math.random() * 100) + 1, // Random priority as requested
          status: existingProject?.status || 'Planning',
          created_at: existingProject?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          description: existingProject?.description,
          deadline: existingProject?.deadline,
          meta: { ...existingProject?.meta, ...data.metadata }
        };

        // Upsert project
        FakeApi.upsertProject(projectData);

        // Clear existing requirements if updating
        if (existingProject) {
          const existingRequirements = FakeApi.listRequirements().filter(
            req => req.project_id === existingProject.project_id
          );
          existingRequirements.forEach(req => FakeApi.deleteRequirement(req.id));
        }

        // Add new requirements
        data.requirements.forEach(req => {
          FakeApi.upsertRequirement({
            ...req,
            id: crypto.randomUUID(),
            project_id: projectData.project_id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        });

        setResults(prev => prev.map((result, idx) => 
          idx === resultIndex ? { 
            ...result, 
            status: 'success', 
            data,
            warnings: data.warnings 
          } : result
        ));

      } catch (error) {
        setResults(prev => prev.map((result, idx) => 
          idx === resultIndex ? { 
            ...result, 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Unknown error'
          } : result
        ));
      }

      setProcessingProgress(((i + 1) / files.length) * 100);
    }

    setIsProcessing(false);
    toast.success(`Successfully processed ${results.filter(r => r.status === 'success').length} out of ${files.length} projects`);
  };

  const handleClose = () => {
    if (!isProcessing) {
      setFiles([]);
      setResults([]);
      setProcessingProgress(0);
      onClose();
      
      // If any files were successfully processed, trigger refresh
      if (results.some(r => r.status === 'success')) {
        onImportComplete();
      }
    }
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const totalWarnings = results.reduce((count, r) => count + (r.warnings?.length || 0), 0);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Bulk Project Importer
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-y-auto">
          {/* Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            }`}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">
              Drop Excel files here or click to browse
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Each file should contain "Requirements" and "Metadata" sheets. The filename will be used as the project name.
            </p>
            <input
              type="file"
              multiple
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
              id="bulk-file-upload"
              disabled={isProcessing}
            />
            <Button 
              variant="outline" 
              asChild 
              disabled={isProcessing}
            >
              <label htmlFor="bulk-file-upload" className="cursor-pointer">
                <FileText className="h-4 w-4 mr-2" />
                Browse Files
              </label>
            </Button>
          </div>

          {/* Processing Progress */}
          {isProcessing && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                  Processing Projects...
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={processingProgress} className="mb-2" />
                <p className="text-sm text-muted-foreground">
                  {Math.round(processingProgress)}% complete
                </p>
              </CardContent>
            </Card>
          )}

          {/* Summary Stats */}
          {results.length > 0 && (
            <div className="flex gap-4">
              <Badge variant="outline" className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {files.length} files
              </Badge>
              {successCount > 0 && (
                <Badge variant="outline" className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  {successCount} successful
                </Badge>
              )}
              {errorCount > 0 && (
                <Badge variant="outline" className="flex items-center gap-1 text-red-600">
                  <AlertTriangle className="h-3 w-3" />
                  {errorCount} errors
                </Badge>
              )}
              {totalWarnings > 0 && (
                <Badge variant="outline" className="flex items-center gap-1 text-yellow-600">
                  <AlertTriangle className="h-3 w-3" />
                  {totalWarnings} warnings
                </Badge>
              )}
            </div>
          )}

          {/* File List */}
          {results.length > 0 && (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <Card key={index} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-sm flex items-center gap-2">
                          {result.status === 'pending' && <FileText className="h-4 w-4 text-muted-foreground" />}
                          {result.status === 'processing' && (
                            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                          )}
                          {result.status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                          {result.status === 'error' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                          {result.projectName}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          File: {result.filename} | Project ID: {result.projectId}
                        </p>
                      </div>
                      {!isProcessing && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>

                  {(result.data || result.error) && (
                    <CardContent className="pt-0">
                      {result.error && (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>{result.error}</AlertDescription>
                        </Alert>
                      )}

                      {result.data && (
                        <div className="space-y-2">
                          <div className="flex gap-2 flex-wrap">
                            <Badge variant="secondary" className="text-xs">
                              {result.data.requirements.length} requirements
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {Object.keys(result.data.metadata).length} metadata fields
                            </Badge>
                          </div>

                          {result.warnings && result.warnings.length > 0 && (
                            <Alert>
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription>
                                <p className="text-xs font-medium">Warnings:</p>
                                <ul className="text-xs list-disc list-inside">
                                  {result.warnings.slice(0, 3).map((warning, idx) => (
                                    <li key={idx}>{warning}</li>
                                  ))}
                                  {result.warnings.length > 3 && (
                                    <li>... and {result.warnings.length - 3} more</li>
                                  )}
                                </ul>
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            {results.some(r => r.status === 'success') ? 'Close' : 'Cancel'}
          </Button>
          <Button 
            onClick={processFiles} 
            disabled={files.length === 0 || isProcessing}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import {files.length} Project{files.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};