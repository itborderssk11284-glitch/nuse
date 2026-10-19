/**
 * Authentication Gatekeeper & User Login / Registration Component
 * โรงพยาบาลสังขละบุรี (Sangkhlaburi Hospital)
 *
 * Requirements:
 * 1. หัวหน้ากลุ่มการพยาบาล: สิทธิดูข้อมูลได้ทั้งหมด แต่ไม่สามารถ เพิ่ม ลบ แก้ไข ข้อมูลได้
 * 2. หัวหน้าฝ่ายงาน: ดูข้อมูล เพิ่ม ลบ แก้ไข พิมพ์รายงาน ได้ แต่ให้สิทธิของฝ่ายงานตัวเองเท่านั้น
 *    (5 user ย่อย: ห้องฉุกเฉิน, ผู้ป่วยนอก, ผู้ป่วยใน 1, ผู้ป่วยใน 2, ห้องคลอด)
 * 3. สิทธิ Admin: ทำได้ทุกฟังก์ชั่น
 * 4. หน้า Login / สมัครเข้าใช้งานระบบ ก่อนเข้าบันทึกข้อมูลหน้าเว็ป
 */

import React, { useState, useEffect } from 'react';
import { AppUser, UserRole, UserDepartment, ROLE_LABELS, DEPARTMENT_LABELS } from '../types/auth';
import {
  authenticateUser,
  registerNewUser,
  loadAllUsers,
  saveAllUsers,
} from '../utils/authStorage';
import {
  isSupabaseConfigured,
  fetchUsersFromSupabase,
  saveUserToSupabase,
} from '../utils/supabase';
import { HospitalLogo } from './HospitalLogo';
import {
  LogIn,
  UserPlus,
  ShieldCheck,
  Ambulance,
  Stethoscope,
  BedDouble,
  Baby,
  Layers,
  KeyRound,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  X,
  Phone,
  Mail,
  Building2,
  Lock,
  Database,
  RefreshCw,
} from 'lucide-react';

