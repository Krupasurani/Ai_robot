import asyncio
import hashlib
import io
import os
from contextlib import contextmanager
from datetime import datetime
from logging import Logger
from typing import Dict, List, Optional, Tuple

from fastapi import HTTPException
from fastapi.responses import StreamingResponse
from smb.SMBConnection import SMBConnection

from app.connectors.core.base.connector.connector_service import BaseConnector
from app.connectors.core.base.data_processor.data_source_entities_processor import (
    DataSourceEntitiesProcessor,
)
from app.connectors.core.base.data_store.data_store import DataStoreProvider
from app.connectors.core.base.sync_point.sync_point import SyncDataPointType, SyncPoint
from app.connectors.core.registry.connector_builder import (
    AuthField,
    ConnectorBuilder,
    DocumentationLink,
)
from app.connectors.sources.samba.apps import SambaApp
from app.connectors.sources.samba.const.const import (
    SAMBA_DOMAIN,
    SAMBA_HOST,
    SAMBA_PASSWORD,
    SAMBA_PORT,
    SAMBA_SHARE,
    SAMBA_USER,
)
from app.connectors.sources.samba.security_service import SambaSecurityService
from app.models.entities import FileRecord, Record, RecordGroupType, RecordType
from app.models.permission import Permission
from libs.core.config import ConfigurationService
from libs.core.constants import HttpStatusCode, MimeTypes, OriginTypes
from libs.core.utils import get_epoch_timestamp_in_ms


@ConnectorBuilder("Samba")\
    .in_group("File Servers")\
    .with_auth_type("BASIC_AUTH")\
    .with_description("Sync files and folders from SMB/CIFS network shares with full permission support")\
    .with_categories(["Storage", "File Servers"])\
    .configure(lambda builder: builder
        .with_icon("/assets/icons/connectors/samba.svg")
        .with_sync_support(True)
        .add_documentation_link(DocumentationLink(
            "Samba Documentation",
            "https://wiki.samba.org/index.php/Main_Page",
            "setup"
        ))
        .with_auth_type("BASIC_AUTH")
        .with_redirect_uri("", False)
        .add_auth_field(AuthField(
            name="host",
            display_name="Server Host",
            placeholder="e.g., 192.168.1.100 or fileserver.domain.com",
            description="The hostname or IP address of your Samba/SMB server",
            required=True,
            min_length=1,
            max_length=255,
        ))
        .add_auth_field(AuthField(
            name="share",
            display_name="Share Name",
            placeholder="e.g., shared, documents",
            description="The name of the SMB share to connect to",
            required=True,
            min_length=1,
            max_length=255,
        ))
        .add_auth_field(AuthField(
            name="user",
            display_name="Username",
            placeholder="e.g., domain\\username or username",
            description="Username for SMB authentication (use DOMAIN\\user for domain accounts)",
            required=True,
            min_length=1,
            max_length=255,
        ))
        .add_auth_field(AuthField(
            name="password",
            display_name="Password",
            placeholder="Enter password",
            description="Password for SMB authentication",
            field_type="PASSWORD",
            required=True,
            is_secret=True,
            min_length=0,
            max_length=255,
        ))
        .add_auth_field(AuthField(
            name="domain",
            display_name="Domain",
            placeholder="e.g., WORKGROUP or MYDOMAIN",
            description="Windows domain name (optional, leave empty for workgroup)",
            required=False,
            default_value="",
            min_length=0,
            max_length=255,
        ))
        .add_auth_field(AuthField(
            name="port",
            display_name="Port",
            placeholder="445",
            description="SMB port (default: 445 for SMB over TCP, 139 for NetBIOS)",
            required=False,
            default_value="445",
            min_length=1,
            max_length=5,
        ))
        .with_scheduled_config(True, 60)
    )\
    .build_decorator()
