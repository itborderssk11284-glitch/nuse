/**
 * User Management Modal (Admin Feature)
 * Sangkhlaburi Hospital Smart Workload System
 */

import React, { useState } from 'react';
import { AppUser, UserRole, UserDepartment, ROLE_LABELS, DEPARTMENT_LABELS } from '../types/auth';
import {
  loadAllUsers,
  saveAllUsers,
  updateUser,
  deleteUser,
  registerNewUser,
  approveUser,
} from '../utils/authStorage';
import {
  isSupabaseConfigured,
  saveUserToSupabase,
  deleteUserFromSupabase,
} from '../utils/supabase';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Search,
  Check,
  AlertTriangle,
  Lock,
  UserCheck,
  Clock,
  UserX,
} from 'lucide-react';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  onUserSessionChanged: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserSessionChanged,
}) => {
  const [users, setUsers] = useState<AppUser[]>(() => loadAllUsers());
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // New User Form State
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPosition, setNewPosition] = useState('พยาบาลวิชาชีพชำนาญการ');
  const [newRole, setNewRole] = useState<UserRole>('department_head');
  const [newDept, setNewDept] = useState<UserDepartment>('ER');
  const [newPhone, setNewPhone] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const reload = () => {
    setUsers(loadAllUsers());
    onUserSessionChanged();
  };

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.position.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    updateUser(editingUser);
    if (isSupabaseConfigured()) {
      saveUserToSupabase(editingUser);
    }
    setEditingUser(null);
    setActionSuccess(`บันทึกการแก้ไขข้อมูลของ ${editingUser.name} สำเร็จ`);
    setTimeout(() => setActionSuccess(null), 3000);
    reload();
  };

  const handleDelete = (targetUser: AppUser) => {
    if (window.confirm(`ยืนยันการลบผู้ใช้ "${targetUser.name}" (${targetUser.username}) ออกจากระบบ?`)) {
      deleteUser(targetUser.id);
      if (isSupabaseConfigured()) {
        deleteUserFromSupabase(targetUser.id);
      }
      setActionSuccess(`ลบผู้ใช้ ${targetUser.name} ออกจากระบบเรียบร้อย`);
      setTimeout(() => setActionSuccess(null), 3000);
      reload();
    }
  };

  const handleApprove = (targetUser: AppUser) => {
    const approved = approveUser(targetUser.id);
    if (approved) {
      if (isSupabaseConfigured()) {
        saveUserToSupabase(approved);
      }
      setActionSuccess(`อนุมัติสิทธิ์การเข้าใช้งานให้ "${approved.name}" (@${approved.username}) เรียบร้อยแล้ว`);
      setTimeout(() => setActionSuccess(null), 3500);
      reload();
    }
  };

  const handleReject = (targetUser: AppUser) => {
    if (window.confirm(`ปฏิเสธคำขอสมัครและลบบัญชี "${targetUser.name}" (@${targetUser.username}) ออกจากระบบหรือไม่?`)) {
      deleteUser(targetUser.id);
      if (isSupabaseConfigured()) {
        deleteUserFromSupabase(targetUser.id);
      }
      setActionSuccess(`ปฏิเสธและลบคำขอสมัครของ "${targetUser.name}" เรียบร้อยแล้ว`);
      setTimeout(() => setActionSuccess(null), 3500);
      reload();
    }
  };

  const handleAddNewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    let finalDept = newDept;
    if (newRole === 'admin') finalDept = 'ALL';
    else if (newRole === 'nursing_director') finalDept = 'NURSING_DIRECTORATE';

    const res = registerNewUser({
      name: newName,
      username: newUsername,
      password: newPassword || 'password123',
      position: newPosition,
      role: newRole,
      department: finalDept,
      phone: newPhone,
      autoApprove: true,
    });

    if (!res.success) {
      setFormError(res.message);
      return;
    }

    if (res.user && isSupabaseConfigured()) {
      saveUserToSupabase(res.user);
    }

    setIsAddingNew(false);
    setNewName('');
    setNewUsername('');
    setNewPassword('');
    setActionSuccess(`เพิ่มผู้ใช้ "${newName}" เข้าสู่ระบบสำเร็จ`);
    setTimeout(() => setActionSuccess(null), 3000);
    reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span>จัดการผู้ใช้งานระบบ (User Management)</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                  สิทธิ์ผู้ดูแลระบบ (Admin)
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                กำหนดสิทธิ์การเข้าถึงข้อมูลตามตำแหน่ง: หัวหน้ากลุ่มการพยาบาล, หัวหน้าฝ่ายงาน 5 ฝ่าย, และ Admin
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action toast */}
        {actionSuccess && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Pending Approval Panel for Admin */}
        {users.filter((u) => u.isApproved === false || (!u.isActive && u.isApproved !== true)).length > 0 && (
          <div className="mx-4 sm:mx-5 mt-3 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
                <span className="font-bold text-xs text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>
                    คำขอสมัครสมาชิกใหม่ รอการอนุมัติสิทธิ์ (
                    {users.filter((u) => u.isApproved === false || (!u.isActive && u.isApproved !== true)).length} รายการ)
                  </span>
                </span>
              </div>
              <span className="text-[10px] text-amber-800 dark:text-amber-300 font-semibold bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-md">
                Admin ต้องอนุมัติก่อนจึงจะเข้าใช้งานได้
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {users
                .filter((u) => u.isApproved === false || (!u.isActive && u.isApproved !== true))
                .map((pUser) => {
                  const rMeta = ROLE_LABELS[pUser.role];
                  const dMeta = DEPARTMENT_LABELS[pUser.department];
                  return (
                    <div
                      key={pUser.id}
                      className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/60 shadow-xs flex flex-col justify-between gap-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                            {pUser.name.slice(0, 1)}
                          </span>
                          <div>
                            <div className="font-bold text-xs text-slate-800 dark:text-slate-100">
                              {pUser.name}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              @{pUser.username} {pUser.position && `• ${pUser.position}`}
                            </div>
                            {pUser.phone && (
                              <div className="text-[10px] text-slate-400">
                                โทร: {pUser.phone}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-[9.5px] px-2 py-0.5 rounded-md font-semibold border ${rMeta.color}`}>
                            {rMeta.badge}
                          </span>
                          <span className="text-[9.5px] font-medium text-slate-600 dark:text-slate-400">
                            {dMeta?.short || pUser.department}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingUser(pUser);
                            setIsAddingNew(false);
                          }}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3 text-amber-600" />
                          <span>ปรับสิทธิ์</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(pUser)}
                          className="px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <UserX className="w-3 h-3" />
                          <span>ปฏิเสธ</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApprove(pUser)}
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>อนุมัติการใช้งาน</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Action Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาชื่อ, username, ตำแหน่ง..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            >
              <option value="all">ทุกระดับสิทธิ์</option>
              <option value="admin">Admin</option>
              <option value="nursing_director">หัวหน้ากลุ่มการพยาบาล</option>
              <option value="department_head">หัวหน้าฝ่ายงาน (5 ฝ่าย)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsAddingNew(!isAddingNew);
              setEditingUser(null);
            }}
            className="px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isAddingNew ? 'ปิดแบบฟอร์ม' : '+ เพิ่มผู้ใช้งานใหม่'}</span>
          </button>
        </div>

        {/* Add New User Panel */}
        {isAddingNew && (
          <form onSubmit={handleAddNewSubmit} className="p-4 bg-purple-50/50 dark:bg-purple-950/20 border-b border-purple-100 dark:border-purple-900/50 space-y-3">
            <h3 className="text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4" />
              <span>เพิ่มผู้ใช้งานใหม่เข้าสู่ระบบ</span>
            </h3>

            {formError && (
              <div className="p-2 rounded-lg bg-rose-50 text-rose-700 text-xs">{formError}</div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold mb-1">ชื่อ-นามสกุล *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="เช่น พว. วิไลลักษณ์ อุทัย"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1">Username *</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="เช่น nurse_ipd1"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1">ตำแหน่ง *</label>
                <input
                  type="text"
                  required
                  value={newPosition}
                  onChange={(e) => setNewPosition(e.target.value)}
                  placeholder="เช่น พยาบาลวิชาชีพชำนาญการ"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1">สิทธิการใช้งาน (Role) *</label>
                <select
                  value={newRole}
                  onChange={(e) => {
                    const r = e.target.value as UserRole;
                    setNewRole(r);
                    if (r === 'admin') setNewDept('ALL');
                    else if (r === 'nursing_director') setNewDept('NURSING_DIRECTORATE');
                    else setNewDept('ER');
                  }}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                >
                  <option value="department_head">หัวหน้าฝ่ายงาน (เพิ่ม ลบ แก้ไข พิมพ์เฉพาะฝ่ายตนเอง)</option>
                  <option value="nursing_director">หัวหน้ากลุ่มการพยาบาล (ดูได้ทั้งหมด ห้ามเพิ่ม ลบ แก้ไข)</option>
                  <option value="admin">ผู้ดูแลระบบ (Admin ทำได้ทุกฟังก์ชั่น)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1">ฝ่ายงาน *</label>
                <select
                  disabled={newRole !== 'department_head'}
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value as UserDepartment)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs disabled:opacity-50"
                >
                  <option value="ER">ห้องฉุกเฉิน (ER)</option>
                  <option value="OPD">ผู้ป่วยนอก (OPD)</option>
                  <option value="IPD1">ผู้ป่วยใน 1 (IPD 1)</option>
                  <option value="IPD2">ผู้ป่วยใน 2 (IPD 2)</option>
                  <option value="LR">ห้องคลอด (LR)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1">รหัสผ่านเริ่มต้น</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="หากว่างไว้จะใช้ password123"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-xs"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-4 py-1 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold"
              >
                บันทึกผู้ใช้ใหม่
              </button>
            </div>
          </form>
        )}

        {/* Edit User Panel */}
        {editingUser && (
          <form onSubmit={handleSaveEdit} className="p-4 bg-amber-50/60 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-900/50 space-y-3">
            <h3 className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
              <Edit2 className="w-4 h-4" />
              <span>แก้ไขสิทธิ์และข้อมูลผู้ใช้งาน: {editingUser.name} ({editingUser.username})</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold mb-1">ชื่อ-นามสกุล</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1">ตำแหน่ง</label>
                <input
                  type="text"
                  value={editingUser.position}
                  onChange={(e) => setEditingUser({ ...editingUser, position: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1">ระดับสิทธิ์ (Role)</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => {
                    const r = e.target.value as UserRole;
                    let d = editingUser.department;
                    if (r === 'admin') d = 'ALL';
                    else if (r === 'nursing_director') d = 'NURSING_DIRECTORATE';
                    else if (d === 'ALL' || d === 'NURSING_DIRECTORATE') d = 'ER';
                    setEditingUser({ ...editingUser, role: r, department: d });
                  }}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                >
                  <option value="department_head">หัวหน้าฝ่ายงาน (เพิ่ม ลบ แก้ไข พิมพ์เฉพาะฝ่ายตนเอง)</option>
                  <option value="nursing_director">หัวหน้ากลุ่มการพยาบาล (ดูได้ทั้งหมด ห้ามเพิ่ม ลบ แก้ไข)</option>
                  <option value="admin">ผู้ดูแลระบบ (Admin ทำได้ทุกฟังก์ชั่น)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1">ฝ่ายงาน</label>
                <select
                  disabled={editingUser.role !== 'department_head'}
                  value={editingUser.department}
                  onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value as UserDepartment })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs disabled:opacity-50"
                >
                  <option value="ER">ห้องฉุกเฉิน (ER)</option>
                  <option value="OPD">ผู้ป่วยนอก (OPD)</option>
                  <option value="IPD1">ผู้ป่วยใน 1 (IPD 1)</option>
                  <option value="IPD2">ผู้ป่วยใน 2 (IPD 2)</option>
                  <option value="LR">ห้องคลอด (LR)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1">สถานะการใช้งาน / การอนุมัติ</label>
                <select
                  value={editingUser.isApproved === false ? 'pending' : (editingUser.isActive ? 'active' : 'inactive')}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'active') {
                      setEditingUser({ ...editingUser, isActive: true, isApproved: true });
                    } else if (val === 'pending') {
                      setEditingUser({ ...editingUser, isActive: false, isApproved: false });
                    } else {
                      setEditingUser({ ...editingUser, isActive: false, isApproved: true });
                    }
                  }}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                >
                  <option value="active">เปิดใช้งาน (อนุมัติแล้ว)</option>
                  <option value="pending">รอการอนุมัติ (Pending Approval)</option>
                  <option value="inactive">ระงับการใช้งานชั่วคราว (Suspended)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1">เบอร์โทรติดต่อ</label>
                <input
                  type="text"
                  value={editingUser.phone || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-xs"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-4 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
              >
                บันทึกการแก้ไข
              </button>
            </div>
          </form>
        )}

        {/* User Table */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">ผู้ใช้งาน</th>
                  <th className="py-2.5 px-3">ตำแหน่ง</th>
                  <th className="py-2.5 px-3">ระดับสิทธิ์ (Role)</th>
                  <th className="py-2.5 px-3">ฝ่ายงาน</th>
                  <th className="py-2.5 px-3 text-center">สถานะ</th>
                  <th className="py-2.5 px-3 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredUsers.map((user) => {
                  const roleMeta = ROLE_LABELS[user.role];
                  const deptMeta = DEPARTMENT_LABELS[user.department];
                  const isMasterAdmin = user.username === 'admin';

                  return (
                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-md ${user.avatarColor || 'bg-slate-600'} text-white flex items-center justify-center font-bold text-[10px]`}>
                            {user.name.slice(0, 1)}
                          </span>
                          <div>
                            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              <span>{user.name}</span>
                              {user.id === currentUser?.id && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
                                  คุณ
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">@{user.username}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                        {user.position}
                      </td>

                      <td className="py-2.5 px-3">
                        <span className={`inline-block text-[10px] px-2 py-0.5 rounded-md font-semibold border ${roleMeta.color}`}>
                          {roleMeta.badge}
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                          {deptMeta?.short || user.department}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        {user.isApproved === false || (!user.isActive && user.isApproved !== true) ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shadow-2xs">
                            <Clock className="w-3 h-3 animate-pulse text-amber-600 dark:text-amber-400" />
                            <span>รออนุมัติ</span>
                          </span>
                        ) : (
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            user.isActive
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          }`}>
                            {user.isActive ? 'เปิดใช้งาน' : 'ระงับ'}
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          {(user.isApproved === false || (!user.isActive && user.isApproved !== true)) && (
                            <button
                              type="button"
                              onClick={() => handleApprove(user)}
                              title="อนุมัติสิทธิ์เข้าใช้งาน"
                              className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10.5px] font-bold flex items-center gap-1 transition-all shadow-xs mr-1 cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              <span>อนุมัติ</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingUser(user);
                              setIsAddingNew(false);
                            }}
                            title="แก้ไขสิทธิ์/ข้อมูล"
                            className="p-1 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {!isMasterAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDelete(user)}
                              title="ลบผู้ใช้"
                              className="p-1 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>สิทธิ์การเข้าถึงข้อมูลจะถูกตรวจสอบในหน้าบันทึกค่างานและระบบรายงานตามฝ่ายงานแบบอัตโนมัติ</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-100 font-semibold text-xs"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
};
