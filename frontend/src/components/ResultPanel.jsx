import { AlertTriangle, CheckCircle2, ClipboardList, Info, Loader2, Stethoscope, WifiOff } from "lucide-react";
import { FIELDS } from "../lib/fields";

const LABEL = Object.fromEntries(FIELDS.map((f) => [f.name, f.label]));

export default function ResultPanel({ loading, error, result }) {
  if (loading) {
    return (
      <div className="card flex flex-col items-center gap-3 py-16 text-center" role="status">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        <p className="text-sm text-slate-600">Running the model...</p>
      </div>
    );
  }

  if (error) {
    const offline = error.kind === "network";
    const Icon = offline ? WifiOff : AlertTriangle;
    return (
      <div className="card border-red-200 bg-red-50" role="alert">
        <div className="flex items-start gap-3">
          <Icon className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="font-semibold text-red-900">
              {offline ? "Server not reachable" : error.kind === "validation" ? "Please check your inputs" : "Could not get a result"}
            </p>
            <p className="mt-1 text-sm text-red-800">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="card flex flex-col items-center gap-3 py-16 text-center">
        <ClipboardList className="h-8 w-8 text-slate-400" />
        <p className="font-medium text-slate-700">No result yet</p>
        <p className="max-w-xs text-sm text-slate-500">
          Fill in the form and press <strong>Predict Risk</strong>. The result will appear here.
        </p>
      </div>
    );
  }

  const high = result.predicted_class === 1;
  const score = Math.round(result.probability * 100);
  const thr = Math.round(result.decision_threshold * 100);
  const tone = high
    ? { box: "border-amber-200 bg-amber-50", text: "text-amber-900", bar: "bg-amber-500", Icon: AlertTriangle }
    : { box: "border-brand-200 bg-brand-50", text: "text-brand-800", bar: "bg-brand-600", Icon: CheckCircle2 };
  const top = result.top_global_features || [];
  const maxImp = Math.max(0.0001, ...top.map((d) => d.importance));

  return (
    <div className="space-y-4">
      <div className={`card ${tone.box}`}>
        <div className={`flex items-center gap-2 ${tone.text}`}>
          <tone.Icon size={20} />
          <h2 className="text-lg font-bold">{result.predicted_label}</h2>
        </div>
        <p className={`mt-2 text-sm ${tone.text}`}>
          {high
            ? "Your inputs resemble the pattern the model linked to a diabetes outcome in its training data."
            : "Your inputs did not resemble that pattern. This does not rule out diabetes."}
        </p>

        <div className="mt-5">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium text-slate-700">Model score</span>
            <span className="font-bold text-slate-900">{score} / 100</span>
          </div>
          <div className="relative mt-2 h-3 rounded-full bg-white/80 ring-1 ring-slate-200">
            <div className={`h-3 rounded-full ${tone.bar}`} style={{ width: `${score}%` }} />
            <div className="absolute -top-1 h-5 w-0.5 bg-slate-700" style={{ left: `${thr}%` }} title="Decision threshold" />
          </div>
          <p className="mt-2 text-xs text-slate-600">
            The vertical line marks the decision threshold ({thr}). Scores at or above it are labelled higher-risk pattern.
          </p>
        </div>
      </div>

      <div className="card text-sm text-slate-600">
        <p className="flex gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />{result.probability_note}</p>
        {result.imputed_features.length > 0 && (
          <p className="mt-3">
            <strong className="text-slate-800">Not provided:</strong>{" "}
            {result.imputed_features.map((f) => LABEL[f] || f).join(", ")}. These were filled with the
            training-data median, which can make the score less reliable.
          </p>
        )}
      </div>

      {top.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-slate-900">What the model relies on most</h3>
          <p className="mt-1 text-xs text-slate-500">
            Overall importance across the test data, from {result.model_name}. It is not an explanation of your individual result.
          </p>
          <ul className="mt-4 space-y-3">
            {top.map((d) => (
              <li key={d.feature}>
                <div className="flex justify-between text-sm"><span>{LABEL[d.feature] || d.feature}</span></div>
                <div className="mt-1 h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-brand-500" style={{ width: `${(d.importance / maxImp) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card flex gap-3 bg-slate-50 text-sm text-slate-700">
        <Stethoscope className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
        <p>
          This result cannot diagnose or rule out diabetes. Please discuss any health concerns and your
          test results with a qualified healthcare professional.
        </p>
      </div>
    </div>
  );
}