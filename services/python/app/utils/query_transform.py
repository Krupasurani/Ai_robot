"""
Query Transformation using LiteLLM - No LangChain overhead.

This module provides query rewriting and expansion using litellm directly,
avoiding the Pydantic validation overhead of LangChain's LCEL chains.

Performance: ~2-5x faster than LangChain chains for simple transformations.
"""

import asyncio
from dataclasses import dataclass
from typing import List, Optional, Tuple

import litellm

from libs.core.config import ConfigurationService
from libs.core.constants import ConfigPath as config_node_constants
from libs.core.logging import create_logger

logger = create_logger("query_transform")


# Prompts as simple strings (no ChatPromptTemplate overhead)
QUERY_REWRITE_SYSTEM = """You are an expert at reformulating search queries to make them more effective.
Given the original query, rewrite it to make it more specific and detailed.
Return ONLY the rewritten query, no explanations or additional text."""

QUERY_EXPANSION_SYSTEM = """Generate 2 additional search queries that capture different aspects or perspectives of the original query.
These should help in retrieving a diverse set of relevant documents.
Return only the list of queries, one per line without any numbering or prefixes."""

FOLLOWUP_REWRITE_SYSTEM = """You are an expert at reformulating search queries to make them more effective.
Given the conversation history and follow-up question, rewrite the follow-up question to be standalone and specific,
so it can be used to search for relevant documents without needing the conversation context.
Return ONLY the rewritten query, no explanations or additional text."""


@dataclass
class LLMConfig:
    """Lightweight LLM configuration (no Pydantic overhead)."""
    model: str
    api_key: str
    api_base: Optional[str] = None
    temperature: float = 0.2


async def get_llm_config(
    config_service: ConfigurationService,
    model_type: str = "slm",
) -> LLMConfig:
    """
    Get LLM configuration for litellm.

    Args:
        config_service: Configuration service
        model_type: Type of model to use (slm, llm, etc.)

    Returns:
        LLMConfig with model, api_key, and optional api_base
    """
    ai_models = await config_service.get_config(
        config_node_constants.AI_MODELS.value,
        use_cache=True
    )

    configs = (ai_models or {}).get(model_type, [])
    if not configs:
        # Fallback to regular LLM if SLM not configured
        configs = (ai_models or {}).get("llm", [])

    if not configs:
        raise ValueError(f"No LLM configuration found for type '{model_type}'")

    # Find default or first config
    selected_config = next(
        (c for c in configs if c.get("isDefault", False)),
        configs[0]
    )

    configuration = selected_config["configuration"]
    provider = selected_config["provider"]

    # Extract model name
    model_names = [
        name.strip()
        for name in configuration["model"].split(",")
        if name.strip()
    ]
    model_name = model_names[0]

    # Build litellm-compatible model string
    if provider == "openAI":
        litellm_model = model_name
    elif provider == "openAICompatible":
        litellm_model = f"openai/{model_name}"
    else:
        litellm_model = model_name

    return LLMConfig(
        model=litellm_model,
        api_key=configuration["apiKey"],
        api_base=configuration.get("endpoint"),
        temperature=configuration.get("temperature", 0.2),
    )


async def rewrite_query(
    query: str,
    config: LLMConfig,
) -> str:
    """
    Rewrite a query to be more specific and detailed.

    Args:
        query: Original query string
        config: LLM configuration

    Returns:
        Rewritten query string
    """
    try:
        response = await litellm.acompletion(
            model=config.model,
            messages=[
                {"role": "system", "content": QUERY_REWRITE_SYSTEM},
                {"role": "user", "content": query},
            ],
            api_key=config.api_key,
            api_base=config.api_base,
            temperature=config.temperature,
            max_tokens=256,
        )

        return response.choices[0].message.content.strip()

    except Exception as e:
        logger.warning(f"Query rewrite failed, using original: {e}")
        return query


async def expand_query(
    query: str,
    config: LLMConfig,
) -> List[str]:
    """
    Generate additional search queries for diverse retrieval.

    Args:
        query: Original query string
        config: LLM configuration

    Returns:
        List of expanded query strings
    """
    try:
        response = await litellm.acompletion(
            model=config.model,
            messages=[
                {"role": "system", "content": QUERY_EXPANSION_SYSTEM},
                {"role": "user", "content": query},
            ],
            api_key=config.api_key,
            api_base=config.api_base,
            temperature=config.temperature,
            max_tokens=256,
        )

        content = response.choices[0].message.content.strip()
        # Parse line-separated queries
        queries = [q.strip() for q in content.split("\n") if q.strip()]
        return queries

    except Exception as e:
        logger.warning(f"Query expansion failed: {e}")
        return []


async def rewrite_followup_query(
    query: str,
    previous_conversations: str,
    config: LLMConfig,
) -> str:
    """
    Rewrite a follow-up question to be standalone based on conversation history.

    Args:
        query: Follow-up question
        previous_conversations: Previous conversation context
        config: LLM configuration

    Returns:
        Rewritten standalone query
    """
    try:
        user_message = f"""Previous Conversations: {previous_conversations}

Follow up question: {query}

Rewritten Query:"""

        response = await litellm.acompletion(
            model=config.model,
            messages=[
                {"role": "system", "content": FOLLOWUP_REWRITE_SYSTEM},
                {"role": "user", "content": user_message},
            ],
            api_key=config.api_key,
            api_base=config.api_base,
            temperature=config.temperature,
            max_tokens=256,
        )

        return response.choices[0].message.content.strip()

    except Exception as e:
        logger.warning(f"Followup query rewrite failed, using original: {e}")
        return query


async def transform_query(
    query: str,
    config_service: ConfigurationService,
    model_type: str = "slm",
) -> Tuple[str, List[str]]:
    """
    Transform a query using rewrite and expansion in parallel.

    This is the main entry point for query transformation.

    Args:
        query: Original query string
        config_service: Configuration service for LLM config
        model_type: Type of model to use (slm, llm, etc.)

    Returns:
        Tuple of (rewritten_query, expanded_queries)
    """
    config = await get_llm_config(config_service, model_type)

    # Run rewrite and expansion in parallel
    rewritten, expanded = await asyncio.gather(
        rewrite_query(query, config),
        expand_query(query, config),
    )

    return rewritten, expanded


async def transform_followup_query(
    query: str,
    previous_conversations: str,
    config_service: ConfigurationService,
    model_type: str = "slm",
) -> str:
    """
    Transform a follow-up query based on conversation history.

    Args:
        query: Follow-up question
        previous_conversations: Previous conversation context
        config_service: Configuration service for LLM config
        model_type: Type of model to use (slm, llm, etc.)

    Returns:
        Rewritten standalone query
    """
    config = await get_llm_config(config_service, model_type)
    return await rewrite_followup_query(query, previous_conversations, config)
