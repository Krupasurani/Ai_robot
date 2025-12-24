"""
Permission Sync Module - ACL Push-Down synchronization services.

This module provides services for keeping vector store ACLs in sync
with permission changes in ArangoDB.
"""

from app.services.permission_sync.permission_sync_service import PermissionSyncService

__all__ = ["PermissionSyncService"]

