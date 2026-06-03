# 🌾 KrishiSync AI - Frontend

This is the React-based frontend for the KrishiSync AI platform.

## 🚀 Features
- **Dynamic Dashboards:** Real-time visualization of soil, weather, and market data.
- **Vani AI Chat:** Interactive RAG-based agricultural assistant.
- **Smart Scanner:** Geolocation-aware environmental diagnostic tool.
- **Market Hub:** Live MSP tracking and AI price forecasting.

## 🛠️ Development

### Setup
```bash
npm install
```

### Run Locally
```bash
npm run dev
```
The app will be available at `http://localhost:5173`.

### Proxy Configuration
The frontend is configured to proxy `/api` requests to `http://127.0.0.1:5001`. Ensure the backend server is running on that port.

## 📁 Structure
- `src/components`: UI components for each major feature.
- `src/data`: Static knowledge bases and crop databases.
- `src/assets`: Images and styling resources.
