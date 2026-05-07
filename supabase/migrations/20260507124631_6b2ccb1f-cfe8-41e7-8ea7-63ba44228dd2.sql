
CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_settings_select_auth" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "app_settings_insert_auth" ON public.app_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "app_settings_update_auth" ON public.app_settings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "app_settings_delete_auth" ON public.app_settings FOR DELETE TO authenticated USING (true);

CREATE TRIGGER trg_app_settings_updated
BEFORE UPDATE ON public.app_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
