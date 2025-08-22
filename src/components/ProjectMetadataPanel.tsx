import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { FakeApi } from '@/api/FakeApi';
import { toast } from 'sonner';
import type { Project } from '@/domain/types';

interface ProjectMetadataPanelProps {
  project: Project;
  onProjectUpdated: () => void;
}

export const ProjectMetadataPanel = ({ project, onProjectUpdated }: ProjectMetadataPanelProps) => {
  const [metadata, setMetadata] = useState(project.meta || {});
  const [isOpen, setIsOpen] = useState(false);

  const handleMetadataChange = (field: string, value: string) => {
    setMetadata(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveMetadata = () => {
    const updatedProject = {
      ...project,
      meta: metadata
    };
    
    FakeApi.upsertProject(updatedProject);
    onProjectUpdated();
    toast.success('Project metadata updated');
  };

  const deleteEmptyTemplate = () => {
    const updatedProject = {
      ...project,
      meta: {}
    };
    
    FakeApi.upsertProject(updatedProject);
    setMetadata({});
    onProjectUpdated();
    toast.success('Project metadata template cleared');
  };

  const metadataFields = [
    { key: 'اسم المشروع', label: 'اسم المشروع', placeholder: 'Enter project name in Arabic' },
    { key: 'رقم الرسم', label: 'رقم الرسم', placeholder: 'Enter drawing number' },
    { key: 'تاريخ الرسم', label: 'تاريخ الرسم', placeholder: 'Enter drawing date' },
    { key: 'رقم الحساب', label: 'رقم الحساب', placeholder: 'Enter account number' },
    { key: 'بند الميزانية', label: 'بند الميزانية', placeholder: 'Enter budget item' },
    { key: 'رقم الاستثمارى', label: 'رقم الاستثمارى', placeholder: 'Enter investment number' },
    { key: 'تاريخ الفتح', label: 'تاريخ الفتح', placeholder: 'Enter opening date (YYYY/MM/DD)' },
    { key: 'الاشراف الهندسى', label: 'الاشراف الهندسى', placeholder: 'Enter engineering supervision' },
    { key: 'الاشراف الفنى', label: 'الاشراف الفنى', placeholder: 'Enter technical supervision' },
    { key: 'الإدارة الطالبة', label: 'الإدارة الطالبة', placeholder: 'Enter requesting department' },
    { key: 'الشركة المنفذة', label: 'الشركة المنفذة', placeholder: 'Enter executing company' },
    { key: 'نسبة صرف المهمات', label: 'نسبة صرف المهمات', placeholder: 'Enter material disbursement percentage' },
    { key: 'نسبة التنفيذ', label: 'نسبة التنفيذ', placeholder: 'Enter execution percentage' },
    { key: 'PO', label: 'PO', placeholder: 'Enter purchase order' },
    { key: 'PR', label: 'PR', placeholder: 'Enter purchase request' },
  ];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle>Project Metadata</CardTitle>
              <div className="flex items-center space-x-2">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {metadataFields.map(({ key, label, placeholder }) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key} className="text-sm font-medium">
                    {label}
                  </Label>
                  <Input
                    id={key}
                    value={metadata[key as keyof typeof metadata] || ''}
                    onChange={(e) => handleMetadataChange(key, e.target.value)}
                    placeholder={placeholder}
                    className="text-sm"
                  />
                </div>
              ))}
            </div>
            
            <div className="flex items-center justify-between mt-6">
              <Button onClick={saveMetadata}>
                Save Metadata
              </Button>
              <Button 
                variant="outline" 
                onClick={deleteEmptyTemplate}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Template
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};