"""
Environment File Provider - Feature flag provider using .env files.

This module provides a feature flag provider that reads flags from .env files.
Useful for development and simple deployments.
"""

import os
from typing import Dict, Optional

from libs.core.featureflag.interface import IConfigProvider
from libs.core.logging import create_logger

logger = create_logger("featureflag.env")


class EnvFileProvider(IConfigProvider):
    """
    Provider that reads feature flags from .env file.

    This provider implements the Single Responsibility Principle - it only
    handles .env file reading and parsing.

    Usage:
        provider = EnvFileProvider("/path/to/.env")
        value = provider.get_flag_value("ENABLE_FEATURE")
    """

    def __init__(self, env_file_path: str) -> None:
        """
        Initialize the provider with path to .env file.

        Args:
            env_file_path: Path to the .env file to read.
        """
        self.env_file_path = env_file_path
        self._flags: Dict[str, bool] = {}
        self._load_env_file()

    def _load_env_file(self) -> None:
        """Load and parse .env file."""
        if not os.path.exists(self.env_file_path):
            logger.warning("Warning: .env file not found at %s", self.env_file_path)
            return

        try:
            with open(self.env_file_path, 'r') as f:
                for line in f:
                    line = line.strip()

                    # Skip empty lines and comments
                    if not line or line.startswith('#'):
                        continue

                    # Parse key=value pairs
                    if '=' in line:
                        key, value = line.split('=', 1)
                        key = key.strip().upper()  # Normalize to uppercase
                        value = value.strip()

                        # Store boolean value
                        self._flags[key] = self._parse_bool(value)
        except IOError as e:
            logger.error("Error loading .env file: %s", e)

    def _parse_bool(self, value: str) -> bool:
        """
        Parse string value to boolean.

        Args:
            value: String value to parse.

        Returns:
            True if value represents a truthy value.
        """
        return value.lower() in ('true', '1', 'yes', 'on', 'enabled')

    def get_flag_value(self, flag_name: str) -> Optional[bool]:
        """
        Get flag value by name.

        Args:
            flag_name: Name of the flag (case-insensitive).

        Returns:
            Boolean value of the flag, or None if not found.
        """
        return self._flags.get(flag_name.upper())

    async def refresh(self) -> None:
        """Reload .env file."""
        self._flags.clear()
        self._load_env_file()

