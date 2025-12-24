"""
Graph Database Interface - Abstract base class for graph database operations.

This module defines the contract that all graph database implementations must follow,
ensuring consistent behavior across different backends (ArangoDB, Neo4j, etc.).

Usage:
    from libs.data.graph import IGraphService

    class MyGraphDB(IGraphService):
        async def connect(self) -> bool:
            # Implementation
            pass
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

from libs.data.graph.models import Edge, Node


class IGraphService(ABC):
    """
    Abstract interface for graph database operations.

    This interface defines the contract for graph database implementations,
    providing methods for:
        - Connection management
        - Graph operations (create, delete)
        - Node operations (CRUD)
        - Edge operations (CRUD)
        - Collection and document operations
        - Query execution
        - Index management

    Implementations:
        - ArangoService: ArangoDB implementation

    Example:
        >>> class CustomGraphDB(IGraphService):
        ...     async def connect(self) -> bool:
        ...         self.client = await create_connection()
        ...         return True
    """

    # -------------------------------------------------------------------------
    # Connection Management
    # -------------------------------------------------------------------------

    @abstractmethod
    async def connect(self) -> bool:
        """
        Establish connection to the graph database.

        Returns:
            True if connection successful, False otherwise.

        Raises:
            ConnectionError: If connection fails after retries.
        """
        pass

    @abstractmethod
    async def disconnect(self) -> bool:
        """
        Close connection to the graph database.

        Returns:
            True if disconnection successful, False otherwise.
        """
        pass

    @abstractmethod
    async def get_service_name(self) -> str:
        """
        Get the name of the graph database service.

        Returns:
            Service name (e.g., "arango", "neo4j").
        """
        pass

    @abstractmethod
    async def get_service_client(self) -> object:
        """
        Get the underlying database client instance.

        Returns:
            The native database client object.
        """
        pass

    # -------------------------------------------------------------------------
    # Graph Operations
    # -------------------------------------------------------------------------

    @abstractmethod
    async def create_graph(self, graph_name: str) -> bool:
        """
        Create a new named graph.

        Args:
            graph_name: Name of the graph to create.

        Returns:
            True if created successfully, False otherwise.
        """
        pass

    @abstractmethod
    async def delete_graph(self) -> bool:
        """
        Delete the current graph.

        Returns:
            True if deleted successfully, False otherwise.
        """
        pass

    # -------------------------------------------------------------------------
    # Node Operations
    # -------------------------------------------------------------------------

    @abstractmethod
    async def create_node(self, node_type: str, node_id: str) -> bool:
        """
        Create a new node in the graph.

        Args:
            node_type: Type/label of the node.
            node_id: Unique identifier for the node.

        Returns:
            True if created successfully, False otherwise.
        """
        pass

    @abstractmethod
    async def get_node(self, node_type: str, node_id: str) -> Optional[Node]:
        """
        Retrieve a node by type and ID.

        Args:
            node_type: Type/label of the node.
            node_id: Unique identifier of the node.

        Returns:
            Node object if found, None otherwise.
        """
        pass

    @abstractmethod
    async def get_nodes(self, node_type: str) -> List[Node]:
        """
        Retrieve all nodes of a given type.

        Args:
            node_type: Type/label of nodes to retrieve.

        Returns:
            List of Node objects.
        """
        pass

    @abstractmethod
    async def delete_node(self, node_type: str, node_id: str) -> bool:
        """
        Delete a node from the graph.

        Args:
            node_type: Type/label of the node.
            node_id: Unique identifier of the node.

        Returns:
            True if deleted successfully, False otherwise.
        """
        pass

    # -------------------------------------------------------------------------
    # Edge Operations
    # -------------------------------------------------------------------------

    @abstractmethod
    async def create_edge(
        self,
        edge_type: str,
        from_node: str,
        to_node: str,
    ) -> bool:
        """
        Create an edge between two nodes.

        Args:
            edge_type: Type/label of the relationship.
            from_node: ID of the source node.
            to_node: ID of the target node.

        Returns:
            True if created successfully, False otherwise.
        """
        pass

    @abstractmethod
    async def get_edge(
        self,
        edge_type: str,
        from_node: str,
        to_node: str,
    ) -> Optional[Edge]:
        """
        Retrieve an edge by its endpoints.

        Args:
            edge_type: Type/label of the relationship.
            from_node: ID of the source node.
            to_node: ID of the target node.

        Returns:
            Edge object if found, None otherwise.
        """
        pass

    @abstractmethod
    async def get_edges(self, edge_type: str) -> List[Edge]:
        """
        Retrieve all edges of a given type.

        Args:
            edge_type: Type/label of edges to retrieve.

        Returns:
            List of Edge objects.
        """
        pass

    @abstractmethod
    async def delete_edge(
        self,
        edge_type: str,
        from_node: str,
        to_node: str,
    ) -> bool:
        """
        Delete an edge from the graph.

        Args:
            edge_type: Type/label of the relationship.
            from_node: ID of the source node.
            to_node: ID of the target node.

        Returns:
            True if deleted successfully, False otherwise.
        """
        pass

    # -------------------------------------------------------------------------
    # Collection & Document Operations
    # -------------------------------------------------------------------------

    @abstractmethod
    async def create_collection(self, collection_name: str) -> bool:
        """
        Create a new document collection.

        Args:
            collection_name: Name of the collection to create.

        Returns:
            True if created successfully (or already exists), False otherwise.
        """
        pass

    @abstractmethod
    async def upsert_document(
        self,
        collection_name: str,
        document: Dict[str, Any],
    ) -> bool:
        """
        Insert or update a document in a collection.

        The document must contain a '_key' field for identification.

        Args:
            collection_name: Name of the target collection.
            document: Document data with '_key' field.

        Returns:
            True if upserted successfully, False otherwise.
        """
        pass

    @abstractmethod
    async def get_document(
        self,
        collection_name: str,
        document_key: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Retrieve a document by key from a collection.

        Args:
            collection_name: Name of the collection.
            document_key: Unique key of the document.

        Returns:
            Document as dictionary if found, None otherwise.
        """
        pass

    @abstractmethod
    async def delete_document(
        self,
        collection_name: str,
        document_key: str,
    ) -> bool:
        """
        Delete a document by key from a collection.

        Args:
            collection_name: Name of the collection.
            document_key: Unique key of the document.

        Returns:
            True if deleted successfully, False otherwise.
        """
        pass

    # -------------------------------------------------------------------------
    # Query Operations
    # -------------------------------------------------------------------------

    @abstractmethod
    async def execute_query(
        self,
        query: str,
        bind_vars: Optional[Dict[str, Any]] = None,
    ) -> Optional[List[Dict[str, Any]]]:
        """
        Execute a database query (e.g., AQL for ArangoDB).

        Args:
            query: Query string in the database's query language.
            bind_vars: Optional dictionary of bind variables.

        Returns:
            List of result documents, or None on error.
            Returns empty list if query succeeds but has no results.
        """
        pass

    # -------------------------------------------------------------------------
    # Index Operations
    # -------------------------------------------------------------------------

    @abstractmethod
    async def create_index(
        self,
        collection_name: str,
        fields: List[str],
        index_type: str = "persistent",
    ) -> bool:
        """
        Create an index on a collection.

        Args:
            collection_name: Name of the collection.
            fields: List of field names to index.
            index_type: Type of index ("persistent", "hash", "skiplist", "ttl").

        Returns:
            True if created successfully (or already exists), False otherwise.
        """
        pass

