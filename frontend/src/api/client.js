const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, { status = 0, fieldErrors = {}, kind = "server" } = {}) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors; // { FieldName: "message" } for 422
    this.kind = kind; // "network" | "validation" | "unavailable" | "server"
  }
}

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch {
    throw new ApiError(
      "Cannot reach the HealthAI server. Make sure the backend is running on " + BASE_URL + ".",
      { kind: "network" }
    );
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON body */
  }

  if (res.ok) return data;

  if (res.status === 422 && Array.isArray(data?.detail)) {
    const fieldErrors = {};
    for (const e of data.detail) {
      const field = e.loc?.[e.loc.length - 1];
      if (typeof field === "string") fieldErrors[field] = e.msg;
    }
    throw new ApiError("Some inputs are invalid. Please check the highlighted fields.", {
      status: 422, fieldErrors, kind: "validation",
    });
  }
  if (res.status === 503) {
    throw new ApiError(
      typeof data?.detail === "string" ? data.detail : "The model is not available on the server.",
      { status: 503, kind: "unavailable" }
    );
  }
  throw new ApiError(
    typeof data?.detail === "string" ? data.detail : `Server error (${res.status}).`,
    { status: res.status, kind: "server" }
  );
}

export const getHealth = () => request("/health");
export const getModelInfo = () => request("/model-info");
export const predictRisk = (payload) =>
  request("/predict", { method: "POST", body: JSON.stringify(payload) });