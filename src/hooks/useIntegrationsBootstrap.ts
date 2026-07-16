import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getChatwootConfig, getDifyConfig } from "@/lib/integrations.functions";
import { useIntegrationsStore } from "@/stores/integrationsStore";

/**
 * Busca as credenciais salvas em app_settings (via server functions) e
 * publica no store para que os services (chatwoot/dify) as consumam.
 * Roda uma vez por sessão autenticada.
 */
export function useIntegrationsBootstrap(enabled = true) {
  const fetchChatwoot = useServerFn(getChatwootConfig);
  const fetchDify = useServerFn(getDifyConfig);
  const loaded = useIntegrationsStore((s) => s.loaded);

  useEffect(() => {
    if (!enabled) return;
    if (loaded) return;
    let cancelled = false;
    (async () => {
      const [cw, df] = await Promise.allSettled([fetchChatwoot(), fetchDify()]);
      if (cancelled) return;
      const store = useIntegrationsStore.getState();
      if (cw.status === "fulfilled" && cw.value) store.setChatwoot(cw.value);
      if (df.status === "fulfilled" && df.value) store.setDify(df.value);
      store.markLoaded();
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, loaded, fetchChatwoot, fetchDify]);
}
