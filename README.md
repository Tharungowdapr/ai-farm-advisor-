# 🌾 KrishiSync AI: Multi-Agent Agricultural Intelligence Hub

[![Python 3.12+](https://img.shields.io/badge/Python-3.12+-blue.svg)](https://www.python.org/downloads/)
[![React 18](https://img.shields.io/badge/React-18-61DAFB.svg)](https://reactjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**KrishiSync AI** is a state-of-the-art agricultural intelligence platform designed to empower farmers with data-driven decision-making. By combining **Multi-Agent RAG (Retrieval-Augmented Generation)** with real-time market logistics and environmental diagnostics, it transforms raw agricultural data into actionable economic strategies.

---

## 🚀 Core Features

### 🤖 Vani AI: The Expert Advisory Scientist
Powered by a **Supervisor-specialist architecture**, Vani AI handles complex queries using context-aware routing:
- **Autonomous Routing:** A Supervisor Agent classifies queries and activates specialized models for Soil, Weather, Pests, or Market trends.
- **RAG-Powered Knowledge:** Deeply integrated with ICAR (Indian Council of Agricultural Research) databases to provide scientifically verified advice.
- **Linguistic Versatility:** Native support for Kannada, Hindi, Telugu, and Tamil with culturally situated metaphors.

### 💰 Smart Selling & AI Negotiator
Move beyond simple price checking with our strategic bargaining engine:
- ** APMC Mandi Database:** Hardcoded logic for the top 12 Karnataka Mandis ensuring 100% location accuracy without LLM hallucinations.
- **Logistics Modeling:** Real-time transport cost estimation using Haversine distance and vehicle-specific overheads.
- **Bargaining Bot:** A conversational negotiator that utilizes bargaining history to help farmers counter low-ball offers and maximize net profit.

### 📊 Market Intelligence Hub
- **Universal Pricing:** Live MSP data for government-regulated crops and regional benchmark fallbacks for non-MSP fruits/vegetables.
- **Regional Dominance:** Dynamically identifies the top 3 crops grown in your specific district using AI-driven location analysis.
- **Profit Analytics:** Clear visualization of "Gross vs. Net" profit after deducting labor, seeds, and vehicle-specific transportation costs (Tata Ace/Truck).

### 🌍 Environmental Diagnostics
- **Hyper-Local Weather:** Integration with OpenWeatherMap and OpenMeteo for real-time field conditions.
- **Soil Suitability:** NPK-based analysis that maps land data to the most profitable crop varieties.

---

## 🛠️ Technical Implementation

### The Multi-Agent Pipeline
The platform utilizes a **Directed Acyclic Graph (DAG)** flow for query resolution:
1. **Input:** User query + GPS context + Soil data.
2. **Supervision:** LLM determines which expert sub-agents (SoilAgent, MarketAgent, etc.) to query.
3. **Retrieval:** RAG service fetches technical ICAR documentation relevant to the specific crop and problem.
4. **Synthesis:** All outputs are unified into a final, highly actionable report for the farmer.

### Technology Stack
- **Frontend:** React 18, Tailwind CSS, Vite.
- **Backend:** Flask, Python Dotenv, Requests.
- **AI/LLM:** Groq API (Llama 3.3 70B Versatile).
- **Search:** Custom Geocoding Resolver (OpenWeather + OpenMeteo).

---

## 📥 Installation & Setup

### 1. Clone & Setup Backend
```bash
git clone https://github.com/Tharungowdapr/ai-farm-advisor-.git
cd ai-farm-advisor-/backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Run the Platform
**Terminal 1 (Backend):**
```bash
python app.py
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm install
npm run dev
```

### 3. Configure API Key
1. Open the web app in your browser (usually http://localhost:5173).
2. Navigate to the **Settings** page via the navigation bar.
3. Enter your **Groq API Key** and click "Save & Activate".
4. The key is stored securely in your browser and passed to the backend for AI requests.

---

## 🛡️ Security & Privacy
- **Zero-Secret Backend:** The backend is designed to be "secret-free." All API keys (Groq) are provided by the user via the frontend and stored strictly in the browser's `localStorage`.
- **In-Memory Processing:** Sensitive credentials are passed via secure headers (`X-Api-Key`) and are never persisted to the server's disk or database.
- **Local Sovereignty:** Soil and farm data are processed via specialized agents to ensure context-aware but private analysis.

---

## 🗺️ Future Roadmap
- [ ] Integration with satellite imagery for crop health monitoring.
- [ ] Voice-to-Action commands for hands-free field use.
- [ ] Offline-first sync for remote areas with poor connectivity.

**Developed with ❤️ for the Indian Farming Community.**
