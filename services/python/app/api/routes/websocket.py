"""
WebSocket route for real-time notifications.
Handles WebSocket connections with JWT authentication.
"""

import os
from logging import Logger
from typing import Optional, Set

from fastapi import APIRouter, Query, Request, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt

from app.services.websocket import WebSocketManager
from libs.core.config import ConfigurationService
from libs.core.constants import ConfigPath as config_node_constants

router = APIRouter(prefix="/ws", tags=["websocket"])


async def validate_websocket_token(
    websocket: WebSocket,
    config_service: ConfigurationService,
    logger: Logger
) -> Optional[dict]:
    """
    Validate JWT token from WebSocket query params.

    Args:
        websocket: The WebSocket connection
        config_service: Configuration service for getting secrets
        logger: Logger instance

    Returns:
        Decoded JWT payload if valid, None otherwise
    """
    try:
        # Get token from query params
        token = websocket.query_params.get("token")

        if not token:
            logger.warning("WebSocket connection attempt without token")
            return None

        # Get JWT secret
        secret_keys = await config_service.get_config(
            config_node_constants.SECRET_KEYS.value
        )
        jwt_secret = secret_keys.get("jwtSecret")
        algorithm = os.environ.get("JWT_ALGORITHM", "HS256")

        if not jwt_secret:
            logger.error("Missing JWT secret in configuration")
            return None

        # Decode and validate token
        payload = jwt.decode(token, jwt_secret, algorithms=[algorithm])
        logger.debug(f"WebSocket token validated for user: {payload.get('userId')}")
        return payload

    except JWTError as e:
        logger.warning(f"WebSocket JWT validation failed: {e}")
        return None
    except Exception as e:
        logger.error(f"WebSocket authentication error: {e}")
        return None


@router.websocket("/notifications")
async def websocket_notifications(
    websocket: WebSocket,
    subscriptions: Optional[str] = Query(None, description="Comma-separated KB IDs to subscribe to"),
):
    """
    WebSocket endpoint for real-time notifications.

    Query Parameters:
        - token: JWT authentication token (required)
        - subscriptions: Comma-separated list of KB IDs to subscribe to (optional)

    Message Types Received:
        - subscribe: {"action": "subscribe", "topic": "kb_id"}
        - unsubscribe: {"action": "unsubscribe", "topic": "kb_id"}
        - ping: {"action": "ping"}

    Message Types Sent:
        - connected: Initial connection confirmation
        - record_event: Record status updates (newRecord, updateRecord, deleteRecord, statusChange)
        - pong: Response to ping
        - error: Error messages
    """
    # Get services from app state
    app = websocket.app
    logger: Logger = app.container.logger()
    config_service: ConfigurationService = app.container.config_service()
    ws_manager: WebSocketManager = app.state.websocket_manager

    # Validate authentication
    user_payload = await validate_websocket_token(websocket, config_service, logger)

    if not user_payload:
        await websocket.close(code=4001, reason="Authentication failed")
        return

    user_id = user_payload.get("userId")
    org_id = user_payload.get("orgId")

    if not user_id or not org_id:
        await websocket.close(code=4002, reason="Invalid token payload")
        return

    # Parse initial subscriptions
    initial_subscriptions: Set[str] = set()
    if subscriptions:
        initial_subscriptions = set(s.strip() for s in subscriptions.split(",") if s.strip())

    # Connect to WebSocket manager
    connection_id = await ws_manager.connect(
        websocket=websocket,
        user_id=user_id,
        org_id=org_id,
        subscriptions=initial_subscriptions
    )

    try:
        while True:
            # Wait for messages from client
            data = await websocket.receive_json()

            action = data.get("action")

            if action == "ping":
                await ws_manager.send_to_connection(connection_id, {
                    "type": "pong",
                    "timestamp": data.get("timestamp")
                })

            elif action == "subscribe":
                topic = data.get("topic")
                if topic:
                    success = await ws_manager.subscribe(connection_id, topic)
                    await ws_manager.send_to_connection(connection_id, {
                        "type": "subscription_result",
                        "action": "subscribe",
                        "topic": topic,
                        "success": success
                    })
                else:
                    await ws_manager.send_to_connection(connection_id, {
                        "type": "error",
                        "message": "Missing topic for subscription"
                    })

            elif action == "unsubscribe":
                topic = data.get("topic")
                if topic:
                    success = await ws_manager.unsubscribe(connection_id, topic)
                    await ws_manager.send_to_connection(connection_id, {
                        "type": "subscription_result",
                        "action": "unsubscribe",
                        "topic": topic,
                        "success": success
                    })
                else:
                    await ws_manager.send_to_connection(connection_id, {
                        "type": "error",
                        "message": "Missing topic for unsubscription"
                    })

            else:
                logger.debug(f"Unknown WebSocket action: {action}")

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: user={user_id}, connection_id={connection_id}")
    except Exception as e:
        logger.error(f"WebSocket error for connection {connection_id}: {e}")
    finally:
        await ws_manager.disconnect(connection_id)


@router.get("/stats")
async def get_websocket_stats(request: Request):
    """
    Get WebSocket connection statistics.
    This endpoint is useful for monitoring.
    """
    ws_manager: WebSocketManager = request.app.state.websocket_manager
    if ws_manager:
        return ws_manager.get_stats()
    return {"error": "WebSocket manager not initialized"}

