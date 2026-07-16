/**
 * Webhook público para ingestão do contexto do cliente.
 *
 * Aceita POST assinado (HMAC-SHA256 do corpo cru, header `x-webhook-signature`,
 * segredo em `CUSTOMER_CONTEXT_WEBHOOK_SECRET`). Faz upsert em
 * `public.customer_context` usando `identifier` como chave.
 *
 * Fontes esperadas: Mercado Livre (via integração/Zapier), site próprio,
 * loja/ERP. Cada emissor manda o payload no formato abaixo.
 *
 *   POST /api/public/customer-context
 *   Content-Type: application/json
 *   x-webhook-signature: <hex hmac sha256 do corpo>
 *
 *   {
 *     "identifier": "cliente@exemplo.com",      // obrigatório
 *     "source": "mercadolivre" | "site" | "loja" | "outro",
 *     "name": "Maria Silva",
 *     "email": "maria@ex.com",
 *     "phone": "+5511999990000",
 *     "external_id": "ML-12345",
 *     "ltv": 1250.90,
 *     "average_ticket": 320.10,
 *     "total_orders": 4,
 *     "last_purchases": [
 *       { "id": "ord_1", "item": "Cafeteira X1", "date": "2026-05-01", "amount": 320.10 }
 *     ],
 *     "tags": ["vip", "recorrente"],
 *     "notes": "Cliente VIP desde 2023",
 *     "payload": { ...raw... }
 *   }
 */
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const schema = z.object({
  identifier: z.string().min(3),
  source: z.string().optional(),
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  external_id: z.string().optional(),
  ltv: z.number().nonnegative().optional(),
  average_ticket: z.number().nonnegative().optional(),
  total_orders: z.number().int().nonnegative().optional(),
  last_purchases: z.array(z.object({
    id: z.string(),
    item: z.string(),
    date: z.string(),
    amount: z.number(),
  })).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
});

const normalize = (s: string) => s.trim().toLowerCase().replace(/[^\w@+.-]/g, "");

export const Route = createFileRoute("/api/public/customer-context")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.CUSTOMER_CONTEXT_WEBHOOK_SECRET;
        if (!secret) return new Response("Server not configured", { status: 500 });

        const signature = request.headers.get("x-webhook-signature") ?? "";
        const body = await request.text();

        const expected = createHmac("sha256", secret).update(body).digest("hex");
        const sig = Buffer.from(signature);
        const exp = Buffer.from(expected);
        if (sig.length !== exp.length || !timingSafeEqual(sig, exp)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let json: unknown;
        try {
          json = JSON.parse(body);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const parsed = schema.safeParse(json);
        if (!parsed.success) {
          return new Response(JSON.stringify({ error: parsed.error.issues }), { status: 400 });
        }
        const p = parsed.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const row = {
          identifier: normalize(p.identifier),
          source: p.source ?? "unknown",
          name: p.name ?? null,
          email: p.email ? p.email.toLowerCase() : null,
          phone: p.phone ?? null,
          external_id: p.external_id ?? null,
          ltv: p.ltv ?? 0,
          average_ticket: p.average_ticket ?? 0,
          total_orders: p.total_orders ?? 0,
          last_purchases: p.last_purchases ?? [],
          tags: p.tags ?? [],
          notes: p.notes ?? null,
          payload: p.payload ?? {},
        };
        const { error } = await supabaseAdmin
          .from("customer_context")
          .upsert(row, { onConflict: "identifier" });
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
