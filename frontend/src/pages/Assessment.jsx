import { useRef, useState } from "react";
import { Loader2, RotateCcw, Sparkles } from "lucide-react";
import { FIELDS, validateForm } from "../lib/fields";
import { ApiError, predictRisk } from "../api/client";
import { addAssessment } from "../lib/history";
import ResultPanel from "../components/ResultPanel";
import Disclaimer from "../components/Disclaimer";

const EMPTY = Object.fromEntries(FIELDS.map((f) => [f.name, ""]));
const SAMPLE = {
  Pregnancies: "2", Glucose: "120", BloodPressure: "70", SkinThickness: "25",
  Insulin: "80", BMI: "28.5", DiabetesPedigreeFunction: "0.45", Age: "35",
};

function Field({ f, value, error, onChange }) {
  const id = `f-${f.name}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-slate-800">
        <span>{f.label}{f.required && <span className="text-red-500"> *</span>}</span>
        <span className="text-xs font-normal text-slate-500">{f.unit}</span>
      </label>
      <input
        id={id} name={f.name} type="number" inputMode="decimal" step={f.step}
        value={value} placeholder={f.placeholder}
        onChange={(e) => onChange(f.name, e.target.value)}
        aria-invalid={!!error} aria-describedby={`${id}-help`}
        className={`input ${error ? "input-error" : ""}`}
      />
      <p id={`${id}-help`} className={`mt-1 text-xs ${error ? "text-red-600" : "text-slate-500"}`}>
        {error || f.hint}
      </p>
    </div>
  );
}

export default function Assessment() {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [apiError, setApiError] = useState(null);
  const resultRef = useRef(null);

  const onChange = (name, v) => {
    setValues((p) => ({ ...p, [name]: v }));
    setErrors((p) => ({ ...p, [name]: undefined }));
  };

  const reset = () => { setValues(EMPTY); setErrors({}); setResult(null); setApiError(null); };

  async function handleSubmit(e) {
    e.preventDefault();
    setApiError(null);
    const { errors: errs, payload } = validateForm(values);
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    setResult(null);
    try {
      const res = await predictRisk(payload);
      setResult(res);
      addAssessment(payload, res);
      if (window.innerWidth < 1024) {
        requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
      }
    } catch (err) {
      if (err instanceof ApiError && err.kind === "validation") setErrors(err.fieldErrors);
      setApiError(err instanceof ApiError ? err : new ApiError("Something went wrong."));
    } finally {
      setLoading(false);
    }
  }

  const group = (required) => FIELDS.filter((f) => f.required === required);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Health Risk Assessment</h1>
      <p className="mt-1 text-slate-600">Enter your measurements to get a model-based diabetes risk score.</p>
      <div className="mt-5"><Disclaimer /></div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <form onSubmit={handleSubmit} noValidate className="card space-y-6 lg:col-span-3">
          <section>
            <h2 className="font-semibold text-slate-900">Required measurements</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {group(true).map((f) => <Field key={f.name} f={f} value={values[f.name]} error={errors[f.name]} onChange={onChange} />)}
            </div>
          </section>

          <section>
            <h2 className="font-semibold text-slate-900">Optional measurements</h2>
            <p className="mt-1 text-xs text-slate-500">
              Leave blank if unknown. Blank values are filled with the training-data median and listed in your result.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {group(false).map((f) => <Field key={f.name} f={f} value={values[f.name]} error={errors[f.name]} onChange={onChange} />)}
            </div>
          </section>

          <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? "Predicting..." : "Predict Risk"}
            </button>
            <button type="button" className="btn-secondary" onClick={reset}><RotateCcw size={16} /> Reset</button>
            <button type="button" className="btn-secondary" onClick={() => { setValues(SAMPLE); setErrors({}); }}>
              <Sparkles size={16} /> Use sample values
            </button>
          </div>
        </form>

        <div ref={resultRef} className="scroll-mt-20 lg:col-span-2">
          <div className="lg:sticky lg:top-6">
            <ResultPanel loading={loading} error={apiError} result={result} />
          </div>
        </div>
      </div>
    </div>
  );
}