/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DailyRecord, DepartmentKey, StandardWeightsConfig, ActivityTemplate } from './types/nursing';
import {
  formatDateISO,
  getThemePreference,
  loadRecords,
  loadStandards,
  resetStandards,
  saveRecords,
  saveStandards,
  saveThemePreference,
  createNewDailyRecord,
  clearAllRecords,
  FontScale,
  getFontScalePreference,
  saveFontScalePreference,
  loadActivityTemplates,
  saveActivityTemplates,
  addOrUpdateActivityTemplateAndLink,
  deleteActivityTemplateAndLink,
  mergeRecordWithActivityTemplates,
} from './utils/storage';
import { exportToExcel } from './utils/exportUtils';
import { TopNavbar, ActiveTab } from './components/TopNavbar';
import { Dashboard } from './components/Dashboard';
import { DataEntryForm } from './components/DataEntryForm';
import { ReportsView } from './components/ReportsView';
import { CalculationReferenceModal } from './components/CalculationReferenceModal';
import { SettingsModal } from './components/SettingsModal';
import { HospitalLogo } from './components/HospitalLogo';
import { AppUser } from './types/auth';
import { getCurrentSessionUser, setCurrentSessionUser, clearAllTestUsers, saveAllUsers } from './utils/authStorage';
import { AuthScreen } from './components/AuthScreen';
import { UserManagementModal } from './components/UserManagementModal';
import {
  isSupabaseConfigured,
  fetchRecordsFromSupabase,
  saveRecordToSupabase,
  deleteRecordFromSupabase,
  fetchStandardsFromSupabase,
  saveStandardsToSupabase,
  fetchUsersFromSupabase,
  fetchActivityTemplatesFromSupabase,
  saveActivityTemplatesToSupabase,
} from './utils/supabase';
import {
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Sun,
  Moon,
  Eye,
  Calendar,
  Layers,
  UserCheck,
  LogIn,
  LogOut,
  Users,
} from 'lucide-react';

