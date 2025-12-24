"""
JWT Utilities - JWT token generation and validation.

This module provides utilities for working with JWT tokens:
    - generate_jwt: Create new JWT tokens.
    - is_jwt_expired: Check if a token is expired.
    - decode_jwt_payload: Decode JWT payload without verification.
"""

import base64
import json
from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING, Any, Dict, Optional

from jose import jwt

from libs.core.constants import ConfigPath

if TYPE_CHECKING:
    from libs.core.config import ConfigurationService


def is_jwt_expired(token: str) -> bool:
    """
    Check if JWT token is expired.

    This function decodes the token without verification to check
    the expiration claim.

    Args:
        token: JWT token string.

    Returns:
        True if token is expired or invalid, False otherwise.
    """
    if not token:
        return True

    # Split the JWT token into its parts
    TOKEN_PARTS = 3
    parts = token.split('.')
    if len(parts) != TOKEN_PARTS:
        return True

    # Decode the payload (second part)
    payload = parts[1]

    # Add padding if necessary
    padding = len(payload) % 4
    if padding:
        payload += '=' * (4 - padding)

    try:
        # Decode base64
        decoded_payload = base64.urlsafe_b64decode(payload)
        payload_data = json.loads(decoded_payload)

        # Check if 'exp' claim exists
        if 'exp' not in payload_data:
            return True

        # Get current timestamp
        current_time = datetime.utcnow().timestamp()

        # Check if token is expired
        return payload_data['exp'] < current_time

    except (ValueError, json.JSONDecodeError):
        return True


def decode_jwt_payload(token: str) -> Optional[Dict[str, Any]]:
    """
    Decode JWT payload without verification.

    This is useful for inspecting token contents without having
    the secret key.

    Args:
        token: JWT token string.

    Returns:
        Decoded payload dictionary, or None if invalid.
    """
    if not token:
        return None

    parts = token.split('.')
    if len(parts) != 3:
        return None

    payload = parts[1]

    # Add padding if necessary
    padding = len(payload) % 4
    if padding:
        payload += '=' * (4 - padding)

    try:
        decoded_payload = base64.urlsafe_b64decode(payload)
        return json.loads(decoded_payload)
    except (ValueError, json.JSONDecodeError):
        return None


async def generate_jwt(
    config_service: "ConfigurationService",
    token_payload: Dict[str, Any],
    expiration_hours: int = 1,
) -> str:
    """
    Generate a JWT token using the jose library.

    Args:
        config_service: Configuration service to get JWT secret.
        token_payload: The payload to include in the JWT.
        expiration_hours: Token expiration time in hours (default: 1).

    Returns:
        The generated JWT token string.

    Raises:
        ValueError: If JWT secret is not configured.
    """
    # Get the JWT secret from configuration
    secret_keys = await config_service.get_config(ConfigPath.SECRET_KEYS.value)
    if not secret_keys:
        raise ValueError("SECRET_KEYS not configured")

    scoped_jwt_secret = secret_keys.get("scopedJwtSecret")
    if not scoped_jwt_secret:
        raise ValueError("scopedJwtSecret not configured")

    # Add standard claims if not present
    if "exp" not in token_payload:
        token_payload["exp"] = datetime.now(timezone.utc) + timedelta(
            hours=expiration_hours
        )

    if "iat" not in token_payload:
        token_payload["iat"] = datetime.now(timezone.utc)

    # Generate the JWT token
    return jwt.encode(token_payload, scoped_jwt_secret, algorithm="HS256")

