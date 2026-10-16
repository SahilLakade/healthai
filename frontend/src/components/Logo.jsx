import { Activity } from "lucide-react";

export default function Logo() {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
        <Activity size={20} />
      </span>
      <span className="text-lg font-bold tracking-tight text-slate-900">
        Health<span className="text-brand-600">AI</span>
      </span>
    </div>
  );
}