import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.0';
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const files: File[] = [];

    // Collect all files from formData
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      throw new Error('No files provided');
    }

    console.log(`Processing ${files.length} file(s)`);

    const results: any[] = [];

    // Process each file
    for (const file of files) {
      try {
        console.log(`Processing file: ${file.name}`);

        // Read file as ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);

        // Parse Excel file
        const workbook = XLSX.read(data, { type: 'array' });

        const result = {
          filename: file.name,
          project_id: '',
          project_name: '',
          status: 'pending',
          requirements_count: 0,
          metadata_fields: 0,
          warnings: [] as string[]
        };

        // Find Requirements and Metadata sheets
        const reqSheetName = workbook.SheetNames.find(name =>
          name.toLowerCase().includes('requirements') ||
          name.includes('المهمات')
        );

        const metaSheetName = workbook.SheetNames.find(name =>
          name.toLowerCase().includes('metadata') ||
          name.includes('بيانات المشروع')
        );

        const requirements: any[] = [];
        const metadata: Record<string, string> = {};

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
              const parsed = parseRequirementRow(row, reqColumnMap);

              if (!parsed.item_code?.trim()) {
                return;
              }

              if (seenItems.has(parsed.item_code)) {
                result.warnings.push(`Duplicate item_code "${parsed.item_code}" at row ${index + 2}`);
              }
              seenItems.add(parsed.item_code);

              parsed.required_qty = Math.max(0, parsed.required_qty);
              parsed.withdrawn_qty = Math.max(0, Math.min(parsed.withdrawn_qty, parsed.required_qty));

              if (parsed.withdrawn_qty > parsed.required_qty) {
                result.warnings.push(`Withdrawn qty clamped for item "${parsed.item_code}" at row ${index + 2}`);
              }

              requirements.push(parsed);
            });
          }
        } else {
          result.warnings.push('Requirements sheet not found');
        }

        // Parse Metadata sheet
        if (metaSheetName) {
          const metaSheet = workbook.Sheets[metaSheetName];
          const metaData = XLSX.utils.sheet_to_json(metaSheet, { header: 1 }) as any[][];

          if (metaData.length >= 2) {
            const headers = metaData[0] as string[];
            const dataRow = metaData[1];

            const metaColumnMap = createMetadataColumnMapping(headers);

            Object.entries(metaColumnMap).forEach(([field, colIndex]) => {
              const value = dataRow[colIndex];
              if (value !== undefined && value !== null && value !== '') {
                metadata[field] = String(value).trim();
              }
            });
          }
        }

        // Get project name from metadata
        const projectName = metadata['اسم المشروع'] || file.name.replace(/\.xlsx?$/i, '');
        result.project_name = projectName;
        result.requirements_count = requirements.length;
        result.metadata_fields = Object.keys(metadata).length;

        // Check if project exists
        const { data: existingProjects } = await supabase
          .from('projects')
          .select('*');

        const existingProject = existingProjects?.find(p =>
          p.name.toLowerCase() === projectName.toLowerCase()
        );

        const projectId = existingProject?.project_id || `prj-${crypto.randomUUID()}`;
        result.project_id = projectId;
        result.status = existingProject ? 'updated' : 'created';

        // Upsert project
        const projectData = {
          project_id: projectId,
          name: projectName,
          priority: existingProject?.priority ?? Math.floor(Math.random() * 100) + 1,
          status: existingProject?.status || 'Planning',
          description: existingProject?.description,
          deadline: existingProject?.deadline,
          meta: { ...existingProject?.meta, ...metadata }
        };

        const { error: projectError } = await supabase
          .from('projects')
          .upsert(projectData, { onConflict: 'project_id' });

        if (projectError) {
          throw new Error(`Failed to upsert project: ${projectError.message}`);
        }

        // Clear existing requirements if updating
        if (existingProject) {
          const { error: deleteError } = await supabase
            .from('project_requirements')
            .delete()
            .eq('project_id', projectId);

          if (deleteError) {
            console.error(`Error deleting old requirements: ${deleteError.message}`);
          }
        }

        // Ensure materials exist for all requirements
        if (requirements.length > 0) {
          const itemCodes = [...new Set(requirements.map(r => r.item_code))];

          // Check existing materials
          const { data: existingMaterials, error: matCheckError } = await supabase
            .from('materials')
            .select('item_code')
            .in('item_code', itemCodes);

          if (matCheckError) {
            console.error('Error checking materials:', matCheckError);
            // Continue and let FK constraint fail if check fails
          } else {
            const existingCodes = new Set(existingMaterials?.map(m => m.item_code) || []);
            const missingCodes = itemCodes.filter(code => !existingCodes.has(code));

            if (missingCodes.length > 0) {
              console.log(`Creating ${missingCodes.length} missing materials for project ${projectId}`);
              const newMaterials = missingCodes.map(code => ({
                item_code: code,
                name: code,
                category: 'Unknown',
                unit: 'Each',
                description: 'Auto-created from import',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }));

              const { error: matCreateError } = await supabase
                .from('materials')
                .upsert(newMaterials, { onConflict: 'item_code' });

              if (matCreateError) {
                console.error('Error creating missing materials:', matCreateError);
                throw new Error(`Failed to create missing materials: ${matCreateError.message}`);
              }
            }
          }
        }

        // Insert new requirements
        if (requirements.length > 0) {
          const requirementsToInsert = requirements.map(req => ({
            project_id: projectId,
            item_code: req.item_code,
            required_qty: req.required_qty,
            withdrawn_qty: req.withdrawn_qty,
            exclude_from_allocation: req.exclude_from_allocation || false,
            notes: req.notes || ''
          }));

          const { error: reqError } = await supabase
            .from('project_requirements')
            .insert(requirementsToInsert);

          if (reqError) {
            throw new Error(`Failed to insert requirements: ${reqError.message}`);
          }
        }

        console.log(`Successfully processed ${file.name}: ${result.status} project ${projectId}`);
        results.push(result);

      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        results.push({
          filename: file.name,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results
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

function createRequirementsColumnMapping(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};

  headers.forEach((header, index) => {
    const normalized = header?.toString().toLowerCase().trim() || '';

    if (normalized.includes('item') && normalized.includes('code') ||
      normalized.includes('الكود') ||
      normalized === 'item code') {
      mapping.item_code = index;
    }
    else if (normalized.includes('required') ||
      normalized.includes('المطلوب')) {
      mapping.required_qty = index;
    }
    else if (normalized.includes('withdrawn') ||
      normalized.includes('المنصرف')) {
      mapping.withdrawn_qty = index;
    }
    else if (normalized.includes('exclude') ||
      normalized.includes('استثناء') ||
      normalized.includes('مكتمل') ||
      normalized.includes('complete')) {
      mapping.exclude_from_allocation = index;
    }
    else if (normalized.includes('notes') ||
      normalized.includes('ملاحظات')) {
      mapping.notes = index;
    }
  });

  return mapping;
}

function createMetadataColumnMapping(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};

  const fieldMappings: Record<string, string> = {
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
    const field = fieldMappings[normalized];
    if (field) {
      mapping[field] = index;
    }
  });

  return mapping;
}

function parseRequirementRow(row: any[], columnMap: Record<string, number>): any {
  const parsed: any = {
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
