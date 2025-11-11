import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.0';
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedRow {
  item_code?: string;
  description?: string;
  unit?: string;
  batch_number?: string;
  current_balance?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      throw new Error('No file provided');
    }

    console.log(`Processing file: ${file.name}, size: ${file.size} bytes`);

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    
    // Parse Excel file
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON with header row
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    if (jsonData.length < 2) {
      throw new Error('File must contain at least a header row and one data row');
    }

    // Get headers and data rows
    const headers = jsonData[0] as string[];
    const dataRows = jsonData.slice(1);
    
    console.log(`Headers found: ${headers.join(', ')}`);
    
    // Create column mapping
    const columnMap = createColumnMapping(headers);
    console.log('Column mapping:', columnMap);
    
    // Generate snapshot ID
    const timestamp = new Date().toISOString();
    const snapshotId = `INV_${timestamp.replace(/[:.]/g, '-')}`;
    
    // Parse inventory rows
    const inventoryRows: any[] = [];
    const materialsMap = new Map<string, any>();
    
    dataRows.forEach((row, index) => {
      const parsedRow = parseRow(row, columnMap);
      
      // Skip rows without item_code
      if (!parsedRow.item_code || parsedRow.item_code.trim() === '') {
        return;
      }
      
      const item_code = parsedRow.item_code.trim();
      
      // Store material info
      if (!materialsMap.has(item_code)) {
        materialsMap.set(item_code, {
          item_code,
          name: parsedRow.description || item_code,
          description: parsedRow.description || '',
          category: 'Imported',
          unit: parsedRow.unit || 'Unit'
        });
      }
      
      // Create inventory row
      inventoryRows.push({
        snapshot_id: snapshotId,
        item_code,
        batch_number: parsedRow.batch_number?.trim() || 'DEFAULT-BATCH',
        current_balance: parsedRow.current_balance || 0,
        location: '',
        notes: parsedRow.description || ''
      });
    });
    
    if (inventoryRows.length === 0) {
      throw new Error('No valid inventory rows found in the file');
    }

    console.log(`Parsed ${inventoryRows.length} inventory rows`);
    console.log(`Found ${materialsMap.size} unique materials`);

    // Upsert materials first to satisfy foreign key constraint
    let materialsCreated = 0;
    for (const material of materialsMap.values()) {
      const { error } = await supabase
        .from('materials')
        .upsert(material, { onConflict: 'item_code' });
      
      if (error) {
        console.error(`Error upserting material ${material.item_code}:`, error);
      } else {
        materialsCreated++;
      }
    }

    console.log(`Upserted ${materialsCreated} materials`);

    // Create snapshot
    const { error: snapshotError } = await supabase
      .from('inventory_snapshots')
      .insert({
        snapshot_id: snapshotId,
        name: `Imported from ${file.name}`,
        created_by: 'admin',
        is_active: true
      });
    
    if (snapshotError) {
      throw new Error(`Failed to create snapshot: ${snapshotError.message}`);
    }

    console.log(`Created snapshot: ${snapshotId}`);

    // Insert inventory rows in batches
    const batchSize = 100;
    for (let i = 0; i < inventoryRows.length; i += batchSize) {
      const batch = inventoryRows.slice(i, i + batchSize);
      const { error: rowsError } = await supabase
        .from('inventory_rows')
        .insert(batch);
      
      if (rowsError) {
        throw new Error(`Failed to insert inventory rows: ${rowsError.message}`);
      }
      
      console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}`);
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        snapshot: {
          snapshot_id: snapshotId,
          name: `Imported from ${file.name}`,
          item_count: inventoryRows.length
        },
        materials_created: materialsCreated,
        warnings: []
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Import error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});

function createColumnMapping(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};
  
  headers.forEach((header, index) => {
    const normalizedHeader = header?.toString().toLowerCase().trim() || '';
    
    if (normalizedHeader.includes('item') || 
        normalizedHeader.includes('code') || 
        normalizedHeader.includes('الكود') ||
        normalizedHeader === 'item code') {
      mapping.item_code = index;
    }
    else if (normalizedHeader.includes('batch') || 
             normalizedHeader.includes('رقم الدفعة') ||
             normalizedHeader.includes('دفعة') ||
             normalizedHeader === 'batch number') {
      mapping.batch_number = index;
    }
    else if (normalizedHeader.includes('description') || 
             normalizedHeader.includes('بيان') ||
             normalizedHeader.includes('المهمات')) {
      mapping.description = index;
    }
    else if (normalizedHeader.includes('unit') || 
             normalizedHeader.includes('الوحدة') ||
             normalizedHeader === 'issue unit') {
      mapping.unit = index;
    }
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
  
  if (columnMap.batch_number !== undefined && row[columnMap.batch_number] !== undefined) {
    parsed.batch_number = String(row[columnMap.batch_number]).trim();
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
