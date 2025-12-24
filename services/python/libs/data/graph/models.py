"""
Graph Models - Data structures for graph database entities.

This module defines the core data structures used in graph database operations,
including nodes and edges for graph traversal.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, Optional


@dataclass
class Node:
    """
    Represents a node (vertex) in a graph database.

    Attributes:
        id: Unique identifier for the node.
        type: The type/label of the node (e.g., "User", "Document").
        properties: Dictionary of node properties/attributes.

    Example:
        >>> node = Node(id="user_123", type="User", properties={"name": "John"})
    """

    id: str
    type: str
    properties: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Edge:
    """
    Represents an edge (relationship) in a graph database.

    Attributes:
        id: Unique identifier for the edge.
        type: The type/label of the relationship (e.g., "OWNS", "CREATED").
        from_node: ID of the source node.
        to_node: ID of the target node.
        properties: Dictionary of edge properties/attributes.

    Example:
        >>> edge = Edge(
        ...     id="edge_1",
        ...     type="OWNS",
        ...     from_node="user_123",
        ...     to_node="doc_456",
        ...     properties={"created_at": 1705312800}
        ... )
    """

    id: str
    type: str
    from_node: str
    to_node: str
    properties: Dict[str, Any] = field(default_factory=dict)

