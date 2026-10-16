import { ShieldAlert } from "lucide-react";

export default function Disclaimer() {
  return (
    <div role="note" className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
      <p>
        <strong>Educational prototype.</strong> HealthAI is not a medical device and cannot diagnose or
        rule out diabetes. Please discuss any health concerns and test results with a qualified
        healthcare professional.
      </p>
    </div>
  );
}