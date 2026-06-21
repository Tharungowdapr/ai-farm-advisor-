FROM python:3.12-slim-bookworm

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential && \
    rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

COPY backend/ /app/

EXPOSE 5001

ENV PORT=5001
ENV FLASK_DEBUG=false
ENV PYTHONUNBUFFERED=1

CMD ["sh", "-c", "gunicorn -w 2 -b 0.0.0.0:$PORT --timeout 120 --access-logfile - app:app"]
