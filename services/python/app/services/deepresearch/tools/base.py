"""
Base class for DeepResearch tools.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict


class BaseTool(ABC):
    """Base class for all DeepResearch tools."""

    name: str = "base_tool"
    description: str = "Base tool description"

    @abstractmethod
    async def call(self, params: Dict[str, Any], **kwargs) -> str:
        """
        Execute the tool with the given parameters.

        Args:
            params: Tool parameters
            **kwargs: Additional keyword arguments

        Returns:
            Tool execution result as string
        """
        pass

