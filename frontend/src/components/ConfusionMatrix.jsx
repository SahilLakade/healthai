function Cell({ value, label, note, cls }) {
  return (
    <div className={`rounded-xl p-3 sm:p-4 ${cls}`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="mt-1 text-xs font-semibold sm:text-sm">{label}</p>
      <p className="text-xs opacity-80">{note}</p>
    </div>
  );
}

export default function ConfusionMatrix({ cm }) {
  const rowLabel = "flex items-center justify-center text-xs font-medium text-slate-600";
  return (
    <div className="grid grid-cols-[5rem_1fr_1fr] gap-2 text-center">
      <div />
      <div className="text-xs font-medium text-slate-600">Predicted lower-risk</div>
      <div className="text-xs font-medium text-slate-600">Predicted higher-risk</div>

      <div className={rowLabel}>Actually no diabetes</div>
      <Cell value={cm.tn} label="True negative" note="Correctly lower-risk" cls="bg-brand-50 text-brand-800" />
      <Cell value={cm.fp} label="False positive" note="Flagged, but no diabetes" cls="bg-amber-50 text-amber-900" />

      <div className={rowLabel}>Actually diabetes</div>
      <Cell value={cm.fn} label="False negative" note="Missed a diabetes case" cls="bg-red-50 text-red-900" />
      <Cell value={cm.tp} label="True positive" note="Correctly higher-risk" cls="bg-brand-50 text-brand-800" />
    </div>
  );
}