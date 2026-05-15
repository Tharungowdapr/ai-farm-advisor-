.PHONY: setup setup-backend setup-frontend run-backend run-frontend run help

help:
	@echo "KrishiVigyan - Makefile"
	@echo ""
	@echo "Commands:"
	@echo "  make setup         Full setup (backend + frontend)"
	@echo "  make run-backend   Start Flask backend (port 5000)"
	@echo "  make run-frontend  Start Vite frontend (port 5173)"
	@echo "  make run           Start both backend and frontend"
	@echo "  make clean         Remove venv and node_modules"
	@echo ""

setup:
	@echo "Running full setup..."
	@bash setup.sh

setup-backend:
	@echo "Setting up backend..."
	cd backend && python3 -m venv venv && \
	. venv/bin/activate && \
	pip install --upgrade pip -q && \
	pip install -r requirements.txt -q
	@echo "Backend ready"

setup-frontend:
	@echo "Setting up frontend..."
	cd frontend && npm install --legacy-peer-deps
	@echo "Frontend ready"

run-backend:
	@echo "Starting backend on port 5000..."
	cd backend && . venv/bin/activate && python app.py

run-frontend:
	@echo "Starting frontend on port 5173..."
	cd frontend && npm run dev

run:
	@echo "Starting backend (background) and frontend..."
	@trap 'kill 0' EXIT; \
	cd backend && . venv/bin/activate && python app.py & \
	cd frontend && npm run dev & \
	wait

clean:
	@echo "Cleaning up..."
	rm -rf backend/venv frontend/node_modules
	rm -rf backend/__pycache__ backend/**/__pycache__
	rm -rf backend/data/chromadb
	@echo "Cleaned"
