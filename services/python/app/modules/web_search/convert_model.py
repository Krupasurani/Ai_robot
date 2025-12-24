"""
ONNX Model Conversion & Quantization Script
Run this once: python -m app.modules.web_search.convert_model
"""
import logging
from pathlib import Path

from optimum.onnxruntime import ORTModelForSequenceClassification, ORTQuantizer
from optimum.onnxruntime.configuration import AutoQuantizationConfig
from transformers import AutoTokenizer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def convert_and_quantize():
    model_id = "MoritzLaurer/mDeBERTa-v3-base-mnli-xnli"
    # Speichert im gleichen Ordner wie dieses Script
    output_dir = Path(__file__).parent / "onnx_model_quantized"

    logger.info(f"🚀 Starting ONNX conversion for: {model_id}")

    try:
        # 1. Export
        model = ORTModelForSequenceClassification.from_pretrained(model_id, export=True)
        tokenizer = AutoTokenizer.from_pretrained(model_id)
        output_dir.mkdir(parents=True, exist_ok=True)
        model.save_pretrained(output_dir)
        tokenizer.save_pretrained(output_dir)

        # 2. Quantization (AVX2 für Intel/AMD, ARM64 wird oft auto-detected)
        qconfig = AutoQuantizationConfig.avx2(is_static=False, per_channel=False)
        quantizer = ORTQuantizer.from_pretrained(output_dir)

        quantizer.quantize(
            save_dir=output_dir,
            quantization_config=qconfig,
        )

        # Cleanup (Optional: remove non-quantized model)
        (output_dir / "model.onnx").unlink(missing_ok=True)

        logger.info(f"🎉 Success! Quantized model saved to: {output_dir}")

    except Exception as e:
        logger.error(f"❌ Conversion failed: {e}")
        raise

if __name__ == "__main__":
    convert_and_quantize()
