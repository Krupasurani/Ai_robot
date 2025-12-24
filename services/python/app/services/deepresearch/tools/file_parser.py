"""
File Parser Tool using local Docling service.
Replaces the original DashScope-based file parsing.
"""

import os
from typing import Any, Dict

import httpx

from app.services.deepresearch.tools.base import BaseTool
from libs.core.logging import create_logger

logger = create_logger("deepresearch.tools.file_parser")

# Local Docling endpoint
DOCLING_URL = os.getenv("DOCLING_URL", "http://localhost:8081")


class FileParserTool(BaseTool):
    """
    File parsing tool using local Docling service.

    Parses various file types (PDF, DOCX, PPTX, etc.) and extracts content.
    """

    name = "parse_file"
    description = "Parse multiple user uploaded local files such as PDF, DOCX, PPTX, TXT, CSV, XLSX, DOC, ZIP."

    def __init__(
        self,
        docling_url: str = None,
        timeout: float = 120.0,
        file_root_path: str = "./uploads",
    ):
        self.docling_url = docling_url or DOCLING_URL
        self.timeout = timeout
        self.file_root_path = file_root_path

    async def _parse_file(self, file_path: str) -> Dict[str, Any]:
        """
        Parse a single file using Docling service.

        Args:
            file_path: Path to the file to parse

        Returns:
            Dict with parsed content or error
        """
        try:
            # Check if file exists
            if not os.path.exists(file_path):
                return {
                    "success": False,
                    "file": file_path,
                    "error": "File not found",
                }

            # Read file and send to Docling
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                with open(file_path, "rb") as f:
                    files = {"file": (os.path.basename(file_path), f)}

                    response = await client.post(
                        f"{self.docling_url}/api/v1/parse",
                        files=files,
                    )

                    if response.status_code == 200:
                        data = response.json()
                        return {
                            "success": True,
                            "file": file_path,
                            "content": data.get("content", ""),
                            "metadata": data.get("metadata", {}),
                        }
                    else:
                        return {
                            "success": False,
                            "file": file_path,
                            "error": f"HTTP {response.status_code}: {response.text[:200]}",
                        }

        except httpx.TimeoutException:
            logger.warning(f"Timeout parsing file: {file_path}")
            return {"success": False, "file": file_path, "error": "Timeout"}
        except Exception as e:
            logger.error(f"Error parsing file '{file_path}': {e}")
            return {"success": False, "file": file_path, "error": str(e)}

    def _resolve_file_path(self, filename: str) -> str:
        """
        Resolve a filename to a full path.

        Args:
            filename: Filename or path

        Returns:
            Resolved absolute path
        """
        if os.path.isabs(filename):
            return filename

        # Check in file root path
        full_path = os.path.join(self.file_root_path, filename)
        if os.path.exists(full_path):
            return full_path

        # Check in current directory
        if os.path.exists(filename):
            return os.path.abspath(filename)

        return full_path  # Return expected path even if not found

    async def call(self, params: Dict[str, Any], **kwargs) -> str:
        """
        Parse file(s) and extract content.

        Args:
            params: Dict with 'files' key containing list of filenames
            **kwargs: May contain 'file_root_path' override

        Returns:
            Formatted string with parsed file content
        """
        files = params.get("files", [])
        kwargs.get("file_root_path", self.file_root_path)

        # Normalize to list
        if isinstance(files, str):
            files = [files]

        if not files:
            return "Error: No files provided"

        results = []

        for filename in files:
            # Resolve path
            file_path = self._resolve_file_path(filename)
            logger.debug(f"Parsing file: {file_path}")

            parse_result = await self._parse_file(file_path)

            if parse_result.get("success"):
                content = parse_result.get("content", "")
                metadata = parse_result.get("metadata", {})

                result_text = f"\n## File: {os.path.basename(filename)}\n"
                if metadata:
                    result_text += f"**Metadata:** {metadata}\n\n"
                result_text += f"{content}\n"
                results.append(result_text)
            else:
                error = parse_result.get("error", "Unknown error")
                results.append(f"\n## Failed to parse: {filename}\n**Error:** {error}\n")

        if not results:
            return "No files could be parsed."

        return "\n---\n".join(results)

