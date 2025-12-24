from typing import Any, Dict, List, Optional, Tuple

from langchain.chat_models.base import BaseChatModel

from app.utils.aimodels import ModelType, get_generator_model
from libs.core.config import ConfigurationService
from libs.core.constants import ConfigPath as config_node_constants
from libs.core.logging import create_logger

logger = create_logger("utils.llm")


async def get_model_config(
    config_service: ConfigurationService,
    model_key: Optional[str],
    model_type: str = ModelType.LLM.value,
) -> Dict[str, Any]:
    """Get model configuration for the requested bucket (llm, reasoning, etc.)."""
    logger.debug(f"Starting get_model_config with model_key={model_key}, model_type={model_type}")

    async def _load_configs(use_cache: bool = True) -> List[Dict[str, Any]]:
        logger.debug(f"_load_configs called with use_cache={use_cache}")
        ai_models = await config_service.get_config(
            config_node_constants.AI_MODELS.value,
            use_cache=use_cache,
        )
        logger.debug(f"config_service.get_config returned: {ai_models is not None}")
        if not ai_models:
            logger.debug("_load_configs: No ai_models found")
            return []
        configs = ai_models.get(model_type) or []
        logger.debug(f"_load_configs: Retrieved configs for {model_type}: {len(configs) if isinstance(configs, list) else 1}")
        # Ensure we always return a list
        result = configs if isinstance(configs, list) else [configs]
        logger.debug(f"_load_configs returning {len(result)} configs")
        return result

    logger.debug("Loading configs with cache=True")
    configs = await _load_configs(use_cache=True)
    logger.debug(f"Loaded {len(configs)} configs with cache")
    if not configs:
        logger.debug("No configs found with cache, trying without cache")
        configs = await _load_configs(use_cache=False)
        logger.debug(f"Loaded {len(configs)} configs without cache")
        if not configs:
            logger.error(f"No configurations found for model type '{model_type}'.")
            raise ValueError(f"No configurations found for model type '{model_type}'.")

    if model_key:
        logger.debug(f"Looking for specific model_key: {model_key}")
        for config in configs:
            if config.get("modelKey") == model_key:
                logger.debug(f"Found matching config for model_key: {model_key}")
                return config

        # Fetch fresh configs if key was not found (covers recently added models).
        logger.debug(f"Model key '{model_key}' not found, fetching fresh configs")
        configs = await _load_configs(use_cache=False)
        for config in configs:
            if config.get("modelKey") == model_key:
                logger.debug(f"Found matching config in fresh configs for model_key: {model_key}")
                return config
        logger.error(f"Model key '{model_key}' not found for model type '{model_type}'.")
        raise ValueError(
            f"Model key '{model_key}' not found for model type '{model_type}'."
        )

    # Prefer explicit defaults, otherwise fall back to the first config.
    logger.debug("No model_key specified, returning default config")
    result = next((cfg for cfg in configs if cfg.get("isDefault")), configs[0])
    logger.debug(f"Returning config: {result.get('modelKey', 'no-key')}")
    return result


async def get_embedding_model_config(
    config_service: ConfigurationService,
    model_key: Optional[str] = None,
) -> Dict[str, Any]:
    """Get embedding model configuration."""
    return await get_model_config(
        config_service=config_service,
        model_key=model_key,
        model_type=ModelType.EMBEDDING.value,
    )


async def get_llm(
    config_service: ConfigurationService,
    model_type: str = ModelType.LLM.value,
    model_key: Optional[str] = None,
    **kwargs
) -> Tuple[BaseChatModel, dict]:
    """
    Resolve and instantiate the LLM for the given model bucket (llm, slm, reasoning, ...).
    Replaces the old simple get_llm and the complex get_llm_for_chat.
    """
    logger.debug("get_llm: start type=%s key=%s", model_type, model_key)

    try:
        llm_config = await get_model_config(
            config_service=config_service,
            model_key=model_key,
            model_type=model_type,
        )
        logger.debug("get_llm: config resolved for type=%s, key=%s",
                     model_type, llm_config.get("modelKey"))
    except Exception as exc:
        logger.error("get_llm: unable to resolve config for type '%s': %s",
                     model_type, exc)
        raise ValueError(f"Failed to resolve LLM configuration for '{model_type}': {exc}") from exc

    configuration = llm_config.get("configuration") or {}
    model_string = configuration.get("model") or ""
    model_names = [name.strip() for name in model_string.split(",") if name.strip()]

    if not model_names:
        logger.error("get_llm: no models defined in configuration for type '%s'", model_type)
        raise ValueError(f"No models defined for LLM type '{model_type}'.")

    default_model_name = model_names[0]
    model_provider = llm_config.get("provider")

    logger.debug(
        "get_llm: instantiating provider=%s, model=%s (type=%s)",
        model_provider,
        default_model_name,
        model_type,
    )

    try:
        llm = get_generator_model(
            provider=model_provider,
            config=llm_config,
            model_name=default_model_name,
        )
    except Exception as exc:
        logger.error(
            "get_llm: failed to initialize LLM for provider=%s, model=%s: %s",
            model_provider,
            default_model_name,
            exc,
        )
        raise ValueError(f"Failed to initialize LLM '{default_model_name}' for provider '{model_provider}': {exc}") from exc

    logger.debug("get_llm: success provider=%s, model=%s", model_provider, default_model_name)
    return llm, llm_config
