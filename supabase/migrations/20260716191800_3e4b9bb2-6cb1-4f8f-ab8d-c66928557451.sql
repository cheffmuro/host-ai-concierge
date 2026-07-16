REVOKE EXECUTE ON FUNCTION public.get_integrations_status() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_integrations_status() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_integrations_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_integrations_status() TO service_role;

ALTER FUNCTION public.get_integrations_status() SECURITY INVOKER;