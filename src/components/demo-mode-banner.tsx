import { FlaskConical, X } from "lucide-react";
import { useDemoStore } from "@/lib/demo-mode";

/** Faixa fina indicando que os dados exibidos são simulados. */
export function DemoModeBanner() {
  const enabled = useDemoStore((s) => s.enabled);
  const setEnabled = useDemoStore((s) => s.setEnabled);
  if (!enabled) return null;

  return (
    <div
      role="status"
      className="flex items-center gap-2 border-b border-indigo-200 bg-indigo-50 px-4 py-1.5 text-[11px] text-indigo-900"
    >
      <FlaskConical className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
      <span className="min-w-0 flex-1 truncate">
        Modo demonstração ativo — conversas, métricas e base de conhecimento são simuladas.
      </span>
      <button
        type="button"
        onClick={() => setEnabled(false)}
        className="inline-flex shrink-0 items-center gap-1 rounded-sm px-1.5 py-0.5 font-medium hover:bg-indigo-100"
      >
        <X className="h-3 w-3" strokeWidth={2} />
        Desligar
      </button>
    </div>
  );
}
