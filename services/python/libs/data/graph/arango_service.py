"""
ArangoDB Service - Implementation of IGraphService for ArangoDB.

This module provides the ArangoDB implementation of the graph database interface,
supporting both ConfigurationService-based and direct config-based initialization.

Usage:
    from libs.data.graph import ArangoService, ArangoConfig

    # Using configuration service
    service = await ArangoService.create(logger, config_service)
    await service.connect()

    # Using direct config
    config = ArangoConfig(url="http://localhost:8529", db="mydb", ...)
    service = await ArangoService.create(logger, config)
    await service.connect()

    # Execute queries
    results = await service.execute_query("FOR doc IN users RETURN doc")
"""

import logging
from typing import Any, Dict, List, Optional, Union

from arango.client import ArangoClient

from libs.data.graph.config import ArangoConfig
from libs.data.graph.interface import IGraphService
from libs.data.graph.models import Edge, Node
from libs.core.constants import ConfigPath


class ArangoService(IGraphService):
    """
    ArangoDB implementation of the IGraphService interface.

    This service provides graph and document operations for ArangoDB,
    supporting both synchronous and asynchronous patterns.

    Attributes:
        logger: Logger instance for debugging and error reporting.
        config_service: Configuration source (ArangoConfig or ConfigurationService).
        client: ArangoDB client instance.
        db: Connected database instance.

    Example:
        >>> logger = create_logger("arango")
        >>> service = await ArangoService.create(logger, config_service)
        >>> await service.connect()
        >>> doc = await service.get_document("users", "user_123")
    """

    def __init__(
        self,
        logger: logging.Logger,
        config_service: Union[ArangoConfig, Any],  # Any = ConfigurationService
    ) -> None:
        """
        Initialize ArangoService.

        Note: Use the create() factory method for proper async initialization.

        Args:
            logger: Logger instance.
            config_service: ArangoConfig or ConfigurationService instance.
        """
        self.logger = logger
        self.config_service = config_service
        self.client: Optional[ArangoClient] = None
        self.db: Optional[Any] = None

    @classmethod
    async def create(
        cls,
        logger: logging.Logger,
        config_service: Union[ArangoConfig, Any],
    ) -> "ArangoService":
        """
        Factory method to create and initialize an ArangoService instance.

        This is the recommended way to create an ArangoService, as it properly
        handles async initialization of the ArangoDB client.

        Args:
            logger: Logger instance for the service.
            config_service: ArangoConfig or ConfigurationService instance.

        Returns:
            Initialized ArangoService instance with client ready.

        Example:
            >>> service = await ArangoService.create(logger, config_service)
            >>> await service.connect()
        """
        service = cls(logger, config_service)
        service.client = await service._create_arango_client()
        return service

    # -------------------------------------------------------------------------
    # Connection Management
    # -------------------------------------------------------------------------

    async def connect(self) -> bool:
        """
        Connect to ArangoDB and initialize the database.

        This method:
        1. Retrieves configuration from the config source.
        2. Connects to the system database.
        3. Creates the target database if it doesn't exist.
        4. Connects to the target database.

        Returns:
            True if connection successful, False otherwise.
        """
        try:
            self.logger.info("🚀 Connecting to ArangoDB...")

            # Get configuration
            arangodb_config = await self._get_config()
            if not arangodb_config or not isinstance(arangodb_config, dict):
                raise ValueError("ArangoDB configuration not found or invalid")

            arango_url = arangodb_config.get("url")
            arango_user = arangodb_config.get("username")
            arango_password = arangodb_config.get("password")
            arango_db = arangodb_config.get("db")

            self.logger.info(f"Connecting to ArangoDB at: {arango_url}")

            if not all([arango_url, arango_user, arango_password, arango_db]):
                raise ValueError("Missing required ArangoDB configuration values")

            # Type assertions after validation
            arango_url = str(arango_url)
            arango_user = str(arango_user)
            arango_password = str(arango_password)
            arango_db = str(arango_db)

            if not self.client:
                self.logger.error("ArangoDB client not initialized")
                return False

            # Connect to system db to ensure our db exists
            sys_db = self.client.db(
                "_system",
                username=arango_user,
                password=arango_password,
                verify=False,
            )
            self.logger.info("System database connected")

            # Check if our database exists, create it if it doesn't
            if not sys_db.has_database(arango_db):
                self.logger.info(f"Database '{arango_db}' does not exist, creating...")
                sys_db.create_database(
                    name=arango_db,
                    users=[
                        {
                            "username": arango_user,
                            "password": arango_password,
                            "active": True,
                        }
                    ],
                )
                self.logger.info(f"✅ Database '{arango_db}' created successfully")
            else:
                self.logger.info(f"Database '{arango_db}' already exists")

            # Connect to our database
            self.logger.info(f"Connecting to database '{arango_db}'...")
            self.db = self.client.db(
                arango_db,
                username=arango_user,
                password=arango_password,
                verify=False,
            )
            self.logger.info("✅ Database connected successfully")

            return True

        except Exception as e:
            self.logger.error(f"Failed to connect to ArangoDB: {str(e)}")
            self.client = None
            self.db = None
            return False

    async def disconnect(self) -> bool:
        """
        Disconnect from ArangoDB.

        Returns:
            True if disconnection successful, False otherwise.
        """
        try:
            self.logger.info("🚀 Disconnecting from ArangoDB")
            if self.client:
                self.client.close()
            self.client = None
            self.db = None
            self.logger.info("✅ Disconnected from ArangoDB")
            return True
        except Exception as e:
            self.logger.error(f"Failed to disconnect from ArangoDB: {str(e)}")
            return False

    async def get_service_name(self) -> str:
        """Get the service name."""
        return "arango"

    async def get_service_client(self) -> object:
        """Get the underlying ArangoDB client."""
        return self.client

    # -------------------------------------------------------------------------
    # Graph Operations
    # -------------------------------------------------------------------------

    async def create_graph(self, graph_name: str) -> bool:
        """
        Create a new named graph.

        Args:
            graph_name: Name of the graph to create.

        Returns:
            True if created successfully, False otherwise.
        """
        if not self.db:
            self.logger.error("Database not connected")
            return False

        try:
            self.db.create_graph(graph_name)
            self.logger.info(f"✅ Created graph: {graph_name}")
            return True
        except Exception as e:
            self.logger.error(f"Failed to create graph {graph_name}: {e}")
            return False

    async def delete_graph(self) -> bool:
        """Delete the current graph (not implemented)."""
        return False

    # -------------------------------------------------------------------------
    # Node Operations
    # -------------------------------------------------------------------------

    async def create_node(self, node_type: str, node_id: str) -> bool:
        """Create a new node (not implemented)."""
        return False

    async def get_node(self, node_type: str, node_id: str) -> Optional[Node]:
        """Get a node (not implemented)."""
        return None

    async def get_nodes(self, node_type: str) -> List[Node]:
        """Get all nodes of a type (not implemented)."""
        return []

    async def delete_node(self, node_type: str, node_id: str) -> bool:
        """Delete a node (not implemented)."""
        return False

    # -------------------------------------------------------------------------
    # Edge Operations
    # -------------------------------------------------------------------------

    async def create_edge(
        self,
        edge_type: str,
        from_node: str,
        to_node: str,
    ) -> bool:
        """Create an edge (not implemented)."""
        return False

    async def get_edge(
        self,
        edge_type: str,
        from_node: str,
        to_node: str,
    ) -> Optional[Edge]:
        """Get an edge (not implemented)."""
        return None

    async def get_edges(self, edge_type: str) -> List[Edge]:
        """Get all edges of a type (not implemented)."""
        return []

    async def delete_edge(
        self,
        edge_type: str,
        from_node: str,
        to_node: str,
    ) -> bool:
        """Delete an edge (not implemented)."""
        return False

    # -------------------------------------------------------------------------
    # Collection & Document Operations
    # -------------------------------------------------------------------------

    async def create_collection(self, collection_name: str) -> bool:
        """
        Create a new collection in ArangoDB.

        Args:
            collection_name: Name of the collection to create.

        Returns:
            True if created successfully or already exists, False otherwise.
        """
        try:
            if not self.db:
                self.logger.error("Database not connected")
                return False

            if self.db.has_collection(collection_name):
                self.logger.debug(f"Collection {collection_name} already exists")
                return True

            self.db.create_collection(collection_name)
            self.logger.info(f"✅ Created collection: {collection_name}")
            return True

        except Exception as e:
            self.logger.error(f"Failed to create collection {collection_name}: {e}")
            return False

    async def upsert_document(
        self,
        collection_name: str,
        document: Dict[str, Any],
    ) -> bool:
        """
        Insert or update a document using atomic AQL UPSERT.

        Args:
            collection_name: Name of the target collection.
            document: Document data with '_key' field.

        Returns:
            True if upserted successfully, False otherwise.
        """
        try:
            if not self.db:
                self.logger.error("Database not connected")
                return False

            if "_key" not in document:
                self.logger.error("Document must have a _key for upsert operation")
                return False

            upsert_query = f"""
            UPSERT {{ _key: @_key }}
            INSERT @document
            UPDATE @document
            IN {collection_name}
            """

            bind_vars = {"_key": document["_key"], "document": document}
            result = await self.execute_query(upsert_query, bind_vars)

            if result is not None:
                self.logger.debug(
                    f"Upserted document {document['_key']} in {collection_name}"
                )
                return True
            else:
                self.logger.error(
                    f"Upsert failed for document {document['_key']} in {collection_name}"
                )
                return False

        except Exception as e:
            self.logger.error(f"Failed to upsert document in {collection_name}: {e}")
            return False

    async def upsert_document_with_merge(
        self,
        collection_name: str,
        document: Dict[str, Any],
        merge_strategy: str = "merge",
    ) -> Optional[Dict[str, Any]]:
        """
        Insert or update a document with custom merge strategy.

        Args:
            collection_name: Name of the collection.
            document: Document to upsert with '_key' field.
            merge_strategy: Strategy - 'merge', 'replace', or 'keep'.

        Returns:
            The upserted document or None if failed.
        """
        try:
            if not self.db:
                self.logger.error("Database not connected")
                return None

            if "_key" not in document:
                self.logger.error("Document must have a _key for upsert operation")
                return None

            # Build merge logic based on strategy
            if merge_strategy == "merge":
                upsert_query = f"""
                UPSERT {{ _key: @_key }}
                INSERT @document
                UPDATE MERGE(OLD, @document)
                IN {collection_name}
                RETURN NEW
                """
            elif merge_strategy == "replace":
                upsert_query = f"""
                UPSERT {{ _key: @_key }}
                INSERT @document
                UPDATE @document
                IN {collection_name}
                RETURN NEW
                """
            elif merge_strategy == "keep":
                upsert_query = f"""
                UPSERT {{ _key: @_key }}
                INSERT @document
                UPDATE OLD
                IN {collection_name}
                RETURN NEW
                """
            else:
                self.logger.error(f"Invalid merge strategy: {merge_strategy}")
                return None

            bind_vars = {"_key": document["_key"], "document": document}
            result = await self.execute_query(upsert_query, bind_vars)

            if result is not None and len(result) > 0:
                self.logger.debug(
                    f"Upserted document {document['_key']} in {collection_name} "
                    f"with strategy '{merge_strategy}'"
                )
                return result[0]
            else:
                self.logger.error(
                    f"Upsert failed for document {document['_key']} in {collection_name}"
                )
                return None

        except Exception as e:
            self.logger.error(f"Failed to upsert document in {collection_name}: {e}")
            return None

    async def batch_upsert_documents(
        self,
        collection_name: str,
        documents: List[Dict[str, Any]],
        merge_strategy: str = "merge",
    ) -> bool:
        """
        Batch upsert multiple documents for better performance.

        Args:
            collection_name: Name of the collection.
            documents: List of documents to upsert (each must have '_key').
            merge_strategy: Strategy - 'merge', 'replace', or 'keep'.

        Returns:
            True if all documents upserted successfully, False otherwise.
        """
        try:
            if not self.db:
                self.logger.error("Database not connected")
                return False

            if not documents:
                self.logger.warning("No documents provided for batch upsert")
                return True

            # Validate all documents have _key
            for doc in documents:
                if "_key" not in doc:
                    self.logger.error(f"Document missing _key: {doc}")
                    return False

            # Build merge logic
            if merge_strategy == "merge":
                update_logic = "UPDATE MERGE(OLD, doc)"
            elif merge_strategy == "replace":
                update_logic = "UPDATE doc"
            elif merge_strategy == "keep":
                update_logic = "UPDATE OLD"
            else:
                self.logger.error(f"Invalid merge strategy: {merge_strategy}")
                return False

            batch_upsert_query = f"""
            FOR doc IN @documents
            UPSERT {{ _key: doc._key }}
            INSERT doc
            {update_logic}
            IN {collection_name}
            """

            bind_vars = {"documents": documents}
            result = await self.execute_query(batch_upsert_query, bind_vars)

            if result is not None:
                self.logger.debug(
                    f"Batch upserted {len(documents)} documents in {collection_name} "
                    f"with strategy '{merge_strategy}'"
                )
                return True
            else:
                self.logger.error(
                    f"Batch upsert failed for {len(documents)} documents "
                    f"in {collection_name}"
                )
                return False

        except Exception as e:
            self.logger.error(
                f"Failed to batch upsert documents in {collection_name}: {e}"
            )
            return False

    async def get_document(
        self,
        collection_name: str,
        document_key: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Get a document by key from a collection.

        Args:
            collection_name: Name of the collection.
            document_key: Unique key of the document.

        Returns:
            Document as dictionary if found, None otherwise.
        """
        try:
            if not self.db:
                self.logger.error("Database not connected")
                return None

            collection = self.db.collection(collection_name)
            try:
                document = collection.get(document_key)
                return document
            except Exception:
                return None

        except Exception as e:
            self.logger.error(
                f"Failed to get document {document_key} from {collection_name}: {e}"
            )
            return None

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
        try:
            if not self.db:
                self.logger.error("Database not connected")
                return False

            collection = self.db.collection(collection_name)
            try:
                collection.delete(document_key)
                self.logger.debug(
                    f"Deleted document {document_key} from {collection_name}"
                )
                return True
            except Exception as e:
                self.logger.error(
                    f"Document {document_key} not found in {collection_name}: {e}"
                )
                return False

        except Exception as e:
            self.logger.error(
                f"Failed to delete document {document_key} from {collection_name}: {e}"
            )
            return False

    # -------------------------------------------------------------------------
    # Query Operations
    # -------------------------------------------------------------------------

    async def execute_query(
        self,
        query: str,
        bind_vars: Optional[Dict[str, Any]] = None,
    ) -> Optional[List[Dict[str, Any]]]:
        """
        Execute an AQL query.

        Args:
            query: AQL query string.
            bind_vars: Optional dictionary of bind variables.

        Returns:
            List of result documents, or None on error.
        """
        try:
            if not self.db:
                self.logger.error("Database not connected")
                return None

            if bind_vars is None:
                bind_vars = {}

            cursor = self.db.aql.execute(query, bind_vars=bind_vars)
            result = [doc for doc in cursor]

            self.logger.debug(f"Executed query: {query[:100]}...")
            return result

        except Exception as e:
            self.logger.error(f"Failed to execute query: {e}")
            return None

    # -------------------------------------------------------------------------
    # Index Operations
    # -------------------------------------------------------------------------

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
            True if created successfully or already exists, False otherwise.
        """
        try:
            if not self.db:
                self.logger.error("Database not connected")
                return False

            collection = self.db.collection(collection_name)

            # Check if index already exists
            existing_indexes = collection.indexes()
            for index in existing_indexes:
                if (
                    index.get("fields") == fields
                    and index.get("type") == index_type
                ):
                    self.logger.debug(
                        f"Index already exists on {fields} in {collection_name}"
                    )
                    return True

            # Create the index
            if index_type == "persistent":
                collection.ensure_persistent_index(fields)
            elif index_type == "hash":
                collection.ensure_hash_index(fields)
            elif index_type == "skiplist":
                collection.ensure_skiplist_index(fields)
            elif index_type == "ttl":
                collection.ensure_ttl_index(fields)
            else:
                self.logger.warning(f"Unsupported index type: {index_type}")
                return False

            self.logger.info(
                f"✅ Created {index_type} index on {fields} in {collection_name}"
            )
            return True

        except Exception as e:
            self.logger.error(
                f"Failed to create index on {fields} in {collection_name}: {e}"
            )
            return False

    # -------------------------------------------------------------------------
    # Private Methods
    # -------------------------------------------------------------------------

    async def _get_config(self) -> Dict[str, Any]:
        """Get ArangoDB configuration from the config source."""
        if isinstance(self.config_service, ArangoConfig):
            return self.config_service.to_dict()
        else:
            # Assume it's a ConfigurationService
            return await self.config_service.get_config(ConfigPath.ARANGODB.value)

    async def _fetch_arango_host(self) -> str:
        """Fetch ArangoDB host URL from configuration."""
        arango_config = await self._get_config()
        if not arango_config or not isinstance(arango_config, dict):
            raise ValueError("ArangoDB configuration not found or invalid")

        url = arango_config.get("url")
        if not url:
            raise ValueError("ArangoDB URL not found in configuration")
        return url

    async def _create_arango_client(self) -> ArangoClient:
        """Create and return an ArangoDB client instance."""
        hosts = await self._fetch_arango_host()
        return ArangoClient(hosts=hosts)

