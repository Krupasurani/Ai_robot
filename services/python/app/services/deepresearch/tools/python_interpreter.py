"""
Python Interpreter Tool using local SandboxService.
Replaces the original SandboxFusion-based execution.
"""

from typing import Any, Dict

from app.services.deepresearch.tools.base import BaseTool
from app.services.sandbox.service import ExecutionResult, get_sandbox_service
from libs.core.logging import create_logger

logger = create_logger("deepresearch.tools.python")


class PythonInterpreterTool(BaseTool):
    """
    Python code execution tool using local SandboxService.

    Executes Python code in a secure Docker container sandbox.
    """

    name = "PythonInterpreter"
    description = "Execute Python code in a sandboxed environment. Use print() for output."

    def __init__(self, timeout: int = 30):
        self.timeout = timeout

    async def call(self, params: Dict[str, Any], **kwargs) -> str:
        """
        Execute Python code in sandbox.

        Args:
            params: Dict with 'code' key containing Python code,
                   or raw code string

        Returns:
            Execution result (stdout/stderr)
        """
        # Handle different input formats
        if isinstance(params, str):
            code = params
        elif isinstance(params, dict):
            code = params.get("code", "")
            if not code and "params" in params:
                # Handle nested params format from agent
                code = params["params"].get("code", "")
        else:
            return "Error: Invalid parameters - expected code string or dict with 'code' key"

        if not code or not code.strip():
            return "Error: No code provided"

        logger.debug(f"Executing Python code ({len(code)} chars)")

        try:
            sandbox = get_sandbox_service()
            result: ExecutionResult = await sandbox.execute_code(
                code,
                timeout=self.timeout,
            )

            if result.success:
                output = result.stdout.strip() if result.stdout else ""

                # Include any output files
                if result.files:
                    output += f"\n\n[Generated files: {', '.join(result.files.keys())}]"

                if not output:
                    output = "[Code executed successfully with no output]"

                logger.debug(f"Code execution successful ({result.execution_time_ms}ms)")
                return output
            else:
                error_msg = result.stderr or result.error or "Unknown error"
                logger.warning(f"Code execution failed: {error_msg[:200]}")
                return f"[Execution Error]\n{error_msg}"

        except Exception as e:
            logger.error(f"Python interpreter error: {e}")
            return f"[Python Interpreter Error]: {e}"

