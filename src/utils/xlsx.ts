import * as XLSX from 'xlsx';
import type { InventorySnapshot, InventoryRow, ProjectRequirement } from '@/domain/types';

interface ParsedRow {
  item_code?: string;
  description?: string;
  unit?: string;
  current_balance?: number;
}

export async function parseInventory(file: File): Promise<InventorySnapshot> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON with header row
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        if (jsonData.length < 2) {
          throw new Error('File must contain at least a header row and one data row');
        }
        
        // Get headers from first row
        const headers = jsonData[0] as string[];
        const dataRows = jsonData.slice(1);
        
        // Create column mapping
        const columnMap = createColumnMapping(headers);
        
        // Parse data rows
        const inventoryRows: InventoryRow[] = [];
        const timestamp = new Date().toISOString();
        const snapshotId = `INV_${timestamp.replace(/[:.]/g, '-')}`;
        
        dataRows.forEach((row, index) => {
          const parsedRow = parseRow(row, columnMap);
          
          // Skip rows without item_code or with empty item_code
          if (!parsedRow.item_code || parsedRow.item_code.trim() === '') {
            return;
          }
          
          const inventoryRow: InventoryRow = {
            id: `${snapshotId}_${index}`,
            snapshot_id: snapshotId,
            item_code: parsedRow.item_code.trim(),
            current_balance: parsedRow.current_balance || 0,
            location: '', // Default empty location
            notes: parsedRow.description || ''
          };
          
          inventoryRows.push(inventoryRow);
        });
        
        if (inventoryRows.length === 0) {
          throw new Error('No valid inventory rows found in the file');
        }
        
        // Create snapshot
        const snapshot: InventorySnapshot = {
          snapshot_id: snapshotId,
          name: `Imported from ${file.name}`,
          created_at: timestamp,
          created_by: 'admin', // TODO: Get from current user context
          is_active: true
        };
        
        // Store rows in the snapshot object for processing
        (snapshot as any).rows = inventoryRows;
        
        resolve(snapshot);
        
      } catch (error) {
        reject(new Error(`Failed to parse XLSX file: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsBinaryString(file);
  });
}

function createColumnMapping(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};
  
  headers.forEach((header, index) => {
    const normalizedHeader = header?.toString().toLowerCase().trim() || '';
    
    // Map Item or Arabic الكود → item_code
    if (normalizedHeader.includes('item') || 
        normalizedHeader.includes('code') || 
        normalizedHeader.includes('الكود') ||
        normalizedHeader === 'item code') {
      mapping.item_code = index;
    }
    
    // Map Description or بيان المهمات → description  
    else if (normalizedHeader.includes('description') || 
             normalizedHeader.includes('بيان') ||
             normalizedHeader.includes('المهمات')) {
      mapping.description = index;
    }
    
    // Map Issue Unit or الوحدة → unit
    else if (normalizedHeader.includes('unit') || 
             normalizedHeader.includes('الوحدة') ||
             normalizedHeader === 'issue unit') {
      mapping.unit = index;
    }
    
    // Map Current Balance or المخزون → current_balance
    else if (normalizedHeader.includes('balance') || 
             normalizedHeader.includes('stock') ||
             normalizedHeader.includes('المخزون') ||
             normalizedHeader === 'current balance') {
      mapping.current_balance = index;
    }
  });
  
  return mapping;
}

function parseRow(row: any[], columnMap: Record<string, number>): ParsedRow {
  const parsed: ParsedRow = {};
  
  if (columnMap.item_code !== undefined && row[columnMap.item_code] !== undefined) {
    parsed.item_code = String(row[columnMap.item_code]).trim();
  }
  
  if (columnMap.description !== undefined && row[columnMap.description] !== undefined) {
    parsed.description = String(row[columnMap.description]).trim();
  }
  
  if (columnMap.unit !== undefined && row[columnMap.unit] !== undefined) {
    parsed.unit = String(row[columnMap.unit]).trim();
  }
  
  if (columnMap.current_balance !== undefined && row[columnMap.current_balance] !== undefined) {
    const balance = row[columnMap.current_balance];
    if (typeof balance === 'number') {
      parsed.current_balance = balance;
    } else if (typeof balance === 'string') {
      const numValue = parseFloat(balance.replace(/[^\d.-]/g, ''));
      parsed.current_balance = isNaN(numValue) ? 0 : numValue;
    }
  }
  
  return parsed;
}

export interface ProjectWorkbookResult {
  requirements: Omit<ProjectRequirement, 'id' | 'created_at' | 'updated_at'>[];
  metadata: Record<string, string>;
  warnings: string[];
}

export async function parseProjectWorkbook(file: File, project_id: string): Promise<ProjectWorkbookResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        const result: ProjectWorkbookResult = {
          requirements: [],
          metadata: {},
          warnings: []
        };

        // Find Requirements sheet
        const reqSheetName = workbook.SheetNames.find(name => 
          name.toLowerCase().includes('requirements') || 
          name.includes('المهمات')
        );

        // Find Metadata sheet
        const metaSheetName = workbook.SheetNames.find(name => 
          name.toLowerCase().includes('metadata') || 
          name.includes('بيانات المشروع')
        );

        // Parse Requirements sheet
        if (reqSheetName) {
          const reqSheet = workbook.Sheets[reqSheetName];
          const reqData = XLSX.utils.sheet_to_json(reqSheet, { header: 1 }) as any[][];
          
          if (reqData.length >= 2) {
            const headers = reqData[0] as string[];
            const dataRows = reqData.slice(1);
            
            const reqColumnMap = createRequirementsColumnMapping(headers);
            const seenItems = new Set<string>();
            
            dataRows.forEach((row, index) => {
              const parsed = parseRequirementRow(row, reqColumnMap, project_id);
              
              if (!parsed.item_code?.trim()) {
                return; // Skip rows without item_code
              }
              
              // Check for duplicates
              if (seenItems.has(parsed.item_code)) {
                result.warnings.push(`Duplicate item_code "${parsed.item_code}" at row ${index + 2}. Last row wins.`);
              }
              seenItems.add(parsed.item_code);
              
              // Validate and clamp values
              parsed.required_qty = Math.max(0, parsed.required_qty);
              parsed.withdrawn_qty = Math.max(0, Math.min(parsed.withdrawn_qty, parsed.required_qty));
              
              if (parsed.withdrawn_qty > parsed.required_qty) {
                result.warnings.push(`Withdrawn qty clamped for item "${parsed.item_code}" at row ${index + 2}`);
              }
              
              result.requirements.push(parsed);
            });
          }
        } else {
          result.warnings.push('Requirements sheet not found (expected "Requirements" or "المهمات")');
        }

        // Parse Metadata sheet
        if (metaSheetName) {
          const metaSheet = workbook.Sheets[metaSheetName];
          const metaData = XLSX.utils.sheet_to_json(metaSheet, { header: 1 }) as any[][];
          
          if (metaData.length >= 2) {
            const headers = metaData[0] as string[];
            const dataRow = metaData[1]; // Single data row expected
            
            const metaColumnMap = createMetadataColumnMapping(headers);
            
            Object.entries(metaColumnMap).forEach(([field, colIndex]) => {
              const value = dataRow[colIndex];
              if (value !== undefined && value !== null && value !== '') {
                if (String(value).trim() === '[CLEAR]') {
                  // Special marker to clear field - we'll handle this in the UI
                  result.metadata[`[CLEAR]${field}`] = '';
                } else {
                  result.metadata[field] = String(value).trim();
                }
              }
            });
          }
        }

        resolve(result);
        
      } catch (error) {
        reject(new Error(`Failed to parse project workbook: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsBinaryString(file);
  });
}

