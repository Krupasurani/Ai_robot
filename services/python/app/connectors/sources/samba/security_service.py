"""Samba Security Service for ACL/Permission handling.

This module provides functionality to extract and parse SMB/CIFS security
descriptors (ACLs) from Samba shares and convert them to the application's
Permission model.
"""

from logging import Logger
from typing import Dict, List, Optional, Tuple

from smb.SMBConnection import SMBConnection
from smb.security_descriptors import (
    ACE,
    SID,
    SecurityDescriptor,
)

from app.models.permission import EntityType, Permission, PermissionType
from libs.core.utils import get_epoch_timestamp_in_ms


# Well-known Windows SIDs
# https://docs.microsoft.com/en-us/windows/security/identity-protection/access-control/security-identifiers
WELL_KNOWN_SIDS: Dict[str, Tuple[str, EntityType]] = {
    "S-1-1-0": ("Everyone", EntityType.ANYONE),
    "S-1-5-11": ("Authenticated Users", EntityType.DOMAIN),
    "S-1-5-32-544": ("Administrators", EntityType.GROUP),
    "S-1-5-32-545": ("Users", EntityType.GROUP),
    "S-1-5-32-546": ("Guests", EntityType.GROUP),
    "S-1-5-18": ("Local System", EntityType.USER),
    "S-1-5-19": ("Local Service", EntityType.USER),
    "S-1-5-20": ("Network Service", EntityType.USER),
}

# SMB Access Mask flags
# Reference: https://docs.microsoft.com/en-us/windows/win32/secauthz/access-mask
FILE_READ_DATA = 0x00000001
FILE_WRITE_DATA = 0x00000002
FILE_APPEND_DATA = 0x00000004
FILE_READ_EA = 0x00000008
FILE_WRITE_EA = 0x00000010
FILE_EXECUTE = 0x00000020
FILE_DELETE_CHILD = 0x00000040
FILE_READ_ATTRIBUTES = 0x00000080
FILE_WRITE_ATTRIBUTES = 0x00000100

# Standard rights
DELETE = 0x00010000
READ_CONTROL = 0x00020000
WRITE_DAC = 0x00040000
WRITE_OWNER = 0x00080000
SYNCHRONIZE = 0x00100000

# Generic rights
GENERIC_READ = 0x80000000
GENERIC_WRITE = 0x40000000
GENERIC_EXECUTE = 0x20000000
GENERIC_ALL = 0x10000000

# Combined access masks for common permission levels
READ_ACCESS = FILE_READ_DATA | FILE_READ_EA | FILE_READ_ATTRIBUTES | READ_CONTROL | SYNCHRONIZE
WRITE_ACCESS = FILE_WRITE_DATA | FILE_APPEND_DATA | FILE_WRITE_EA | FILE_WRITE_ATTRIBUTES
FULL_ACCESS = GENERIC_ALL | DELETE | WRITE_DAC | WRITE_OWNER


