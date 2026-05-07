import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { mockMetrics, mockConversations } from "@/mocks/data";
import { Badge } from "@/components/ui/badge";
import { ChannelIcon, channelLabel } from "@/components/channel-icon";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Anfitrião" },
      { name: "description", content: "Métricas operacionais de atendimento e desempenho da IA concierge." },
      { property: "og:title", content: "Dashboard — Anfitrião" },
      { property: "og:description", content: "Métricas operacionais e desempenho da IA concierge." },
    ],
  }),
  component: DashboardPage,
});

function Metric({ label, value, delta, positive }: { label: string; value: string; delta: string; positive?: boolean }) {
  return (
    <Card className="rounded-sm border-border/60 shadow-none">
      <CardHeader className="pb-1">
        <CardTitle className="text-[10px] uppercase tracking-[0.18em] font-medium text-slate-500">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <span className="text-3xl font-medium tracking-tight text-slate-900">{value}</span>
          <span className={`flex items-center gap-1 text-xs ${positive ? "text-emerald-700" : "text-slate-500"}`}>
            {positive ? <ArrowUpRight className="h-3 w-3" strokeWidth={1.5} /> : <ArrowDownRight className="h-3 w-3" strokeWidth={1.5} />}
            {delta}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
  const m = mockMetrics;
  const handoffs = mockConversations.filter((c) => !c.aiHandling).slice(0, 4);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Resolução pela IA" value={`${Math.round(m.resolutionRate * 100)}%`} delta="+3.2 sem." positive />
        <Metric label="Tempo Médio" value={m.avgHandleTime} delta="-12s sem." positive />
        <Metric label="Transbordos Humanos" value={String(m.humanHandoffs)} delta="-4 sem." positive />
        <Metric label="Conversas Ativas" value={String(m.activeConversations)} delta="+6 hoje" />
      </div>

      <Card className="rounded-sm border-border/60 shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-slate-900">Volume de atendimentos · últimos 7 dias</CardTitle>
          <p className="text-xs text-slate-500">Comparativo entre automatizados e transbordos humanos.</p>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={m.weeklyVolume} margin={{ top: 8, right: 16, bottom: 0, left: -10 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 2, fontSize: 12 }}
                  labelStyle={{ color: "#0f172a", fontWeight: 500 }}
                />
                <Line type="monotone" dataKey="automated" stroke="#0f172a" strokeWidth={1.5} dot={{ r: 2 }} activeDot={{ r: 4 }} name="Automatizados" />
                <Line type="monotone" dataKey="human" stroke="#94a3b8" strokeWidth={1.5} dot={{ r: 2 }} activeDot={{ r: 4 }} name="Humanos" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-sm border-border/60 shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-slate-900">Últimos transbordos</CardTitle>
          <p className="text-xs text-slate-500">Conversas que foram escaladas para o time humano.</p>
        </CardHeader>
        <CardContent className="divide-y divide-border/60">
          {handoffs.map((c) => (
            <div key={c.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-700">
                  {c.customerInitials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{c.customerName}</p>
                  <p className="text-xs text-slate-500 truncate">{c.preview}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Badge variant="outline" className="rounded-sm border-border/60 text-slate-600 font-normal gap-1">
                  <ChannelIcon channel={c.channel} />
                  {channelLabel[c.channel]}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
