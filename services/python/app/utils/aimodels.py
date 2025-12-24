from enum import Enum
from typing import Any, Dict

from langchain.chat_models.base import BaseChatModel
from langchain_core.embeddings.embeddings import Embeddings

from libs.core.logging import create_logger


class ModelType(str, Enum):
    LLM = "llm"
    EMBEDDING = "embedding"
    OCR = "ocr"
    SLM = "slm"
    DEEPRESEARCH = "deepresearch"
    REASONING = "reasoning"
    MULTIMODAL = "multiModal"
    IMAGE_GENERATION = "imageGeneration"


class EmbeddingProvider(Enum):
    """Supported embedding providers.

    Active: OPENAI, OPENAI_COMPATIBLE
    """
    OPENAI = "openAI"
    OPENAI_COMPATIBLE = "openAICompatible"


class LLMProvider(Enum):
    """Supported LLM providers.

    Active: OPENAI, OPENAI_COMPATIBLE (used for OpenRouter)
    """
    OPENAI = "openAI"
    OPENAI_COMPATIBLE = "openAICompatible"


logger = create_logger("aimodels")


def get_embedding_model(provider: str, config: Dict[str, Any], model_name: str | None = None) -> Embeddings:
    """Get embedding model for the specified provider.

    Supported providers:
    - openAI: Direct OpenAI API
    - openAICompatible: OpenAI-compatible APIs (e.g., Nebius, OpenRouter, local proxies)
    """
    configuration = config['configuration']
    is_default = config.get("isDefault")

    if is_default and model_name is None:
        model_names = [name.strip() for name in configuration["model"].split(",") if name.strip()]
        model_name = model_names[0]
    elif not is_default and model_name is None:
        model_names = [name.strip() for name in configuration["model"].split(",") if name.strip()]
        model_name = model_names[0]
    elif not is_default and model_name is not None:
        model_names = [name.strip() for name in configuration["model"].split(",") if name.strip()]
        if model_name not in model_names:
            raise ValueError(f"Model name {model_name} not found in {configuration['model']}")

    logger.info(f"Getting embedding model: provider={provider}, model_name={model_name}")

    if provider == EmbeddingProvider.OPENAI.value:
        from langchain_openai.embeddings import OpenAIEmbeddings

        return OpenAIEmbeddings(
            model=model_name,
            api_key=configuration["apiKey"],
            organization=configuration.get("organizationId"),
        )

    elif provider == EmbeddingProvider.OPENAI_COMPATIBLE.value:
        from langchain_openai.embeddings import OpenAIEmbeddings

        return OpenAIEmbeddings(
            model=model_name,
            api_key=configuration['apiKey'],
            base_url=configuration['endpoint'],
            check_embedding_ctx_length=configuration.get("checkEmbeddingCtxLength", False),
        )

    raise ValueError(f"Unsupported embedding provider: {provider}. Supported: openAI, openAICompatible")


def get_generator_model(provider: str, config: Dict[str, Any], model_name: str | None = None) -> BaseChatModel:
    """Get LLM model for the specified provider.

    Supported providers:
    - openAI: Direct OpenAI API
    - openAICompatible: OpenAI-compatible APIs (e.g., OpenRouter)
    """
    logger.debug(f"Starting get_generator_model with provider={provider}, model_name={model_name}")
    configuration = config['configuration']
    logger.debug(f"Configuration keys: {list(configuration.keys())}")
    is_default = config.get("isDefault")
    logger.debug(f"is_default: {is_default}")

    if is_default and model_name is None:
        logger.debug("Processing default model, model_name is None")
        model_names = [name.strip() for name in configuration["model"].split(",") if name.strip()]
        model_name = model_names[0]
        logger.debug(f"Selected default model_name: {model_name}")
    elif not is_default and model_name is None:
        logger.debug("Processing non-default model, model_name is None")
        model_names = [name.strip() for name in configuration["model"].split(",") if name.strip()]
        model_name = model_names[0]
        logger.debug(f"Selected first model_name: {model_name}")
    elif not is_default and model_name is not None:
        logger.debug(f"Processing non-default model with provided model_name: {model_name}")
        model_names = [name.strip() for name in configuration["model"].split(",") if name.strip()]
        if model_name not in model_names:
            logger.error(f"Model name {model_name} not found in {configuration['model']}")
            raise ValueError(f"Model name {model_name} not found in {configuration['model']}")
        logger.debug(f"Model name {model_name} found in available models")

    DEFAULT_LLM_TIMEOUT = 360.0
    logger.debug(f"DEFAULT_LLM_TIMEOUT: {DEFAULT_LLM_TIMEOUT}")

    if provider == LLMProvider.OPENAI.value:
        logger.debug("Creating OpenAI ChatOpenAI instance")
        from langchain_openai import ChatOpenAI

        is_reasoning_model = "gpt-5" in model_name or configuration.get("isReasoning")
        temperature = 1 if is_reasoning_model else configuration.get("temperature", 0.2)

        # Build kwargs with optional parameters
        kwargs = {
            "model": model_name,
            "temperature": temperature,
            "timeout": DEFAULT_LLM_TIMEOUT,
            "api_key": configuration["apiKey"],
        }

        # Add organization if provided
        if "organizationId" in configuration:
            kwargs["organization"] = configuration["organizationId"]

        # Add optional parameters if configured
        if "top_p" in configuration:
            kwargs["top_p"] = configuration["top_p"]
        if "top_k" in configuration:
            kwargs["top_k"] = configuration["top_k"]
        if "max_tokens" in configuration:
            kwargs["max_tokens"] = configuration["max_tokens"]
        if "frequency_penalty" in configuration:
            kwargs["frequency_penalty"] = configuration["frequency_penalty"]
        if "presence_penalty" in configuration:
            kwargs["presence_penalty"] = configuration["presence_penalty"]

        return ChatOpenAI(**kwargs)

    elif provider == LLMProvider.OPENAI_COMPATIBLE.value:
        logger.debug("Creating OpenAI Compatible ChatOpenAI instance")
        from langchain_openai import ChatOpenAI

        # Check if this is a thinking/reasoning model (higher temperature needed)
        is_thinking_model = "thinking" in model_name.lower() or configuration.get("isReasoning")
        temperature = 1 if is_thinking_model else configuration.get("temperature", 0.2)

        # Build kwargs with optional parameters
        kwargs = {
            "model": model_name,
            "temperature": temperature,
            "timeout": DEFAULT_LLM_TIMEOUT,
            "api_key": configuration["apiKey"],
            "base_url": configuration["endpoint"],
        }

        # Add optional parameters if configured
        if "top_p" in configuration:
            kwargs["top_p"] = configuration["top_p"]
        if "top_k" in configuration:
            kwargs["top_k"] = configuration["top_k"]
        if "max_tokens" in configuration:
            kwargs["max_tokens"] = configuration["max_tokens"]
        if "frequency_penalty" in configuration:
            kwargs["frequency_penalty"] = configuration["frequency_penalty"]
        if "presence_penalty" in configuration:
            kwargs["presence_penalty"] = configuration["presence_penalty"]

        return ChatOpenAI(**kwargs)

    logger.error(f"Unsupported provider type: {provider}")
    raise ValueError(f"Unsupported provider: {provider}. Supported: openAI, openAICompatible")
