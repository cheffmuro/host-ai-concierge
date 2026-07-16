import { Link } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, Settings2 } from "lucide-react";
import { integrationLabel, useIntegrationsStatus } from "@/hooks/useIntegrationsStatus";

interface Props {
  /** Se true, esconde o banner quando todas integrações estiverem configuradas. */
  hideWhenComplete?: boolean;
  compact?: boolean;
}

export function IntegrationsBanner({ hideWhenComplete = true, compact = false }: Props) {
  const status = useIntegrationsStatus();
  if (status.loading) return null;
  if (hideWhenComplete && status.missing.length === 0) return null;

  const complete = status.missing.length === 0;

  return (
    <div
      className={`flex items-start gap-3 rounded-sm border ${
        complete ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
      } ${compact ? "px-3 py-2" : "p-4"}`}
      role="status"
    >
      {complete ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" strokeWidth={1.5} />
      ) : (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" strokeWidth={1.5} />
      )}
      <div className="min-w-0 flex-1 space-y-1">
        <p className={`text-sm font-medium ${complete ? "text-emerald-900" : "text-amber-900"}`}>
          {complete
            ? "Todas as integrações estão configuradas."
            : "Integrações pendentes de configuração"}
        </p>
        {!complete && (
          <p className="text-xs text-amber-800">
            Faltando:{" "}
            {status.missing.map((k, i) => (
              <span key={k} className="font-medium">
                {integrationLabel(k)}
                {i < status.missing.length - 1 ? ", " : ""}
              </span>
            ))}
            . Sem essas credenciais o painel opera em modo vazio.
          </p>
        )}
      </div>
      <Link
        to="/settings/integrations"
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium transition ${
          complete
            ? "text-emerald-700 hover:bg-emerald-100"
            : "bg-amber-900 text-amber-50 hover:bg-amber-800"
        }`}
      >
        <Settings2 className="h-3 w-3" strokeWidth={1.75} />
        Configurar
      </Link>
    </div>
  );
}
