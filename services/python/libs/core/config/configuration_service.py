"""
Configuration Service - Centralized configuration management.

This service provides a unified interface for accessing configuration values
from multiple sources with caching, encryption, and environment variable fallbacks.

Features:
    - LRU caching with automatic invalidation via ETCD watches.
    - Environment variable fallbacks for local development.
    - Automatic encryption/decryption of sensitive values.
    - Thread-safe cache updates.

Usage:
    from libs.core.config import ConfigurationService

    config_service = ConfigurationService(logger, key_value_store)
    db_config = await config_service.get_config("/services/arangodb")
"""

import hashlib
import json
import logging
import os
import threading
import time
from typing import Any, Dict, List, Optional, Union

import dotenv
from cachetools import LRUCache

from libs.core.config.key_value_store import KeyValueStore
from libs.core.constants import ConfigPath
from libs.core.encryption import EncryptionService

dotenv.load_dotenv()

# Type alias for configuration values
ConfigValue = Union[str, int, float, bool, Dict[str, Any], List[Any], None]


class ConfigurationService:
    """
    Service for managing application configuration with caching and encryption.

    This service provides a centralized way to access configuration values from
    a distributed key-value store (ETCD) with automatic caching, environment
    variable fallbacks, and encryption for sensitive data.

    Attributes:
        cache: LRU cache for configuration values.
        store: Underlying key-value store implementation.
        encryption_service: Service for encrypting/decrypting sensitive values.

    Example:
        >>> from libs.core.config import ConfigurationService
        >>> from libs.core.logging import create_logger
        >>>
        >>> logger = create_logger("my_service")
        >>> config_service = ConfigurationService(logger, etcd_store)
        >>>
        >>> # Get database configuration
        >>> db_config = await config_service.get_config("/services/arangodb")
        >>> print(db_config["url"])
        "http://localhost:8529"
        >>>
        >>> # Set a configuration value
        >>> await config_service.set_config("/services/feature_flags", {"new_ui": True})
    """

    def __init__(
        self,
        logger: logging.Logger,
        key_value_store: KeyValueStore,
        cache_size: int = 1000,
    ) -> None:
        """
        Initialize the configuration service.

        Args:
            logger: Logger instance for debugging and error reporting.
            key_value_store: Backend store for configuration persistence.
            cache_size: Maximum number of entries in the LRU cache.

        Raises:
            ValueError: If SECRET_KEY environment variable is not set.
        """
        self.logger = logger
        self.logger.debug("🔧 Initializing ConfigurationService")

        # Initialize encryption service
        secret_key = os.getenv("SECRET_KEY")
        if not secret_key:
            raise ValueError("SECRET_KEY environment variable is required")

        # Hash the secret key to ensure exactly 32 bytes for AES-256
        hashed_key = hashlib.sha256(secret_key.encode()).digest()
        hex_key = hashed_key.hex()
        self.logger.debug("🔑 Secret key hashed to 32 bytes")

        self.encryption_service = EncryptionService.get_instance(
            "aes-256-gcm", hex_key, logger
        )
        self.logger.debug("🔐 Initialized EncryptionService")

        # Initialize LRU cache
        self.cache: LRUCache = LRUCache(maxsize=cache_size)
        self.logger.debug(f"📦 Initialized LRU cache with max size {cache_size}")

        # Store reference
        self.store = key_value_store

        # Start ETCD watch for cache invalidation
        self._start_watch()
        self.logger.debug("👀 Started ETCD watch")

        self.logger.debug("✅ ConfigurationService initialized successfully")

    async def get_config(
        self,
        key: str,
        default: ConfigValue = None,
        use_cache: bool = True,
    ) -> ConfigValue:
        """
        Get a configuration value with caching and fallback support.

        Retrieves configuration from the following sources in order:
        1. LRU cache (if use_cache=True and key exists)
        2. Key-value store (ETCD)
        3. Environment variable fallback (for specific keys)
        4. Default value

        Args:
            key: Configuration key path (e.g., "/services/arangodb").
            default: Default value if key is not found.
            use_cache: Whether to use cached value if available.

        Returns:
            The configuration value, or default if not found.

        Example:
            >>> db_config = await config_service.get_config("/services/arangodb")
            >>> kafka_config = await config_service.get_config(
            ...     "/services/kafka",
            ...     default={"host": "localhost", "port": 9092}
            ... )
        """
        try:
            # Check cache first
            if use_cache and key in self.cache:
                self.logger.debug(f"📦 Cache hit for key: {key}")
                return self.cache[key]

            # Fetch from store
            value = await self.store.get_key(key)

            if value is None:
                # Try environment variable fallback
                env_fallback = self._get_env_fallback(key)
                if env_fallback is not None:
                    self.logger.debug(f"📦 Using environment fallback for key: {key}")
                    self.cache[key] = env_fallback
                    return env_fallback

                self.logger.debug(f"📦 Cache miss for key: {key}")
                return default

            # Cache and return
            self.cache[key] = value
            return value

        except Exception as e:
            self.logger.error(f"❌ Failed to get config {key}: {str(e)}")

            # Try environment variable fallback on error
            env_fallback = self._get_env_fallback(key)
            if env_fallback is not None:
                self.logger.debug(f"📦 Using environment fallback due to error for key: {key}")
                return env_fallback

            return default

    async def set_config(self, key: str, value: ConfigValue) -> bool:
        """
        Set a configuration value with encryption for sensitive keys.

        Args:
            key: Configuration key path.
            value: Value to store.

        Returns:
            True if the value was stored successfully, False otherwise.

        Example:
            >>> success = await config_service.set_config(
            ...     "/services/feature_flags",
            ...     {"new_ui": True, "beta_features": False}
            ... )
        """
        try:
            success = await self.store.create_key(key, value, overwrite=True)

            if success:
                self.cache[key] = value
                self.logger.debug(f"✅ Successfully set config for key: {key}")
            else:
                self.logger.error(f"❌ Failed to set config for key: {key}")

            return success

        except Exception as e:
            self.logger.error(f"❌ Failed to set config {key}: {str(e)}")
            return False

    async def update_config(self, key: str, value: ConfigValue) -> bool:
        """
        Update an existing configuration value.

        If the key doesn't exist, it will be created.

        Args:
            key: Configuration key path.
            value: New value to store.

        Returns:
            True if the value was updated successfully, False otherwise.
        """
        try:
            existing_value = await self.store.get_key(key)
            if existing_value is None:
                self.logger.warning(f"⚠️ Key {key} does not exist, creating new key")
                return await self.set_config(key, value)

            await self.store.update_value(key, value)
            self.cache[key] = value
            self.logger.debug(f"✅ Successfully updated config for key: {key}")
            return True

        except Exception as e:
            self.logger.error(f"❌ Failed to update config {key}: {str(e)}")
            return False

    async def delete_config(self, key: str) -> bool:
        """
        Delete a configuration value.

        Args:
            key: Configuration key path to delete.

        Returns:
            True if the key was deleted, False otherwise.
        """
        try:
            success = await self.store.delete_key(key)

            if success:
                self.cache.pop(key, None)
                self.logger.debug(f"✅ Successfully deleted config for key: {key}")
            else:
                self.logger.error(f"❌ Failed to delete config for key: {key}")

            return success

        except Exception as e:
            self.logger.error(f"❌ Failed to delete config {key}: {str(e)}")
            return False

    def invalidate_cache(self, key: Optional[str] = None) -> None:
        """
        Invalidate cached configuration values.

        Args:
            key: Specific key to invalidate. If None, clears entire cache.
        """
        if key:
            self.cache.pop(key, None)
            self.logger.debug(f"🗑️ Invalidated cache for key: {key}")
        else:
            self.cache.clear()
            self.logger.debug("🗑️ Cleared entire configuration cache")

    def _get_env_fallback(self, key: str) -> Optional[Dict[str, Any]]:
        """
        Get environment variable fallback for specific configuration keys.

        This provides fallback configuration for local development when
        ETCD is not available.

        Args:
            key: Configuration key path.

        Returns:
            Fallback configuration dict, or None if no fallback available.
        """
        if key == ConfigPath.KAFKA.value:
            kafka_brokers = os.getenv("KAFKA_BROKERS")
            if kafka_brokers:
                brokers_list = [b.strip() for b in kafka_brokers.split(",")]
                first_broker = brokers_list[0]
                host, port = (first_broker.split(":") + ["9092"])[:2]
                return {
                    "host": host,
                    "port": int(port),
                    "topic": "records",
                    "bootstrap_servers": brokers_list,
                    "brokers": brokers_list,
                }

        elif key == ConfigPath.ARANGODB.value:
            arango_url = os.getenv("ARANGO_URL")
            if arango_url:
                return {
                    "url": arango_url,
                    "username": os.getenv("ARANGO_USERNAME", "root"),
                    "password": os.getenv("ARANGO_PASSWORD"),
                    "db": os.getenv("ARANGO_DB_NAME", "es"),
                }

        elif key == ConfigPath.REDIS.value:
            redis_host = os.getenv("REDIS_HOST")
            if redis_host:
                redis_password = os.getenv("REDIS_PASSWORD", "")
                return {
                    "host": redis_host,
                    "port": int(os.getenv("REDIS_PORT", "6379")),
                    "password": redis_password if redis_password.strip() else None,
                }

        elif key == ConfigPath.QDRANT.value:
            qdrant_host = os.getenv("QDRANT_HOST")
            if qdrant_host:
                # Get API key from env var, or None if not set (don't use invalid default)
                api_key = os.getenv("QDRANT_API_KEY")
                return {
                    "host": qdrant_host,
                    "port": int(os.getenv("QDRANT_PORT", "6333")),  # HTTP port
                    "grpcPort": int(os.getenv("QDRANT_GRPC_PORT", "6334")),  # gRPC port
                    "apiKey": api_key,  # None if not set, will be handled by _resolve_api_key
                }

        elif key == ConfigPath.AI_MODELS.value:
            ai_models_config = os.getenv("AI_MODELS_CONFIG")
            if ai_models_config:
                try:
                    parsed = json.loads(ai_models_config)
                    # Ensure all expected keys exist with defaults
                    default_structure = {
                        "llm": [],
                        "embedding": [],
                        "slm": [],
                        "reasoning": [],
                        "multiModal": [],
                        "ocr": [],
                        "deepresearch": [],
                        "imageGeneration": [],
                    }
                    for model_type, default_value in default_structure.items():
                        if model_type not in parsed:
                            parsed[model_type] = default_value
                        models = parsed.get(model_type, [])
                        if models and not any(m.get("isDefault") for m in models):
                            models[0]["isDefault"] = True
                    self.logger.info("📦 Using AI_MODELS_CONFIG from environment")
                    return parsed
                except json.JSONDecodeError as e:
                    self.logger.error(f"❌ Failed to parse AI_MODELS_CONFIG: {str(e)}")

        return None

    def _start_watch(self) -> None:
        """
        Start watching ETCD for changes to invalidate cache.

        This runs in a background daemon thread to avoid blocking
        the main application.
        """

        def watch_etcd() -> None:
            # Wait for store client to be ready
            if hasattr(self.store, "client"):
                while getattr(self.store, "client", None) is None:
                    time.sleep(3)
                try:
                    self.store.client.add_watch_prefix_callback(
                        "/", self._watch_callback
                    )
                    self.logger.debug("👀 ETCD prefix watch registered for cache invalidation")
                except Exception as e:
                    self.logger.error(f"❌ Failed to register ETCD watch: {str(e)}")
            else:
                self.logger.debug("📋 Store doesn't expose ETCD client; skipping watch")

        self._watch_thread = threading.Thread(target=watch_etcd, daemon=True)
        self._watch_thread.start()

    def _watch_callback(self, event: Any) -> None:  # noqa: ANN401
        """
        Handle ETCD watch events to invalidate cache.

        Args:
            event: ETCD watch event containing changed keys.
        """
        try:
            for evt in event.events:
                key = evt.key.decode()
                self.cache.pop(key, None)
                self.logger.debug(f"🔄 Cache invalidated for key: {key}")
        except Exception as e:
            self.logger.error(f"❌ Error in watch callback: {str(e)}")

    async def ensure_ai_models_config_seeded(self) -> bool:
        """
        Ensure AI_MODELS configuration is seeded from environment to etcd.

        This bootstrap function:
        1. Reads AI_MODELS_CONFIG from environment
        2. Validates the configuration (embedding model required)
        3. Compares with current etcd value
        4. Updates etcd if missing or different

        Returns:
            True if config was seeded/updated, False if already present and unchanged.

        Raises:
            ValueError: If AI_MODELS_CONFIG is invalid or missing required fields.
        """
        try:
            self.logger.info("🔍 Checking AI_MODELS configuration seed status")

            # Read from environment
            env_config = self._get_env_fallback(ConfigPath.AI_MODELS.value)
            if not env_config:
                self.logger.warning(
                    "⚠️ No AI_MODELS_CONFIG found in environment. "
                    "Set AI_MODELS_CONFIG, AI_MODELS_CONFIG_BASE64, or AI_MODELS_CONFIG_FILE."
                )
                # Check if etcd has config
                existing_config = await self.get_config(
                    ConfigPath.AI_MODELS.value, use_cache=False
                )
                if not existing_config:
                    raise ValueError(
                        "No AI_MODELS configuration found in environment or etcd. "
                        "Please configure AI_MODELS_CONFIG environment variable."
                    )
                self.logger.info("✅ AI_MODELS configuration exists in etcd")
                return False

            # Validate embedding configuration
            self._validate_ai_models_config(env_config)

            # Get current etcd value
            existing_config = await self.get_config(
                ConfigPath.AI_MODELS.value, use_cache=False
            )

            # Normalize both configs for comparison
            normalized_env = self._normalize_config_for_comparison(env_config)
            normalized_existing = (
                self._normalize_config_for_comparison(existing_config)
                if existing_config
                else None
            )

            # Compare configs
            if normalized_existing == normalized_env:
                self.logger.info("✅ AI_MODELS configuration in etcd is up-to-date")
                return False

            # Seed/update etcd
            self.logger.info("📝 Seeding/updating AI_MODELS configuration to etcd")
            success = await self.set_config(ConfigPath.AI_MODELS.value, env_config)

            if not success:
                raise RuntimeError("Failed to write AI_MODELS configuration to etcd")

            self.logger.info("✅ Successfully seeded AI_MODELS configuration to etcd")
            return True

        except json.JSONDecodeError as e:
            self.logger.error(f"❌ Invalid AI_MODELS_CONFIG JSON: {str(e)}")
            raise ValueError(f"Invalid AI_MODELS_CONFIG JSON: {str(e)}")
        except Exception as e:
            self.logger.error(f"❌ Failed to seed AI_MODELS configuration: {str(e)}")
            raise

    def _validate_ai_models_config(self, config: Dict[str, Any]) -> None:
        """
        Validate AI_MODELS configuration structure and required fields.

        Args:
            config: Parsed AI_MODELS configuration.

        Raises:
            ValueError: If configuration is invalid or missing required fields.
        """
        if not isinstance(config, dict):
            raise ValueError("AI_MODELS_CONFIG must be a JSON object")

        # Validate embedding configuration (critical for indexing)
        embedding_configs = config.get("embedding", [])
        if not embedding_configs:
            raise ValueError(
                "AI_MODELS_CONFIG must contain at least one 'embedding' model. "
                "Example: {\"embedding\": [{\"provider\": \"openAI\", \"configuration\": {\"model\": \"text-embedding-3-small\", \"apiKey\": \"sk-...\"}}]}"
            )

        if not isinstance(embedding_configs, list):
            raise ValueError("AI_MODELS_CONFIG 'embedding' must be an array")

        # Validate first embedding model
        embedding_model = embedding_configs[0]
        if not isinstance(embedding_model, dict):
            raise ValueError("Embedding model configuration must be an object")

        provider = embedding_model.get("provider")
        if provider not in ["openAI", "openAICompatible"]:
            raise ValueError(
                f"Unsupported embedding provider: {provider}. "
                "Supported providers: openAI, openAICompatible"
            )

        configuration = embedding_model.get("configuration")
        if not configuration or not isinstance(configuration, dict):
            raise ValueError("Embedding model must have a 'configuration' object")

        # Validate required configuration fields
        if not configuration.get("model"):
            raise ValueError("Embedding configuration must specify 'model'")

        if not configuration.get("apiKey"):
            raise ValueError("Embedding configuration must specify 'apiKey'")

        # For openAICompatible, endpoint is required
        if provider == "openAICompatible" and not configuration.get("endpoint"):
            raise ValueError(
                "OpenAI-compatible embedding provider requires 'endpoint' in configuration"
            )

        self.logger.debug(
            f"✅ Validated embedding configuration: provider={provider}, "
            f"model={configuration.get('model')}"
        )

    def _normalize_config_for_comparison(self, config: Dict[str, Any]) -> str:
        """
        Normalize configuration for comparison by sorting and serializing.

        Args:
            config: Configuration dictionary.

        Returns:
            JSON string with sorted keys for deterministic comparison.
        """
        return json.dumps(config, sort_keys=True, separators=(",", ":"))