class SambaSecurityService:
    """Service for handling Samba/SMB security descriptors and permissions."""

    def __init__(self, logger: Logger) -> None:
        self.logger = logger
        self._sid_cache: Dict[str, Tuple[str, EntityType]] = {}

    def get_file_permissions(
        self,
        connection: SMBConnection,
        share: str,
        path: str,
    ) -> List[Permission]:
        """
        Get permissions for a file or directory from the SMB share.

        Args:
            connection: Active SMB connection
            share: Name of the SMB share
            path: Path to the file/directory within the share

        Returns:
            List of Permission objects representing the ACL
        """
        try:
            # Normalize path - SMB uses backslashes
            normalized_path = path.replace("/", "\\").lstrip("\\")
            if not normalized_path:
                normalized_path = "\\"

            # Get security descriptor from SMB
            security_descriptor = connection.getSecurity(share, normalized_path)

            if not security_descriptor:
                self.logger.warning(f"No security descriptor returned for {path}")
                return []

            return self._parse_security_descriptor(security_descriptor, path)

        except Exception as e:
            self.logger.warning(f"Failed to get security for {path}: {e}")
            return []

    def _parse_security_descriptor(
        self,
        sd: SecurityDescriptor,
        path: str,
    ) -> List[Permission]:
        """
        Parse a SecurityDescriptor into Permission objects.

        Args:
            sd: The SecurityDescriptor from pysmb
            path: Path for logging purposes

        Returns:
            List of Permission objects
        """
        permissions: List[Permission] = []
        seen_sids: set = set()

        # Process owner SID first
        if sd.owner:
            owner_perm = self._create_permission_from_sid(
                sd.owner,
                PermissionType.OWNER,
            )
            if owner_perm:
                sid_str = self._sid_to_string(sd.owner)
                if sid_str not in seen_sids:
                    permissions.append(owner_perm)
                    seen_sids.add(sid_str)

        # Process DACL (Discretionary Access Control List)
        if sd.dacl and sd.dacl.aces:
            for ace in sd.dacl.aces:
                permission = self._parse_ace(ace)
                if permission:
                    sid_str = self._sid_to_string(ace.sid)
                    # Avoid duplicates, but allow upgrades
                    if sid_str not in seen_sids:
                        permissions.append(permission)
                        seen_sids.add(sid_str)
                    else:
                        # Check if we should upgrade an existing permission
                        self._maybe_upgrade_permission(permissions, permission, sid_str)

        self.logger.debug(
            f"Parsed {len(permissions)} permissions for {path}"
        )
        return permissions

    def _parse_ace(self, ace: ACE) -> Optional[Permission]:
        """
        Parse a single Access Control Entry into a Permission.

        Args:
            ace: The ACE from the DACL

        Returns:
            Permission object or None if ACE should be skipped
        """
        # Skip deny ACEs - we only process allow ACEs
        # ACE type 0 = ACCESS_ALLOWED_ACE_TYPE
        # ACE type 1 = ACCESS_DENIED_ACE_TYPE
        if hasattr(ace, "ace_type") and ace.ace_type == 1:
            return None

        # Get the access mask
        access_mask = getattr(ace, "mask", 0) or getattr(ace, "access_mask", 0)
        if not access_mask:
            return None

        # Determine permission type from access mask
        perm_type = self._access_mask_to_permission_type(access_mask)

        return self._create_permission_from_sid(ace.sid, perm_type)

    def _access_mask_to_permission_type(self, mask: int) -> PermissionType:
        """
        Convert SMB access mask to PermissionType.

        Args:
            mask: The access mask from the ACE

        Returns:
            Corresponding PermissionType
        """
        # Check for full control / owner-level access
        if mask & GENERIC_ALL or mask & WRITE_OWNER or mask & WRITE_DAC:
            return PermissionType.OWNER

        # Check for write access
        if mask & GENERIC_WRITE or mask & FILE_WRITE_DATA or mask & FILE_APPEND_DATA:
            return PermissionType.WRITE

        # Check for read access
        if mask & GENERIC_READ or mask & FILE_READ_DATA:
            return PermissionType.READ

        # Default to read for any other access
        return PermissionType.READ

    def _create_permission_from_sid(
        self,
        sid: SID,
        perm_type: PermissionType,
    ) -> Optional[Permission]:
        """
        Create a Permission object from a SID.

        Args:
            sid: The SID object
            perm_type: The permission type to assign

        Returns:
            Permission object or None if SID cannot be processed
        """
        sid_str = self._sid_to_string(sid)
        if not sid_str:
            return None

        # Check well-known SIDs first
        if sid_str in WELL_KNOWN_SIDS:
            name, entity_type = WELL_KNOWN_SIDS[sid_str]
            return Permission(
                external_id=sid_str,
                email=None,  # Well-known SIDs don't have emails
                type=perm_type,
                entity_type=entity_type,
                created_at=get_epoch_timestamp_in_ms(),
                updated_at=get_epoch_timestamp_in_ms(),
            )

        # Determine entity type from SID structure
        entity_type = self._determine_entity_type(sid)

        return Permission(
            external_id=sid_str,
            email=None,  # Email needs to be resolved via AD lookup
            type=perm_type,
            entity_type=entity_type,
            created_at=get_epoch_timestamp_in_ms(),
            updated_at=get_epoch_timestamp_in_ms(),
        )

    def _sid_to_string(self, sid: SID) -> Optional[str]:
        """
        Convert a SID object to its string representation.

        Args:
            sid: The SID object from pysmb

        Returns:
            SID string like "S-1-5-21-..." or None
        """
        if not sid:
            return None

        try:
            # pysmb SID objects have a toString() method or __str__
            if hasattr(sid, "toString"):
                return sid.toString()
            return str(sid)
        except Exception:
            return None

    def _determine_entity_type(self, sid: SID) -> EntityType:
        """
        Determine the entity type from a SID.

        Domain SIDs typically have:
        - Users: RID >= 1000
        - Groups: well-known RIDs or domain groups

        Args:
            sid: The SID object

        Returns:
            EntityType (USER or GROUP)
        """
        sid_str = self._sid_to_string(sid)
        if not sid_str:
            return EntityType.USER

        # Parse SID components
        parts = sid_str.split("-")

        # Check for domain SIDs (S-1-5-21-...)
        if len(parts) >= 8 and parts[1] == "1" and parts[2] == "5" and parts[3] == "21":
            # Last part is the RID (Relative Identifier)
            try:
                rid = int(parts[-1])
                # Domain Users group has RID 513
                # Domain Admins group has RID 512
                # Regular users typically have RID >= 1000
                if rid in (512, 513, 514, 515, 516, 517, 518, 519, 520, 521, 522, 553):
                    return EntityType.GROUP
            except ValueError:
                pass

        return EntityType.USER

    def _maybe_upgrade_permission(
        self,
        permissions: List[Permission],
        new_permission: Permission,
        sid_str: str,
    ) -> None:
        """
        Upgrade an existing permission if the new one has higher access.

        Args:
            permissions: List of existing permissions
            new_permission: The new permission to potentially merge
            sid_str: The SID string for matching
        """
        perm_hierarchy = {
            PermissionType.READ: 1,
            PermissionType.COMMENT: 2,
            PermissionType.WRITE: 3,
            PermissionType.OWNER: 4,
        }

        for i, existing in enumerate(permissions):
            if existing.external_id == sid_str:
                existing_level = perm_hierarchy.get(existing.type, 0)
                new_level = perm_hierarchy.get(new_permission.type, 0)
                if new_level > existing_level:
                    permissions[i] = new_permission
                break

    def batch_get_permissions(
        self,
        connection: SMBConnection,
        share: str,
        paths: List[str],
    ) -> Dict[str, List[Permission]]:
        """
        Get permissions for multiple files/directories in batch.

        Args:
            connection: Active SMB connection
            share: Name of the SMB share
            paths: List of paths to get permissions for

        Returns:
            Dictionary mapping paths to their permissions
        """
        results: Dict[str, List[Permission]] = {}

        for path in paths:
            results[path] = self.get_file_permissions(connection, share, path)

        return results

    def permissions_equal(
        self,
        perms1: List[Permission],
        perms2: List[Permission],
    ) -> bool:
        """
        Compare two permission lists for equality.

        Args:
            perms1: First permission list
            perms2: Second permission list

        Returns:
            True if permissions are equivalent
        """
        if len(perms1) != len(perms2):
            return False

        # Create sets of (external_id, type) tuples for comparison
        set1 = {(p.external_id, p.type) for p in perms1}
        set2 = {(p.external_id, p.type) for p in perms2}

        return set1 == set2
