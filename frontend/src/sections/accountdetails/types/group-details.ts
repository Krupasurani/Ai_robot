type AlertColor = 'success' | 'info' | 'warning' | 'error';

export interface AppUserGroup {
  _id: string;
  name: string;
  type: string;
  orgId: string;
  users: string[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  slug: string;
  __v: number;
}

export interface AppUser {
  _id: string;
  orgId: string;
  fullName: string;
  email: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  slug: string;
  __v: number;
  designation?: string;
  firstName?: string;
  lastName?: string;
  deletedBy?: string;
  isEmailVerified: boolean;
  hasPhoto?: boolean;
}

export interface GroupUser {
  _id: string;
  fullName: string;
  email: string;
  orgId: string;
  hasLoggedIn: boolean;
  hasPhoto?: boolean;
  photoURL?: string;
  groups: {
    _id: string;
    name: string;
    type: string;
  }[];
}

export interface SnackbarState {
  open: boolean;
  message: string;
  severity: AlertColor;
}

export interface EditGroupModalProps {
  open: boolean;
  onClose: () => void;
  groupId: string | null;
  groupName: string;
}

export interface AddUsersToGroupsModalProps {
  open: boolean;
  onClose: () => void;
  onUsersAdded: (message?: string) => void;
  allUsers: GroupUser[] | null;
  /** Optional list of groups (not required when adding to a single group) */
  groups?: AppUserGroup[];
  /** Optional single group id when adding users to a specific group */
  group?: string | null;
}

export interface AddUserModalProps {
  open: boolean;
  onClose: () => void;
  groups: AppUserGroup[];
  onUsersAdded: (message?: string) => void;
  freeSeats?: number | null;
}
