"""
WebSocket Manager for handling real-time connections.
Manages active WebSocket connections mapped by user_id and org_id.
"""

import asyncio
from dataclasses import dataclass, field
from datetime import datetime
from logging import Logger
from typing import Any, Dict, Optional, Set

from fastapi import WebSocket


@dataclass
class ConnectionInfo:
    """Information about a connected WebSocket client."""
    websocket: WebSocket
    user_id: str
    org_id: str
    connected_at: datetime = field(default_factory=datetime.utcnow)
    subscriptions: Set[str] = field(default_factory=set)


class WebSocketManager:
    """
    Manages WebSocket connections and message broadcasting.

    Supports:
    - Connection management by user_id and org_id
    - Subscription-based message filtering (e.g., subscribe to specific KB)
    - Broadcast to all users in an org
    - Send to specific user
    """

    def __init__(self, logger: Logger) -> None:
        self.logger = logger
        # Map: connection_id -> ConnectionInfo
        self._connections: Dict[str, ConnectionInfo] = {}
        # Map: user_id -> Set of connection_ids (user can have multiple tabs)
        self._user_connections: Dict[str, Set[str]] = {}
        # Map: org_id -> Set of connection_ids
        self._org_connections: Dict[str, Set[str]] = {}
        # Lock for thread-safe operations
        self._lock = asyncio.Lock()
        self.logger.info("WebSocketManager initialized")

    def _generate_connection_id(self, user_id: str) -> str:
        """Generate a unique connection ID."""
        import uuid
        return f"{user_id}_{uuid.uuid4().hex[:8]}"

    async def connect(
        self,
        websocket: WebSocket,
        user_id: str,
        org_id: str,
        subscriptions: Optional[Set[str]] = None
    ) -> str:
        """
        Register a new WebSocket connection.

        Args:
            websocket: The WebSocket connection
            user_id: The user's ID
            org_id: The organization's ID
            subscriptions: Optional set of subscription topics (e.g., KB IDs)

        Returns:
            The unique connection ID
        """
        await websocket.accept()
        connection_id = self._generate_connection_id(user_id)

        async with self._lock:
            # Create connection info
            connection_info = ConnectionInfo(
                websocket=websocket,
                user_id=user_id,
                org_id=org_id,
                subscriptions=subscriptions or set()
            )

            # Store connection
            self._connections[connection_id] = connection_info

            # Add to user connections
            if user_id not in self._user_connections:
                self._user_connections[user_id] = set()
            self._user_connections[user_id].add(connection_id)

            # Add to org connections
            if org_id not in self._org_connections:
                self._org_connections[org_id] = set()
            self._org_connections[org_id].add(connection_id)

        self.logger.info(
            f"WebSocket connected: user={user_id}, org={org_id}, "
            f"connection_id={connection_id}, total_connections={len(self._connections)}"
        )

        # Send welcome message
        await self.send_to_connection(connection_id, {
            "type": "connected",
            "connection_id": connection_id,
            "timestamp": datetime.utcnow().isoformat()
        })

        return connection_id

    async def disconnect(self, connection_id: str) -> None:
        """
        Remove a WebSocket connection.

        Args:
            connection_id: The connection ID to remove
        """
        async with self._lock:
            if connection_id not in self._connections:
                return

            connection_info = self._connections[connection_id]
            user_id = connection_info.user_id
            org_id = connection_info.org_id

            # Remove from user connections
            if user_id in self._user_connections:
                self._user_connections[user_id].discard(connection_id)
                if not self._user_connections[user_id]:
                    del self._user_connections[user_id]

            # Remove from org connections
            if org_id in self._org_connections:
                self._org_connections[org_id].discard(connection_id)
                if not self._org_connections[org_id]:
                    del self._org_connections[org_id]

            # Remove connection
            del self._connections[connection_id]

        self.logger.info(
            f"WebSocket disconnected: user={user_id}, connection_id={connection_id}, "
            f"total_connections={len(self._connections)}"
        )

    async def subscribe(self, connection_id: str, topic: str) -> bool:
        """
        Subscribe a connection to a topic (e.g., a KB ID).

        Args:
            connection_id: The connection ID
            topic: The topic to subscribe to

        Returns:
            True if subscription was successful
        """
        async with self._lock:
            if connection_id not in self._connections:
                return False
            self._connections[connection_id].subscriptions.add(topic)

        self.logger.debug(f"Connection {connection_id} subscribed to topic: {topic}")
        return True

    async def unsubscribe(self, connection_id: str, topic: str) -> bool:
        """
        Unsubscribe a connection from a topic.

        Args:
            connection_id: The connection ID
            topic: The topic to unsubscribe from

        Returns:
            True if unsubscription was successful
        """
        async with self._lock:
            if connection_id not in self._connections:
                return False
            self._connections[connection_id].subscriptions.discard(topic)

        self.logger.debug(f"Connection {connection_id} unsubscribed from topic: {topic}")
        return True

    async def send_to_connection(self, connection_id: str, message: Dict[str, Any]) -> bool:
        """
        Send a message to a specific connection.

        Args:
            connection_id: The connection ID
            message: The message to send

        Returns:
            True if message was sent successfully
        """
        if connection_id not in self._connections:
            return False

        try:
            websocket = self._connections[connection_id].websocket
            await websocket.send_json(message)
            return True
        except Exception as e:
            self.logger.warning(f"Failed to send to connection {connection_id}: {e}")
            # Connection might be dead, clean it up
            await self.disconnect(connection_id)
            return False

    async def send_to_user(self, user_id: str, message: Dict[str, Any]) -> int:
        """
        Send a message to all connections of a specific user.

        Args:
            user_id: The user's ID
            message: The message to send

        Returns:
            Number of connections the message was sent to
        """
        connection_ids = self._user_connections.get(user_id, set()).copy()
        sent_count = 0

        for connection_id in connection_ids:
            if await self.send_to_connection(connection_id, message):
                sent_count += 1

        return sent_count

    async def broadcast_to_org(self, org_id: str, message: Dict[str, Any]) -> int:
        """
        Broadcast a message to all connections in an organization.

        Args:
            org_id: The organization's ID
            message: The message to send

        Returns:
            Number of connections the message was sent to
        """
        connection_ids = self._org_connections.get(org_id, set()).copy()
        sent_count = 0

        for connection_id in connection_ids:
            if await self.send_to_connection(connection_id, message):
                sent_count += 1

        self.logger.debug(f"Broadcast to org {org_id}: sent to {sent_count}/{len(connection_ids)} connections")
        return sent_count

    async def broadcast_to_topic(
        self,
        topic: str,
        message: Dict[str, Any],
        org_id: Optional[str] = None
    ) -> int:
        """
        Broadcast a message to all connections subscribed to a topic.
        Optionally filter by org_id.

        Args:
            topic: The topic (e.g., KB ID)
            message: The message to send
            org_id: Optional org filter

        Returns:
            Number of connections the message was sent to
        """
        sent_count = 0

        async with self._lock:
            # Get relevant connections
            if org_id:
                connection_ids = self._org_connections.get(org_id, set()).copy()
            else:
                connection_ids = set(self._connections.keys())

        for connection_id in connection_ids:
            connection_info = self._connections.get(connection_id)
            if connection_info and topic in connection_info.subscriptions:
                if await self.send_to_connection(connection_id, message):
                    sent_count += 1

        self.logger.debug(f"Broadcast to topic {topic}: sent to {sent_count} connections")
        return sent_count

    async def broadcast_record_event(
        self,
        event_type: str,
        record_id: str,
        org_id: str,
        kb_id: Optional[str] = None,
        payload: Optional[Dict[str, Any]] = None
    ) -> int:
        """
        Broadcast a record event to relevant subscribers.

        Args:
            event_type: Type of event (newRecord, updateRecord, deleteRecord, statusChange)
            record_id: The record ID
            org_id: The organization ID
            kb_id: Optional KB ID for topic-based routing
            payload: Additional event payload

        Returns:
            Number of connections notified
        """
        message = {
            "type": "record_event",
            "event_type": event_type,
            "record_id": record_id,
            "kb_id": kb_id,
            "timestamp": datetime.utcnow().isoformat(),
            "payload": payload or {}
        }

        # If KB ID is provided, broadcast to topic subscribers within the org
        if kb_id:
            # First send to topic subscribers
            topic_count = await self.broadcast_to_topic(kb_id, message, org_id)
            # Also send to org for users who might be browsing without specific subscription
            org_count = await self.broadcast_to_org(org_id, message)
            return max(topic_count, org_count)  # Deduplicate count
        else:
            # Broadcast to entire org
            return await self.broadcast_to_org(org_id, message)

    def get_connection_count(self) -> int:
        """Get total number of active connections."""
        return len(self._connections)

    def get_user_connection_count(self, user_id: str) -> int:
        """Get number of connections for a specific user."""
        return len(self._user_connections.get(user_id, set()))

    def get_org_connection_count(self, org_id: str) -> int:
        """Get number of connections for a specific organization."""
        return len(self._org_connections.get(org_id, set()))

    def get_stats(self) -> Dict[str, Any]:
        """Get statistics about current connections."""
        return {
            "total_connections": len(self._connections),
            "unique_users": len(self._user_connections),
            "unique_orgs": len(self._org_connections),
        }

