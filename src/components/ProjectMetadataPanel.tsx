import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { FakeApi } from '@/api/FakeApi';
import { toast } from 'sonner';
import type { Project } from '@/domain/types';

interface ProjectMetadataPanelProps {
  project: Project;
  onProjectUpdated: () => void;
}

export const ProjectMetadataPanel = ({ project, onProjectUpdated }: ProjectMetadataPanelProps) => {
  const [metadata, setMetadata] = useState(project.meta || {});

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
    <Card>
      <CardHeader>
        <CardTitle>Project Metadata</CardTitle>
      </CardHeader>
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
        
        <div className="mt-6">
          <Button onClick={saveMetadata}>
            Save Metadata
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};