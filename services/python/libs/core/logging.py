"""
Logging Module - Standardized logger creation for all services.

This module provides a consistent logging interface across all backend services,
with both file and console output handlers, configurable log levels, and
cross-platform compatibility (including Windows UTF-8 support).

Usage:
    from libs.core.logging import create_logger

    logger = create_logger("my_service")
    logger.info("Service started")
    logger.error("Something went wrong", exc_info=True)

Configuration:
    - LOG_LEVEL: Environment variable to set log level (default: "info").
                 Supported values: "debug", "info", "warning", "error", "critical".
    - Log files are stored in the "logs/" directory relative to the working directory.
"""

import logging
import os
import sys
from typing import Optional

# Ensure log directory exists at module load time
LOG_DIR = "logs"
os.makedirs(LOG_DIR, exist_ok=True)

# Force UTF-8 for stdout/stderr on Windows platforms
if sys.platform == "win32":
    try:
        import ctypes
        kernel32 = ctypes.windll.kernel32
        kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
        sys.stdout.reconfigure(encoding="utf-8")  # type: ignore
        sys.stderr.reconfigure(encoding="utf-8")  # type: ignore
    except Exception:
        pass  # Silently ignore if Windows console configuration fails

# Configure base logging settings (applies to root logger)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s",
    encoding="utf-8",
)


def create_logger(
    service_name: str,
    log_level: Optional[str] = None,
    log_dir: str = LOG_DIR,
) -> logging.Logger:
    """
    Create a logger instance for a specific service.

    Creates a logger with both file and console handlers, using a standardized
    format that includes timestamps, service name, log level, filename, and
    line numbers for easier debugging.

    Args:
        service_name: The name of the service (used for logger name and log file).
        log_level: Optional log level override. If not provided, uses LOG_LEVEL
                   environment variable or defaults to "info".
        log_dir: Directory to store log files. Defaults to "logs/".

    Returns:
        logging.Logger: Configured logger instance for the service.

    Example:
        >>> logger = create_logger("query_service")
        >>> logger.info("Query service started")
        2024-01-15 10:30:00 - query_service - INFO - [main.py:42] - Query service started

        >>> logger = create_logger("indexing_service", log_level="debug")
        >>> logger.debug("Debug message visible")
    """
    # Determine log level from argument, environment, or default
    if log_level is None:
        log_level = os.getenv("LOG_LEVEL", "info").lower()

    # Map string log level to logging constant
    level_mapping = {
        "debug": logging.DEBUG,
        "info": logging.INFO,
        "warning": logging.WARNING,
        "error": logging.ERROR,
        "critical": logging.CRITICAL,
    }
    numeric_level = level_mapping.get(log_level, logging.INFO)

    # Create logger instance
    logger = logging.getLogger(service_name)
    logger.setLevel(numeric_level)

    # Prevent duplicate handlers if logger already configured
    if logger.handlers:
        return logger

    # Define log format with detailed context
    log_format = (
        "%(asctime)s - %(name)s - %(levelname)s - "
        "[%(filename)s:%(lineno)d] - %(message)s"
    )
    formatter = logging.Formatter(log_format)

    # Ensure log directory exists
    os.makedirs(log_dir, exist_ok=True)

    # File handler - writes to service-specific log file
    file_handler = logging.FileHandler(
        os.path.join(log_dir, f"{service_name}.log"),
        encoding="utf-8",
    )
    file_handler.setLevel(numeric_level)
    file_handler.setFormatter(formatter)

    # Console handler - writes to stdout
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(numeric_level)
    console_handler.setFormatter(formatter)

    # Add handlers to logger
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)

    # Prevent propagation to root logger (avoid duplicate logs)
    logger.propagate = False

    return logger

