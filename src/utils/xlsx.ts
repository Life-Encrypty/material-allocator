import * as XLSX from 'xlsx';
import type { ProjectRequirement } from '@/domain/types';

/**
 * Excel parsing has been moved to Supabase Edge Functions:
 * - import-inventory: Handles inventory Excel uploads
 * - import-projects: Handles project workbook uploads
 * 
 * This file now only contains export functions.
 */

export async function exportProjectTemplate(
  project: any,
  requirements: ProjectRequirement[],
  descriptions: Record<string, string> = {}
): Promise<void> {
  const wb = XLSX.utils.book_new();

  // Requirements Sheet
  const reqHeaders = [
    'Item Code', 'Description', 'Required Qty', 'Withdrawn Qty', 'Exclude', 'Notes'
  ];

  const reqData = [
    reqHeaders,
    ...requirements.map(req => [
      req.item_code,
      descriptions[req.item_code] || '',
      req.required_qty,
      req.withdrawn_qty,
      req.exclude_from_allocation ? 'TRUE' : 'FALSE',
      req.notes || ''
    ])
  ];

  const reqWs = XLSX.utils.aoa_to_sheet(reqData);
  XLSX.utils.book_append_sheet(wb, reqWs, 'Requirements');

  // Metadata Sheet  
  const metaHeaders = [
    'اسم المشروع', 'رقم الرسم', 'تاريخ الرسم', 'رقم الحساب', 'بند الميزانية',
    'رقم الاستثمارى', 'تاريخ الفتح', 'الاشراف الهندسى', 'الاشراف الفنى',
    'الإدارة الطالبة', 'الشركة المنفذة', 'نسبة صرف المهمات', 'نسبة التنفيذ', 'PO', 'PR'
  ];

  const metaData = [
    metaHeaders,
    metaHeaders.map(header => project.meta?.[header] || '')
  ];

  const metaWs = XLSX.utils.aoa_to_sheet(metaData);
  XLSX.utils.book_append_sheet(wb, metaWs, 'Metadata');

  // Export file
  XLSX.writeFile(wb, `project_${project.project_id}_template.xlsx`);
}

export async function exportToExcel(data: any[], filename: string): Promise<void> {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, filename);
}
