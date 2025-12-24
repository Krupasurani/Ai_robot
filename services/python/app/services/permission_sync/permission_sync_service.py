"""
Permission Sync Service - Synchronizes ACL changes to vector store payloads.

ACL Push-Down: When permissions change in ArangoDB (e.g., user added/removed from a document),
this service updates the access_control_list field in the corresponding vector payloads
without requiring a full re-indexing of the document content.

This is critical for maintaining search performance:
- Without this sync, users might see stale permissions (security risk)
- Re-indexing entire documents for permission changes is expensive
- Qdrant's set_payload operation is efficient and doesn't require re-embedding

Usage:
    service = PermissionSyncService(logger, arango_service, vector_db_service, collection_name)
    await service.sync_record_permissions(record_id, org_id)
    # or for batch updates:
    await service.sync_multiple_records(record_ids, org_id)
"""

import asyncio
from typing import List, Optional

from libs.core.logging import create_logger
from libs.data.vector import IVectorDBService


class PermissionSyncService:
    """
    Service for synchronizing permission changes to vector store payloads.

    This service bridges the gap between permission changes in ArangoDB
    and the denormalized access_control_list in Qdrant vector payloads.

    Attributes:
        logger: Logger instance for the service.
        arango_service: ArangoDB service for fetching permissions.
        vector_db_service: Vector database service for updating payloads.
        collection_name: Name of the vector collection.
    """

    def __init__(
        self,
        logger,
        arango_service,
        vector_db_service: IVectorDBService,
        collection_name: str,
    ) -> None:
        """
        Initialize the Permission Sync Service.

        Args:
            logger: Logger instance.
            arango_service: BaseArangoService instance for graph queries.
            vector_db_service: Vector DB service for payload updates.
            collection_name: Name of the Qdrant collection.
        """
        self.logger = logger or create_logger("permission_sync_service")
        self.arango_service = arango_service
        self.vector_db_service = vector_db_service
        self.collection_name = collection_name

    async def sync_record_permissions(
        self,
        record_id: str,
        org_id: str,
        virtual_record_id: Optional[str] = None,
    ) -> bool:
        """
        Sync permissions for a single record to its vector payloads.

        This method:
        1. Fetches the current permissions from ArangoDB graph
        2. Updates all vector payloads for this record with the new ACL

        Args:
            record_id: The record ID (_key) in ArangoDB.
            org_id: The organization ID for context.
            virtual_record_id: Optional virtual record ID (fetched if not provided).

        Returns:
            True if sync was successful, False otherwise.
        """
        try:
            self.logger.info(f"🔐 Syncing permissions for record {record_id}")

            # Get the virtual_record_id if not provided
            if not virtual_record_id:
                from libs.core.constants import CollectionNames
                record = await self.arango_service.get_document(
                    record_id, CollectionNames.RECORDS.value
                )
                if not record:
                    self.logger.warning(f"⚠️ Record {record_id} not found in database")
                    return False
                virtual_record_id = record.get("virtualRecordId")

            if not virtual_record_id:
                self.logger.warning(f"⚠️ No virtualRecordId for record {record_id}")
                return False

            # Fetch current permissions from ArangoDB graph
            access_control_list = await self.arango_service.get_record_permissions(
                record_id=record_id,
                org_id=org_id
            )

            self.logger.debug(
                f"📋 Record {record_id} has {len(access_control_list)} principals: "
                f"{access_control_list[:5]}..."  # Log first 5 for brevity
            )

            # Build filter to find all vector payloads for this record
            qdrant_filter = await self.vector_db_service.filter_collection(
                must={"virtualRecordId": virtual_record_id}
            )

            # Update the access_control_list in all matching payloads
            # Using set_payload for partial update (doesn't overwrite other fields)
            self.vector_db_service.set_payload(
                collection_name=self.collection_name,
                payload={"metadata.access_control_list": access_control_list},
                points=qdrant_filter,
            )

            self.logger.info(
                f"✅ Successfully synced permissions for record {record_id} "
                f"(virtualRecordId: {virtual_record_id})"
            )
            return True

        except Exception as e:
            self.logger.error(
                f"❌ Failed to sync permissions for record {record_id}: {str(e)}"
            )
            return False

    async def sync_multiple_records(
        self,
        record_ids: List[str],
        org_id: str,
        concurrency_limit: int = 10,
    ) -> dict:
        """
        Sync permissions for multiple records in parallel.

        Args:
            record_ids: List of record IDs to sync.
            org_id: The organization ID for context.
            concurrency_limit: Maximum concurrent sync operations.

        Returns:
            Dict with success/failure counts and failed record IDs.
        """
        self.logger.info(
            f"🔐 Syncing permissions for {len(record_ids)} records (concurrency: {concurrency_limit})"
        )

        semaphore = asyncio.Semaphore(concurrency_limit)
        results = {"success": 0, "failed": 0, "failed_records": []}

        async def sync_with_semaphore(record_id: str) -> bool:
            async with semaphore:
                return await self.sync_record_permissions(record_id, org_id)

        tasks = [sync_with_semaphore(record_id) for record_id in record_ids]
        task_results = await asyncio.gather(*tasks, return_exceptions=True)

        for record_id, result in zip(record_ids, task_results):
            if isinstance(result, Exception):
                self.logger.error(f"❌ Exception syncing {record_id}: {result}")
                results["failed"] += 1
                results["failed_records"].append(record_id)
            elif result:
                results["success"] += 1
            else:
                results["failed"] += 1
                results["failed_records"].append(record_id)

        self.logger.info(
            f"✅ Permission sync complete: {results['success']} succeeded, "
            f"{results['failed']} failed"
        )
        return results

    async def sync_group_permission_change(
        self,
        group_id: str,
        org_id: str,
    ) -> dict:
        """
        Sync permissions when a group's access changes.

        When a group is added/removed from documents, or a user is added/removed
        from a group, this method finds all affected records and syncs their ACLs.

        Args:
            group_id: The group ID that changed.
            org_id: The organization ID.

        Returns:
            Dict with sync results.
        """
        try:
            self.logger.info(f"🔐 Syncing permissions for group {group_id} change")

            # Find all records that have this group in their permissions
            from libs.core.constants import CollectionNames

            query = f"""
            FOR record, edge IN 1..1 ANY CONCAT("{CollectionNames.GROUPS.value}/", @groupId)
                {CollectionNames.PERMISSIONS.value}, {CollectionNames.PERMISSION.value}
                FILTER IS_SAME_COLLECTION("{CollectionNames.RECORDS.value}", record)
                RETURN DISTINCT record._key
            """

            cursor = self.arango_service.db.aql.execute(
                query,
                bind_vars={"groupId": group_id}
            )
            affected_record_ids = list(cursor)

            if not affected_record_ids:
                self.logger.info(f"ℹ️ No records affected by group {group_id} change")
                return {"success": 0, "failed": 0, "affected_records": 0}

            self.logger.info(
                f"📋 Found {len(affected_record_ids)} records affected by group change"
            )

            results = await self.sync_multiple_records(affected_record_ids, org_id)
            results["affected_records"] = len(affected_record_ids)
            return results

        except Exception as e:
            self.logger.error(
                f"❌ Failed to sync group permission change for {group_id}: {str(e)}"
            )
            return {"success": 0, "failed": 0, "error": str(e)}

