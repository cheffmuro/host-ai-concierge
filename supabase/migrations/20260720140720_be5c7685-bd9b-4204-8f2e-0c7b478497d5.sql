
-- Endurecer policy de INSERT em organizations: só permite criar org e virar admin dela na mesma transação (via trigger). Remove insert livre.
DROP POLICY IF EXISTS organizations_insert_any ON public.organizations;
-- (trigger handle_new_user_org já cria org para novos usuários; criações manuais ficam via service_role/edge)

-- White-label: branding por organização
CREATE TABLE IF NOT EXISTS public.org_branding (
  org_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  brand_name text,
  logo_url text,
  primary_color text DEFAULT '#0f172a',
  accent_color text DEFAULT '#3b82f6',
  custom_domain text UNIQUE,
  support_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_branding TO authenticated;
GRANT SELECT ON public.org_branding TO anon; -- necessário para resolver branding por domínio na landing
GRANT ALL ON public.org_branding TO service_role;
ALTER TABLE public.org_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_branding_select_public ON public.org_branding
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY org_branding_write_admin ON public.org_branding
  FOR ALL TO authenticated
  USING (public.is_org_admin(org_id, auth.uid()))
  WITH CHECK (public.is_org_admin(org_id, auth.uid()));

CREATE TRIGGER org_branding_set_updated_at
  BEFORE UPDATE ON public.org_branding
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Semear branding default para orgs existentes sem registro
INSERT INTO public.org_branding (org_id, brand_name)
SELECT o.id, o.name FROM public.organizations o
LEFT JOIN public.org_branding b ON b.org_id = o.id
WHERE b.org_id IS NULL;

-- Helper: primeira org do usuário atual (para conveniência client-side)
CREATE OR REPLACE FUNCTION public.current_user_primary_org()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT org_id FROM public.organization_members
  WHERE user_id = auth.uid()
  ORDER BY created_at ASC
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.current_user_primary_org() TO authenticated;
