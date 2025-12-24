import asyncio
import logging
import os
import re  # <--- WICHTIG für präzise Worterkennung
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

# Check if classifier should be disabled for local development (saves ~1-2GB RAM)
DISABLE_CLASSIFIER = os.getenv("DISABLE_WEB_SEARCH_CLASSIFIER", "false").lower() in ("true", "1", "yes")

if not DISABLE_CLASSIFIER:
    from transformers import pipeline
else:
    pipeline = None  # type: ignore
# Importiere deine ONNX Instanz (angepasst an deine Struktur)
from app.modules.web_search.onnx_router import (
    OPTIMUM_AVAILABLE,
    USE_ONNX_ROUTER,  # Oder wie deine Variable heißt
    onnx_router_instance,
)

logger = logging.getLogger(__name__)

class WebSearchRouter:
    _instance = None
    _pytorch_pipeline = None
    _executor = ThreadPoolExecutor(max_workers=1)

    # 1. OPTIMIERUNG: Erweiterte Trigger-Liste
    TRIGGERS = [
        # --- ZEIT & AKTUALITÄT (Time & Recency) ---
        "heute", "morgen", "gestern", "aktuell", "neueste", "jetzt", "uhrzeit",
        "today", "tomorrow", "yesterday", "current", "latest", "now", "time", "recent",
        "wann", "when", "seit wann", "since when",

        # --- WETTER & ORT (Weather & Location) ---
        "wetter", "temperatur", "regen", "sonne", "schnee", "grad", "vorhersage",
        "weather", "temperature", "rain", "sun", "snow", "degrees", "forecast",
        "wo ist", "where is", "location", "map", "karte",

        # --- NACHRICHTEN & EREIGNISSE (News & Events) ---
        "nachrichten", "news", "schlagzeile", "passiert", "ereignis", "wahl", "abstimmung",
        "breaking", "happened", "event", "election", "vote", "scandal", "skandal",
        "release", "erscheinungsdatum", "launch", "start",

        # --- PERSONEN & POLITIK (People & Politics) ---
        "wer ist", "who is", "wer war", "who was", # Nur "wer" ist oft zu allgemein, aber ok mit Regex
        "präsident", "president", "kanzler", "chancellor", "minister",
        "ceo", "cfo", "chef", "boss", "founder", "gründer",
        "alter", "age", "geboren", "born", "gestorben", "died", "tod", "death",
        "verheiratet", "married", "kinder", "children", "net worth", "vermögen",

        # --- FINANZEN & WIRTSCHAFT (Finance & Economy) ---
        "aktie", "stock", "kurs", "price", "preis", "kosten", "cost", "wert", "value",
        "bitcoin", "crypto", "krypto", "ethereum", "coin", "währung", "currency",
        "euro", "dollar", "usd", "eur", "börse", "market",

        # --- SPORT & UNTERHALTUNG (Sports & Entertainment) ---
        "ergebnis", "result", "score", "gewinner", "winner", "verlierer", "loser",
        "spiel", "game", "match", "tabelle", "standings", "live",
        "film", "movie", "kino", "cinema", "stream", "netflix", "trailer",
        "bewertung", "review", "rating", "kritik"
    ]

    # 2. OPTIMIERUNG: Schärfere Labels
    # Wir zwingen das Modell zu unterscheiden zwischen "Ich brauche Fakten" vs "Ich will plaudern"
    CANDIDATE_LABELS = [
        # Label A (Web Search): Fokus auf Faktensuche, Daten und Ereignisse
        "search for facts, specific people, events, news, data, prices or weather",
        # Label B (Keine Suche): Fokus auf Kreativität, Logik und Smalltalk
        "casual chat, creative writing, logic, translation, math or general advice",
    ]

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(WebSearchRouter, cls).__new__(cls)
        return cls._instance

    def _get_pytorch_pipeline(self):
        if DISABLE_CLASSIFIER:
            raise RuntimeError("Classifier is disabled via DISABLE_WEB_SEARCH_CLASSIFIER")
        if self._pytorch_pipeline is None:
            logger.info("🐢 Loading PyTorch Fallback Model...")
            self._pytorch_pipeline = pipeline(
                "zero-shot-classification",
                model="MoritzLaurer/mDeBERTa-v3-base-mnli-xnli",
                device=-1,
                use_fast=True
            )
        return self._pytorch_pipeline

    def _heuristic_check(self, query_text: str) -> Optional[bool]:
        """
        Prüft auf URLs und Keywords mit präziser Wortgrenzen-Erkennung.
        """
        query_lower = query_text.lower()

        # 1. URL Check
        if "http" in query_lower and ("://" in query_lower or "www." in query_lower):
            logger.debug("🚀 Heuristic: URL detected")
            return True

        # 2. Advanced Regex Keyword Check
        # Wir bauen ein Pattern, das sagt:
        # "Finde eines der Wörter, aber nur wenn davor/dahinter ein Leerzeichen oder Satzzeichen steht"
        # \b = Word Boundary. Verhindert, dass "who" in "whole" matcht.

        # Wir escapen jedes Wort zur Sicherheit (falls mal ein Punkt drin ist wie "v.2")
        escaped_triggers = [re.escape(t) for t in self.TRIGGERS]

        # Das Pattern sieht dann so aus: \b(heute|today|wetter|...)\b
        pattern = r"\b(" + "|".join(escaped_triggers) + r")\b"

        match = re.search(pattern, query_lower)
        if match:
            # Debugging: Zeige genau, welches Wort ausgelöst hat
            triggered_word = match.group(0)
            logger.debug(f"🚀 Heuristic: Web Search triggered by keyword '{triggered_word}'")
            return True

        return None

    async def classify(self, query_text: Optional[str]) -> bool:
        if not query_text:
            return False

        # SCHRITT 0: Early exit wenn Classifier deaktiviert (spart ~1-2GB RAM lokal)
        if DISABLE_CLASSIFIER:
            logger.debug("🔇 Web Search Classifier disabled - using heuristics only")
            heuristic_result = self._heuristic_check(query_text)
            return heuristic_result if heuristic_result is not None else False

        # SCHRITT 1: Heuristik
        heuristic_result = self._heuristic_check(query_text)
        if heuristic_result is not None:
            return heuristic_result

        # SCHRITT 2: ONNX (mit den neuen Labels)
        if OPTIMUM_AVAILABLE and USE_ONNX_ROUTER:
            try:
                # Wichtig: hypothesis_template hilft dem Modell enorm

                # Hinweis: onnx_router_instance.predict muss hypothesis_template unterstützen
                # Falls nicht, übergib es direkt im predict call in onnx_router.py
                top_label, score = await onnx_router_instance.predict(
                    query_text,
                    self.CANDIDATE_LABELS,
                    # hypothesis_template=hypothesis_template # Check deine onnx_router implementation
                )

                logger.debug(f"⚡ ONNX: {top_label[:20]}... ({score:.2f})")
                # Threshold leicht gesenkt auf 0.4
                return top_label == self.CANDIDATE_LABELS[0] and score > 0.4

            except Exception as e:
                logger.warning(f"⚠️ ONNX Error: {e}")

        # SCHRITT 3: PyTorch Fallback
        try:
            pipe = self._get_pytorch_pipeline()
            loop = asyncio.get_running_loop()

            result = await loop.run_in_executor(
                self._executor,
                lambda: pipe(
                    query_text,
                    self.CANDIDATE_LABELS,
                    hypothesis_template="The user wants to {}.",
                ),
            )

            top_label = result["labels"][0]
            score = result["scores"][0]

            return top_label == self.CANDIDATE_LABELS[0] and score > 0.4

        except Exception as e:
            logger.error(f"❌ Classifier failed: {e}")
            return False


web_router = WebSearchRouter()


async def classify_web_need(query_text: Optional[str], _logger: Optional[logging.Logger] = None) -> bool:
    """
    Backwards-compatible wrapper used by `chatbot.py`.

    Parameters
    ----------
    query_text:
        User query text.
    _logger:
        Optional logger passed from callers; currently unused because this
        module uses its own module-level logger, but kept for API compatibility.
    """
    return await web_router.classify(query_text)
