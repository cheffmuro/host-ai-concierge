import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getCustomerContext } from "@/lib/customerContext.functions";
import type { CustomerContext } from "@/services/types";

/**
 * Busca o contexto do cliente (customer_context) por identifier.
 * Retorna null se não houver registro para aquele identifier.
 */
export function useCustomerContext(identifier?: string) {
  const fetchCtx = useServerFn(getCustomerContext);
  const [data, setData] = useState<CustomerContext | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!identifier) { setData(null); return; }
    let cancelled = false;
    setLoading(true);
    fetchCtx({ data: { identifier } })
      .then((res) => { if (!cancelled) setData(res as CustomerContext | null); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [identifier, fetchCtx]);

  return { data, loading };
}
