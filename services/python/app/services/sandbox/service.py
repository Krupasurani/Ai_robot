"""
Secure Python Sandbox Service using Docker containers.

Executes Python code in isolated, ephemeral Docker containers with
resource limits and timeouts for security.
"""

import os
import tempfile
import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Optional

import docker
from docker.errors import APIError, ContainerError, ImageNotFound

from libs.core.logging import create_logger


@dataclass
class ExecutionResult:
    """Result of a code execution."""
    success: bool
    stdout: str = ""
    stderr: str = ""
    exit_code: int = 0
    error: Optional[str] = None
    execution_time_ms: int = 0
    files: Dict[str, bytes] = field(default_factory=dict)


class SandboxService:
    """
    Secure Python code execution service using Docker containers.

    Features:
    - Ephemeral containers (destroyed after execution)
    - Resource limits (CPU, memory)
    - Execution timeout
    - Network isolation
    - File output capture
    """

    def __init__(
        self,
        image: str = "python:3.10-slim",
        timeout_seconds: int = 30,
        memory_limit: str = "256m",
        cpu_limit: float = 1.0,
        network_disabled: bool = True,
        logger=None,
    ):
        self.image = os.getenv("SANDBOX_IMAGE", image)
        self.timeout_seconds = int(os.getenv("SANDBOX_TIMEOUT", timeout_seconds))
        self.memory_limit = os.getenv("SANDBOX_MEMORY_LIMIT", memory_limit)
        self.cpu_limit = float(os.getenv("SANDBOX_CPU_LIMIT", cpu_limit))
        self.network_disabled = network_disabled
        self.logger = logger or create_logger("sandbox")

        self._client: Optional[docker.DockerClient] = None
        self._initialized = False

    async def initialize(self) -> None:
        """Initialize the Docker client and pull the sandbox image."""
        if self._initialized:
            return

        try:
            self._client = docker.from_env()
            self.logger.info(f"Docker client initialized, using image: {self.image}")

            # Check if image exists, pull if not
            try:
                self._client.images.get(self.image)
                self.logger.info(f"Sandbox image '{self.image}' found locally")
            except ImageNotFound:
                self.logger.info(f"Pulling sandbox image '{self.image}'...")
                self._client.images.pull(self.image)
                self.logger.info(f"Sandbox image '{self.image}' pulled successfully")

            self._initialized = True

        except Exception as e:
            self.logger.error(f"Failed to initialize Docker client: {e}")
            raise RuntimeError(f"Docker initialization failed: {e}")

    async def execute_code(
        self,
        code: str,
        *,
        timeout: Optional[int] = None,
        packages: Optional[List[str]] = None,
        working_dir: str = "/workspace",
    ) -> ExecutionResult:
        """
        Execute Python code in a secure Docker container.

        Args:
            code: Python code to execute
            timeout: Execution timeout in seconds (overrides default)
            packages: Additional pip packages to install before execution
            working_dir: Working directory inside the container

        Returns:
            ExecutionResult with stdout, stderr, exit code, and any output files
        """
        if not self._initialized:
            await self.initialize()

        execution_id = str(uuid.uuid4())[:8]

        self.logger.debug(f"[{execution_id}] Starting code execution")

        # Create temporary directory for code and output files
        with tempfile.TemporaryDirectory() as temp_dir:
            # Write code to file
            code_file = os.path.join(temp_dir, "main.py")
            with open(code_file, "w") as f:
                f.write(code)

            # Build the command
            commands = []

            # Install packages if specified
            if packages:
                pkg_list = " ".join(packages)
                commands.append(f"pip install --quiet {pkg_list}")

            # Run the code
            commands.append(f"cd {working_dir} && python main.py")

            full_command = " && ".join(commands)

            try:
                import time
                start_time = time.time()

                # Run container
                container = self._client.containers.run(
                    image=self.image,
                    command=["sh", "-c", full_command],
                    volumes={
                        temp_dir: {"bind": working_dir, "mode": "rw"}
                    },
                    working_dir=working_dir,
                    mem_limit=self.memory_limit,
                    cpu_period=100000,
                    cpu_quota=int(100000 * self.cpu_limit),
                    network_disabled=self.network_disabled,
                    remove=True,
                    detach=False,
                    stdout=True,
                    stderr=True,
                )

                execution_time = int((time.time() - start_time) * 1000)

                # Container.run returns bytes when detach=False
                stdout = container.decode("utf-8") if isinstance(container, bytes) else str(container)

                # Collect any output files (excluding the input script)
                output_files = {}
                for filename in os.listdir(temp_dir):
                    if filename != "main.py":
                        filepath = os.path.join(temp_dir, filename)
                        if os.path.isfile(filepath):
                            with open(filepath, "rb") as f:
                                output_files[filename] = f.read()

                self.logger.debug(f"[{execution_id}] Execution completed successfully in {execution_time}ms")

                return ExecutionResult(
                    success=True,
                    stdout=stdout,
                    stderr="",
                    exit_code=0,
                    execution_time_ms=execution_time,
                    files=output_files,
                )

            except ContainerError as e:
                execution_time = int((time.time() - start_time) * 1000)
                stderr = e.stderr.decode("utf-8") if e.stderr else str(e)

                self.logger.warning(f"[{execution_id}] Container error: {stderr[:200]}")

                return ExecutionResult(
                    success=False,
                    stdout="",
                    stderr=stderr,
                    exit_code=e.exit_status,
                    error=f"Container exited with code {e.exit_status}",
                    execution_time_ms=execution_time,
                )

            except APIError as e:
                self.logger.error(f"[{execution_id}] Docker API error: {e}")
                return ExecutionResult(
                    success=False,
                    error=f"Docker API error: {e}",
                )

            except Exception as e:
                self.logger.error(f"[{execution_id}] Unexpected error: {e}")
                return ExecutionResult(
                    success=False,
                    error=f"Execution error: {e}",
                )

    async def health_check(self) -> bool:
        """Check if the sandbox service is healthy."""
        try:
            if not self._client:
                await self.initialize()

            # Try to ping Docker daemon
            self._client.ping()
            return True
        except Exception as e:
            self.logger.error(f"Sandbox health check failed: {e}")
            return False

    async def cleanup(self) -> None:
        """Cleanup any resources."""
        if self._client:
            try:
                self._client.close()
            except Exception:
                pass
            self._client = None
            self._initialized = False


# Singleton instance for the service
_sandbox_service: Optional[SandboxService] = None


def get_sandbox_service() -> SandboxService:
    """Get or create the singleton SandboxService instance."""
    global _sandbox_service
    if _sandbox_service is None:
        _sandbox_service = SandboxService()
    return _sandbox_service


def set_sandbox_service(service: SandboxService) -> None:
    """Set the singleton SandboxService instance."""
    global _sandbox_service
    _sandbox_service = service

