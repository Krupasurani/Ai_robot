"""
Redis Scheduler - Redis-based task scheduler implementation.

This module provides a scheduler using Redis sorted sets for delayed
task execution.
"""

import asyncio
import json
from datetime import datetime, timedelta, timezone
from logging import Logger
from typing import TYPE_CHECKING, Any, List

import aiohttp
from jose import jwt
from redis import asyncio as aioredis
from tenacity import retry, stop_after_attempt, wait_exponential

from libs.core.constants import ConfigPath, HttpStatusCode
from libs.scheduler.interface import IScheduler

if TYPE_CHECKING:
    from libs.core.config import ConfigurationService


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=15))
async def make_api_call(signed_url_route: str, token: str) -> dict:
    """
    Make an API call with the JWT token.

    Args:
        signed_url_route: The route to send the request to.
        token: The JWT token to use for authentication.

    Returns:
        dict with 'is_json' boolean and 'data' containing response.
    """
    try:
        async with aiohttp.ClientSession() as session:
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            }

            async with session.get(signed_url_route, headers=headers) as response:
                content_type = response.headers.get("Content-Type", "").lower()

                if (
                    response.status == HttpStatusCode.SUCCESS.value
                    and "application/json" in content_type
                ):
                    data = await response.json()
                    return {"is_json": True, "data": data}
                else:
                    data = await response.read()
                    return {"is_json": False, "data": data}
    except Exception:
        raise


