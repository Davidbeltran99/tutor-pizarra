type Props = {
  output: string;
  isSuccess?: boolean;
};

export default function ConsolePanel({ output, isSuccess = false }: Props) {
  const badgeClass = isSuccess
    ? "bg-emerald-100 text-emerald-800"
    : "bg-slate-100 text-slate-700";

  const panelClass = isSuccess
    ? "border border-emerald-200 bg-emerald-50"
    : "bg-slate-950";

  const textClass = isSuccess ? "text-emerald-900" : "text-emerald-300";

  return (
    <div className="soft-card h-full rounded-[28px] p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Consola</h2>
          <p className="text-xs text-slate-500">Aquí verás el resultado del programa</p>
        </div>

        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${badgeClass}`}>
          {isSuccess ? "🎉 Éxito" : "Resultado"}
        </span>
      </div>

      <div className={`h-[calc(100%-50px)] overflow-auto rounded-xl p-3 ${panelClass}`}>
        <pre className={`whitespace-pre-wrap text-sm leading-5 ${textClass}`}>
          {output || "Sin salida todavía..."}
        </pre>
      </div>
    </div>
  );
}
