CREATE TABLE public.customer_context (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier text NOT NULL UNIQUE,
  source text NOT NULL DEFAULT 'unknown',
  name text,
  email text,
  phone text,
  external_id text,
  ltv numeric NOT NULL DEFAULT 0,
  average_ticket numeric NOT NULL DEFAULT 0,
  total_orders integer NOT NULL DEFAULT 0,
  last_purchases jsonb NOT NULL DEFAULT '[]'::jsonb,
  tags text[] NOT NULL DEFAULT '{}',
  notes text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.customer_context TO authenticated;
GRANT ALL ON public.customer_context TO service_role;

ALTER TABLE public.customer_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY customer_context_select_auth ON public.customer_context
  FOR SELECT TO authenticated USING (true);

CREATE INDEX customer_context_email_idx ON public.customer_context (lower(email));
CREATE INDEX customer_context_phone_idx ON public.customer_context (phone);
CREATE INDEX customer_context_external_idx ON public.customer_context (external_id);

CREATE TRIGGER customer_context_set_updated_at
  BEFORE UPDATE ON public.customer_context
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();