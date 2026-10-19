/**
 * Authentication and Role-Based Access Control (RBAC) Types
 * โรงพยาบาลสังขละบุรี (Sangkhlaburi Hospital)
 *
 * 1. หัวหน้ากลุ่มการพยาบาล (Nursing Director):
 *    - มีสิทธิดูข้อมูลได้ทั้งหมด
 *    - แต่ไม่สามารถ เพิ่ม ลบ แก้ไข ข้อมูลได้ (Read-only)
 * 2. หัวหน้าฝ่ายงาน (Department Heads):
 *    - ดูข้อมูล, เพิ่ม ลบ แก้ไข, พิมพ์รายงาน ได้
 *    - ให้สิทธิของฝ่ายงานตัวเองเท่านั้น
 *    - แบ่งเป็น 5 user ย่อย: ห้องฉุกเฉิน (ER), ผู้ป่วยนอก (OPD), ผู้ป่วยใน 1 (IPD1), ผู้ป่วยใน 2 (IPD2), ห้องคลอด (LR)
 * 3. ผู้ดูแลระบบ (Admin):
 *    - ทำได้ทุกฟังก์ชั่น
 */

import { DepartmentKey } from './nursing';

export type UserRole = 'admin' | 'nursing_director' | 'department_head';

export type UserDepartment = DepartmentKey | 'NURSING_DIRECTORATE' | 'ALL';

export interface AppUser {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: UserRole;
  department: UserDepartment;
  position: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
  avatarColor?: string;
}

export interface RolePermissionDetails {
  canViewAll: boolean;
  canEditAnyDept: boolean;
  canEditOwnDeptOnly: boolean;
  canAddRecord: boolean;
  canDeleteRecord: boolean;
  canEditStandards: boolean;
  canManageUsers: boolean;
  canPrintAllReports: boolean;
  canPrintOwnReportOnly: boolean;
  isReadOnly: boolean;
}

export const ROLE_LABELS: Record<UserRole, { label: string; badge: string; color: string; description: string }> = {
  admin: {
    label: 'ผู้ดูแลระบบ (Admin)',
    badge: '👑 ผู้ดูแลระบบ',
    color: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800',
    description: 'สิทธิสูงสุด ทำได้ทุกฟังก์ชั่น บันทึก ลบ แก้ไข และจัดการผู้ใช้งาน',
  },
  nursing_director: {
    label: 'หัวหน้ากลุ่มการพยาบาล (Nursing Director)',
    badge: '🩺 หัวหน้ากลุ่มการพยาบาล',
    color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800',
    description: 'มีสิทธิดูข้อมูลได้ทุกฝ่ายงานและภาพรวม แต่ไม่สามารถ เพิ่ม ลบ หรือแก้ไขข้อมูลได้',
  },
  department_head: {
    label: 'หัวหน้าฝ่ายงาน (Department Head)',
    badge: '🏥 หัวหน้าฝ่ายงาน',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800',
    description: 'ดูข้อมูล เพิ่ม ลบ แก้ไข พิมพ์รายงาน ได้เฉพาะฝ่ายงานของตนเองเท่านั้น',
  },
};

export const DEPARTMENT_LABELS: Record<UserDepartment, { name: string; short: string; color: string; icon: string }> = {
  ER: {
    name: 'งานอุบัติเหตุ-ฉุกเฉิน (Emergency Room)',
    short: 'ห้องฉุกเฉิน (ER)',
    color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
    icon: 'Ambulance',
  },
  OPD: {
    name: 'งานผู้ป่วยนอก (Outpatient Department)',
    short: 'ผู้ป่วยนอก (OPD)',
    color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
    icon: 'Stethoscope',
  },
  IPD1: {
    name: 'หอผู้ป่วยใน 1 สามัญ/หญิง-เด็ก (Inpatient 1)',
    short: 'ผู้ป่วยใน 1 (IPD 1)',
    color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
    icon: 'BedDouble',
  },
  IPD2: {
    name: 'หอผู้ป่วยใน 2 ชาย/พิเศษ (Inpatient 2)',
    short: 'ผู้ป่วยใน 2 (IPD 2)',
    color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800',
    icon: 'BedDouble',
  },
  LR: {
    name: 'งานห้องคลอดและทารกแรกเกิด (Labor Room)',
    short: 'ห้องคลอด (LR)',
    color: 'text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/40 border-pink-200 dark:border-pink-800',
    icon: 'Baby',
  },
  NURSING_DIRECTORATE: {
    name: 'กลุ่มงานการพยาบาล (ฝ่ายบริหารการพยาบาล)',
    short: 'กลุ่มการพยาบาล',
    color: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800',
    icon: 'Layers',
  },
  ALL: {
    name: 'โรงพยาบาลสังขละบุรี (ทุกฝ่ายงาน)',
    short: 'ทุกฝ่ายงาน',
    color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800',
    icon: 'ShieldCheck',
  },
};

/**
 * Check if the user has permission to edit a specific department
 */
export function canUserEditDepartment(user: AppUser | null, deptKey: DepartmentKey): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'nursing_director') return false; // หัวหน้ากลุ่มการพยาบาล ห้ามเพิ่ม ลบ แก้ไข
  if (user.role === 'department_head') {
    return user.department === deptKey; // ได้เฉพาะฝ่ายงานตนเองเท่านั้น
  }
  return false;
}

/**
 * Check if the user has permission to delete records
 */
export function canUserDeleteRecord(user: AppUser | null): boolean {
  if (!user) return false;
  return user.role === 'admin';
}

/**
 * Check if the user can add new daily records
 */
export function canUserAddRecord(user: AppUser | null): boolean {
  if (!user) return false;
  if (user.role === 'nursing_director') return false; // หัวหน้ากลุ่มการพยาบาล ดูได้อย่างเดียว
  return true; // Admin and department heads can add/start a record for their shift
}

/**
 * Check if the user can modify standard calculation weights
 */
export function canUserEditStandards(user: AppUser | null): boolean {
  if (!user) return false;
  return user.role === 'admin';
}

/**
 * Check if user can manage users
 */
export function canUserManageUsers(user: AppUser | null): boolean {
  if (!user) return false;
  return user.role === 'admin';
}

/**
 * Check if user can print a report for a given department
 */
export function canUserPrintReport(user: AppUser | null, targetDept?: DepartmentKey | 'all'): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'nursing_director') return true; // หัวหน้ากลุ่มพยาบาลดูและพิมพ์รายงานภาพรวมได้
  if (user.role === 'department_head') {
    if (!targetDept || targetDept === 'all') return true; // Can print if filtered or their own
    return user.department === targetDept;
  }
  return false;
}
