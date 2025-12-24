"""
Encryption Module - AES-256-GCM encryption service for sensitive data.

This module provides encryption and decryption capabilities for sensitive
configuration values stored in ETCD or other key-value stores. It uses
AES-256-GCM (Galois/Counter Mode) for authenticated encryption.

Usage:
    from libs.core.encryption import EncryptionService

    service = EncryptionService.get_instance(secret_key_hex, logger)
    encrypted = service.encrypt("sensitive_data")
    decrypted = service.decrypt(encrypted)

Security Notes:
    - Uses 12-byte random IV for each encryption (recommended for GCM).
    - Includes 16-byte authentication tag for integrity verification.
    - Secret key must be 32 bytes (256 bits) in hexadecimal format.
"""

import logging
import os
from typing import Optional

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


class EncryptionError(Exception):
    """
    Exception raised when encryption fails.

    Attributes:
        message: Description of the encryption failure.
        detail: Optional additional details about the error.
    """

    def __init__(self, message: str, detail: Optional[str] = None) -> None:
        full_message = f"{message}: {detail}" if detail else message
        super().__init__(full_message)
        self.message = message
        self.detail = detail


class DecryptionError(Exception):
    """
    Exception raised when decryption fails.

    This typically occurs when:
    - The encrypted data is corrupted or tampered with.
    - The wrong encryption key is used.
    - The encrypted format is invalid.

    Attributes:
        message: Description of the decryption failure.
        detail: Optional additional details about the error.
    """

    def __init__(self, message: str, detail: Optional[str] = None) -> None:
        full_message = f"{message}: {detail}" if detail else message
        super().__init__(full_message)
        self.message = message
        self.detail = detail


class InvalidKeyFormatError(Exception):
    """
    Exception raised when the encryption key format is invalid.

    The key must be a valid hexadecimal string representing 32 bytes.
    """

    def __init__(self, message: str) -> None:
        super().__init__(message)


# Expected number of parts in encrypted string format: "iv:ciphertext:authTag"
EXPECTED_ENCRYPTED_PARTS = 3


class EncryptionService:
    """
    Singleton encryption service using AES-256-GCM.

    This service provides authenticated encryption/decryption for sensitive
    data. It uses a singleton pattern to ensure consistent key usage across
    the application.

    Attributes:
        algorithm: The encryption algorithm (always "aes-256-gcm").
        secret_key: The 32-byte encryption key in hexadecimal format.

    Example:
        >>> logger = create_logger("encryption")
        >>> service = EncryptionService.get_instance(hex_key, logger)
        >>> encrypted = service.encrypt("my_secret_value")
        >>> print(encrypted)
        "a1b2c3...:d4e5f6...:g7h8i9..."
        >>> decrypted = service.decrypt(encrypted)
        >>> print(decrypted)
        "my_secret_value"
    """

    _instance: Optional["EncryptionService"] = None

    def __init__(
        self,
        algorithm: str,
        secret_key: str,
        logger: logging.Logger,
    ) -> None:
        """
        Initialize the encryption service.

        Note: Use get_instance() instead of direct instantiation.

        Args:
            algorithm: Encryption algorithm (should be "aes-256-gcm").
            secret_key: 32-byte key as hexadecimal string.
            logger: Logger instance for error reporting.
        """
        self.algorithm = algorithm
        self.secret_key = secret_key
        self.logger = logger

    @classmethod
    def get_instance(
        cls,
        algorithm: str,
        secret_key: str,
        logger: logging.Logger,
    ) -> "EncryptionService":
        """
        Get or create the singleton encryption service instance.

        Args:
            algorithm: Encryption algorithm (e.g., "aes-256-gcm").
            secret_key: 32-byte encryption key as hexadecimal string.
            logger: Logger instance for error reporting.

        Returns:
            The singleton EncryptionService instance.

        Example:
            >>> service = EncryptionService.get_instance("aes-256-gcm", hex_key, logger)
        """
        if cls._instance is None:
            cls._instance = EncryptionService(algorithm, secret_key, logger)
        return cls._instance

    @classmethod
    def reset_instance(cls) -> None:
        """
        Reset the singleton instance.

        This is primarily useful for testing or when the encryption key
        needs to be changed.
        """
        cls._instance = None

    def encrypt(self, plaintext: str) -> str:
        """
        Encrypt a plaintext string using AES-256-GCM.

        Args:
            plaintext: The string to encrypt.

        Returns:
            Encrypted string in format "iv:ciphertext:authTag" (all hex-encoded).

        Raises:
            EncryptionError: If encryption fails for any reason.

        Example:
            >>> encrypted = service.encrypt("sensitive_password")
            >>> print(encrypted)
            "a1b2c3d4e5f6...:78901234...:abcdef..."
        """
        try:
            # Generate random 12-byte IV (recommended for GCM)
            iv = os.urandom(12)

            # Convert hex key to bytes
            key = bytes.fromhex(self.secret_key)

            # Create AESGCM cipher
            aesgcm = AESGCM(key)

            # Encrypt (returns ciphertext + 16-byte auth tag)
            encrypted = aesgcm.encrypt(iv, plaintext.encode("utf-8"), None)

            # Split ciphertext and authentication tag
            ciphertext = encrypted[:-16]
            auth_tag = encrypted[-16:]

            # Return as "iv:ciphertext:authTag" format
            return f"{iv.hex()}:{ciphertext.hex()}:{auth_tag.hex()}"

        except Exception as e:
            self.logger.error("Encryption failed", exc_info=True)
            raise EncryptionError("Encryption failed", str(e))

    def decrypt(self, encrypted_text: str) -> str:
        """
        Decrypt an encrypted string using AES-256-GCM.

        Args:
            encrypted_text: Encrypted string in "iv:ciphertext:authTag" format.

        Returns:
            The decrypted plaintext string.

        Raises:
            DecryptionError: If decryption fails (wrong key, corrupted data, etc.).
            InvalidKeyFormatError: If the encrypted text format is invalid.

        Example:
            >>> decrypted = service.decrypt("a1b2c3...:d4e5f6...:g7h8i9...")
            >>> print(decrypted)
            "sensitive_password"
        """
        if encrypted_text is None:
            raise DecryptionError("Decryption failed, encrypted text is None")

        try:
            # Parse "iv:ciphertext:authTag" format
            parts = encrypted_text.split(":")
            if len(parts) != EXPECTED_ENCRYPTED_PARTS:
                raise InvalidKeyFormatError(
                    "Invalid encrypted text format; expected format iv:ciphertext:authTag"
                )

            iv_hex, ciphertext_hex, auth_tag_hex = parts

            # Convert hex strings to bytes
            iv = bytes.fromhex(iv_hex)
            ciphertext = bytes.fromhex(ciphertext_hex)
            auth_tag = bytes.fromhex(auth_tag_hex)
            key = bytes.fromhex(self.secret_key)

            # Recombine ciphertext and auth tag for AESGCM
            combined = ciphertext + auth_tag

            # Decrypt
            aesgcm = AESGCM(key)
            decrypted = aesgcm.decrypt(iv, combined, None)

            return decrypted.decode("utf-8")

        except InvalidKeyFormatError:
            raise
        except Exception as e:
            self.logger.error("Decryption failed", exc_info=True)
            raise DecryptionError(
                "Decryption failed, could be due to different encryption algorithm or secret key",
                str(e),
            )

