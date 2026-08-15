import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChannelIcon, channelLabel } from "@/components/channel-icon";
import { ReverseCaseCard } from "@/components/reverse-actions";
import { useReverseStore, reverseMetrics, reverseReasonLabel, reverseStatusLabel } from "@/lib/reverse-logistics";
import { useDemoMode } from "@/lib/demo-mode";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PackageSearch } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reversas")({
  head: () => ({
    meta: [
      { title: "Logística reversa — Anfitrião" },
      { name: "description", content: "Protocolos de devolução e troca, etiquetas, rastreio e reembolsos em um só painel." },
      { property: "og:title", content: "Logística reversa — Anfitrião" },
      { property: "og:description", content: "Protocolos de devolução e troca, etiquetas, rastreio e reembolsos." },
    ],
  }),
  component: ReversasPage,
});

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function ReversasPage() {
  const cases = useReverseStore((s) => s.cases);
  const demoMode = useDemoMode();
  const m = reverseMetrics(cases);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header>
        <h1 className="text-xl font-medium tracking-tight text-slate-900">Logística reversa</h1>
        <p className="mt-1 text-sm text-slate-500">
          Devoluções e trocas com protocolo, etiqueta pré-paga, rastreio e reembolso.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Casos" value={String(m.total)} />
        <Stat label="Em aberto" value={String(m.open)} />
        <Stat label="Reembolsado" value={brl(m.refundValue)} />
        <Stat label="Principal motivo" value={m.topReason} />
      </div>

      {cases.length === 0 ? (
        <Card className="rounded-sm border-border/60 shadow-none">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <PackageSearch className="h-8 w-8 text-slate-300" strokeWidth={1.5} />
            <p className="text-sm text-slate-500">Nenhuma reversa aberta.</p>
            <p className="max-w-sm text-xs text-slate-400">
              {demoMode
                ? "Abra uma conversa no Inbox e use “Gerar etiqueta de reversa” no painel de contexto."
                : "Ative o Modo Demonstração em Configurações → Integrações para simular o fluxo completo."}
            </p>
            <Button asChild size="sm" variant="outline" className="rounded-sm">
              <Link to="/inbox">Ir para o Inbox</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {cases.map((c) => (
            <Card key={c.id} className="rounded-sm border-border/60 shadow-none">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm font-medium text-slate-900">{c.customerName}</CardTitle>
                  <Badge variant="outline" className="rounded-sm border-border/60 text-[10px] font-normal text-slate-500 gap-1">
                    <ChannelIcon channel={c.channel} className="h-3 w-3" />
                    {channelLabel[c.channel]}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-400">
                  {reverseReasonLabel[c.reason]} · {reverseStatusLabel[c.status]} · aberto há{" "}
                  {formatDistanceToNow(new Date(c.createdAt), { locale: ptBR })}
                </p>
              </CardHeader>
              <CardContent>
                <ReverseCaseCard item={c} />
                {c.notes && <p className="mt-2 text-[11px] italic text-slate-500">{c.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-sm border-border/60 shadow-none">
      <CardHeader className="pb-1">
        <CardTitle className="text-[10px] uppercase tracking-[0.18em] font-medium text-slate-500">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <span className="text-xl font-medium tracking-tight text-slate-900">{value}</span>
      </CardContent>
    </Card>
  );
}