function createRequirementsColumnMapping(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};
  
  headers.forEach((header, index) => {
    const normalized = header?.toString().toLowerCase().trim() || '';
    
    // Item Code | الكود
    if (normalized.includes('item') && normalized.includes('code') || 
        normalized.includes('الكود') || 
        normalized === 'item code') {
      mapping.item_code = index;
    }
    
    // Description | بيان المهمات
    else if (normalized.includes('description') || 
             normalized.includes('بيان') ||
             normalized.includes('المهمات')) {
      mapping.description = index;
    }
    
    // Required Qty | المطلوب
    else if (normalized.includes('required') || 
             normalized.includes('المطلوب')) {
      mapping.required_qty = index;
    }
    
    // Withdrawn Qty | المنصرف
    else if (normalized.includes('withdrawn') || 
             normalized.includes('المنصرف')) {
      mapping.withdrawn_qty = index;
    }
    
    // Exclude | استثناء | مكتمل
    else if (normalized.includes('exclude') || 
             normalized.includes('استثناء') || 
             normalized.includes('مكتمل') ||
             normalized.includes('complete')) {
      mapping.exclude_from_allocation = index;
    }
    
    // Notes | ملاحظات
    else if (normalized.includes('notes') || 
             normalized.includes('ملاحظات')) {
      mapping.notes = index;
    }
  });
  
  return mapping;
}

