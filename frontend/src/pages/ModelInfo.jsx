import { useEffect, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { AlertTriangle, Loader2 } from "lucide-react";
import { getModelInfo } from "../api/client";
import { FIELDS } from "../lib/fields";
import ConfusionMatrix from "../components/ConfusionMatrix";
import Disclaimer from "../components/Disclaimer";

const LABEL = Object.fromEntries(FIELDS.map((f) => [f.name, f.label]));
const UNIT = Object.fromEntries(FIELDS.map((f) => [f.name, f.unit]));
const pct = (v) => `${(v * 100).toFixed(1)}%`;
const num = (v, d = 3) => Number(v).toFixed(d);

function Section({ title, sub, children }) {
  return (
    <section className="card">
      <h2 className="font-semibold text-slate-900">{title}</h2>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Fact({ k, v }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{k}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-900">{v}</p>
    </div>
  );
}

function Th({ children, right }) {
  return <th className={`py-2 pr-4 font-medium ${right ? "text-right" : ""}`}>{children}</th>;
}

export default function ModelInfo() {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let on = true;
    getModelInfo().then((d) => on && setInfo(d)).catch((e) => on && setError(e));
    return () => { on = false; };
  }, []);

  if (error) {
    return (
      <div className="card flex gap-3 border-red-200 bg-red-50 text-sm text-red-800" role="alert">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <p>Could not load model information: {error.message}</p>
      </div>
    );
  }
  if (!info) {
    return (
      <div className="flex justify-center py-24" role="status">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  const { dataset, split, preprocessing, selected_model: sel } = info;
  const names = Object.keys(info.test_results);
  const cm = info.test_results[sel].confusion_matrix;
  const roc = info.roc_curve.map((p) => ({ fpr: p.fpr, tpr: p.tpr, chance: p.fpr }));
  const imp = info.feature_importance.map((d) => ({ label: LABEL[d.feature] || d.feature, importance: d.importance }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Model Information</h1>
        <p className="mt-1 text-slate-600">
          Everything below is read from the results file written by the real training run.
        </p>
      </div>
      <Disclaimer />

      <Section title="Selected model" sub={info.selection_reason}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Fact k="Model" v={sel} />
          <Fact k="Decision threshold" v={info.decision_threshold} />
          <Fact k="Trained (your local time)" v={new Date(info.trained_at_utc).toLocaleString()} />
          <Fact k="scikit-learn" v={info.environment.scikit_learn} />
        </div>
      </Section>

      <Section title="Dataset" sub={dataset.origin}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Fact k="Name" v={dataset.name} />
          <Fact k="Rows x columns" v={`${dataset.rows} x ${dataset.columns}`} />
          <Fact k="Without diabetes (0)" v={dataset.class_counts.no_diabetes_0} />
          <Fact k="With diabetes (1)" v={`${dataset.class_counts.diabetes_1} (${dataset.positive_rate_percent}%)`} />
        </div>
        <p className="mt-4 text-sm text-slate-600"><strong>Target:</strong> {dataset.target}</p>
        <p className="mt-1 text-sm text-slate-600"><strong>Population:</strong> {dataset.population_note}</p>

        <h3 className="mt-6 text-sm font-semibold text-slate-900">Data quality: impossible zero values</h3>
        <p className="text-xs text-slate-500">
          A zero in these columns means "not measured", so it was converted to missing and then imputed.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[360px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr><Th>Feature</Th><Th right>Zero values</Th><Th right>Share of rows</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.keys(dataset.invalid_zero_counts).map((f) => (
                <tr key={f}>
                  <td className="py-2 pr-4">{LABEL[f] || f}</td>
                  <td className="py-2 pr-4 text-right">{dataset.invalid_zero_counts[f]}</td>
                  <td className="py-2 pr-4 text-right">{dataset.invalid_zero_percent[f]}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Input features" sub="Summary of the training data, ignoring invalid zeros. Median is what a blank optional field is filled with.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr><Th>Feature</Th><Th>Unit</Th><Th right>Min</Th><Th right>Median</Th><Th right>Max</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {info.features.map((f) => (
                <tr key={f}>
                  <td className="py-2 pr-4">{LABEL[f] || f}</td>
                  <td className="py-2 pr-4 text-slate-500">{UNIT[f]}</td>
                  <td className="py-2 pr-4 text-right">{info.feature_summary[f].min}</td>
                  <td className="py-2 pr-4 text-right">{info.feature_summary[f].median}</td>
                  <td className="py-2 text-right">{info.feature_summary[f].max}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Train / test split and preprocessing">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Fact k="Training rows" v={`${split.train_rows} (${split.train_positive} positive)`} />
          <Fact k="Test rows" v={`${split.test_rows} (${split.test_positive} positive)`} />
          <Fact k="Split" v={`${Math.round((1 - split.test_size) * 100)}/${Math.round(split.test_size * 100)}, stratified`} />
          <Fact k="Random seed" v={split.random_state} />
        </div>
        <p className="mt-4 text-sm text-slate-600">{preprocessing.strategy}</p>
        <p className="mt-1 text-xs text-slate-500">
          Imputation medians come from training rows only, so no information leaks from the test set.
        </p>
      </Section>

      <Section title="Model comparison"
        sub={`Cross-validation: ${info.cross_validation.folds} folds on training data. Test: ${split.test_rows} held-out rows.`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <Th>Model</Th><Th right>CV ROC-AUC</Th><Th right>CV recall</Th>
                <Th right>Accuracy</Th><Th right>Precision</Th><Th right>Recall</Th>
                <Th right>F1</Th><Th right>ROC-AUC</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {names.map((n) => {
                const t = info.test_results[n];
                const c = info.cross_validation.results[n];
                return (
                  <tr key={n} className={n === sel ? "bg-brand-50/60" : ""}>
                    <td className="py-2.5 pr-4 font-medium">
                      {n}{n === sel && <span className="ml-2 rounded-full bg-brand-600 px-2 py-0.5 text-xs text-white">Selected</span>}
                    </td>
                    <td className="py-2.5 pr-4 text-right">{num(c.roc_auc_mean)} ± {num(c.roc_auc_std)}</td>
                    <td className="py-2.5 pr-4 text-right">{num(c.recall_mean)}</td>
                    <td className="py-2.5 pr-4 text-right">{pct(t.accuracy)}</td>
                    <td className="py-2.5 pr-4 text-right">{pct(t.precision)}</td>
                    <td className="py-2.5 pr-4 text-right">{pct(t.recall)}</td>
                    <td className="py-2.5 pr-4 text-right">{num(t.f1)}</td>
                    <td className="py-2.5 text-right">{num(t.roc_auc)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          With only {split.test_rows} test rows, small differences between models are within normal random variation
          and should not be read as one model being clearly better.
        </p>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title={`Confusion matrix: ${sel}`} sub={`Test set, ${split.test_rows} rows.`}>
          <ConfusionMatrix cm={cm} />
          <p className="mt-4 text-xs text-slate-500">
            A false negative is a diabetes case the model labelled lower-risk, which is the costliest mistake in
            screening. A false positive is a false alarm.
          </p>
        </Section>

        <Section title="ROC curve" sub="Closer to the top-left corner is better. The dashed line is random guessing.">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={roc} margin={{ top: 28, right: 12, left: -8, bottom: 16 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fpr" type="number" domain={[0, 1]} tick={{ fontSize: 11 }}
                  tickFormatter={(v) => v.toFixed(2)}
                  label={{ value: "False positive rate", position: "insideBottom", offset: -8, fontSize: 11 }} />
                <YAxis type="number" domain={[0, 1]} tick={{ fontSize: 11 }}
                  label={{ value: "True positive rate", angle: -90, position: "insideLeft", offset: 14, fontSize: 11 }} />
                <Tooltip formatter={(v) => Number(v).toFixed(3)} />
                <Legend verticalAlign="top" height={24} />
                <Line type="monotone" dataKey="tpr" name="Model" stroke="#0d9488" strokeWidth={2} dot={false} />
                <Line dataKey="chance" name="Random guess" stroke="#94a3b8" strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      <Section title="Which inputs the model relies on"
        sub="Permutation importance on the test set: how much ROC-AUC drops when a feature is shuffled. It describes the model overall, not any one person's result.">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={imp} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="label" width={150} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => Number(v).toFixed(4)} />
              <Bar dataKey="importance" fill="#14b8a6" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <Section title="Why accuracy alone is not enough">
        <p className="text-sm text-slate-600">
          About {Math.round(100 - dataset.positive_rate_percent)}% of the rows are "no diabetes", so a model that
          always answered "no diabetes" would score roughly that accuracy while missing every real case. That is why
          this page also reports precision, recall, F1, ROC-AUC and the confusion matrix. In health screening, recall
          (how many real cases are caught) matters alongside precision (how many alerts are correct).
        </p>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Limitations">
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
            <li>The data covers only women aged 21+ of Pima Indian heritage. Results may not apply to other groups.</li>
            <li>Only {dataset.rows} rows, so every metric carries real uncertainty.</li>
            <li>
              {dataset.invalid_zero_percent.Insulin}% of insulin and {dataset.invalid_zero_percent.SkinThickness}% of
              skin-thickness values were not measured and are filled by median imputation.
            </li>
            <li>The data is decades old and the model has not been clinically validated.</li>
            <li>The score is a raw model output, not a calibrated personal probability.</li>
          </ul>
        </Section>

        <Section title="Ethical considerations">
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
            <li>Educational prototype only. It must never replace a qualified healthcare professional.</li>
            <li>No names, contact details or other identifiers are collected, and the server stores nothing.</li>
            <li>History stays in your own browser and can be deleted from the Dashboard.</li>
            <li>No treatment, medication or dosage advice is given.</li>
            <li>Performance can differ across populations, so the model could be unfair to groups it was not trained on.</li>
          </ul>
        </Section>
      </div>
    </div>
  );
}