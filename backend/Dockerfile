FROM python:3.12-slim-bookworm

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential && \
    rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ /app/
RUN chmod +x /app/entrypoint.sh

EXPOSE 5001

ENV PORT=5001
ENV FLASK_DEBUG=false
ENV PYTHONUNBUFFERED=1
ENV RENDER_DISK_PATH=/opt/render/data

CMD ["/app/entrypoint.sh"]