interface AuthScreenProps {
  onLoginSuccess: (user: AppUser) => void;
  isModal?: boolean;
  onCloseModal?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onLoginSuccess,
  isModal = false,
  onCloseModal,
}) => {
  const [authTab, setAuthTab] = useState<'login' | 'register'>(() => {
    const existing = loadAllUsers();
    return existing.length === 0 ? 'register' : 'login';
  });

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPosition, setRegPosition] = useState('พยาบาลวิชาชีพชำนาญการ');
  const [regRole, setRegRole] = useState<UserRole>('department_head');
  const [regDept, setRegDept] = useState<UserDepartment>('ER');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  // Supabase cloud user sync states
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);
  const [supabaseUsersCount, setSupabaseUsersCount] = useState<number | null>(null);

  // Auto-sync users from Supabase on mount so ANY computer can login immediately
  useEffect(() => {
    if (isSupabaseConfigured()) {
      setIsSyncingSupabase(true);
      fetchUsersFromSupabase()
        .then((remoteUsers) => {
          if (remoteUsers.length > 0) {
            saveAllUsers(remoteUsers);
            setSupabaseUsersCount(remoteUsers.length);
            setAuthTab('login');
          }
        })
        .catch((err) => {
          console.error('Failed to load users from Supabase:', err);
        })
        .finally(() => {
          setIsSyncingSupabase(false);
        });
    }
  }, []);

  // Handle Login submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!loginUsername.trim()) {
      setLoginError('กรุณากรอกชื่อผู้ใช้งาน หรือรหัสพนักงาน');
      return;
    }

    // 1. Try local authentication first
    let user = authenticateUser(loginUsername, loginPassword);

    // 2. If not found locally, fetch fresh from Supabase to support cross-device logins
    if (!user && isSupabaseConfigured()) {
      setIsSyncingSupabase(true);
      try {
        const remoteUsers = await fetchUsersFromSupabase();
        if (remoteUsers.length > 0) {
          saveAllUsers(remoteUsers);
          setSupabaseUsersCount(remoteUsers.length);
          user = authenticateUser(loginUsername, loginPassword);
        }
      } catch (err) {
        console.error('Failed to sync users during login:', err);
      } finally {
        setIsSyncingSupabase(false);
      }
    }

    if (!user) {
      setLoginError('ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง (หากยังไม่มีบัญชี กรุณากดแท็บ สมัครเข้าใช้งานระบบ)');
      return;
    }

    onLoginSuccess(user);
  };

  // Handle Registration submission
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);

    // Validation
    if (!regName.trim()) {
      setRegError('กรุณากรอกชื่อ-นามสกุล');
      return;
    }
    if (!regUsername.trim()) {
      setRegError('กรุณากำหนดชื่อผู้ใช้งาน (Username/รหัสพนักงาน)');
      return;
    }
    if (regPassword.length > 0 && regPassword.length < 4) {
      setRegError('รหัสผ่านควรมีความยาวอย่างน้อย 4 ตัวอักษร');
      return;
    }

    // Role-department alignment
    let finalDept = regDept;
    if (regRole === 'admin') {
      finalDept = 'ALL';
    } else if (regRole === 'nursing_director') {
      finalDept = 'NURSING_DIRECTORATE';
    }

    const result = registerNewUser({
      name: regName,
      username: regUsername,
      password: regPassword || 'password123',
      position: regPosition,
      role: regRole,
      department: finalDept,
      phone: regPhone,
      email: regEmail,
    });

    if (!result.success) {
      setRegError(result.message);
      return;
    }

    // Auto-sync newly created user to Supabase
    if (result.user && isSupabaseConfigured()) {
      saveUserToSupabase(result.user).catch((e) =>
        console.error('Failed to sync new user to Supabase:', e)
      );
    }

    if (result.user) {
      setRegSuccess('สมัครสมาชิกสำเร็จ กำลังเข้าสู่ระบบ...');
      setTimeout(() => {
        onLoginSuccess(result.user!);
      }, 700);
    }
  };

  return (
    <div
      className={`${
        isModal
          ? 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-sm overflow-y-auto'
          : 'min-h-screen bg-linear-to-br from-slate-50 via-emerald-50/20 to-teal-50 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/30 flex items-center justify-center p-3 sm:p-6'
      }`}
    >
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header Banner */}
        <div className="relative bg-linear-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white px-5 sm:px-8 py-6">
          {isModal && onCloseModal && (
            <button
              type="button"
              onClick={onCloseModal}
              className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
            <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-inner">
              <HospitalLogo size={56} />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-700/60 border border-emerald-400/30 text-emerald-100 text-xs font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                  <span>ระบบยืนยันตัวตนและกำหนดสิทธิการเข้าถึง (RBAC)</span>
                </div>
                {isSupabaseConfigured() && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-400/40 text-emerald-200 text-xs font-semibold shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Supabase Cloud ออนไลน์</span>
                    {supabaseUsersCount !== null && (
                      <span className="text-[10px] bg-emerald-800/80 px-1.5 py-0.5 rounded-full font-mono">
                        {supabaseUsersCount} บัญชี
                      </span>
                    )}
                    {isSyncingSupabase && (
                      <RefreshCw className="w-3 h-3 animate-spin text-emerald-300" />
                    )}
                  </div>
                )}
              </div>
              <h1 className="text-lg sm:text-2xl font-bold tracking-tight">
                Sangkhlaburi Hospital Smart Workload System
              </h1>
              <p className="text-emerald-100/90 text-xs sm:text-sm mt-0.5">
                ระบบประเมินภาระงานและบริหารจัดการอัตรากำลังทางการพยาบาล 3 ส่วน โรงพยาบาลสังขละบุรี
              </p>
            </div>
          </div>

          {/* Navigation Tabs (Login / Register) */}
          <div className="flex items-center gap-2 mt-6 pt-2 border-t border-white/15">
            <button
              type="button"
              onClick={() => setAuthTab('login')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                authTab === 'login'
                  ? 'bg-white text-emerald-900 shadow-md font-bold'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>เข้าสู่ระบบ (Sign In)</span>
            </button>
            <button
              type="button"
              onClick={() => setAuthTab('register')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                authTab === 'register'
                  ? 'bg-white text-emerald-900 shadow-md font-bold'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>สมัครเข้าใช้งานระบบ (Register)</span>
            </button>
          </div>
        </div>

        {/* Tab 1: เข้าสู่ระบบ (Login) */}
        {authTab === 'login' && (
          <div className="p-5 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
              
              {/* Left Column: Direct Login Form */}
              <div className="lg:col-span-5 space-y-4">
                <div>
                  <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>กรอกข้อมูลเข้าสู่ระบบ</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    ลงชื่อเข้าใช้ด้วยชื่อผู้ใช้ / รหัสพนักงาน หรืออีเมล
                  </p>
                </div>

                {loginError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      ชื่อผู้ใช้งาน (Username) / อีเมล
                    </label>
                    <input
                      type="text"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      placeholder="เช่น รหัสพนักงาน หรือ Username"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        รหัสผ่าน (Password)
                      </label>
                      <span className="text-[11px] text-slate-400">(ระบุรหัสผ่านของท่าน)</span>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder:text-slate-400 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-emerald-900/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>เข้าสู่ระบบ</span>
                  </button>
                </form>
              </div>

              {/* Right Column: Hospital Access Control Guidelines & Registration Callout (Production Ready) */}
              <div className="lg:col-span-7 bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>โครงสร้างสิทธิ์การเข้าใช้งานระบบ (Nursing RBAC)</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      ระบบพร้อมสำหรับการบันทึกข้อมูลจริง โรงพยาบาลสังขละบุรี
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    ข้อมูลจริง (Production)
                  </span>
                </div>

                <div className="space-y-2.5">
                  {/* Role 1: Nursing Director */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                          1
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          หัวหน้ากลุ่มการพยาบาล (Nursing Directorate)
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        ดูข้อมูลอย่างเดียว
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-8 leading-relaxed">
                      มีสิทธิ์ดูข้อมูลสถิติ วิเคราะห์ภาระงานและอัตรากำลังของทุกฝ่ายงาน แต่ไม่สามารถเพิ่ม ลบ หรือแก้ไขข้อมูลได้
                    </p>
                  </div>

                  {/* Role 2: Department Heads */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                          2
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          หัวหน้าฝ่ายงาน (5 แผนกย่อย)
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        สิทธิ์เฉพาะฝ่ายตนเอง
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-8 leading-relaxed">
                      แบ่งเป็น 5 แผนก: <strong className="text-slate-700 dark:text-slate-300">ห้องฉุกเฉิน • ผู้ป่วยนอก • ผู้ป่วยใน 1 • ผู้ป่วยใน 2 • ห้องคลอด</strong> — มีสิทธิ์ดูข้อมูล เพิ่ม ลบ แก้ไข และพิมพ์รายงาน A4 เฉพาะฝ่ายงานของตนเอง
                    </p>
                  </div>

                  {/* Role 3: Admin */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-xs">
                          3
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          ผู้ดูแลระบบ (Admin)
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        สิทธิ์เต็มรูปแบบ
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-8 leading-relaxed">
                      ทำได้ทุกฟังก์ชัน ทั้งบันทึกค่างาน กำหนดเกณฑ์มาตรฐานสภาฯ ดูรายงาน และจัดการบัญชีผู้ใช้งานระบบ
                    </p>
                  </div>
                </div>

                {/* Callout to Register */}
                <div className="pt-2">
                  <div className="p-3.5 rounded-xl bg-linear-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                        <UserPlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>ยังไม่มีบัญชีผู้ใช้งานระบบใช่หรือไม่?</span>
                      </div>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                        คลิกเพื่อลงทะเบียนชื่อ-สกุล และเลือกฝ่ายงานของท่านเพื่อเริ่มต้นบันทึกข้อมูล
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAuthTab('register')}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all whitespace-nowrap cursor-pointer"
                    >
                      สมัครเข้าใช้งานระบบ
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab 2: สมัครเข้าใช้งานระบบ (Register) */}
        {authTab === 'register' && (
          <div className="p-5 sm:p-8 space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>สมัครเข้าใช้งานระบบบุคลากรทางการพยาบาล</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                กรอกข้อมูลส่วนบุคคลและระบุฝ่ายงานเพื่อกำหนดสิทธิ์การบันทึกข้อมูลอย่างถูกต้อง
              </p>
            </div>

            {regError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{regError}</span>
              </div>
            )}

            {regSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{regSuccess}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ชื่อ-นามสกุล <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="เช่น พว. สุดาพร ใจมั่น"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Username */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ชื่อผู้ใช้งาน / รหัสพนักงาน (Username) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="เช่น nurse_er01 หรือ 105432"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    รหัสผ่าน (Password)
                  </label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="หากว่างไว้จะใช้ password123"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Position */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ตำแหน่งทางการพยาบาล <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={regPosition}
                    onChange={(e) => setRegPosition(e.target.value)}
                    placeholder="เช่น พยาบาลวิชาชีพชำนาญการ, หัวหน้าเวร"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Role Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    สิทธิการใช้งาน (Role Permissions) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={regRole}
                    onChange={(e) => {
                      const newRole = e.target.value as UserRole;
                      setRegRole(newRole);
                      if (newRole === 'admin') setRegDept('ALL');
                      else if (newRole === 'nursing_director') setRegDept('NURSING_DIRECTORATE');
                      else if (regDept === 'ALL' || regDept === 'NURSING_DIRECTORATE') setRegDept('ER');
                    }}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="department_head">2. หัวหน้าฝ่ายงาน (เพิ่ม ลบ แก้ไข พิมพ์รายงานเฉพาะฝ่ายตนเอง)</option>
                    <option value="nursing_director">1. หัวหน้ากลุ่มการพยาบาล (ดูข้อมูลได้ทั้งหมด แต่ห้ามเพิ่ม ลบ แก้ไข)</option>
                    <option value="admin">3. ผู้ดูแลระบบ (Admin - ทำได้ทุกฟังก์ชั่น)</option>
                  </select>
                </div>

                {/* Department Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ฝ่ายงาน / หอผู้ป่วยประจำสังกัด <span className="text-rose-500">*</span>
                  </label>
                  <select
                    disabled={regRole === 'admin' || regRole === 'nursing_director'}
                    value={regDept}
                    onChange={(e) => setRegDept(e.target.value as UserDepartment)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                  >
                    <option value="ER">ห้องฉุกเฉิน (ER - Emergency Room)</option>
                    <option value="OPD">ผู้ป่วยนอก (OPD - Outpatient)</option>
                    <option value="IPD1">ผู้ป่วยใน 1 (IPD 1 - สามัญ/หญิง-เด็ก)</option>
                    <option value="IPD2">ผู้ป่วยใน 2 (IPD 2 - ชาย/พิเศษ)</option>
                    <option value="LR">ห้องคลอด (LR - Labor Room)</option>
                    {regRole === 'nursing_director' && (
                      <option value="NURSING_DIRECTORATE">กลุ่มงานการพยาบาล (บริหาร)</option>
                    )}
                    {regRole === 'admin' && (
                      <option value="ALL">โรงพยาบาลสังขละบุรี (ทุกฝ่ายงาน)</option>
                    )}
                  </select>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    เบอร์โทรศัพท์ติดต่อ / เบอร์ภายใน
                  </label>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="เช่น 034-595034 หรือ 081-xxx-xxxx"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    อีเมลราชการ / ส่วนตัว
                  </label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="เช่น nurse@sangkhla.moph.go.th"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

              </div>

              {/* Role explanation summary */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>สรุปสิทธิการเข้าถึงของบัญชีนี้:</span>
                </span>
                <p className="text-slate-600 dark:text-slate-400 pl-5">
                  {regRole === 'nursing_director' &&
                    '• สิทธิหัวหน้ากลุ่มการพยาบาล: ตรวจสอบและดูข้อมูลภาพรวมได้ทุกฝ่ายงาน แต่ไม่สามารถ เพิ่ม ลบ หรือแก้ไขข้อมูลได้'}
                  {regRole === 'department_head' &&
                    `• สิทธิหัวหน้าฝ่ายงาน: สามารถดูข้อมูล เพิ่ม ลบ แก้ไข และพิมพ์รายงานได้เฉพาะ "${DEPARTMENT_LABELS[regDept]?.short || regDept}" เท่านั้น`}
                  {regRole === 'admin' &&
                    '• สิทธิผู้ดูแลระบบ (Admin): สามารถทำได้ทุกฟังก์ชัน ทั้งบันทึก ลบ แก้ไข กำหนดเกณฑ์ และจัดการผู้ใช้งาน'}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAuthTab('login')}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-all"
                >
                  ยกเลิก / กลับไปเข้าสู่ระบบ
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md shadow-emerald-900/20 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>ยืนยันสมัครสมาชิกและเข้าสู่ระบบทันที</span>
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
