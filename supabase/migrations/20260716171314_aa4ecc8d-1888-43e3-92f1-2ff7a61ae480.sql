-- Restringir leitura de app_settings a administradores (contém tokens sensíveis).
-- Usuários autenticados não-admin precisam continuar sabendo quais integrações estão
-- configuradas (para o IntegrationsBanner), então expomos uma VIEW só com metadados
-- não-sensíveis (presença + url pública, sem tokens).

DROP POLICY IF EXISTS app_settings_select_auth ON public.app_settings;

CREATE POLICY app_settings_select_admin
  ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- View pública com só o que precisa para renderizar status "conectado / pendente"
-- na inbox e dashboard de usuários comuns. Nunca expõe user_token / api_key / etc.
CREATE OR REPLACE VIEW public.app_settings_public
WITH (security_invoker=on) AS
  SELECT
    key,
    (value ? 'url')            AS has_url,
    (value ? 'user_token')     AS has_user_token,
    (value ? 'api_key')        AS has_api_key,
    (value ? 'account_id')     AS has_account_id,
    (value ? 'dataset_id')     AS has_dataset_id,
    (value ? 'instance')       AS has_instance,
    updated_at
  FROM public.app_settings;

-- Policy dedicada para a view (security_invoker herda o permission check do
-- caller; precisamos de uma policy que permita SELECT a autenticados nas linhas
-- correspondentes).
CREATE POLICY app_settings_select_meta_auth
  ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Mas isso reabriria a leitura de tokens. Melhor caminho: manter policy admin-only
-- na tabela e criar uma função SECURITY DEFINER que devolve só o status booleano.

DROP POLICY IF EXISTS app_settings_select_meta_auth ON public.app_settings;
DROP VIEW IF EXISTS public.app_settings_public;

CREATE OR REPLACE FUNCTION public.get_integrations_status()
RETURNS TABLE (
  key text,
  configured boolean,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.key,
    CASE s.key
      WHEN 'chatwoot' THEN (s.value ? 'url') AND (s.value ? 'user_token') AND (s.value ? 'account_id')
      WHEN 'dify'     THEN (s.value ? 'url') AND (s.value ? 'api_key') AND (s.value ? 'dataset_id')
      WHEN 'evolution'THEN (s.value ? 'url') AND (s.value ? 'api_key') AND (s.value ? 'instance')
      WHEN 'n8n'      THEN (s.value ? 'webhook_handoff') OR (s.value ? 'webhook_reverse_logistics') OR (s.value ? 'webhook_whatsapp')
      ELSE false
    END AS configured,
    s.updated_at
  FROM public.app_settings s
  WHERE s.key IN ('chatwoot','dify','evolution','n8n');
$$;

GRANT EXECUTE ON FUNCTION public.get_integrations_status() TO authenticated;
