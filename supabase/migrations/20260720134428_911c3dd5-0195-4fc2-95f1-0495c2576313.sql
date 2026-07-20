
-- 1. organizations
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER organizations_set_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. organization_members
CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 3. Helper functions (SECURITY DEFINER para evitar recursão RLS)
CREATE OR REPLACE FUNCTION public.is_org_member(_org_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members
                 WHERE org_id = _org_id AND user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(_org_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members
                 WHERE org_id = _org_id AND user_id = _user_id AND role = 'admin')
$$;

CREATE OR REPLACE FUNCTION public.current_user_org_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
$$;

-- 4. Políticas organizations / members
CREATE POLICY organizations_select_members ON public.organizations
  FOR SELECT TO authenticated
  USING (public.is_org_member(id, auth.uid()));
CREATE POLICY organizations_update_admin ON public.organizations
  FOR UPDATE TO authenticated
  USING (public.is_org_admin(id, auth.uid()))
  WITH CHECK (public.is_org_admin(id, auth.uid()));
CREATE POLICY organizations_insert_any ON public.organizations
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY org_members_select_self ON public.organization_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_org_member(org_id, auth.uid()));
CREATE POLICY org_members_admin_manage ON public.organization_members
  FOR ALL TO authenticated
  USING (public.is_org_admin(org_id, auth.uid()))
  WITH CHECK (public.is_org_admin(org_id, auth.uid()));
CREATE POLICY org_members_self_insert ON public.organization_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 5. Criar organização "default" para dados legados
INSERT INTO public.organizations (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default', 'default')
ON CONFLICT (slug) DO NOTHING;

-- Adicionar todos usuários existentes como admin da default
INSERT INTO public.organization_members (org_id, user_id, role)
SELECT '00000000-0000-0000-0000-000000000001', id, 'admin'
FROM auth.users
ON CONFLICT DO NOTHING;

-- 6. app_settings: add org_id + repolicy
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS org_id uuid;
UPDATE public.app_settings SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
ALTER TABLE public.app_settings ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.app_settings ADD CONSTRAINT app_settings_org_fk
  FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Drop old PK if key was primary; make (org_id, key) the unique combo
ALTER TABLE public.app_settings DROP CONSTRAINT IF EXISTS app_settings_pkey;
ALTER TABLE public.app_settings ADD PRIMARY KEY (org_id, key);

DROP POLICY IF EXISTS app_settings_delete_admin ON public.app_settings;
DROP POLICY IF EXISTS app_settings_insert_admin ON public.app_settings;
DROP POLICY IF EXISTS app_settings_select_admin ON public.app_settings;
DROP POLICY IF EXISTS app_settings_update_admin ON public.app_settings;

CREATE POLICY app_settings_select_members ON public.app_settings
  FOR SELECT TO authenticated USING (public.is_org_member(org_id, auth.uid()));
CREATE POLICY app_settings_write_admin ON public.app_settings
  FOR ALL TO authenticated
  USING (public.is_org_admin(org_id, auth.uid()))
  WITH CHECK (public.is_org_admin(org_id, auth.uid()));

-- 7. customer_context: add org_id + repolicy
ALTER TABLE public.customer_context ADD COLUMN IF NOT EXISTS org_id uuid;
UPDATE public.customer_context SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
ALTER TABLE public.customer_context ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.customer_context ADD CONSTRAINT customer_context_org_fk
  FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS customer_context_org_idx ON public.customer_context(org_id, identifier);

DROP POLICY IF EXISTS customer_context_select_auth ON public.customer_context;
CREATE POLICY customer_context_select_members ON public.customer_context
  FOR SELECT TO authenticated USING (public.is_org_member(org_id, auth.uid()));

-- 8. Trigger: novo usuário cria sua organização e vira admin
CREATE OR REPLACE FUNCTION public.handle_new_user_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_org_id uuid;
  base_slug text;
  final_slug text;
  n int := 0;
BEGIN
  base_slug := lower(regexp_replace(coalesce(split_part(NEW.email,'@',1),'org'), '[^a-z0-9]+', '-', 'g'));
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.organizations WHERE slug = final_slug) LOOP
    n := n + 1;
    final_slug := base_slug || '-' || n::text;
  END LOOP;

  INSERT INTO public.organizations (name, slug)
  VALUES (coalesce(NEW.raw_user_meta_data->>'company', 'Minha Empresa'), final_slug)
  RETURNING id INTO new_org_id;

  INSERT INTO public.organization_members (org_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'admin');

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created_org ON auth.users;
CREATE TRIGGER on_auth_user_created_org
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_org();

-- 9. Grants para as helper functions
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_org_ids() TO authenticated;
