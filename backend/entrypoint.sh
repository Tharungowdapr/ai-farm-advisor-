#!/usr/bin/env bash
set -e

RENDER_DISK_PATH="${RENDER_DISK_PATH:-/opt/render/data}"

mkdir -p "$RENDER_DISK_PATH/chromadb" "$RENDER_DISK_PATH/uploads" "$RENDER_DISK_PATH/settings"

export DATABASE_PATH="${RENDER_DISK_PATH}/krishisync.db"
export CHROMA_DIR="${RENDER_DISK_PATH}/chromadb"
export UPLOAD_FOLDER="${RENDER_DISK_PATH}/uploads"
export SETTINGS_DIR="${RENDER_DISK_PATH}/settings"
export TRANSFORMERS_CACHE="${RENDER_DISK_PATH}/transformers_cache"
export SENTENCE_TRANSFORMERS_HOME="${RENDER_DISK_PATH}/transformers_cache"

exec gunicorn -w 2 -b 0.0.0.0:${PORT:-5001} --timeout 120 --access-logfile - app:app
