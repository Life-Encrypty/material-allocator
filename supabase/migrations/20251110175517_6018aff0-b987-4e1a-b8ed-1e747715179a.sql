-- Create materials table
CREATE TABLE public.materials (
  item_code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create projects table
CREATE TABLE public.projects (
  project_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Planning' CHECK (status IN ('Planning', 'In Progress', 'Completed', 'On Hold')),
  description TEXT,
  deadline TIMESTAMPTZ,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create inventory_snapshots table
CREATE TABLE public.inventory_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false
);

-- Create inventory_rows table
CREATE TABLE public.inventory_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id TEXT NOT NULL REFERENCES public.inventory_snapshots(snapshot_id) ON DELETE CASCADE,
  item_code TEXT NOT NULL REFERENCES public.materials(item_code) ON DELETE CASCADE,
  batch_number TEXT NOT NULL,
  current_balance NUMERIC NOT NULL DEFAULT 0,
  location TEXT,
  notes TEXT
);

-- Create project_requirements table
CREATE TABLE public.project_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL REFERENCES public.projects(project_id) ON DELETE CASCADE,
  item_code TEXT NOT NULL REFERENCES public.materials(item_code) ON DELETE CASCADE,
  required_qty NUMERIC NOT NULL DEFAULT 0,
  withdrawn_qty NUMERIC NOT NULL DEFAULT 0,
  exclude_from_allocation BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, item_code)
);

-- Create indexes
CREATE INDEX idx_inventory_rows_snapshot_item ON public.inventory_rows(snapshot_id, item_code);
CREATE INDEX idx_project_requirements_project ON public.project_requirements(project_id);
CREATE INDEX idx_project_requirements_item ON public.project_requirements(item_code);

-- Enable Row Level Security
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_requirements ENABLE ROW LEVEL SECURITY;

-- Create permissive RLS policies (no auth yet)
CREATE POLICY "allow_all_select" ON public.materials FOR SELECT USING (true);
CREATE POLICY "allow_all_insert" ON public.materials FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_update" ON public.materials FOR UPDATE USING (true);
CREATE POLICY "allow_all_delete" ON public.materials FOR DELETE USING (true);

CREATE POLICY "allow_all_select" ON public.projects FOR SELECT USING (true);
CREATE POLICY "allow_all_insert" ON public.projects FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_update" ON public.projects FOR UPDATE USING (true);
CREATE POLICY "allow_all_delete" ON public.projects FOR DELETE USING (true);

CREATE POLICY "allow_all_select" ON public.inventory_snapshots FOR SELECT USING (true);
CREATE POLICY "allow_all_insert" ON public.inventory_snapshots FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_update" ON public.inventory_snapshots FOR UPDATE USING (true);
CREATE POLICY "allow_all_delete" ON public.inventory_snapshots FOR DELETE USING (true);

CREATE POLICY "allow_all_select" ON public.inventory_rows FOR SELECT USING (true);
CREATE POLICY "allow_all_insert" ON public.inventory_rows FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_update" ON public.inventory_rows FOR UPDATE USING (true);
CREATE POLICY "allow_all_delete" ON public.inventory_rows FOR DELETE USING (true);

CREATE POLICY "allow_all_select" ON public.project_requirements FOR SELECT USING (true);
CREATE POLICY "allow_all_insert" ON public.project_requirements FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_update" ON public.project_requirements FOR UPDATE USING (true);
CREATE POLICY "allow_all_delete" ON public.project_requirements FOR DELETE USING (true);

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_materials_updated_at
  BEFORE UPDATE ON public.materials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_requirements_updated_at
  BEFORE UPDATE ON public.project_requirements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to ensure only one active snapshot
CREATE OR REPLACE FUNCTION public.ensure_single_active_snapshot()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE public.inventory_snapshots
    SET is_active = false
    WHERE snapshot_id != NEW.snapshot_id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for active snapshot
CREATE TRIGGER ensure_single_active_snapshot_trigger
  BEFORE INSERT OR UPDATE ON public.inventory_snapshots
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION public.ensure_single_active_snapshot();

-- Enable realtime for critical tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_rows;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_requirements;