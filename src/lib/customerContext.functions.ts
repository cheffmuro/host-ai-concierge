/**
 * Server function que busca o contexto do cliente na tabela
 * `customer_context` — populada por webhooks externos
 * (Mercado Livre, site próprio, loja/ERP) em `/api/public/customer-context`.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireFreshSupabaseAuth } from "@/lib/safe-supabase-auth.middleware";
import { z } from "zod";
import type { CustomerContext, CustomerPurchase } from "@/services/types";

const normalize = (s: string) => s.trim().toLowerCase().replace(/[^\w@+.-]/g, "");

export const getCustomerContext = createServerFn({ method: "POST" })
  .middleware([requireFreshSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ identifier: z.string().min(3) }).parse(input),
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .handler(async ({ context, data }): Promise<any> => {
    const id = normalize(data.identifier);
    const { data: row, error } = await context.supabase
      .from("customer_context")
      .select("*")
      .or(
        [
          `identifier.eq.${id}`,
          `email.eq.${id}`,
          `phone.eq.${id}`,
        ].join(","),
      )
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    const ctx: CustomerContext = {
      ltv: Number(row.ltv ?? 0),
      averageTicket: Number(row.average_ticket ?? 0),
      totalOrders: Number(row.total_orders ?? 0),
      lastPurchases: (row.last_purchases as unknown as CustomerPurchase[]) ?? [],
      tags: (row.tags as string[]) ?? [],
      automations: [],
      source: row.source ?? undefined,
      notes: row.notes ?? undefined,
      externalId: row.external_id ?? undefined,
    };
    return ctx;
  });
