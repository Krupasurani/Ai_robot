"""
Notification Handler for bridging Kafka events to WebSocket clients.
Listens to record-events topic and broadcasts updates to connected WebSocket clients.
"""

from logging import Logger
from typing import Any, Dict, Optional

from app.connectors.core.base.event_service.event_service import BaseEventService
from app.services.websocket import WebSocketManager
from libs.core.constants import EventTypes


class NotificationEventHandler(BaseEventService):
    """
    Handles Kafka record events and broadcasts them to WebSocket clients.

    Supported events:
    - newRecord: New record created
    - updateRecord: Record updated (content or metadata)
    - deleteRecord: Record deleted
    - reindexRecord: Record reindexed
    - statusChange: Record indexing status changed
    """

    def __init__(
        self,
        logger: Logger,
        websocket_manager: WebSocketManager,
    ) -> None:
        self.logger = logger
        self.websocket_manager = websocket_manager
        self.logger.info("NotificationEventHandler initialized")

    async def process_event(self, event_type: str, payload: dict) -> bool:
        """
        Process a Kafka event and broadcast it to relevant WebSocket clients.

        Args:
            event_type: The type of event (newRecord, updateRecord, etc.)
            payload: The event payload containing record details

        Returns:
            True if the event was processed successfully
        """
        try:
            self.logger.debug(f"Processing notification event: {event_type}")

            # Extract relevant information from payload
            record_id = payload.get("recordId") or payload.get("id")
            org_id = payload.get("orgId")
            kb_id = payload.get("kbId") or payload.get("knowledgeBaseId")
            payload.get("userId") or payload.get("createdBy")

            if not record_id:
                self.logger.warning(f"Missing recordId in event payload: {event_type}")
                return False

            if not org_id:
                self.logger.warning(f"Missing orgId in event payload for record {record_id}")
                # Try to continue without org filtering

            # Build notification payload
            notification_payload = self._build_notification_payload(event_type, payload)

            # Broadcast to connected clients
            sent_count = await self.websocket_manager.broadcast_record_event(
                event_type=event_type,
                record_id=record_id,
                org_id=org_id or "",
                kb_id=kb_id,
                payload=notification_payload
            )

            self.logger.info(
                f"📤 Broadcast {event_type} event for record {record_id} "
                f"to {sent_count} connections"
            )

            return True

        except Exception as e:
            self.logger.error(f"Error processing notification event: {e}")
            return False

    def _build_notification_payload(
        self,
        event_type: str,
        payload: dict
    ) -> Dict[str, Any]:
        """
        Build a clean notification payload for WebSocket clients.
        Removes sensitive or unnecessary fields.

        Args:
            event_type: The event type
            payload: The raw Kafka payload

        Returns:
            Cleaned payload for frontend
        """
        # Common fields to include
        notification = {
            "recordId": payload.get("recordId") or payload.get("id"),
            "recordName": payload.get("recordName") or payload.get("name"),
            "kbId": payload.get("kbId") or payload.get("knowledgeBaseId"),
            "folderId": payload.get("folderId") or payload.get("parentFolderId"),
        }

        # Add status information for status-related events
        if event_type in [
            EventTypes.NEW_RECORD.value,
            EventTypes.UPDATE_RECORD.value,
            EventTypes.REINDEX_RECORD.value,
            "statusChange"
        ]:
            notification["indexingStatus"] = payload.get("indexingStatus")
            notification["processingStatus"] = payload.get("processingStatus")
            notification["progressStatus"] = payload.get("progressStatus")

        # Add record type info
        notification["recordType"] = payload.get("recordType")
        notification["connectorName"] = payload.get("connectorName")
        notification["origin"] = payload.get("origin")

        # Add file info if available
        if payload.get("extension"):
            notification["extension"] = payload.get("extension")
        if payload.get("mimeType"):
            notification["mimeType"] = payload.get("mimeType")
        if payload.get("sizeInBytes"):
            notification["sizeInBytes"] = payload.get("sizeInBytes")

        # Add timestamps
        notification["updatedAtTimestamp"] = payload.get("updatedAtTimestamp")
        notification["createdAtTimestamp"] = payload.get("createdAtTimestamp")

        # Remove None values
        notification = {k: v for k, v in notification.items() if v is not None}

        return notification

    async def handle_status_change(
        self,
        record_id: str,
        org_id: str,
        kb_id: Optional[str],
        old_status: str,
        new_status: str,
        additional_payload: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Helper method to broadcast a status change event.
        Can be called directly from other services when record status changes.

        Args:
            record_id: The record ID
            org_id: The organization ID
            kb_id: The knowledge base ID (optional)
            old_status: Previous indexing status
            new_status: New indexing status
            additional_payload: Additional data to include

        Returns:
            True if broadcast was successful
        """
        payload = {
            "recordId": record_id,
            "oldStatus": old_status,
            "newStatus": new_status,
            "indexingStatus": new_status,
            **(additional_payload or {})
        }

        sent_count = await self.websocket_manager.broadcast_record_event(
            event_type="statusChange",
            record_id=record_id,
            org_id=org_id,
            kb_id=kb_id,
            payload=payload
        )

        self.logger.debug(
            f"📤 Broadcast statusChange ({old_status} -> {new_status}) "
            f"for record {record_id} to {sent_count} connections"
        )

        return sent_count > 0

