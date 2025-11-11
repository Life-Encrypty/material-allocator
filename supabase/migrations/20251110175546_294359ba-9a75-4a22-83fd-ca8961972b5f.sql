-- Fix search_path for update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix search_path for ensure_single_active_snapshot function
CREATE OR REPLACE FUNCTION public.ensure_single_active_snapshot()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE public.inventory_snapshots
    SET is_active = false
    WHERE snapshot_id != NEW.snapshot_id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;