export default function App() {
  // Theme state
  const [isDark, setIsDark] = useState<boolean>(() => getThemePreference() === 'dark');

  // Eye-care Font Scaling state ('normal' | 'comfort' | 'large')
  const [fontScale, setFontScale] = useState<FontScale>(() => getFontScalePreference());

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Pre-selected department when jumping from dashboard to entry form
  const [targetDept, setTargetDept] = useState<DepartmentKey>('ER');

  // Hospital Role-based App User State (หัวหน้ากลุ่มการพยาบาล, หัวหน้าฝ่ายงาน 5 แผนก, Admin)
  const [appUser, setAppUser] = useState<AppUser | null>(() => getCurrentSessionUser());
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);

  // Settings & Standards Modal states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStandardsModalOpen, setIsStandardsModalOpen] = useState(false);

  // Notification Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Data records & standards config (Local Storage)
  const [records, setRecords] = useState<DailyRecord[]>(() => loadRecords());
  const [standardsConfig, setStandardsConfig] = useState<StandardWeightsConfig>(() => loadStandards());
  const [activityTemplates, setActivityTemplates] = useState<ActivityTemplate[]>(() => loadActivityTemplates());

  // Current selected date
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const existing = loadRecords();
    if (existing.length > 0) {
      const sorted = [...existing].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return sorted[0].date;
    }
    return formatDateISO(new Date());
  });

  // Apply dark mode class to html element
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Apply font scale attribute to html element
  useEffect(() => {
    document.documentElement.setAttribute('data-font-scale', fontScale);
  }, [fontScale]);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    saveThemePreference(next ? 'dark' : 'light');
  };

  const handleChangeFontScale = (scale: FontScale) => {
    setFontScale(scale);
    saveFontScalePreference(scale);
  };

  // One-time cleanup: Clear all 7 test accounts and test simulation records to reset database to 0
  useEffect(() => {
    // Purge test users from localStorage
    const rawUsers = localStorage.getItem('sangkhlaburi_nursing_users_v1');
    if (rawUsers) {
      try {
        const parsed = JSON.parse(rawUsers);
        if (Array.isArray(parsed)) {
          const cleanUsers = parsed.filter(
            (u: any) =>
              !['admin', 'director', 'head_er', 'head_opd', 'head_ipd1', 'head_ipd2', 'head_lr'].includes(u.username?.toLowerCase()) &&
              !['user-admin-01', 'user-director-01', 'user-head-er-01', 'user-head-opd-01', 'user-head-ipd1-01', 'user-head-ipd2-01', 'user-head-lr-01'].includes(u.id)
          );
          if (cleanUsers.length !== parsed.length) {
            localStorage.setItem('sangkhlaburi_nursing_users_v1', JSON.stringify(cleanUsers));
          }
        }
      } catch (e) {
        console.error(e);
      }
    }

    // Purge test records from localStorage
    const rawRecs = localStorage.getItem('sangkhlaburi_nursing_records_v2');
    if (rawRecs) {
      try {
        const parsed = JSON.parse(rawRecs);
        if (Array.isArray(parsed)) {
          const cleanRecs = parsed.filter(
            (r: any) => !r.notes?.includes('รพ.พหลฯ') && !r.notes?.includes('สถานการณ์เวรปกติ')
          );
          if (cleanRecs.length !== parsed.length) {
            localStorage.setItem('sangkhlaburi_nursing_records_v2', JSON.stringify(cleanRecs));
            setRecords(cleanRecs);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Auto-sync from Supabase on mount if configured
  useEffect(() => {
    if (isSupabaseConfigured()) {
      fetchRecordsFromSupabase().then((remoteRecords) => {
        if (remoteRecords.length > 0) {
          setRecords(remoteRecords);
          saveRecords(remoteRecords);
          setSelectedDate(remoteRecords[0].date);
        }
      });
      fetchStandardsFromSupabase().then((remoteStds) => {
        if (remoteStds) {
          setStandardsConfig(remoteStds);
          saveStandards(remoteStds);
        }
      });
      fetchUsersFromSupabase().then((remoteUsers) => {
        if (remoteUsers.length > 0) {
          saveAllUsers(remoteUsers);
        }
      });
      // Fetch Activity Templates from Supabase (ส่วนที่ 2: งานรอง และ ส่วนที่ 3: งานสนับสนุน)
      fetchActivityTemplatesFromSupabase().then((remoteTemplates) => {
        if (remoteTemplates && remoteTemplates.length > 0) {
          setActivityTemplates(remoteTemplates);
          saveActivityTemplates(remoteTemplates);
          setRecords((prev) => {
            const merged = prev.map((r) => mergeRecordWithActivityTemplates(r, remoteTemplates));
            saveRecords(merged);
            return merged;
          });
        } else if (isSupabaseConfigured()) {
          const currentTpls = loadActivityTemplates();
          saveActivityTemplatesToSupabase(currentTpls);
        }
      });
    }
  }, []);

  // Re-sync latest records from Supabase whenever user logs in
  useEffect(() => {
    if (appUser && isSupabaseConfigured()) {
      fetchRecordsFromSupabase().then((remoteRecords) => {
        if (remoteRecords.length > 0) {
          setRecords(remoteRecords);
          saveRecords(remoteRecords);
          setSelectedDate(remoteRecords[0].date);
        }
      });
    }
  }, [appUser]);

  // Find or create current active record (always merged with all active activity templates)
  const currentRecord = React.useMemo(() => {
    const found = records.find((r) => r.date === selectedDate);
    if (found) {
      const merged = mergeRecordWithActivityTemplates(found, activityTemplates);
      if (!merged.recorderName && appUser?.name) {
        merged.recorderName = appUser.name;
        merged.recorderPosition = appUser.position || '';
        merged.recorderPhone = appUser.phone || '';
      }
      return merged;
    }
    const fresh = createNewDailyRecord(
      selectedDate,
      appUser?.name || '',
      appUser?.position || '',
      appUser?.phone || ''
    );
    return mergeRecordWithActivityTemplates(fresh, activityTemplates);
  }, [records, selectedDate, appUser, activityTemplates]);

  // Save or update record (Local Storage + Supabase)
  const handleSaveRecord = async (updatedRecord: DailyRecord) => {
    const existingIndex = records.findIndex((r) => r.date === updatedRecord.date);
    let newRecords: DailyRecord[];
    if (existingIndex >= 0) {
      newRecords = [...records];
      newRecords[existingIndex] = updatedRecord;
    } else {
      newRecords = [updatedRecord, ...records];
    }
    setRecords(newRecords);
    saveRecords(newRecords);

    if (isSupabaseConfigured()) {
      const ok = await saveRecordToSupabase(updatedRecord);
      if (ok) {
        setToastMessage('บันทึกข้อมูลและซิงค์ไปยัง Supabase สำเร็จ');
      } else {
        setToastMessage('บันทึกลงในเครื่องเรียบร้อย (Supabase กำลังเชื่อมต่อ)');
      }
    } else {
      setToastMessage('บันทึกข้อมูลเวรลงในเครื่องเรียบร้อยแล้ว');
    }
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Add new date record (Local Storage + Supabase) with all templates pre-linked
  const handleAddNewDateRecord = (dateStr: string) => {
    const existing = records.find((r) => r.date === dateStr);
    if (existing) {
      setSelectedDate(dateStr);
      return;
    }
    const newRec = createNewDailyRecord(
      dateStr,
      appUser?.name || '',
      appUser?.position || '',
      appUser?.phone || ''
    );
    const merged = mergeRecordWithActivityTemplates(newRec, activityTemplates);
    const updated = [merged, ...records];
    setRecords(updated);
    saveRecords(updated);
    if (isSupabaseConfigured()) {
      saveRecordToSupabase(merged);
    }
    setSelectedDate(dateStr);
    setToastMessage(`เพิ่มเวรวันที่ ${dateStr} เรียบร้อยแล้ว (เชื่อมโยงงานรองและงานสนับสนุนครบถ้วน)`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Delete record (Local Storage + Supabase)
  const handleDeleteRecord = async (id: string) => {
    const newRecords = records.filter((r) => r.id !== id);
    setRecords(newRecords);
    saveRecords(newRecords);
    if (newRecords.length > 0) {
      setSelectedDate(newRecords[0].date);
    }
    if (isSupabaseConfigured()) {
      await deleteRecordFromSupabase(id);
    }
    setToastMessage('ลบข้อมูลเวรเรียบร้อยแล้ว');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Handle standard weights update (Local Storage + Supabase)
  const handleSaveStandards = (newConfig: StandardWeightsConfig) => {
    setStandardsConfig(newConfig);
    saveStandards(newConfig);
    if (isSupabaseConfigured()) {
      saveStandardsToSupabase(newConfig);
    }
    setToastMessage('บันทึกเกณฑ์มาตรฐานเรียบร้อยแล้ว');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleResetStandards = () => {
    const reset = resetStandards();
    setStandardsConfig(reset);
    if (isSupabaseConfigured()) {
      saveStandardsToSupabase(reset);
    }
    setToastMessage('คืนค่ามาตรฐาน สธ. เรียบร้อยแล้ว');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Clear all test records to 0 for real data recording
  const handleClearAllRecords = () => {
    clearAllRecords();
    setRecords([]);
    setSelectedDate(formatDateISO(new Date()));
    setToastMessage('ล้างข้อมูลเวรทดสอบทั้งหมดเป็น 0 เรียบร้อย พร้อมบันทึกข้อมูลจริง');
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Master Activity Templates (ส่วนที่ 2: งานรอง และ ส่วนที่ 3: งานสนับสนุน)
  const handleSaveActivityTemplate = async (template: ActivityTemplate, linkAllDates = true) => {
    const { templates: updatedTemplates, updatedRecords } = addOrUpdateActivityTemplateAndLink(template, true);
    setActivityTemplates(updatedTemplates);

    // Merge every recorded date in the system with the new/updated template
    const currentRecs = loadRecords();
    const sourceRecs = currentRecs.length > 0 ? currentRecs : records;
    const allMerged = sourceRecs.map((r) => mergeRecordWithActivityTemplates(r, updatedTemplates));
    setRecords(allMerged);
    saveRecords(allMerged);

    if (isSupabaseConfigured()) {
      await saveActivityTemplatesToSupabase(updatedTemplates);
      for (const rec of allMerged) {
        saveRecordToSupabase(rec);
      }
    }
    setToastMessage(`บันทึกประเภท "${template.name}" ไปยังฐานข้อมูลและเชื่อมโยงกับทุกวันที่บันทึก (${allMerged.length} วัน) สำเร็จ!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleDeleteActivityTemplate = async (templateId: string, removeFromAllDates = true) => {
    const { templates: updatedTemplates, updatedRecords } = deleteActivityTemplateAndLink(templateId, removeFromAllDates);
    setActivityTemplates(updatedTemplates);
    if (removeFromAllDates && updatedRecords.length > 0) {
      setRecords(updatedRecords);
      saveRecords(updatedRecords);
    }
    if (isSupabaseConfigured()) {
      await saveActivityTemplatesToSupabase(updatedTemplates);
      if (removeFromAllDates && updatedRecords.length > 0) {
        for (const rec of updatedRecords) {
          saveRecordToSupabase(rec);
        }
      }
    }
    setToastMessage('ลบประเภทงานออกจากฐานข้อมูลและทุกวันที่บันทึกเรียบร้อย');
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSyncAllDatesWithTemplates = async () => {
    let tpls = activityTemplates;
    if (isSupabaseConfigured()) {
      const remote = await fetchActivityTemplatesFromSupabase();
      if (remote && remote.length > 0) {
        tpls = remote;
        setActivityTemplates(remote);
        saveActivityTemplates(remote);
      }
    }
    const merged = records.map((r) => mergeRecordWithActivityTemplates(r, tpls));
    setRecords(merged);
    saveRecords(merged);
    if (isSupabaseConfigured()) {
      for (const rec of merged) {
        saveRecordToSupabase(rec);
      }
    }
    setToastMessage(`เชื่อมโยงประเภทงานจากฐานข้อมูลกับทุกวันที่บันทึก (${merged.length} วัน) สำเร็จ`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Navigation handlers
  const handleNavigateToEntry = (dept?: string) => {
    if (dept && (dept === 'ER' || dept === 'OPD' || dept === 'IPD1' || dept === 'IPD2' || dept === 'LR')) {
      setTargetDept(dept as DepartmentKey);
    }
    setActiveTab('entry');
  };

  // If no user is logged in, show AuthScreen first
  if (!appUser) {
    return (
      <div className={isDark ? 'dark' : ''}>
        <AuthScreen
          onLoginSuccess={(user) => {
            setCurrentSessionUser(user);
            setAppUser(user);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-emerald-700 text-white shadow-lg shadow-emerald-900/30 text-xs font-medium animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation Bar - Clean, intuitive, full-width ergonomics */}
      <TopNavbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDark={isDark}
        toggleTheme={toggleTheme}
        openSettingsModal={() => setIsSettingsOpen(true)}
        currentDate={selectedDate}
        appUser={appUser}
        onOpenUserManagement={() => setIsUserManagementOpen(true)}
        onLogoutUser={() => {
          setCurrentSessionUser(null);
          setAppUser(null);
          setToastMessage('ออกจากระบบผู้ใช้งานเรียบร้อย');
          setTimeout(() => setToastMessage(null), 3000);
        }}
        fontScale={fontScale}
        onChangeFontScale={handleChangeFontScale}
      />

      {/* Main View Container with Fluid Eye-Care Width */}
      <main className="flex-1 p-3 sm:p-5 lg:p-6 max-w-[1680px] w-full mx-auto">
          {activeTab === 'dashboard' && (
            <Dashboard
              currentRecord={currentRecord}
              records={records}
              onSelectDate={setSelectedDate}
              onNavigateToEntry={handleNavigateToEntry}
              onExportExcel={() => exportToExcel(records, standardsConfig)}
              onOpenStandards={() => setIsStandardsModalOpen(true)}
              standardsConfig={standardsConfig}
            />
          )}

          {activeTab === 'entry' && (
            <DataEntryForm
              currentRecord={currentRecord}
              onSaveRecord={handleSaveRecord}
              onAddNewDateRecord={handleAddNewDateRecord}
              standardsConfig={standardsConfig}
              initialDept={targetDept}
              onOpenStandards={() => setIsSettingsOpen(true)}
              appUser={appUser}
              activityTemplates={activityTemplates}
              onSaveActivityTemplate={handleSaveActivityTemplate}
              onDeleteActivityTemplate={handleDeleteActivityTemplate}
              onSyncAllDatesWithTemplates={handleSyncAllDatesWithTemplates}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              records={records}
              onSelectRecord={(date) => {
                setSelectedDate(date);
                setActiveTab('dashboard');
              }}
              onDeleteRecord={handleDeleteRecord}
              standardsConfig={standardsConfig}
              appUser={appUser}
            />
          )}

          {activeTab === 'standards' && (
            <CalculationReferenceModal
              standardsConfig={standardsConfig}
              isStandaloneTab={true}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="no-print mt-auto border-t border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xs py-4 px-4 sm:px-6 text-xs text-slate-500 dark:text-slate-400">
          <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex items-center gap-2.5">
              <HospitalLogo size={28} />
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  กลุ่มงานการพยาบาล โรงพยาบาลสังขละบุรี
                </span>
                <span className="hidden md:inline text-slate-400"> • Sangkhlaburi Hospital Smart Workload and Workforce Assessment System</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>สังขละบุรี จ.กาญจนบุรี</span>
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>MOPH & TNC Certified</span>
              </span>
              <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {isSupabaseConfigured()
                    ? 'เชื่อมต่อฐานข้อมูล Supabase PostgreSQL (Cloud Active)'
                    : 'ระบบฐานข้อมูลภายในโรงพยาบาลสังขละบุรี (Local / Supabase Ready)'}
                </span>
              </span>
            </div>
          </div>
        </footer>

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        standardsConfig={standardsConfig}
        onSaveStandards={handleSaveStandards}
        onResetStandards={handleResetStandards}
        onClearAllRecords={handleClearAllRecords}
      />

      <CalculationReferenceModal
        isOpen={isStandardsModalOpen}
        onClose={() => setIsStandardsModalOpen(false)}
        standardsConfig={standardsConfig}
      />

      {/* User Management Modal (Admin Feature) */}
      <UserManagementModal
        isOpen={isUserManagementOpen}
        onClose={() => setIsUserManagementOpen(false)}
        currentUser={appUser}
        onUserSessionChanged={() => setAppUser(getCurrentSessionUser())}
      />

    </div>
  );
}
