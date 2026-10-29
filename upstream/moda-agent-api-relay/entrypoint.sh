#!/bin/bash
set -e

source "${CONDA_DIR}/etc/profile.d/conda.sh"
conda activate ocr_env

echo "Starting OCR Server in ocr_env..."
export PYTHONPATH=$PYTHONPATH:/app/moda_agent

python3 /app/moda_agent/poc_easyocr/ocr_api_server.py \
    --host ${OCR_BIND_HOST:-0.0.0.0} \
    --port ${OCR_BIND_PORT:-5000} \
    --vlm-api-url ${VLM_API_URL:-http://model-gemma-3-4b-it:8000/v1} \
    --vlm-api-key ${VLM_API_KEY:-sk-test} \
    --vlm-model-name ${VLM_MODEL_NAME:-/model/gemma-3-4b-it} &
	
exec java -jar /app/app.jar
