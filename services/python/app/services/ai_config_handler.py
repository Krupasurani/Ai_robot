from __future__ import annotations

import asyncio
import json
from typing import Any, Dict, List, Optional

from aiokafka import AIOKafkaConsumer

from app.modules.retrieval.retrieval_service import RetrievalService
from app.services.messaging.kafka.handlers.ai_config import (
    AiConfigEventService,
)
from libs.core.config import ConfigurationService
from libs.core.constants import ConfigPath as config_node_constants


class RetrievalAiConfigHandler:
    """Kafka consumer for AI configuration events (LLM/embeddings).

    Listens on the entity-events topic for the following event types:
      - llmConfigured
      - embeddingModelConfigured

    On receiving these events, it refreshes the cached LLM and embedding
    model instances inside the `RetrievalService`.
    """

    def __init__(
        self,
        logger: Any,
        config_service: ConfigurationService,
        retrieval_service: RetrievalService,
    ) -> None:
        self.logger = logger
        self.config_service = config_service
        self.retrieval_service = retrieval_service

        self.consumer: Optional[AIOKafkaConsumer] = None
        self.running: bool = False
        self._event_service = AiConfigEventService(
            logger=self.logger, retrieval_service=self.retrieval_service
        )

    async def _create_consumer(self) -> None:
        """Create and start the Kafka consumer for AI config events."""
        try:
            kafka_config = await self.config_service.get_config(
                config_node_constants.KAFKA.value
            )
            if not kafka_config:
                raise ValueError("Kafka configuration not found")

            # Robustly extract brokers from config (dict/JSON/string)
            brokers_list: List[str] = self._extract_brokers(kafka_config)

            # Align with utils: client_id/group_id used for AI config consumer
            client_id = "aiconfig_consumer_client"
            group_id = "aiconfig_consumer_group"

            # The AI config events are published on entity-events
            topics = ["entity-events"]

            self.consumer = AIOKafkaConsumer(
                *topics,
                bootstrap_servers=",".join(brokers_list),
                group_id=group_id,
                auto_offset_reset="earliest",
                enable_auto_commit=True,
                client_id=client_id,
            )

            await self.consumer.start()
            self.logger.info(
                "✅ AIOKafkaConsumer started for AI config events on topics: %s",
                topics,
            )
        except Exception as exc:
            self.logger.error("❌ Failed to create/start AI config consumer: %s", exc)
            raise

    def _extract_brokers(self, kafka_config_value: Any) -> List[str]:
        """Extract a list of broker strings from various config formats.

        Supports:
        - dict with key 'brokers' (list[str] | str)
        - JSON string of dict/list/str
        - comma-separated string
        - bracketed list string (e.g. "['localhost:9092']")
        """
        try:
            # If dict, look for 'brokers' inside
            if isinstance(kafka_config_value, dict):
                brokers_value = kafka_config_value.get("brokers")
            else:
                brokers_value = kafka_config_value

            # If already a list
            if isinstance(brokers_value, list):
                brokers = [str(b).strip() for b in brokers_value if str(b).strip()]
                if brokers:
                    return brokers

            # If it's a string, normalize and try to parse
            if isinstance(brokers_value, str):
                s = brokers_value.strip()

                # Strip wrapping quotes if present
                if (s.startswith("\"") and s.endswith("\"")) or (s.startswith("'") and s.endswith("'")):
                    s = s[1:-1]

                # Try JSON first (dict/list/str)
                try:
                    parsed = json.loads(s)
                    if isinstance(parsed, dict):
                        inner = parsed.get("brokers")
                        if isinstance(inner, list):
                            brokers = [str(b).strip() for b in inner if str(b).strip()]
                            if brokers:
                                return brokers
                        if isinstance(inner, str):
                            return [p.strip() for p in inner.split(",") if p.strip()]
                    if isinstance(parsed, list):
                        brokers = [str(b).strip() for b in parsed if str(b).strip()]
                        if brokers:
                            return brokers
                    if isinstance(parsed, str):
                        return [p.strip() for p in parsed.split(",") if p.strip()]
                except Exception:
                    # Not JSON; continue with heuristic parsing
                    pass

                # Bracketed list string like ["host:port", "host2:port2"]
                if s.startswith("[") and s.endswith("]"):
                    try:
                        parsed_list = json.loads(s)
                        if isinstance(parsed_list, list):
                            brokers = [str(b).strip() for b in parsed_list if str(b).strip()]
                            if brokers:
                                return brokers
                    except Exception:
                        # Fallback: strip brackets and split by comma
                        inner = s[1:-1]
                        return [p.strip().strip("\"").strip("'") for p in inner.split(",") if p.strip()]

                # Finally, treat as comma-separated hosts
                splitted = [p.strip() for p in s.split(",") if p.strip()]
                if splitted:
                    return splitted

            # If we reach here, no brokers extracted
            raise ValueError("Kafka brokers not found in configuration")
        except Exception as e:
            # Re-raise with a clearer error
            raise ValueError(f"Invalid Kafka configuration format: {e}") from e

    async def _process_message(self, message: Any) -> bool:
        """Parse and handle a single Kafka message."""
        try:
            value = message.value
            if isinstance(value, bytes):
                try:
                    value = value.decode("utf-8")
                except Exception:
                    # Fallback to raw bytes if decoding fails
                    pass

            if isinstance(value, str):
                try:
                    payload_obj: Dict[str, Any] = json.loads(value)
                except json.JSONDecodeError:
                    # Some producers may double-encode JSON
                    payload_obj = json.loads(json.loads(value))
            else:
                payload_obj = value

            if not isinstance(payload_obj, dict):
                self.logger.warning("Skipping non-dict message: %s", type(payload_obj))
                return True

            event_type = payload_obj.get("eventType")
            payload = payload_obj.get("payload", {})

            if not event_type:
                self.logger.warning("Skipping message without eventType")
                return True

            # Only handle AI configuration events
            if event_type not in ("llmConfigured", "embeddingModelConfigured"):
                # Acknowledge but ignore unrelated events on the same topic
                return True

            return await self._event_service.process_event(event_type, payload)

        except Exception as exc:
            self.logger.error("Error processing AI config message: %s", exc, exc_info=True)
            return False

    async def consume_messages(self) -> None:
        """Run the main consumption loop until stopped or cancelled."""
        self.running = True
        try:
            if self.consumer is None:
                await self._create_consumer()

            assert self.consumer is not None
            self.logger.info("🚀 Starting AI config consumer loop")
            while self.running:
                try:
                    message_batch = await self.consumer.getmany(timeout_ms=100, max_records=5)
                    if not message_batch:
                        await asyncio.sleep(0.1)
                        continue

                    for _tp, messages in message_batch.items():
                        for msg in messages:
                            await self._process_message(msg)
                except asyncio.CancelledError:
                    break
                except Exception as exc:
                    self.logger.error("Error in AI config consume loop: %s", exc, exc_info=True)
                    await asyncio.sleep(1)
        finally:
            await self._cleanup()

    async def _cleanup(self) -> None:
        """Stop and clean up the Kafka consumer."""
        try:
            if self.consumer is not None:
                await self.consumer.stop()
                self.logger.info("🔻 AI config Kafka consumer stopped")
        except Exception as exc:
            self.logger.error("Error during AI config consumer cleanup: %s", exc)

    def stop(self) -> None:
        """Signal the consumer loop to stop."""
        self.running = False


