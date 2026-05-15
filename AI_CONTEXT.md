# KrishiVigyan (Vani AI) - AI Context & Architecture

This document serves as a persistent technical reference to quickly understand the project structure, stack, and architecture without needing to re-scan the entire codebase.

## 1. Project Overview
**KrishiVigyan** (also referred to as Vani AI) is an advanced agricultural intelligence platform. It provides real-time geospatial diagnostics, AI-driven crop recommendations, multi-agent RAG for cultivation advice, and local image-based disease prediction.

## 2. Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion, Recharts, Lucide React.
- **Backend**: Flask (Python), PyTorch (local ML inference), ChromaDB (Vector DB).
- **AI Models**: 
  - LLM: Groq API (`llama-3.3-70b-versatile`).
  - Embeddings: `sentence-transformers` (`all-MiniLM-L6-v2`).
  - Vision: PyTorch with `timm` (Vision Transformers for plant disease).

## 3. Directory Structure
```
6th-sem-main-el/
├── backend/
│   ├── app.py                      # Main entrypoint, registers blueprints/routes
│   ├── routes/                     # API endpoint definitions (main_routes.py, prediction_routes.py)
│   ├── services/                   # Core business logic
│   │   ├── llm_service.py          # Groq API client & key management
│   │   ├── rag_service.py          # ChromaDB indexing & semantic search
│   │   ├── soil_service.py         # SoilGrids/ICAR integration
│   │   ├── weather_disease_risk.py # Open-Meteo weather and risk models
│   │   └── ...
│   ├── data/                       # JSON knowledge bases (ICAR, schemes, crops)
│   ├── settings/                   # user_settings.json (stores Groq API keys)
│   ├── local_inference_service.py  # Plant disease detection via PyTorch/timm
│   └── requirements.txt            # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.jsx                 # Routing and main application state
│   │   ├── components/
│   │   │   ├── CropIntelligenceHub.jsx # Integrated lifecycle + tracking + disease hub
│   │   │   ├── VaniAIChat.jsx      # Multi-agent RAG chat interface
│   │   │   ├── MarketHub.jsx       # MSP and price intelligence
│   │   │   └── SmartEnvironmentScanner.jsx # Advanced location scanner
│   └── vite.config.js              # Proxies `/api` to `localhost:5001`
```

## 4. Key Systems & Workflows

### A. AI Chat & RAG (`rag_service.py` & `llm_service.py`)
- **Indexing**: `rag_service.py` indexes local JSON files (`data/knowledge_core_*.json`, `synthetic_icar_data.json`) into ChromaDB (`backend/data/chromadb`).
- **Inference**: Chat endpoints use `llm_service.py` (Groq API) enriched with ChromaDB context (Retrieval-Augmented Generation).
- **Key management**: API keys are pulled from `backend/settings/user_settings.json` or `.env`.

### B. Geospatial & Environment Scanning
- **Frontend**: `LandAnalyser.jsx` / `CropIntelligenceHub.jsx` / `SmartEnvironmentScanner.jsx` collect location data.
- **Backend Route**: `/api/diagnostics/location` (POST) and `/api/env/*` (GET) for specific weather/soil/geocode data.
- **Services**: Combines `weather_api.py`, `soil_lookup.py`, and `app.py` proxy logic.

### C. Persistent Tracking
- **Hub**: `CropIntelligenceHub.jsx` allows starting a "Farm Tracking" session.
- **Backend**: Synced via `/api/farms/create` and retrieved via `/api/user/farms`.
- **Database**: Saved in `krishisync.db` (SQLite) within the `farms` table.

### D. Plant Disease Diagnosis
- Uses `local_inference_service.py`.
- Relies on PyTorch and `timm`. If these are missing, it falls back to a "Mock Inference" mode.

## 5. Common Troubleshooting & Gotchas
- **Missing API Key**: If Vani AI fails, check `user_settings.json` or set `GROQ_API_KEY` in `.env`.
- **ChromaDB Issues**: If RAG fails, delete `backend/data/chromadb` and let the system re-index on the next request.
- **Dependency Issues**: The backend requires heavy ML libraries (`torch`, `torchvision`, `timm`). Ensure they are installed via `pip install -r backend/requirements.txt`.
- **Port Collisions**: Backend runs on `5001` by default. Vite will auto-increment (e.g., `5174`, `5175`) if `5173` is busy.

## 6. Git & Sync
- **Remote**: The codebase is synced with `https://github.com/Tharungowdapr/ai-farm-advisor-.git`.
- **Secrets**: NEVER commit `user_settings.json` if it contains real API keys. It is included in `.gitignore`.
