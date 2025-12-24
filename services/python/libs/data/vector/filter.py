"""
Qdrant Filter Utilities - Filter mode enum and helper functions.

This module provides utilities for building Qdrant filter conditions.
"""

from enum import Enum
from typing import Any, Dict, List, Union

from qdrant_client.http.models import (  # type: ignore
    FieldCondition,
    MatchAny,
    MatchValue,
)


class QdrantFilterMode(Enum):
    """
    Filter modes for Qdrant queries.

    Attributes:
        MUST: All conditions must be true (AND logic).
        SHOULD: At least one condition should be true (OR logic).
        MUST_NOT: Conditions must not be true (NOT logic).
    """

    MUST = "must"
    SHOULD = "should"
    MUST_NOT = "must_not"


# Type alias for filter values
FilterValue = Union[str, int, float, bool, List[Union[str, int, float, bool]]]


class QdrantUtils:
    """
    Utility class for Qdrant operations.

    Provides helper methods for building filter conditions and
    other Qdrant-specific operations.
    """

    @staticmethod
    def build_conditions(
        filters: Dict[str, FilterValue],
    ) -> List[FieldCondition]:
        """
        Build Qdrant field conditions from a filter dictionary.

        Args:
            filters: Dictionary mapping field names to values.
                     Values can be single values or lists for MatchAny.

        Returns:
            List of FieldCondition objects.

        Example:
            >>> conditions = QdrantUtils.build_conditions({
            ...     "orgId": "123",
            ...     "status": ["active", "pending"]
            ... })
        """
        conditions = []

        for field, value in filters.items():
            if isinstance(value, list):
                # Use MatchAny for list values (OR within the field)
                conditions.append(
                    FieldCondition(
                        key=field,
                        match=MatchAny(any=value),
                    )
                )
            else:
                # Use MatchValue for single values
                conditions.append(
                    FieldCondition(
                        key=field,
                        match=MatchValue(value=value),
                    )
                )

        return conditions

