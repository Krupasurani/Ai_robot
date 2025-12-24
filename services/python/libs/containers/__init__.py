"""
Containers Module - Dependency Injection containers using the new libs structure.

This module provides base container classes that demonstrate how to use
the new libs structure for dependency injection.

Usage:
    from libs.containers import BaseServiceContainer

    class MyServiceContainer(BaseServiceContainer):
        # Add service-specific providers
        pass
"""

from libs.containers.base import BaseServiceContainer

__all__ = [
    "BaseServiceContainer",
]

