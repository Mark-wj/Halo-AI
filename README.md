# HALO Guardian Network
### AI-Powered GBV Response System for Kenya

[![Live Demo](https://img.shields.io/badge/Live-halo001.vercel.app-purple)](https://halo001.vercel.app)
[![Backend](https://img.shields.io/badge/API-halo--backend--c1cl.onrender.com-green)](https://halo-backend-c1cl.onrender.com/health)


HALO (Holistic AI-Linked Operations) is a Progressive Web App designed to protect survivors of gender-based violence in Kenya. It combines a four-model ML ensemble for lethality prediction, multilingual NLP distress analysis, and an AI-powered resource recommendation system — all running on free-tier infrastructure, offline-capable, and disguisable as a calculator.

---

## Features

| Feature | Description |
|---|---|
| **Emergency SOS** | One-tap email alerts to up to 3 contacts with live GPS coordinates and 2-minute location updates |
| **AI Risk Assessment** | 11-question DA-20/ODARA-calibrated assessment with 4-model ML ensemble prediction |
| **AI Safety Chatbot** | Guided conversational assessment powered by the Flask backend |
| **Anonymous Reporting** | Case number-tracked anonymous incident reporting with offline queue |
| **Resource Directory** | 50+ verified GBV services with AI proximity matching and smart scoring |
| **Evidence Vault** | PIN-protected vault for GPS-tagged photos, audio recordings, and incident journal with court-ready HTML export |
| **Safety Plan** | 7-section interactive safety plan (DA-20 aligned) with progress tracking |
| **Court Case Tracker** | Legal case timeline and document management |
| **Disguise Mode** | App hides behind a fully-functional calculator; secret PIN reveals HALO |
| **PWA Install** | Installs as "Calculator" on home screen on Android and iOS |
| **Multilingual** | English, Kiswahili, Gĩkũyũ, Dholuo |
| **Offline-First** | Keyword-based crisis detection, cached resources, queued SOS when offline |

---

## Architecture

```
Frontend (React + Vite + Tailwind)     Backend (Flask + Python ML)
┌────────────────────────────┐         ┌─────────────────────────────────┐
│  React PWA                 │  HTTPS  │  Flask API                      │
│  - Vite build              │ ──────► │  - Gunicorn (1 worker, 2 threads)│
│  - Tailwind CSS            │         │  - Lazy TF loading               │
│  - Lucide icons            │         │                                 │
│  - Service Worker (PWA)    │         │  ML Stack                       │
│  - localStorage            │         │  ├── Risk Escalation Ensemble   │
│  - Offline fallbacks       │         │  │   ├── Random Forest          │
└────────────────────────────┘         │  │   ├── XGBoost                │
         │                             │  │   ├── LightGBM               │
         │ Deployed on Vercel          │  │   └── Neural Network (TF)    │
                                       │  ├── Sentiment Analysis         │
                                       │  │   ├── TF-IDF + LogReg        │
                                       │  │   ├── CNN (1D Conv)          │
                                       │  │   └── Bidirectional LSTM     │
                                       │  └── Recommendation System      │
                                       │      ├── TruncatedSVD           │
                                       │      └── Cosine Similarity      │
                                       └─────────────────────────────────┘
                                                Deployed on Render
```

---

## ML Models

### Risk Escalation (Part 1)
Four-model AUC-weighted ensemble predicting 30-day escalation probability.

- **Data**: 10,000 synthetic records calibrated to DA-20 (Campbell 2003), Kenya DHS 2022, WHO Multi-Country Study (Garcia-Moreno 2005), ODARA (Hilton 2004)
- **Class imbalance**: SMOTE applied before training; `scale_pos_weight` computed from original imbalanced split
- **Scaler**: RobustScaler (outlier-resistant for extreme abuse cases)
- **Ensemble weights**: Proportional to individual AUC scores

### Sentiment & Distress Analysis (Part 2)
Three-model ensemble for journal entry distress classification (SAFE → MODERATE → HIGH_DISTRESS → CRITICAL).

- **TF-IDF + Logistic Regression**: Fast baseline; runs even before TF lazy-loads
- **CNN**: 1D convolutions detect local crisis phrases regardless of position
- **Bidirectional LSTM**: Reads forward and backward for long-range context
- **Ensemble weights**: Macro-F1 (not accuracy) to avoid majority-class bias

### Resource Recommendation
Hybrid collaborative + content-based + risk-aware scoring.

- **Matrix factorisation**: TruncatedSVD on user-resource interaction matrix
- **Content-based**: Cosine similarity on GBVIMS Kenya 2023 resource features
- **Risk override**: CRITICAL users get emergency shelters boosted regardless of CF score

---

## Project Structure

```
halo-guardian-network/
├── Frontend/
│   ├── src/
│   │   ├── App.jsx                    # Main app, all page components
│   │   ├── services/
│   │   │   ├── i18n.jsx               # I18nProvider + translations (en/sw/ki/luo)
│   │   │   ├── mlAPI.js               # Backend API client with offline fallbacks
│   │   │   ├── offlineService.js      # Cache, queue, online detection
│   │   │   ├── sosAlerts.js           # Email-based SOS alert system
│   │   │   ├── realResources.js       # 50+ verified Kenya GBV services
│   │   │   ├── geolocation.js         # GPS + proximity scoring
│   │   │   └── panicButton.js         # Hardware button / tap-zone panic trigger
│   │   └── components/
│   │       ├── evidence/EvidenceVaultFixed.jsx
│   │       ├── disguise/disguiseMode.jsx
│   │       ├── safety plan/safetyPlanBuilder.jsx
│   │       ├── court/courtCaseTracker.jsx
│   │       └── shared/UIComponents.jsx
│   ├── public/
│   │   ├── manifest.json              # PWA manifest ("Calculator")
│   │   ├── sw.js                      # Service worker
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   ├── index.html
│   ├── vite.config.js
│   ├── vercel.json
│   └── package.json
│
└── Halo Backend/
    ├── app.py                         # Flask entry point + CORS
    ├── requirements.txt
    ├── render.yaml
    ├── .python-version                # 3.11.9
    ├── services/
    │   ├── ml_service.py              # Full ML service
    │   └── ml_service_lazy.py         # Free-tier lazy TF loader
    └── models/
        ├── risk_escalation/           # RF, XGB, LGBM, NN .pkl/.h5
        ├── sentiment/                 # TF-IDF, LR, CNN, BiLSTM
        ├── recommendation/            # SVD, similarity matrices
        └── chatbot/chatbot_config.json
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11
- Git + Git LFS

### Frontend (Local Dev)

```bash
cd Frontend
npm install
cp .env.example .env.local
# Set VITE_API_URL=http://localhost:5000 in .env.local
npm run dev
# → http://localhost:5173
```

### Backend (Local Dev)

```bash
cd "Halo Backend"
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
# → http://localhost:5000
```

### Environment Variables

**Frontend** (`Frontend/.env.local`):
```
VITE_API_URL=https://halo-backend-c1cl.onrender.com
```

**Backend** (Render Environment tab):
```
LAZY_LOAD_MODELS=true
FLASK_ENV=production
FRONTEND_URL=https://halo001.vercel.app
```

---

## Deployment

### Backend → Render

```bash
# From Halo Backend/
echo "3.11.9" > .python-version
git add .
git commit -m "Deploy"
git push origin main
# Render auto-deploys on push
```

Render config (`render.yaml`):
```yaml
startCommand: gunicorn app:app --workers 1 --threads 2 --timeout 120 --bind 0.0.0.0:$PORT
```

### Frontend → Vercel

```bash
# From Frontend/
# Set VITE_API_URL env var in Vercel dashboard
git push origin main
# Vercel auto-deploys on push
```

### ML Models → Git LFS

```bash
git lfs install
git lfs track "models/**/*.pkl" "models/**/*.h5"
git add .gitattributes models/
git commit -m "Add models via LFS"
git lfs push --all origin main
git push origin main
```

---

## ML Data Calibration Sources

| Source | What it calibrates |
|---|---|
| Campbell JC et al., DA-20 NIJ Journal 2003 | Strangulation (0.28), death threats (0.24), femicide predictors |
| Kenya KNBS & ICF, DHS 2022 Chapter 18 | Alcohol involvement (54%), weapon access (22%), county distributions |
| Garcia-Moreno C et al., WHO Multi-Country Study 2005 | Escalation base rate 47–54%, class balance target |
| Hilton NZ et al., ODARA Psychological Assessment 2004 | ODARA AUC ~0.77 calibration target, actuarial feature weights |
| GBVIMS Kenya 2023 | Resource taxonomy, service directory categories |

---

## Security & Privacy

- All user data stored in `localStorage` — never sent to any server except the ML backend for analysis
- Evidence Vault PIN-protected (client-side)
- Disguise Mode: app opens as a working calculator; PIN typed into calculator reveals HALO
- No user accounts, no cloud storage of personal data
- ML backend receives text/assessment data only — no names, no identifiers
- CORS restricted to known frontend origins

---

## Emergency Contacts

The app uses email-based SOS (no Twilio required). Users add up to 3 trusted contacts. On SOS activation, the system:
1. Gets current GPS coordinates
2. Emails all contacts with location link + instructions
3. Sends location updates every 2 minutes while active
4. Sends "I'm safe" confirmation when deactivated

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit: `git commit -m "Add your feature"`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

---

## Author
This project was built by Mark Njenga Wanjiku in efforts to fight gbve.

---

## Acknowledgements

Built for the Presidential Task Force on Femicide Initiative, Kenya 2026.
Crisis data calibrated against validated IPV research instruments.
GBV resource directory sourced from GBVIMS Kenya 2023.

**If you are in danger, call 999 (Police) or 1195 (GBV Hotline, free, 24/7)**