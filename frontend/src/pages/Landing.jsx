import { Link } from "react-router-dom";
import { Brain, BarChart3, ShieldCheck, ArrowRight, ClipboardList, CheckCircle2, Cpu, FileText } from "lucide-react";
import Logo from "../components/Logo";
import Disclaimer from "../components/Disclaimer";

const FEATURES = [
  { icon: Brain, title: "ML prediction",
    text: "A machine learning model trained on the public Pima Indians Diabetes dataset estimates a risk score from health measurements." },
  { icon: BarChart3, title: "Health analytics",
    text: "Review your past assessments and the model's real evaluation results in one dashboard." },
  { icon: ShieldCheck, title: "Responsible AI",
    text: "Every result explains its limits. No names or contact details are collected, and nothing is stored on the server." },
];

const STEPS = [
  { icon: ClipboardList, title: "Enter measurements", text: "Fill in a short form. Optional values can be left blank." },
  { icon: CheckCircle2, title: "Inputs are validated", text: "The server checks every value against sensible ranges." },
  { icon: Cpu, title: "Model scores them", text: "A saved ML pipeline applies the same preprocessing used in training." },
  { icon: FileText, title: "Read the result", text: "See the score, what the model relies on, and its limits." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Logo />
          <Link to="/assess" className="btn-primary">Assess Health Risk</Link>
        </div>
      </header>

      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:py-20">
          <div>
            <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
              Final-year IT project - AI/ML in healthcare
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Understand diabetes risk with transparent machine learning
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              HealthAI turns a few health measurements into a model-based risk score, and explains what the
              score does and does not mean.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/assess" className="btn-primary">Assess Health Risk <ArrowRight size={16} /></Link>
              <a href="#how" className="btn-secondary">How it works</a>
            </div>
          </div>

          <div className="card space-y-3">
            <p className="text-sm font-semibold text-slate-900">What happens when you submit</p>
            {["Your inputs", "Validated by the API", "Trained ML pipeline", "Score + explanation"].map((t, i) => (
              <div key={t} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">{i + 1}</span>
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-5 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Icon size={20} /></span>
              <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-2xl font-bold text-slate-900">How it works</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <div key={title} className="card">
                <div className="flex items-center gap-2 text-brand-700">
                  <Icon size={18} /><span className="text-xs font-semibold">STEP {i + 1}</span>
                </div>
                <h3 className="mt-3 font-semibold text-slate-900">{title}</h3>
                <p className="mt-1 text-sm text-slate-600">{text}</p>
              </div>
            ))}
          </div>
          <div className="mt-10"><Disclaimer /></div>
        </div>
      </section>
    </div>
  );
}