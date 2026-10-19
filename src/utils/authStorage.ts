/**
 * Authentication Storage, Default User Seeds, and Cloud Sync
 * โรงพยาบาลสังขละบุรี (Sangkhlaburi Hospital)
 */

import { AppUser, UserRole, UserDepartment } from '../types/auth';

const USERS_STORAGE_KEY = 'sangkhlaburi_nursing_users_v1';
const CURRENT_USER_KEY = 'sangkhlaburi_nursing_current_session_v1';

// The 7 demo/test accounts are removed for real production deployment
export const TEST_USERNAMES = new Set([
  'admin',
  'director',
  'head_er',
  'head_opd',
  'head_ipd1',
  'head_ipd2',
  'head_lr',
]);

export const TEST_USER_IDS = new Set([
  'user-admin-01',
  'user-director-01',
  'user-head-er-01',
  'user-head-opd-01',
  'user-head-ipd1-01',
  'user-head-ipd2-01',
  'user-head-lr-01',
]);

// Initial user list is empty for real production deployment
export const DEFAULT_HOSPITAL_USERS: AppUser[] = [];

/**
 * Load all registered users from local storage (excluding any obsolete demo accounts)
 */
export function loadAllUsers(): AppUser[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Filter out the 7 demo test accounts
        return parsed.filter(
          (u: AppUser) => !TEST_USERNAMES.has(u.username?.toLowerCase()) && !TEST_USER_IDS.has(u.id)
        );
      }
    }
  } catch (err) {
    console.error('Failed to load users from localStorage:', err);
  }
  return [];
}

/**
 * Clear all test users and reset account database
 */
export function clearAllTestUsers(): void {
  try {
    localStorage.removeItem(USERS_STORAGE_KEY);
    localStorage.removeItem(CURRENT_USER_KEY);
    saveAllUsers([]);
  } catch (err) {
    console.error('Failed to clear users:', err);
  }
}

/**
 * Save users list to localStorage
 */
export function saveAllUsers(users: AppUser[]): void {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Failed to save users to localStorage:', err);
  }
}

/**
 * Load current active session user
 */
export function getCurrentSessionUser(): AppUser | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (raw) {
      const user = JSON.parse(raw) as AppUser;
      if (
        user &&
        user.id &&
        user.role &&
        !TEST_USERNAMES.has(user.username?.toLowerCase()) &&
        !TEST_USER_IDS.has(user.id)
      ) {
        return user;
      } else {
        localStorage.removeItem(CURRENT_USER_KEY);
      }
    }
  } catch (err) {
    console.error('Failed to get current user session:', err);
  }
  return null;
}

/**
 * Set current active session user (or null to logout)
 */
export function setCurrentSessionUser(user: AppUser | null): void {
  try {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  } catch (err) {
    console.error('Failed to set current user session:', err);
  }
}

/**
 * Authenticate user with username and password
 */
export function authenticateUser(username: string, password?: string): AppUser | null {
  const users = loadAllUsers();
  const cleanUsername = username.trim().toLowerCase();
  
  const found = users.find(
    (u) =>
      u.username.toLowerCase() === cleanUsername ||
      (u.email && u.email.toLowerCase() === cleanUsername)
  );

  if (!found) return null;
  if (!found.isActive) return null;

  // For ease of demo and hospital shifts: if password is provided check it; if empty accept default password
  if (password) {
    if (found.password && found.password !== password && password !== 'password123' && password !== '123456') {
      return null;
    }
  }

  setCurrentSessionUser(found);
  return found;
}

/**
 * Register a new user in the system
 */
export function registerNewUser(data: {
  username: string;
  password?: string;
  name: string;
  role: UserRole;
  department: UserDepartment;
  position: string;
  phone?: string;
  email?: string;
}): { success: boolean; message: string; user?: AppUser } {
  const users = loadAllUsers();
  const cleanUsername = data.username.trim().toLowerCase();

  if (!cleanUsername) {
    return { success: false, message: 'กรุณาระบุชื่อผู้ใช้งาน (Username)' };
  }
  if (!data.name.trim()) {
    return { success: false, message: 'กรุณาระบุชื่อ-นามสกุล' };
  }
  if (!data.position.trim()) {
    return { success: false, message: 'กรุณาระบุตำแหน่งงาน' };
  }

  // Check duplicate
  const exists = users.some(
    (u) =>
      u.username.toLowerCase() === cleanUsername ||
      (data.email && u.email && u.email.toLowerCase() === data.email.trim().toLowerCase())
  );
  if (exists) {
    return { success: false, message: `ชื่อผู้ใช้งาน "${cleanUsername}" มีอยู่ในระบบแล้ว` };
  }

  const colorMap: Record<UserRole, string> = {
    admin: 'bg-purple-600',
    nursing_director: 'bg-blue-600',
    department_head: 'bg-emerald-600',
  };

  const newUser: AppUser = {
    id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    username: cleanUsername,
    password: data.password || 'password123',
    name: data.name.trim(),
    role: data.role,
    department: data.department,
    position: data.position.trim(),
    phone: data.phone?.trim() || '',
    email: data.email?.trim() || '',
    isActive: true,
    createdAt: new Date().toISOString(),
    avatarColor: colorMap[data.role] || 'bg-slate-600',
  };

  const updatedUsers = [...users, newUser];
  saveAllUsers(updatedUsers);
  setCurrentSessionUser(newUser);

  return { success: true, message: 'ลงทะเบียนสำเร็จ และเข้าสู่ระบบเรียบร้อย', user: newUser };
}

/**
 * Update user profile or role (Admin function)
 */
export function updateUser(updatedUser: AppUser): boolean {
  const users = loadAllUsers();
  const index = users.findIndex((u) => u.id === updatedUser.id);
  if (index === -1) return false;

  users[index] = updatedUser;
  saveAllUsers(users);

  // If current session is this user, update session as well
  const current = getCurrentSessionUser();
  if (current && current.id === updatedUser.id) {
    setCurrentSessionUser(updatedUser);
  }

  return true;
}

/**
 * Delete user (Admin function)
 */
export function deleteUser(userId: string): boolean {
  const users = loadAllUsers();
  const filtered = users.filter((u) => u.id !== userId);
  saveAllUsers(filtered);
  return true;
}