class SambaConnector(BaseConnector):
    """Connector implementation for Samba/SMB network shares."""

    # Sync point key for tracking last sync timestamp
    SYNC_POINT_KEY = "last_sync"

    def __init__(
        self,
        logger: Logger,
        data_entities_processor: DataSourceEntitiesProcessor,
        data_store_provider: DataStoreProvider,
        config_service: ConfigurationService,
    ) -> None:
        super().__init__(
            SambaApp(),
            logger,
            data_entities_processor,
            data_store_provider,
            config_service,
        )
        self._config: Dict[str, str] = {}
        self._security_service = SambaSecurityService(logger)
        self._sync_point: Optional[SyncPoint] = None

    def _init_sync_point(self) -> None:
        """Initialize the sync point for tracking incremental sync state."""
        if self._sync_point is None:
            self._sync_point = SyncPoint(
                connector_name=self.connector_name,
                org_id=self.data_entities_processor.org_id,
                sync_data_point_type=SyncDataPointType.RECORDS,
                data_store_provider=self.data_store_provider,
            )

    async def init(self) -> bool:  # type: ignore[override]
        """Load Samba configuration for the active organisation."""
        config = await self._load_config()
        if not config:
            self.logger.error("❌ Samba configuration not found")
            raise ValueError("Samba configuration not found")
        self._config = config
        return True

    async def test_connection_and_access(self) -> bool:  # type: ignore[override]
        try:
            if not self._config:
                await self.init()
            await asyncio.to_thread(self._validate_root_access)
            return True
        except Exception as exc:  # pragma: no cover - network exception
            self.logger.error(f"❌ Samba connection test failed: {exc}")
            return False

    def get_signed_url(self, record: Record) -> Optional[str]:  # type: ignore[override]
        # Samba shares do not expose signed URLs
        return None

    async def stream_record(self, record: Record) -> StreamingResponse:  # type: ignore[override]
        if not getattr(record, "path", None):
            raise HTTPException(
                status_code=HttpStatusCode.NOT_FOUND.value,
                detail="Samba record path missing",
            )

        if not self._config:
            await self.init()

        file_bytes = await asyncio.to_thread(self._download_file, record.path)  # type: ignore[attr-defined]
        media_type = (
            record.mime_type.value  # type: ignore[attr-defined]
            if getattr(record, "mime_type", None)
            else "application/octet-stream"
        )

        return StreamingResponse(
            io.BytesIO(file_bytes),
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={record.record_name}"},
        )

    async def run_sync(self) -> None:  # type: ignore[override]
        """
        Run a full sync of all files and permissions.

        This method scans all files in the share, updates records and permissions,
        and handles deletions. After completion, it updates the sync point to
        enable efficient incremental syncs.
        """
        if not self._config:
            await self.init()

        self._init_sync_point()

        # Record the start time for this sync
        sync_start_time = get_epoch_timestamp_in_ms()

        existing_records = await self._fetch_existing_records()
        current_external_ids: Dict[str, int] = {}

        try:
            files_with_permissions = await asyncio.to_thread(self._list_share_files_with_permissions)
        except Exception as exc:
            self.logger.error(f"❌ Failed to enumerate Samba share: {exc}")
            raise

        records_to_process: List[Tuple[FileRecord, List[Permission]]] = []
        permission_updates: List[Tuple[Dict[str, object], List[Permission]]] = []

        for metadata, permissions in files_with_permissions:
            external_id = self._build_external_id(str(metadata["path"]))
            updated_at = int(metadata["updated_at"])  # type: ignore[index]
            current_external_ids[external_id] = updated_at

            existing = existing_records.get(external_id)
            existing_timestamp = (
                int(existing.get("sourceLastModifiedTimestamp"))  # type: ignore[index]
                if existing and existing.get("sourceLastModifiedTimestamp") is not None
                else None
            )

            if existing_timestamp is not None and existing_timestamp == updated_at:
                # File content unchanged - check for permission changes
                if existing and self._should_update_permissions(existing, permissions):
                    permission_updates.append((existing, permissions))
                continue

            file_record = self._to_file_record(metadata, external_id)
            records_to_process.append((file_record, permissions))

        if records_to_process:
            await self.data_entities_processor.on_new_records(records_to_process)

        # Handle permission-only updates
        for existing_record, new_permissions in permission_updates:
            await self._update_record_permissions(existing_record, new_permissions)

        # Handle deletions
        missing_records = set(existing_records.keys()) - set(current_external_ids.keys())
        for external_id in missing_records:
            record_meta = existing_records[external_id]
            record_id = record_meta.get("_key")
            if record_id:
                await self.data_entities_processor.on_record_deleted(record_id)

        # Update the sync point with the new timestamp for incremental syncs
        await self._sync_point.update_sync_point(
            self.SYNC_POINT_KEY,
            {"lastSyncTimestamp": sync_start_time},
        )

        self.logger.info(
            f"Full sync completed: {len(records_to_process)} records processed, "
            f"{len(permission_updates)} permission updates, "
            f"{len(missing_records)} deletions"
        )

    async def run_incremental_sync(self) -> None:  # type: ignore[override]
        """
        Run an incremental sync, only processing files changed since the last sync.

        Uses the sync point to track the last successful sync timestamp and
        only processes files with a last_write_time after that timestamp.
        """
        if not self._config:
            await self.init()

        self._init_sync_point()

        # Get the last sync timestamp
        sync_data = await self._sync_point.read_sync_point(self.SYNC_POINT_KEY)
        last_sync_timestamp = sync_data.get("lastSyncTimestamp", 0)

        self.logger.info(
            f"Starting incremental sync from timestamp: {last_sync_timestamp}"
        )

        # Record the start time for this sync
        sync_start_time = get_epoch_timestamp_in_ms()

        existing_records = await self._fetch_existing_records()
        current_external_ids: Dict[str, int] = {}

        try:
            files_with_permissions = await asyncio.to_thread(
                self._list_share_files_with_permissions_since,
                last_sync_timestamp,
            )
        except Exception as exc:
            self.logger.error(f"❌ Failed to enumerate Samba share: {exc}")
            raise

        records_to_process: List[Tuple[FileRecord, List[Permission]]] = []
        permission_updates: List[Tuple[Dict[str, object], List[Permission]]] = []

        for metadata, permissions in files_with_permissions:
            external_id = self._build_external_id(str(metadata["path"]))
            updated_at = int(metadata["updated_at"])  # type: ignore[index]
            current_external_ids[external_id] = updated_at

            existing = existing_records.get(external_id)
            existing_timestamp = (
                int(existing.get("sourceLastModifiedTimestamp"))  # type: ignore[index]
                if existing and existing.get("sourceLastModifiedTimestamp") is not None
                else None
            )

            if existing_timestamp is not None and existing_timestamp == updated_at:
                # File content unchanged - check for permission changes
                if existing and self._should_update_permissions(existing, permissions):
                    permission_updates.append((existing, permissions))
                continue

            file_record = self._to_file_record(metadata, external_id)
            records_to_process.append((file_record, permissions))

        if records_to_process:
            await self.data_entities_processor.on_new_records(records_to_process)

        # Handle permission-only updates
        for existing_record, new_permissions in permission_updates:
            await self._update_record_permissions(existing_record, new_permissions)

        # Note: Incremental sync does not handle deletions to avoid full scans
        # Full sync should be run periodically to catch deletions

        # Update the sync point with the new timestamp
        await self._sync_point.update_sync_point(
            self.SYNC_POINT_KEY,
            {"lastSyncTimestamp": sync_start_time},
        )

        self.logger.info(
            f"Incremental sync completed: {len(records_to_process)} records processed, "
            f"{len(permission_updates)} permission updates"
        )

    def handle_webhook_notification(self, notification: Dict) -> None:  # type: ignore[override]
        self.logger.info("Webhook notifications are not supported for Samba: %s", notification)

    def cleanup(self) -> None:  # type: ignore[override]
        # Connections are short-lived and cleaned up per operation.
        return

    @classmethod
    async def create_connector(
        cls,
        logger: Logger,
        data_store_provider: DataStoreProvider,
        config_service: ConfigurationService,
    ) -> "SambaConnector":
        data_entities_processor = DataSourceEntitiesProcessor(
            logger, data_store_provider, config_service
        )
        await data_entities_processor.initialize()
        connector = cls(
            logger,
            data_entities_processor,
            data_store_provider,
            config_service,
        )
        await connector.init()
        return connector

    async def _load_config(self) -> Dict[str, str]:
        org_id = self.data_entities_processor.org_id
        base_path = "/services/connectors/samba/config"
        org_specific = await self.config_service.get_config(f"{base_path}/{org_id}")
        if org_specific:
            return org_specific
        return await self.config_service.get_config(base_path) or {}

    def _validate_root_access(self) -> None:
        with self._connection() as connection:
            share = self._config[SAMBA_SHARE]
            connection.listPath(share, "")

    def _download_file(self, path: str) -> bytes:
        with self._connection() as connection:
            share = self._config[SAMBA_SHARE]
            buffer = io.BytesIO()
            connection.retrieveFile(share, path, buffer)
            buffer.seek(0)
            return buffer.read()

    def _list_share_files(self) -> List[Dict[str, object]]:
        with self._connection() as connection:
            share = self._config[SAMBA_SHARE]
            return self._walk_share(connection, share)

    def _list_share_files_with_permissions(
        self,
    ) -> List[Tuple[Dict[str, object], List[Permission]]]:
        """List all files in the share along with their permissions."""
        with self._connection() as connection:
            share = self._config[SAMBA_SHARE]
            files = self._walk_share(connection, share)

            results: List[Tuple[Dict[str, object], List[Permission]]] = []
            for file_metadata in files:
                path = str(file_metadata["path"])
                permissions = self._security_service.get_file_permissions(
                    connection, share, path
                )
                results.append((file_metadata, permissions))

            return results

    def _list_share_files_with_permissions_since(
        self,
        since_timestamp: int,
    ) -> List[Tuple[Dict[str, object], List[Permission]]]:
        """
        List files modified since a given timestamp along with their permissions.

        Args:
            since_timestamp: Unix timestamp in milliseconds; only files modified
                            after this time will be included

        Returns:
            List of (metadata, permissions) tuples for modified files
        """
        with self._connection() as connection:
            share = self._config[SAMBA_SHARE]
            all_files = self._walk_share(connection, share)

            # Filter to files modified since the given timestamp
            modified_files = [
                f for f in all_files
                if int(f.get("updated_at", 0)) > since_timestamp
            ]

            self.logger.info(
                f"Found {len(modified_files)} files modified since {since_timestamp} "
                f"(out of {len(all_files)} total)"
            )

            results: List[Tuple[Dict[str, object], List[Permission]]] = []
            for file_metadata in modified_files:
                path = str(file_metadata["path"])
                permissions = self._security_service.get_file_permissions(
                    connection, share, path
                )
                results.append((file_metadata, permissions))

            return results

    def _walk_share(self, connection: SMBConnection, share: str, path: str = "") -> List[Dict[str, object]]:
        items: List[Dict[str, object]] = []
        normalized = path if path else ""
        for entry in connection.listPath(share, normalized):
            if entry.filename in {".", ".."}:
                continue

            relative_path = os.path.join(path, entry.filename) if path else entry.filename
            if entry.isDirectory:
                items.extend(self._walk_share(connection, share, relative_path))
                continue

            items.append(
                {
                    "path": relative_path.replace("\\", "/"),
                    "name": entry.filename,
                    "size": int(entry.file_size or 0),
                    "created_at": self._to_epoch_ms(entry.create_time),
                    "updated_at": self._to_epoch_ms(entry.last_write_time),
                }
            )
        return items

    async def _fetch_existing_records(self) -> Dict[str, Dict[str, object]]:
        arango_service = getattr(self.data_store_provider, "arango_service", None)
        if not arango_service:
            return {}

        def _query() -> List[Dict[str, object]]:
            cursor = arango_service.db.aql.execute(
                """
                FOR record IN records
                    FILTER record.orgId == @org_id
                    FILTER record.connectorName == @connector_name
                    FILTER record.isDeleted == false
                    RETURN {
                        "externalRecordId": record.externalRecordId,
                        "_key": record._key,
                        "sourceLastModifiedTimestamp": record.sourceLastModifiedTimestamp,
                        "permissionHash": record.permissionHash,
                        "recordName": record.recordName,
                        "path": record.path
                    }
                """,
                bind_vars={
                    "org_id": self.data_entities_processor.org_id,
                    "connector_name": self.connector_name.value,
                },
            )
            return list(cursor)

        rows = await asyncio.to_thread(_query)
        return {row["externalRecordId"]: row for row in rows}

    def _should_update_permissions(
        self,
        existing_record: Dict[str, object],
        new_permissions: List[Permission],
    ) -> bool:
        """
        Check if permissions have changed for an existing record.

        Args:
            existing_record: The existing record metadata from the database
            new_permissions: The new permissions retrieved from the SMB share

        Returns:
            True if permissions should be updated
        """
        # Compute hash of new permissions for comparison
        new_hash = self._compute_permission_hash(new_permissions)
        existing_hash = existing_record.get("permissionHash")

        # If no existing hash, permissions have never been tracked - update them
        if not existing_hash:
            return True

        return new_hash != existing_hash

    def _compute_permission_hash(self, permissions: List[Permission]) -> str:
        """
        Compute a hash of the permissions for change detection.

        Args:
            permissions: List of Permission objects

        Returns:
            Hash string representing the permissions
        """
        # Create a sorted, deterministic representation
        perm_data = sorted([
            f"{p.external_id or ''}:{p.type.value}:{p.entity_type.value}"
            for p in permissions
        ])
        combined = "|".join(perm_data)
        return hashlib.sha256(combined.encode()).hexdigest()[:16]

    async def _update_record_permissions(
        self,
        existing_record: Dict[str, object],
        new_permissions: List[Permission],
    ) -> None:
        """
        Update permissions for an existing record.

        Args:
            existing_record: The existing record metadata
            new_permissions: The new permissions to apply
        """
        record_id = existing_record.get("_key")
        record_name = existing_record.get("recordName", "Unknown")

        if not record_id:
            return

        self.logger.info(
            f"Updating permissions for record: {record_name} ({record_id})"
        )

        # Create a minimal record object for the permission update
        record = FileRecord(
            record_name=str(record_name),
            record_type=RecordType.FILE,
            record_group_type=RecordGroupType.DRIVE,
            parent_record_type=RecordType.FILE,
            external_record_id=str(existing_record.get("externalRecordId", "")),
            external_record_group_id=self._config.get(SAMBA_SHARE),
            parent_external_record_id=None,
            version=1,
            origin=OriginTypes.CONNECTOR,
            connector_name=self.connector_name,
            org_id=self.data_entities_processor.org_id,
            source_created_at=get_epoch_timestamp_in_ms(),
            source_updated_at=get_epoch_timestamp_in_ms(),
            is_file=True,
            size_in_bytes=0,
            extension=None,
            path=str(existing_record.get("path", "")),
            mime_type=MimeTypes.BIN,
        )
        # Set the ID to the existing record's ID
        record.id = str(record_id)

        await self.data_entities_processor.on_updated_record_permissions(
            record, new_permissions
        )

        # Update the permission hash in the record
        new_hash = self._compute_permission_hash(new_permissions)
        await self._update_permission_hash(record_id, new_hash)

    async def _update_permission_hash(self, record_id: str, permission_hash: str) -> None:
        """Update the permission hash for a record in the database."""
        arango_service = getattr(self.data_store_provider, "arango_service", None)
        if not arango_service:
            return

        def _update() -> None:
            arango_service.db.aql.execute(
                """
                UPDATE { _key: @record_id } WITH { permissionHash: @hash } IN records
                """,
                bind_vars={
                    "record_id": record_id,
                    "hash": permission_hash,
                },
            )

        await asyncio.to_thread(_update)

    def _to_file_record(self, metadata: Dict[str, object], external_id: str) -> FileRecord:
        name = str(metadata["name"])
        extension = self._extract_extension(name)
        mime_type = self._determine_mime_type(extension)

        return FileRecord(
            record_name=name,
            record_type=RecordType.FILE,
            record_group_type=RecordGroupType.DRIVE,
            parent_record_type=RecordType.FILE,
            external_record_id=external_id,
            external_record_group_id=self._config.get(SAMBA_SHARE),
            parent_external_record_id=None,
            version=1,
            origin=OriginTypes.CONNECTOR,
            connector_name=self.connector_name,
            org_id=self.data_entities_processor.org_id,
            source_created_at=int(metadata["created_at"]),
            source_updated_at=int(metadata["updated_at"]),
            is_file=True,
            size_in_bytes=int(metadata["size"]),
            extension=extension,
            path=str(metadata["path"]),
            mime_type=mime_type,
        )

    def _build_external_id(self, path: str) -> str:
        share = (self._config.get(SAMBA_SHARE) or "").strip("/")
        clean_path = path.lstrip("/")
        return f"samba://{share}/{clean_path}".replace("\\", "/")

    @staticmethod
    def _extract_extension(filename: str) -> Optional[str]:
        _, ext = os.path.splitext(filename)
        return ext[1:].lower() if ext else None

    @staticmethod
    def _determine_mime_type(extension: Optional[str]) -> MimeTypes:
        if not extension:
            return MimeTypes.BIN
        mapping = {
            "pdf": MimeTypes.PDF,
            "doc": MimeTypes.DOC,
            "docx": MimeTypes.DOCX,
            "ppt": MimeTypes.PPT,
            "pptx": MimeTypes.PPTX,
            "xls": MimeTypes.XLS,
            "xlsx": MimeTypes.XLSX,
            "csv": MimeTypes.CSV,
            "txt": MimeTypes.PLAIN_TEXT,
            "html": MimeTypes.HTML,
        }
        return mapping.get(extension.lower(), MimeTypes.BIN)

    @staticmethod
    def _to_epoch_ms(value) -> int:
        if isinstance(value, datetime):
            return int(value.timestamp() * 1000)
        if isinstance(value, (int, float)):
            return int(value)
        return get_epoch_timestamp_in_ms()

    def _connect(self) -> SMBConnection:
        host = self._config.get(SAMBA_HOST)
        username = self._config.get(SAMBA_USER)
        share = self._config.get(SAMBA_SHARE)
        if not host or not username or not share:
            raise ValueError("Incomplete Samba configuration")

        password = self._config.get(SAMBA_PASSWORD, "")
        port = int(self._config.get(SAMBA_PORT, 445))
        domain = self._config.get(SAMBA_DOMAIN, "")

        if host.lower() in {"localhost", "127.0.0.1"}:
            client_name = "CLIENT"
            server_name = "LOCALHOST"
        else:
            client_name = "workplace-ai"
            server_name = host.upper()

        connection = SMBConnection(
            username,
            password,
            client_name,
            server_name,
            domain=domain,
            use_ntlm_v2=True,
            is_direct_tcp=(port == 445),
            sign_options=SMBConnection.SIGN_NEVER,
        )

        if not connection.connect(host, port):
            raise ConnectionError(f"Unable to connect to Samba server {host}:{port}")

        return connection

    @contextmanager
    def _connection(self) -> SMBConnection:
        connection = self._connect()
        try:
            yield connection
        finally:
            try:
                connection.close()
            except Exception:  # pragma: no cover - defensive cleanup
                pass
