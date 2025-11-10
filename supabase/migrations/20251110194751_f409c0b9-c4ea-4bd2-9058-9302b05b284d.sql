-- Make item_code nullable in project_requirements to allow empty rows
ALTER TABLE public.project_requirements 
ALTER COLUMN item_code DROP NOT NULL;

-- Update the foreign key constraint to handle NULL values properly
-- (Foreign keys already allow NULL by default, but let's ensure proper behavior)
ALTER TABLE public.project_requirements 
DROP CONSTRAINT IF EXISTS project_requirements_item_code_fkey;

ALTER TABLE public.project_requirements 
ADD CONSTRAINT project_requirements_item_code_fkey 
FOREIGN KEY (item_code) 
REFERENCES public.materials(item_code) 
ON DELETE RESTRICT 
ON UPDATE CASCADE;