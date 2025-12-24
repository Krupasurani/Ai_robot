"""
AI Model Constants - OCR providers and model configurations.

This module provides constants for AI model configurations including
OCR providers and document intelligence models.
"""

from enum import Enum


class OCRProvider(Enum):
    """OCR provider identifiers."""

    AZURE_DI = "azureDI"
    OCRMYPDF = "ocrmypdf"
    # Default OCR provider powered by DeepSeek OCR service
    DEEPSEEK = "deepseekOCR"


class AzureDocIntelligenceModel(Enum):
    """Azure Document Intelligence model identifiers."""

    PREBUILT_DOCUMENT = "prebuilt-document"

