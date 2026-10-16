import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { AlertTriangle, BarChart3, ClipboardList, Clock, Cpu, History, Loader2, Trash2 } from "lucide-react";
import { getModelInfo } from "../api/client";
import { clearHistory, getHistory, getSessionCount } from "../lib/history";
import StatCard from "../components/StatCard";
import Disclaimer from "../components/Disclaimer";

const LOW = "#0d9488";
const HIGH = "#f59e0b";

function Empty({ icon: Icon, title, text, cta }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <Icon className="h-8 w-8 text-slate-300" />
      <p className="font-medium text-slate-700">{title}</p>
      <p className="max-w-xs text-sm text-slate-500">{text}</p>
      {cta && <Link to="/assess" className="btn-primary mt-2">Start an assessment</Link>}
    </div>
  );
}

export default function Dashboard() {
  const [history, setHistory] = useState(() => getHistory());
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let on = true;
    getModelInfo()
      .then((d) => on && setInfo(d))
      .catch((e) => on && setError(e));
    return () => { on = false; };
  }, []);

  const higher = history.filter((h) => h.predicted_class === 1).length;
  const lower = history.length - higher;
  const pieData = [
    { name: "Lower-risk pattern", value: lower, color: LOW },
    { name: "Higher-risk pattern", value: higher, color: HIGH },
  ].filter((d) => d.value > 0);

  const selected = info?.selected_model;
  const r = selected ? info.test_results[selected] : null;
  const metricData = r
    ? [
        { name: "Accuracy", value: r.accuracy },
        { name: "Precision", value: r.precision },
        { name: "Recall", value: r.recall },
        { name: "Specificity", value: r.specificity },
        { name: "F1", value: r.f1 },
        { name: "ROC-AUC", value: r.roc_auc },
      ]
    : [];

  function onClear() {
    if (window.confirm("Delete all saved assessments from this browser?")) {
      clearHistory();
      setHistory([]);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-slate-600">Your assessments and the model's measured performance.</p>
      </div>
      <Disclaimer />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={ClipboardList} label="Total assessments" value={history.length}
          sub="Saved in this browser only" />
        <StatCard icon={Clock} label="This session" value={getSessionCount()}
          sub="Since the page was last loaded" />
        <StatCard icon={Cpu} label="Model" value={selected || (error ? "Unavailable" : "Loading...")}
          sub={info ? `Trained ${new Date(info.trained_at_utc).toLocaleDateString()}` : undefined} />
      </div>

      {error && (
        <div className="card flex gap-3 border-red-200 bg-red-50 text-sm text-red-800" role="alert">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>Could not load model information: {error.message}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="font-semibold text-slate-900">Assessment outcomes</h2>
          <p className="text-xs text-slate-500">Model labels across your saved assessments.</p>
          {history.length === 0 ? (
            <Empty icon={BarChart3} title="No assessments yet"
              text="Complete an assessment and your outcome summary will appear here." cta />
          ) : (
            <>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                      {pieData.map((d) => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-4 text-sm">
                <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full" style={{ background: LOW }} />Lower-risk: {lower}</span>
                <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full" style={{ background: HIGH }} />Higher-risk: {higher}</span>
              </div>
            </>
          )}
        </section>

        <section className="card">
          <h2 className="font-semibold text-slate-900">Model evaluation (held-out test set)</h2>
          <p className="text-xs text-slate-500">
            {selected ? `${selected}, measured on ${info.split.test_rows} test rows during training.` : "Loaded from the training run."}
          </p>
          {!info ? (
            <div className="flex justify-center py-16">
              {error ? <p className="text-sm text-slate-500">No data available.</p> : <Loader2 className="h-6 w-6 animate-spin text-brand-600" />}
            </div>
          ) : (
            <div className="mt-3 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metricData} margin={{ top: 18, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => Number(v).toFixed(3)} />
                  <Bar dataKey="value" fill={LOW} radius={[6, 6, 0, 0]}>
                    <LabelList dataKey="value" position="top" formatter={(v) => v.toFixed(2)} style={{ fontSize: 11 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      <section className="card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Recent assessments</h2>
            <p className="text-xs text-slate-500">Stored only in this browser. No names or identifiers are saved.</p>
          </div>
          {history.length > 0 && (
            <button className="btn-secondary !px-3 !py-2" onClick={onClear}><Trash2 size={14} /> Clear</button>
          )}
        </div>

        {history.length === 0 ? (
          <Empty icon={History} title="Nothing here yet" text="Your most recent assessments will be listed here." />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Result</th>
                  <th className="py-2 pr-4 font-medium">Score</th>
                  <th className="py-2 pr-4 font-medium">Glucose</th>
                  <th className="py-2 pr-4 font-medium">BMI</th>
                  <th className="py-2 font-medium">Age</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.slice(0, 8).map((h) => (
                  <tr key={h.id}>
                    <td className="py-2.5 pr-4 text-slate-600">{new Date(h.at).toLocaleString()}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        h.predicted_class === 1 ? "bg-amber-100 text-amber-800" : "bg-brand-100 text-brand-800"}`}>
                        {h.predicted_label}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4">{Math.round(h.probability * 100)} / 100</td>
                    <td className="py-2.5 pr-4">{h.inputs.Glucose}</td>
                    <td className="py-2.5 pr-4">{h.inputs.BMI}</td>
                    <td className="py-2.5">{h.inputs.Age}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}