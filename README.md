# HealthAI - Smart Healthcare Risk Assessment System

A full-stack machine learning web application that estimates a **diabetes risk score** from health measurements and explains what that score does and does not mean.

> **Educational prototype only.** HealthAI is not a medical device. It cannot diagnose or rule out diabetes and gives no medical advice, treatment or dosage guidance. Please discuss any health concerns and test results with a qualified healthcare professional.

Built as a final-year B.E. Information Technology project: *"Develop a healthcare-based tool with a user interface using AI/ML models and algorithms, and demonstrate it."*

---

## Features

- **Real ML model.** A scikit-learn pipeline (cleaning, imputation, model) trained on the public Pima Indians Diabetes dataset. No hardcoded or random predictions.
- **Two models compared.** Logistic Regression (baseline) and Random Forest, evaluated with cross-validation and a held-out test set. The selection rule is documented and saved with the results.
- **FastAPI backend** with typed Pydantic validation, a health-check endpoint, CORS configuration and clear error codes.
- **React dashboard** with a landing page, assessment form, result panel, dashboard with charts, and a model information page.
- **Honest outputs.** Metrics shown in the UI are read from the file written by the real training run. Empty states are shown instead of invented numbers.
- **Privacy by design.** No names, emails or identifiers are collected. The server stores nothing. Assessment history stays in your own browser and can be cleared.
- **Missing values handled openly.** Optional fields can be left blank. They are filled with the training-data median and the result lists which fields were filled.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS 3, Recharts, Lucide React, React Router |
| Backend | Python, FastAPI, Pydantic v2, Uvicorn |
| Machine learning | pandas, NumPy, scikit-learn (Pipeline, Logistic Regression, Random Forest), joblib |
| Testing | pytest, FastAPI TestClient |

Developed and tested on Windows with Python 3.13.3 and Node.js 22.

## Project structure

```
healthai/
├── README.md
├── .gitignore
├── backend/
│   ├── requirements.txt
│   ├── pytest.ini
│   ├── app/
│   │   ├── main.py                # FastAPI app, CORS, routes
│   │   ├── config.py              # paths, allowed origins, disclaimer text
│   │   ├── schemas.py             # Pydantic request/response models
│   │   ├── preprocessing.py       # feature names/order and invalid-zero rule (shared)
│   │   └── prediction_service.py  # loads the saved pipeline, runs inference
│   ├── data/diabetes.csv          # Pima Indians Diabetes dataset
│   ├── models/
│   │   ├── metrics.json           # real evaluation results from training
│   │   └── pipeline.joblib        # created by training (not stored in Git)
│   ├── scripts/
│   │   ├── download_data.py       # reproducible dataset download
│   │   └── train_model.py         # data checks, training, comparison, evaluation, saving
│   └── tests/                     # pytest suite
└── frontend/
    ├── package.json
    ├── .env.example               # copy to .env
    └── src/
        ├── api/client.js          # API calls and error handling
        ├── lib/                   # form fields/validation, browser history
        ├── components/            # layout, result panel, charts helpers
        └── pages/                 # Landing, Dashboard, Assessment, ModelInfo
```

## Getting started (Windows PowerShell)

### Prerequisites

```powershell
python --version    # 3.11 or newer
node --version      # 18 or newer
npm --version
git --version
```

### 1. Clone the repository

```powershell
git clone https://github.com/SahilLakade/healthai.git
cd healthai
```

### 2. Backend: environment, packages and model

```powershell
cd backend
python -m venv venv
venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

If PowerShell blocks the activation script, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` and try again.

The dataset is already included at `backend/data/diabetes.csv`. To re-download it: `python scripts\download_data.py --force`.

Train and evaluate the model (creates `models/pipeline.joblib` and `models/metrics.json`):

```powershell
python scripts\train_model.py
```

Run the backend tests:

```powershell
python -m pytest -v
```

Start the API (keep this terminal open):

```powershell
uvicorn app.main:app --reload --port 8000
```

Check it at <http://127.0.0.1:8000/health> and browse the interactive docs at <http://127.0.0.1:8000/docs>.

### 3. Frontend (second terminal)

```powershell
cd healthai\frontend
Copy-Item .env.example .env
npm install
npm run dev
```

Open <http://localhost:5173>. Use this exact address, because the backend only allows requests from port 5173 (see CORS below).

## Using the app

| Page | What it does |
|---|---|
| **Landing** | Explains the project and the prediction process, with the disclaimer. |
| **Risk Assessment** | Form with units, hints and validation. Shows the model's predicted pattern, a 0 to 100 score against the decision threshold, which inputs the model relies on overall, and the limits of the result. |
| **Dashboard** | Counts of your saved assessments, an outcome chart, the model's measured test metrics, and recent history. |
| **Model Information** | Dataset facts, data-quality report, train/test split, model comparison, confusion matrix, ROC curve, feature importance, limitations and ethics. |

