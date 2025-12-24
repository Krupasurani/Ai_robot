#!/bin/bash
set -e

# Zielordner definieren
# WICHTIG: Docling erwartet die Struktur oft unter einem "models" Unterordner
BASE_DIR="${MODEL_DIR:-/artifacts}"
MODELS_DIR="${BASE_DIR}/models"

echo "================================================"
echo "Docling Complete Model Downloader"
echo "Target: ${MODELS_DIR}"
echo "================================================"

mkdir -p "${MODELS_DIR}"

# 1. Standard-Modelle herunterladen (RapidOCR, TableFormer, etc.)
# Das Tool legt die richtige Struktur (RapidOCR/...) automatisch an.
echo ">> Downloading Standard Docling Models (OCR, Layout)..."
docling-tools models download --output-dir "${MODELS_DIR}"

# 2. Granite Modell herunterladen (falls noch nicht dabei)
echo ">> Downloading IBM Granite 258M Model..."
# WICHTIG: HuggingFace erwartet im Offline-Modus den Ordnernamen im Format "org--repo"
# (mit -- statt /) damit AutoProcessor.from_pretrained() funktioniert
python3 -c "
from huggingface_hub import snapshot_download
import os

target = os.environ.get('MODELS_DIR', '/artifacts/models')
# Ordnername muss 'org--repo' Format haben für Offline-Nutzung
folder_name = 'ibm-granite--granite-docling-258M'
print(f'Downloading Granite to {target}/{folder_name}...')
path = snapshot_download(
    repo_id='ibm-granite/granite-docling-258M', 
    local_dir=f'{target}/{folder_name}'
)
print('Done.')
"

# 3. Berechtigungen fixen (Kritisch!)
echo ">> Fixing permissions for User 1001..."
chmod -R 777 "${BASE_DIR}"

echo "================================================"
echo "✓ All models ready."
echo "================================================"
