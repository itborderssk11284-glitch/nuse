import React, { useState } from 'react';
import { HospitalLogo } from './HospitalLogo';
import {
  LayoutDashboard,
  ClipboardPen,
  FileSpreadsheet,
  Calculator,
  Moon,
  Sun,
  SlidersHorizontal,
  Calendar,
  Menu,
  X,
  Eye,
  Cloud,
  RefreshCw,
  LogOut,
  Users,
  Building2,
  CheckCircle2,
  Database,
} from 'lucide-react';
import { AppUser, ROLE_LABELS, DEPARTMENT_LABELS } from '../types/auth';
import { isSupabaseConfigured } from '../utils/supabase';
import { loadAllUsers } from '../utils/authStorage';

export type ActiveTab = 'dashboard' | 'entry' | 'reports' | 'standards';

interface TopNavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isDark: boolean;
  toggleTheme: () => void;
  openSettingsModal: () => void;
  currentDate: string;
  appUser: AppUser;
  onOpenUserManagement: () => void;
  onLogoutUser: () => void;
  fontScale: 'normal' | 'comfort' | 'large';
  onChangeFontScale: (scale: 'normal' | 'comfort' | 'large') => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  activeTab,
  setActiveTab,
  isDark,
  toggleTheme,
  openSettingsModal,
  currentDate,
  appUser,
  onOpenUserManagement,
  onLogoutUser,
  fontScale,
  onChangeFontScale,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const dateObj = new Date(currentDate);
  const thaiDateStr = dateObj.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });

  const navItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'แดชบอร์ดภาพรวม',
      icon: LayoutDashboard,
    },
    {
      id: 'entry' as ActiveTab,
      label: 'บันทึกค่างานพยาบาล',
      icon: ClipboardPen,
    },
    {
      id: 'reports' as ActiveTab,
      label: 'ระบบรายงานสถิติ (A4)',
      icon: FileSpreadsheet,
    },
    {
      id: 'standards' as ActiveTab,
      label: 'เกณฑ์มาตรฐานสภาฯ',
      icon: Calculator,
    },
  ];

  const handleNavClick = (tab: ActiveTab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    onLogoutUser();
  };

  return (
    <>
      <header className="no-print sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 shadow-xs transition-colors">
        <div className="max-w-[1680px] mx-auto px-3 sm:px-5 lg:px-6">
          <div className="flex items-center justify-between h-16 sm:h-[70px] gap-2 lg:gap-4">
            
            {/* Left: Brand Identity */}
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              <HospitalLogo size={38} className="drop-shadow-xs" />
              <div className="hidden min-[480px]:block">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white tracking-tight leading-tight">
                    โรงพยาบาลสังขละบุรี
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hidden sm:inline">
                    Smart Workload
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[280px] lg:max-w-none">
                  ระบบประเมินภาระงานและอัตรากำลังทางการพยาบาล
                </div>
              </div>
            </div>

            {/* Center: Main Navigation Menu (Desktop & Tablet) */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs xl:text-sm font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-700/25 ring-1 ring-emerald-500'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              {/* Admin Button: User Management */}
              {appUser.role === 'admin' && (
                <button
                  type="button"
                  onClick={onOpenUserManagement}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs xl:text-sm font-semibold transition-all bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800 cursor-pointer ml-1 relative"
                >
                  <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>จัดการผู้ใช้งาน</span>
                  {loadAllUsers().filter((u) => u.isApproved === false || (!u.isActive && u.isApproved !== true)).length > 0 ? (
                    <span className="flex items-center gap-1 text-[9.5px] px-1.5 py-0.5 rounded-full bg-amber-500 text-white font-bold animate-pulse shadow-xs">
                      รออนุมัติ ({loadAllUsers().filter((u) => u.isApproved === false || (!u.isActive && u.isApproved !== true)).length})
                    </span>
                  ) : (
                    <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-purple-200 dark:bg-purple-800 text-purple-900 dark:text-purple-100 font-bold">
                      Admin
                    </span>
                  )}
                </button>
              )}
            </nav>

            {/* Right: Date, Utilities & Real User Profile with Logout */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              
              {/* Active Date Badge */}
              <div className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200/80 dark:border-slate-700">
                <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-mono">{thaiDateStr}</span>
              </div>

              {/* Eye-Care Font Scaling */}
              <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 px-1.5 font-medium hidden 2xl:inline flex items-center gap-0.5">
                  <Eye className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>สายตา:</span>
                </span>
                <button
                  type="button"
                  onClick={() => onChangeFontScale('normal')}
                  title="ตัวอักษรปกติ (100%)"
                  className={`px-2 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                    fontScale === 'normal'
                      ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  A
                </button>
                <button
                  type="button"
                  onClick={() => onChangeFontScale('comfort')}
                  title="ตัวอักษรสบายตา (110%)"
                  className={`px-2 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                    fontScale === 'comfort'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  A+
                </button>
                <button
                  type="button"
                  onClick={() => onChangeFontScale('large')}
                  title="ตัวอักษรใหญ่พิเศษ (120%)"
                  className={`px-2 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                    fontScale === 'large'
                  ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  A++
                </button>
              </div>

              {/* Settings Button */}
              <button
                type="button"
                onClick={openSettingsModal}
                title="ตั้งค่าเกณฑ์มาตรฐาน สธ."
                className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden xl:inline">เกณฑ์ สธ.</span>
              </button>

              {/* Dark Mode Switcher */}
              <button
                type="button"
                onClick={toggleTheme}
                title={isDark ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด (ถนอมสายตาเวรดึก)'}
                className="p-2 rounded-xl text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
              </button>

              {/* Database Status Badge (Supabase Cloud or Local) */}
              <button
                type="button"
                onClick={openSettingsModal}
                title={
                  isSupabaseConfigured()
                    ? 'ฐานข้อมูล Supabase PostgreSQL (Cloud Active) - คลิกเพื่อจัดการ'
                    : 'ระบบฐานข้อมูลในเครื่อง (Local Storage) - คลิกเพื่อดูการตั้งค่าเชื่อมต่อ Supabase'
                }
                className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-xs hover:opacity-90"
                style={{
                  backgroundColor: isSupabaseConfigured() ? 'rgba(16, 185, 129, 0.12)' : 'rgba(241, 245, 249, 0.9)',
                  borderColor: isSupabaseConfigured() ? 'rgba(16, 185, 129, 0.4)' : 'rgba(203, 213, 225, 0.8)',
                  color: isSupabaseConfigured() ? '#047857' : '#475569',
                }}
              >
                {isSupabaseConfigured() ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-bold">Supabase Cloud</span>
                  </>
                ) : (
                  <>
                    <Database className="w-3.5 h-3.5 text-slate-500" />
                    <span>ฐานข้อมูลในเครื่อง</span>
                  </>
                )}
              </button>

              {/* User Profile Card & Prominent Logout (Real Production Usage) */}
              <div className="flex items-center pl-1 sm:pl-2 ml-1 border-l border-slate-200 dark:border-slate-700 gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-xl ${appUser.avatarColor || 'bg-emerald-600'} text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs`}
                    title={`${appUser.name} (${appUser.position})`}
                  >
                    {appUser.name.slice(0, 1)}
                  </div>
                  <div className="hidden sm:block text-left leading-tight">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-[150px]">
                      {appUser.name}
                    </div>
                    <div className="flex items-center gap-1 text-[10px]">
                      <span className={`px-1.5 py-0.2 rounded font-medium border ${ROLE_LABELS[appUser.role]?.color}`}>
                        {ROLE_LABELS[appUser.role]?.badge}
                      </span>
                      {appUser.role === 'department_head' && (
                        <span className="text-slate-500 dark:text-slate-400 font-semibold truncate max-w-[80px]">
                          • {DEPARTMENT_LABELS[appUser.department]?.short || appUser.department}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Real Logout Button (No Switch Account Button!) */}
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(true)}
                  title="ออกจากระบบ เพื่อให้ผู้อื่นเข้าใช้งาน"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-semibold transition-all cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden md:inline">ออกจากระบบ</span>
                </button>
              </div>

              {/* Mobile Hamburger Menu Toggle */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 rounded-xl text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                aria-label="Toggle navigation menu"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

            </div>

          </div>
        </div>

        {/* Mobile Navigation Dropdown Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 space-y-2 shadow-lg animate-in slide-in-from-top-2 duration-200">
            {/* User Profile in Mobile Drawer */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl ${appUser.avatarColor || 'bg-emerald-600'} text-white flex items-center justify-center font-bold text-sm shadow-xs`}>
                  {appUser.name.slice(0, 1)}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">{appUser.name}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    {ROLE_LABELS[appUser.role]?.label} {appUser.role === 'department_head' && `• ${DEPARTMENT_LABELS[appUser.department]?.short}`}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setShowLogoutConfirm(true);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 text-xs font-bold flex items-center gap-1 border border-rose-200 dark:border-rose-800"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>ออกจากระบบ</span>
              </button>
            </div>

            {/* Navigation links */}
            <div className="space-y-1 pt-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              {appUser.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenUserManagement();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-purple-600" />
                    <span>จัดการผู้ใช้งานระบบ (Admin)</span>
                  </div>
                  {loadAllUsers().filter((u) => u.isApproved === false || (!u.isActive && u.isApproved !== true)).length > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-white font-bold animate-pulse">
                      รออนุมัติ {loadAllUsers().filter((u) => u.isApproved === false || (!u.isActive && u.isApproved !== true)).length}
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Quick settings in mobile */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  openSettingsModal();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 py-1"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>ตั้งค่าเกณฑ์มาตรฐาน สธ.</span>
              </button>
              <div className="flex items-center gap-1 font-mono text-slate-500">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>{thaiDateStr}</span>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Confirmation Modal before Logging Out (Safe for Production) */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-800">
              <LogOut className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                ยืนยันการออกจากระบบ
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                คุณต้องการออกจากระบบบัญชี <span className="font-semibold text-slate-800 dark:text-slate-200">{appUser.name}</span> ใช่หรือไม่?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-900/20 transition-colors cursor-pointer"
              >
                ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
