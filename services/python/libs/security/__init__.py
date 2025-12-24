"""
Security Library - JWT, OAuth, and signed URL utilities.

This module provides security-related utilities for authentication
and authorization:
    - JWT: Token generation, validation, and expiry checking.
    - OAuth: OAuth configuration helpers.
    - SignedURL: Signed URL generation and validation.

Usage:
    from libs.security import generate_jwt, is_jwt_expired, SignedUrlHandler

    # Generate JWT
    token = await generate_jwt(config_service, {"user_id": "123"})

    # Check expiry
    if is_jwt_expired(token):
        # Token is expired
        pass

    # Create signed URL
    handler = SignedUrlHandler(logger, config, config_service)
    url = await handler.get_signed_url(record_id, org_id, user_id)
"""

from libs.security.jwt import (
    decode_jwt_payload,
    generate_jwt,
    is_jwt_expired,
)
from libs.security.oauth import (
    OAuthConfig,
    get_oauth_config,
)
from libs.security.signed_url import (
    SignedUrlConfig,
    SignedUrlHandler,
    TokenPayload,
)

__all__ = [
    # JWT
    "generate_jwt",
    "is_jwt_expired",
    "decode_jwt_payload",
    # OAuth
    "OAuthConfig",
    "get_oauth_config",
    # Signed URL
    "SignedUrlConfig",
    "SignedUrlHandler",
    "TokenPayload",
]

