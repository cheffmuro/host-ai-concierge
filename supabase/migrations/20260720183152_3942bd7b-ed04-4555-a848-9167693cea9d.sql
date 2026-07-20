
CREATE OR REPLACE FUNCTION public.get_integrations_status()
 RETURNS TABLE(key text, configured boolean, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT
    s.key,
    CASE s.key
      WHEN 'chatwoot' THEN (s.value ? 'url') AND (s.value ? 'user_token') AND (s.value ? 'account_id')
      WHEN 'dify'     THEN (s.value ? 'url') AND (s.value ? 'api_key') AND (s.value ? 'dataset_id')
      WHEN 'evolution'THEN (s.value ? 'url') AND (s.value ? 'api_key') AND (s.value ? 'instance')
      ELSE false
    END AS configured,
    s.updated_at
  FROM public.app_settings s
  WHERE s.key IN ('chatwoot','dify','evolution');
$function$;

DELETE FROM public.app_settings WHERE key = 'n8n';
