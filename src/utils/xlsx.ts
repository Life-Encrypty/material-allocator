import * as XLSX from 'xlsx';
import type { InventorySnapshot, InventoryRow } from '@/domain/types';

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