function createMetadataColumnMapping(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};
  
  const fieldMappings = {
    'اسم المشروع': 'اسم المشروع',
    'project name': 'اسم المشروع',
    'رقم الرسم': 'رقم الرسم', 
    'drawing no': 'رقم الرسم',
    'تاريخ الرسم': 'تاريخ الرسم',
    'drawing date': 'تاريخ الرسم',
    'رقم الحساب': 'رقم الحساب',
    'account no': 'رقم الحساب',
    'بند الميزانية': 'بند الميزانية',
    'budget item': 'بند الميزانية',
    'رقم الاستثمارى': 'رقم الاستثمارى',
    'investment no': 'رقم الاستثمارى',
    'تاريخ الفتح': 'تاريخ الفتح',
    'open date': 'تاريخ الفتح',
    'الاشراف الهندسى': 'الاشراف الهندسى',
    'engineering supervisor': 'الاشراف الهندسى',
    'الاشراف الفنى': 'الاشراف الفنى',
    'technical supervisor': 'الاشراف الفنى',
    'الإدارة الطالبة': 'الإدارة الطالبة',
    'requesting dept': 'الإدارة الطالبة',
    'الشركة المنفذة': 'الشركة المنفذة',
    'contractor': 'الشركة المنفذة',
    'نسبة صرف المهمات': 'نسبة صرف المهمات',
    'material issue %': 'نسبة صرف المهمات',
    'نسبة التنفيذ': 'نسبة التنفيذ',
    'execution %': 'نسبة التنفيذ',
    'po': 'PO',
    'pr': 'PR'
  };
  
  headers.forEach((header, index) => {
    const normalized = header?.toString().toLowerCase().trim() || '';
    const field = fieldMappings[normalized as keyof typeof fieldMappings];
    if (field) {
      mapping[field] = index;
    }
  });
  
  return mapping;
}

function parseRequirementRow(row: any[], columnMap: Record<string, number>, project_id: string): Omit<ProjectRequirement, 'id' | 'created_at' | 'updated_at'> {
  const parsed: Omit<ProjectRequirement, 'id' | 'created_at' | 'updated_at'> = {
    project_id,
    item_code: '',
    required_qty: 0,
    withdrawn_qty: 0,
    exclude_from_allocation: false,
    notes: ''
  };
  
  if (columnMap.item_code !== undefined && row[columnMap.item_code] !== undefined) {
    parsed.item_code = String(row[columnMap.item_code]).trim();
  }
  
  if (columnMap.required_qty !== undefined && row[columnMap.required_qty] !== undefined) {
    const value = row[columnMap.required_qty];
    if (typeof value === 'number') {
      parsed.required_qty = value;
    } else if (typeof value === 'string') {
      const numValue = parseFloat(value.replace(/[^\d.-]/g, ''));
      parsed.required_qty = isNaN(numValue) ? 0 : numValue;
    }
  }
  
  if (columnMap.withdrawn_qty !== undefined && row[columnMap.withdrawn_qty] !== undefined) {
    const value = row[columnMap.withdrawn_qty];
    if (typeof value === 'number') {
      parsed.withdrawn_qty = value;
    } else if (typeof value === 'string') {
      const numValue = parseFloat(value.replace(/[^\d.-]/g, ''));
      parsed.withdrawn_qty = isNaN(numValue) ? 0 : numValue;
    }
  }
  
  if (columnMap.exclude_from_allocation !== undefined && row[columnMap.exclude_from_allocation] !== undefined) {
    const value = String(row[columnMap.exclude_from_allocation]).toLowerCase().trim();
    parsed.exclude_from_allocation = ['true', '1', 'yes', 'نعم', 'y', 't'].includes(value);
  }
  
  if (columnMap.notes !== undefined && row[columnMap.notes] !== undefined) {
    parsed.notes = String(row[columnMap.notes]).trim();
  }
  
  return parsed;
}

export async function exportProjectTemplate(project: any, requirements: ProjectRequirement[]): Promise<void> {
  const wb = XLSX.utils.book_new();

  // Requirements Sheet
  const reqHeaders = [
    'Item Code', 'Description', 'Required Qty', 'Withdrawn Qty', 'Exclude', 'Notes'
  ];
  
  const reqData = [
    reqHeaders,
    ...requirements.map(req => [
      req.item_code,
      '', // Description will be filled from inventory
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