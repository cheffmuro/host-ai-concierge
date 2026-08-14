import { useEffect, useState } from "react";
import { getDashboardMetrics, type DashboardMetrics } from "@/lib/metrics.functions";
import { useIntegrationsStore } from "@/stores/integrationsStore";
import { useDemoMode } from "@/lib/demo-mode";
import { demoMetrics } from "@/mocks/demo-scenario";

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
  const demo = useDemoMode();

  useEffect(() => {
    if (demo) {
      setData(demoMetrics as DashboardMetrics);
      setError(null);
      setLoading(false);
      return;
    }
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
  }, [version, demo]);

  return { data, loading, error };
}
