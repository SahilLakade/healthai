// Field definitions for the assessment form. Names match the backend exactly.
export const FIELDS = [
  { name: "Pregnancies", label: "Pregnancies", unit: "count", required: true, integer: true, min: 0, max: 20, step: 1,
    hint: "Number of times pregnant. Enter 0 if none.", placeholder: "e.g. 2" },
  { name: "Glucose", label: "Plasma glucose", unit: "mg/dL", required: true, min: 40, max: 400, step: 1,
    hint: "Glucose concentration from an oral glucose tolerance test.", placeholder: "e.g. 120" },
  { name: "BloodPressure", label: "Diastolic blood pressure", unit: "mm Hg", required: false, min: 30, max: 200, step: 1,
    hint: "The lower number of a blood pressure reading. Leave blank if unknown.", placeholder: "e.g. 70" },
  { name: "SkinThickness", label: "Triceps skin-fold thickness", unit: "mm", required: false, min: 1, max: 100, step: 1,
    hint: "Measured by a clinician. Leave blank if unknown.", placeholder: "e.g. 25" },
  { name: "Insulin", label: "2-hour serum insulin", unit: "mu U/ml", required: false, min: 1, max: 1000, step: 1,
    hint: "Leave blank if unknown.", placeholder: "e.g. 80" },
  { name: "BMI", label: "Body mass index", unit: "kg/m²", required: true, min: 10, max: 80, step: 0.1,
    hint: "Weight in kg divided by height in metres squared.", placeholder: "e.g. 28.5" },
  { name: "DiabetesPedigreeFunction", label: "Diabetes pedigree function", unit: "score", required: false, min: 0.01, max: 3, step: 0.01,
    hint: "A score from the dataset reflecting family history. Leave blank if unknown.", placeholder: "e.g. 0.45" },
  { name: "Age", label: "Age", unit: "years", required: true, integer: true, min: 21, max: 100, step: 1,
    hint: "The training data only covers ages 21 and above.", placeholder: "e.g. 35" },
];

// Validate raw form strings. Returns { errors, payload }.
export function validateForm(values) {
  const errors = {};
  const payload = {};
  for (const f of FIELDS) {
    const raw = (values[f.name] ?? "").toString().trim();
    if (raw === "") {
      if (f.required) errors[f.name] = "This field is required.";
      else payload[f.name] = null;
      continue;
    }
    const num = Number(raw);
    if (!Number.isFinite(num)) errors[f.name] = "Enter a valid number.";
    else if (f.integer && !Number.isInteger(num)) errors[f.name] = "Enter a whole number.";
    else if (num < f.min || num > f.max) errors[f.name] = `Enter a value between ${f.min} and ${f.max}.`;
    else payload[f.name] = num;
  }
  return { errors, payload };
}