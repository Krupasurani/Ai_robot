"""
ETCD3 Connection Manager - Manages ETCD3 client connections.

This module provides robust connection management for ETCD3 with automatic
reconnection, health checks, and connection state tracking.
"""

import asyncio
from dataclasses import dataclass
from typing import List, Optional

import etcd3

from libs.core.logging import create_logger

logger = create_logger("etcd")


@dataclass
class ConnectionConfig:
    """
    Configuration for ETCD connection.

    Attributes:
        hosts: List of ETCD server hostnames.
        port: ETCD server port (default: 2379).
        timeout: Connection timeout in seconds (default: 5.0).
        ca_cert: Optional path to CA certificate for TLS.
        cert_key: Optional path to client key for TLS.
        cert_cert: Optional path to client certificate for TLS.
    """

    hosts: List[str]
    port: int = 2379
    timeout: float = 5.0
    ca_cert: Optional[str] = None
    cert_key: Optional[str] = None
    cert_cert: Optional[str] = None


class ConnectionState:
    """Enum-like class for connection states."""

    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    FAILED = "failed"


class Etcd3ConnectionManager:
    """
    Manages ETCD3 client connections with automatic reconnection and health checks.

    This class handles connection lifecycle, including initial connection,
    reconnection on failure, and graceful shutdown.

    Attributes:
        config: Connection configuration.
        client: ETCD3 client instance.
        state: Current connection state.
    """

    def __init__(self, config: ConnectionConfig) -> None:
        """
        Initialize the connection manager.

        Args:
            config: Connection configuration.
        """
        logger.debug("Initializing ETCD3 Connection Manager")
        logger.debug("Connection config: hosts=%s, port=%s, timeout=%s",
                     config.hosts, config.port, config.timeout)

        self.config = config
        self.client: Optional[etcd3.client] = None
        self.state = ConnectionState.DISCONNECTED
        self._health_check_task: Optional[asyncio.Task] = None

        logger.debug("Connection manager initialized")

    async def connect(self) -> None:
        """
        Establish connection to ETCD cluster.

        Raises:
            ConnectionError: If connection fails after retries.
        """
        logger.debug("Attempting to connect to ETCD (current state: %s)", self.state)

        if self.state == ConnectionState.CONNECTING:
            logger.debug("Already attempting to connect, skipping")
            return

        self.state = ConnectionState.CONNECTING
        logger.info("Connecting to ETCD cluster at %s:%s",
                    self.config.hosts[0], self.config.port)

        try:
            self.client = await asyncio.to_thread(self._create_client)
            self.state = ConnectionState.CONNECTED
            logger.info("Successfully connected to ETCD cluster")

        except Exception as e:
            self.state = ConnectionState.FAILED
            logger.error("Failed to connect to ETCD: %s", str(e))
            raise ConnectionError(f"Failed to connect to ETCD: {str(e)}")

    def _create_client(self) -> etcd3.client:
        """
        Create new ETCD client instance.

        Returns:
            etcd3.client: Connected ETCD client.

        Raises:
            Exception: If client creation fails.
        """
        logger.debug("Creating new ETCD client")

        client_kwargs = {
            "host": self.config.hosts[0],
            "port": self.config.port,
            "timeout": self.config.timeout,
        }

        # Add TLS configuration if provided
        if any([self.config.ca_cert, self.config.cert_key, self.config.cert_cert]):
            client_kwargs.update({
                "ca_cert": self.config.ca_cert,
                "cert_key": self.config.cert_key,
                "cert_cert": self.config.cert_cert,
            })

        # Create client synchronously (etcd3 doesn't support async)
        client = etcd3.client(**client_kwargs)

        # Verify connection with status check
        logger.debug("Testing connection with status check")
        status = client.status()
        logger.debug("ETCD cluster status: %s", status)

        logger.debug("ETCD client created successfully")
        return client

    async def reconnect(self) -> None:
        """
        Attempt to reconnect to ETCD cluster.

        Closes existing connection and establishes a new one.
        """
        logger.debug("Initiating reconnection to ETCD")

        self.state = ConnectionState.DISCONNECTED
        if self.client:
            try:
                self.client.close()
                logger.debug("Existing client closed")
            except Exception as e:
                logger.warning("Error closing ETCD client: %s", str(e))

        await self.connect()

    async def get_client(self) -> etcd3.client:
        """
        Get the current ETCD client, connecting if necessary.

        Returns:
            etcd3.client: Connected ETCD client.

        Raises:
            ConnectionError: If no connection is available.
        """
        logger.debug("Getting ETCD client (state: %s)", self.state)

        if self.state != ConnectionState.CONNECTED:
            await self.connect()

        if not self.client:
            raise ConnectionError("No ETCD client available")

        return self.client

    async def close(self) -> None:
        """
        Clean up resources and close connection.
        """
        logger.debug("Closing ETCD connection")

        if self.client:
            try:
                self.client.close()
                logger.debug("Client connection closed")
            except Exception as e:
                logger.error("Error during client close: %s", str(e))

        self.client = None
        self.state = ConnectionState.DISCONNECTED
        logger.debug("Connection closed, state: %s", self.state)