class RedisScheduler(IScheduler):
    """
    Redis-based scheduler using sorted sets for delayed event processing.

    Events are stored in a Redis sorted set with their execution time as
    the score. A background loop periodically checks for events that are
    ready to be processed.

    Usage:
        scheduler = RedisScheduler(
            redis_url="redis://localhost:6379",
            logger=logger,
            config_service=config_service,
            delay_hours=1,
        )
        await scheduler.schedule_event(event_data)
    """

    def __init__(
        self,
        redis_url: str,
        logger: Logger,
        config_service: "ConfigurationService",
        delay_hours: int = 1,
    ) -> None:
        """
        Initialize the Redis scheduler.

        Args:
            redis_url: Redis connection URL.
            logger: Logger instance.
            config_service: Configuration service for JWT secrets.
            delay_hours: Default delay in hours for scheduled events.
        """
        self.redis = aioredis.from_url(redis_url)
        self.logger = logger
        self.config_service = config_service
        self.delay_hours = delay_hours
        self.scheduled_set = "scheduled_updates"
        self.processing_set = "processing_updates"

    async def generate_jwt(self, token_payload: dict) -> str:
        """
        Generate a JWT token using the jose library.

        Args:
            token_payload: The payload to include in the JWT.

        Returns:
            The generated JWT token string.

        Raises:
            ValueError: If JWT secret is not configured.
        """
        secret_keys = await self.config_service.get_config(
            ConfigPath.SECRET_KEYS.value
        )
        if not secret_keys:
            raise ValueError("SECRET_KEYS not configured")

        scoped_jwt_secret = secret_keys.get("scopedJwtSecret")
        if not scoped_jwt_secret:
            raise ValueError("scopedJwtSecret not configured")

        # Add standard claims if not present
        if "exp" not in token_payload:
            token_payload["exp"] = datetime.now(timezone.utc) + timedelta(hours=1)

        if "iat" not in token_payload:
            token_payload["iat"] = datetime.now(timezone.utc)

        return jwt.encode(token_payload, scoped_jwt_secret, algorithm="HS256")

    async def schedule_event(self, event_data: dict) -> None:
        """
        Schedule an update event for later processing.

        If an update for the same record already exists, it will be replaced.

        Args:
            event_data: Event data containing payload.recordId.

        Raises:
            ValueError: If event_data is missing recordId.
        """
        try:
            record_id = event_data.get('payload', {}).get('recordId')
            if not record_id:
                raise ValueError("Event data missing recordId")

            # Calculate execution time
            execution_time = datetime.now() + timedelta(hours=self.delay_hours)

            # Create event JSON with metadata
            event_json = json.dumps({
                'record_id': record_id,
                'scheduled_at': datetime.now().isoformat(),
                'event_data': event_data
            })

            # Remove any existing updates for this record
            existing_updates = await self.redis.zrangebyscore(
                self.scheduled_set, "-inf", "+inf"
            )
            for update in existing_updates:
                update_data = json.loads(update)
                if update_data.get('record_id') == record_id:
                    await self.redis.zrem(self.scheduled_set, update)
                    self.logger.info(
                        f"Removed existing scheduled update for record {record_id}"
                    )

            # Store new update
            await self.redis.zadd(
                self.scheduled_set,
                {event_json: execution_time.timestamp()}
            )

            self.logger.info(
                f"Scheduled update for record {record_id} at {execution_time}"
            )

        except Exception as e:
            self.logger.error(f"Failed to schedule update: {str(e)}")
            raise

    async def get_scheduled_events(self) -> List[dict]:
        """
        Get events that are ready for processing.

        Returns:
            List of event data dictionaries with execution time <= now.
        """
        try:
            current_time = datetime.now().timestamp()

            # Get events with scores less than current time
            events = await self.redis.zrangebyscore(
                self.scheduled_set, "-inf", current_time
            )

            return [json.loads(event)['event_data'] for event in events]

        except Exception as e:
            self.logger.error(f"Failed to get ready events: {str(e)}")
            return []

    async def remove_processed_event(self, event_data: dict) -> None:
        """
        Remove an event after processing.

        Args:
            event_data: Event data that was processed.
        """
        try:
            record_id = event_data.get('payload', {}).get('recordId')
            if not record_id:
                raise ValueError("Event data missing recordId")

            # Find and remove the event with matching record_id
            existing_updates = await self.redis.zrangebyscore(
                self.scheduled_set, "-inf", "+inf"
            )
            for update in existing_updates:
                update_data = json.loads(update)
                if update_data.get('record_id') == record_id:
                    await self.redis.zrem(self.scheduled_set, update)
                    self.logger.info(
                        f"Removed processed event for record {record_id}"
                    )
                    break

        except Exception as e:
            self.logger.error(f"Failed to remove processed event: {str(e)}")

    async def process_scheduled_events(self, event_processor: Any) -> None:
        """
        Process scheduled events in a continuous loop.

        This method runs indefinitely, checking every minute for events
        that are ready to be processed.

        Args:
            event_processor: Processor with on_event() and arango_service.
        """
        while True:
            try:
                ready_events = await self.get_scheduled_events()

                for event in ready_events:
                    try:
                        await self._process_single_event(event, event_processor)
                        await self.remove_processed_event(event)

                        self.logger.info(
                            f"Processed scheduled update for record "
                            f"{event.get('payload', {}).get('recordId')}"
                        )

                    except Exception as e:
                        self.logger.error(
                            f"Error processing scheduled update: {str(e)}"
                        )

                # Wait before next check
                await asyncio.sleep(60)

            except Exception as e:
                self.logger.error(f"Error in scheduled update processor: {str(e)}")
                await asyncio.sleep(60)

    async def _process_single_event(
        self,
        event: dict,
        event_processor: Any,
    ) -> None:
        """
        Process a single scheduled event.

        Args:
            event: Event data to process.
            event_processor: Processor to handle the event.
        """
        # Import here to avoid circular imports
        from libs.core.constants import ArangoCollection, ProgressStatus

        payload_data = event.get("payload", {})
        record_id = payload_data.get("recordId")
        extension = payload_data.get("extension", "unknown")
        mime_type = payload_data.get("mimeType", "unknown")

        if extension is None and mime_type != "text/gmail_content":
            extension = payload_data["recordName"].split(".")[-1]

        self.logger.info(
            f"Processing update for record {record_id} "
            f"Extension: {extension}, Mime Type: {mime_type}"
        )

        # Get record from database
        record = await event_processor.arango_service.get_document(
            record_id, ArangoCollection.RECORDS.value
        )
        if record is None:
            self.logger.error(f"Record {record_id} not found in database")
            return

        doc = dict(record)

        # Update status
        doc.update({
            "indexingStatus": ProgressStatus.IN_PROGRESS.value,
            "extractionStatus": ProgressStatus.IN_PROGRESS.value,
        })

        await event_processor.arango_service.batch_upsert_nodes(
            [doc], ArangoCollection.RECORDS.value
        )

        # Handle signed URL if present
        if payload_data and payload_data.get("signedUrlRoute"):
            try:
                payload = {
                    "orgId": payload_data["orgId"],
                    "scopes": ["storage:token"],
                }
                token = await self.generate_jwt(payload)
                self.logger.debug(f"Generated JWT token for record {record_id}")

                response = await make_api_call(
                    payload_data["signedUrlRoute"], token
                )
                self.logger.debug(
                    f"Received signed URL response for record {record_id}"
                )

                if response.get("is_json"):
                    signed_url = response["data"]["signedUrl"]
                    payload_data["signedUrl"] = signed_url
                else:
                    payload_data["buffer"] = response["data"]

                event["payload"] = payload_data
                await event_processor.on_event(event)

            except Exception as e:
                self.logger.error(f"Error processing signed URL: {str(e)}")
                raise