## API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Backend and model status (503 if the model is not loaded) |
| GET | `/model-info` | Training metadata and real evaluation metrics |
| POST | `/predict` | Validate inputs and return the prediction |
| GET | `/docs` | Interactive API documentation |

Example request:

```json
{
  "Pregnancies": 2, "Glucose": 120, "BloodPressure": 70, "SkinThickness": 25,
  "Insulin": 80, "BMI": 28.5, "DiabetesPedigreeFunction": 0.45, "Age": 35
}
```

`Pregnancies`, `Glucose`, `BMI` and `Age` are required. The other four may be omitted or `null`. Unknown fields are rejected, so identifiers cannot be sent by accident. Invalid values return `422`, and a missing model file returns `503` with a message instead of a fake prediction.

**CORS.** The browser app (port 5173) and the API (port 8000) are different origins, so the backend explicitly allows `http://localhost:5173` and `http://127.0.0.1:5173`. To change this, set the environment variable `HEALTHAI_CORS_ORIGINS` (comma-separated).

## Machine learning

**Dataset.** Pima Indians Diabetes Database, originally from the National Institute of Diabetes and Digestive and Kidney Diseases: 768 rows, 8 features, binary target `Outcome` (1 = diabetes within 5 years of baseline). Downloaded by `scripts/download_data.py` from a public mirror, with OpenML as a fallback.

**Preprocessing (inside the saved pipeline).**
1. Zeros in Glucose, BloodPressure, SkinThickness, Insulin and BMI are physiologically impossible and are converted to missing values.
2. Missing values are filled with the **median learned from the training rows only**.
3. Logistic Regression additionally uses standard scaling.

Because every step lives in one `Pipeline`, inference applies exactly the same cleaning as training, and nothing from the test set leaks into preprocessing.

**Evaluation strategy.** Stratified 80/20 split (614 training rows, 154 test rows, seed 42). Models are compared with 5-fold stratified cross-validation on the training rows only. The test set is used once for the final report. A model is chosen on cross-validated ROC-AUC, unless a close runner-up (within 0.01 AUC) has higher recall, since missing a real case is the costlier mistake in screening.

**Results from the run on Python 3.13.3 and scikit-learn 1.6.1:**

| Model | CV ROC-AUC | CV recall | Test accuracy | Test precision | Test recall | Test F1 | Test ROC-AUC |
|---|---|---|---|---|---|---|---|
| Logistic Regression | 0.844 | 0.701 | 0.734 | 0.603 | 0.704 | 0.650 | 0.813 |
| **Random Forest (selected)** | 0.838 | 0.748 | 0.727 | 0.591 | 0.722 | 0.650 | 0.817 |

Random Forest test confusion matrix: TN 73, FP 27, FN 15, TP 39.

The two models perform very similarly. With only 154 test rows, the differences are within normal random variation and should not be read as one model being clearly better. Accuracy alone is misleading here: about 65% of rows are "no diabetes", so a model that always answers "no" would score about 65% while missing every real case. That is why precision, recall, F1, ROC-AUC and the confusion matrix are reported.

Re-running the training script recreates these numbers on the same setup. Other package versions can change them slightly.

## Responsible use and limitations

- The data covers only women aged 21+ of Pima Indian heritage. Performance may not carry over to other populations.
- Only 768 rows, so every metric carries real uncertainty.
- Large parts of Insulin (48.7%) and SkinThickness (29.6%) were not measured and are imputed.
- The dataset is decades old and the model has **not** been clinically validated.
- The score is a raw model output, **not** a calibrated personal probability of disease.
- Feature importance describes the model overall. It does not explain an individual result.
- No treatment, medication or dosage advice is given.

## Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| "Server not reachable" in the app | The backend is not running. Start it with `uvicorn app.main:app --reload --port 8000` from the `backend` folder. |
| `{"detail":"Not Found"}` at `/health` | Another program is using port 8000. Find it with `netstat -ano \| findstr :8000`, stop it with `taskkill /PID <pid> /F`, then restart the backend. |
| `/predict` returns 503 | The model file is missing. Run `python scripts\train_model.py`. |
| Blank white page | A source file is empty or failed to load. Check the terminal running `npm run dev` for a red import error. |
| Page has no styling | Check that `postcss.config.js` is not empty, then restart `npm run dev`. |
| CORS error in the browser console | Open the app at `http://localhost:5173`, not another address or port. |

## Dataset citation and acknowledgements

Smith, J.W., Everhart, J.E., Dickson, W.C., Knowler, W.C., and Johannes, R.S. (1988). *Using the ADAP learning algorithm to forecast the onset of diabetes mellitus.* Proceedings of the Symposium on Computer Applications and Medical Care, 261-265.

Dataset originally from the National Institute of Diabetes and Digestive and Kidney Diseases, available via the UCI Machine Learning Repository and OpenML.

## License and intended use

For educational and demonstration purposes only. Not for clinical, diagnostic or patient-care use.
