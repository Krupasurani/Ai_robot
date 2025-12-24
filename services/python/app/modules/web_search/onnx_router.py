import asyncio
import logging
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

# Flag, ob der ONNX Router laut Konfiguration verwendet werden soll.
# Kann zur Laufzeit über `set_use_onnx_router` gesetzt werden.
USE_ONNX_ROUTER: bool = True

# Wir fangen Import-Fehler ab, falls optimum nicht installiert ist
try:
    from optimum.onnxruntime import ORTModelForSequenceClassification
    from optimum.pipelines import pipeline
    from transformers import AutoTokenizer
    OPTIMUM_AVAILABLE = True
except ImportError:
    OPTIMUM_AVAILABLE = False

logger = logging.getLogger(__name__)


def set_use_onnx_router(enabled: bool) -> None:
    """
    Globale Schalter-Funktion, um die Nutzung des ONNX Routers
    per Konfiguration ein- oder auszuschalten.
    """
    global USE_ONNX_ROUTER
    USE_ONNX_ROUTER = bool(enabled)
    logger.info(
        "ONNX Web Search Router is %s",
        "enabled" if USE_ONNX_ROUTER else "disabled",
    )

class ONNXWebSearchRouter:
    _instance = None
    _pipeline = None
    _executor = ThreadPoolExecutor(max_workers=1)

    MODEL_DIR = Path(__file__).parent / "onnx_model_quantized"
    MODEL_FILENAME = "model_quantized.onnx"

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ONNXWebSearchRouter, cls).__new__(cls)
        return cls._instance

    def _get_pipeline(self):
        if not OPTIMUM_AVAILABLE:
            raise ImportError("Library 'optimum' is not installed.")

        if not USE_ONNX_ROUTER:
            raise RuntimeError("ONNX Web Search Router is disabled by configuration.")

        if self._pipeline is None:
            start_time = time.time()

            if not self.MODEL_DIR.exists():
                raise FileNotFoundError(f"ONNX Model not found at {self.MODEL_DIR}")

            try:
                tokenizer = AutoTokenizer.from_pretrained(self.MODEL_DIR)
                model = ORTModelForSequenceClassification.from_pretrained(
                    self.MODEL_DIR, file_name=self.MODEL_FILENAME
                )

                self._pipeline = pipeline(
                    "zero-shot-classification",
                    model=model,
                    tokenizer=tokenizer,
                    accelerator="ort",
                    device=-1,
                )
                logger.info(f"✅ ONNX Model loaded in {time.time() - start_time:.2f}s")
            except Exception as e:
                logger.error(f"❌ Failed to load ONNX model: {e}")
                raise

        return self._pipeline

    async def predict(self, query_text: str, labels: list) -> tuple[str, float]:
        """
        Führt NUR die Vorhersage aus. Keine Heuristik.
        """
        pipe = self._get_pipeline()
        loop = asyncio.get_running_loop()

        t0 = time.perf_counter()

        result = await loop.run_in_executor(
            self._executor,
            lambda: pipe(
                query_text,
                labels,
                hypothesis_template="The intent of this query is {}.",
            ),
        )

        duration = (time.perf_counter() - t0) * 1000
        top_label = result["labels"][0]
        score = result["scores"][0]

        logger.debug(f"⚡ ONNX Inference: {duration:.1f}ms | Label: {top_label[:30]}... ({score:.2f})")
        return top_label, score

# Singleton Instanz
onnx_router_instance = ONNXWebSearchRouter()

__all__ = [
    "ONNXWebSearchRouter",
    "onnx_router_instance",
    "set_use_onnx_router",
    "OPTIMUM_AVAILABLE",
    "USE_ONNX_ROUTER",
]
