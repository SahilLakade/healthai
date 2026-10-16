// Assessment history lives only in THIS browser (localStorage). No names or identifiers are stored.
const KEY = "healthai.history.v1";
const MAX = 50;

// Counts assessments made since the page was loaded (resets on refresh).
let sessionCount = 0;
export const getSessionCount = () => sessionCount;

export function getHistory() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addAssessment(inputs, result) {
  sessionCount += 1;
  const entry = {
    id: Date.now(),
    at: new Date().toISOString(),
    inputs,
    predicted_class: result.predicted_class,
    predicted_label: result.predicted_label,
    probability: result.probability,
    model_name: result.model_name,
  };
  try {
    localStorage.setItem(KEY, JSON.stringify([entry, ...getHistory()].slice(0, MAX)));
  } catch {
    /* storage full or blocked: ignore */
  }
  return entry;
}

export function clearHistory() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}