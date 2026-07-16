import { useEffect, useState } from "react";
import { getDashboardMetrics, type DashboardMetrics } from "@/lib/metrics.functions";
import { useIntegrationsStore } from "@/stores/integrationsStore";

const EMPTY: DashboardMetrics = {
  configured: false,
  resolutionRate: 0,
  avgHandleTime: "—",
  humanHandoffs: 0,
  activeConversations: 0,
  weeklyVolume: [],
};

/** Busca métricas reais do Chatwoot (server fn) com refresh a cada 60s. */
export function useDashboardMetrics() {
  const [data, setData] = useState<DashboardMetrics>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const version = useIntegrationsStore((s) => s.version);

  useEffect(() => {
    let cancelled = false;
    const fetchOnce = async () => {
      try {
        setLoading(true);
        const m = await getDashboardMetrics();
        if (!cancelled) { setData(m); setError(null); }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "erro");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchOnce();
    const t = setInterval(fetchOnce, 60_000);
    return () => { cancelled = true; clearInterval(t); };
  }, [version]);

  return { data, loading, error };
}
