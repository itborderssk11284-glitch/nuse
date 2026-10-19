import React, { useState } from 'react';
import { StandardWeightsConfig } from '../types/nursing';
import { DEFAULT_STANDARDS } from '../utils/calculator';
import {
  X,
  SlidersHorizontal,
  RotateCcw,
  Save,
  CheckCircle2,
  Trash2,
  Database,
  Download,
  Upload,
  ShieldCheck,
  Cloud,
  RefreshCw,
  Copy,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import {
  isSupabaseConfigured,
  testSupabaseConnection,
  syncAllLocalToSupabase,
} from '../utils/supabase';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  standardsConfig: StandardWeightsConfig;
  onSaveStandards: (newConfig: StandardWeightsConfig) => void;
  onResetStandards: () => void;
  onClearAllRecords?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  standardsConfig,
  onSaveStandards,
  onResetStandards,
  onClearAllRecords,
}) => {
  const [cfg, setCfg] = useState<StandardWeightsConfig>(JSON.parse(JSON.stringify(standardsConfig)));
  const [savedToast, setSavedToast] = useState(false);
  const [testingSupabase, setTestingSupabase] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [syncingSupabase, setSyncingSupabase] = useState(false);
  const [copySchemaSuccess, setCopySchemaSuccess] = useState(false);

  const supabaseReady = isSupabaseConfigured();

  const handleTestSupabase = async () => {
    setTestingSupabase(true);
    setSupabaseStatus(null);
    try {
      const res = await testSupabaseConnection();
      setSupabaseStatus(res);
    } catch (e: any) {
      setSupabaseStatus({ success: false, message: e.message || 'Error' });
    } finally {
      setTestingSupabase(false);
    }
  };

  const handleSyncSupabase = async () => {
    setSyncingSupabase(true);
    setSupabaseStatus(null);
    try {
      const res = await syncAllLocalToSupabase();
      setSupabaseStatus({ success: res.success, message: res.message });
    } catch (e: any) {
      setSupabaseStatus({ success: false, message: e.message || 'Sync failed' });
    } finally {
      setSyncingSupabase(false);
    }
  };

  const handleCopySchema = () => {
    const sqlSchema = `-- สคริปต์สร้างฐานข้อมูล Supabase PostgreSQL โรงพยาบาลสังขละบุรี
CREATE TABLE IF NOT EXISTS public.daily_records (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    recorder_name TEXT,
    recorder_position TEXT,
    recorder_phone TEXT,
    notes TEXT,
    shift_type TEXT DEFAULT 'all_day',
    er JSONB NOT NULL DEFAULT '{}'::jsonb,
    opd JSONB NOT NULL DEFAULT '{}'::jsonb,
    ipd1 JSONB NOT NULL DEFAULT '{}'::jsonb,
    ipd2 JSONB NOT NULL DEFAULT '{}'::jsonb,
    lr JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_daily_records_date ON public.daily_records(date DESC);

CREATE TABLE IF NOT EXISTS public.standards_config (
    id TEXT PRIMARY KEY DEFAULT 'active_config',
    config JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.hospital_users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    department TEXT NOT NULL,
    position TEXT,
    avatar_color TEXT,
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.hospital_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE public.daily_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.standards_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public all daily_records" ON public.daily_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all standards_config" ON public.standards_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all hospital_users" ON public.hospital_users FOR ALL USING (true) WITH CHECK (true);`;

    navigator.clipboard.writeText(sqlSchema).then(() => {
      setCopySchemaSuccess(true);
      setTimeout(() => setCopySchemaSuccess(false), 2500);
    });
  };

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveStandards(cfg);
    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
      onClose();
    }, 1200);
  };

  const handleReset = () => {
    if (confirm('คุณต้องการคืนค่าเกณฑ์มาตรฐานเริ่มต้นตามกระทรวงสาธารณสุขหรือไม่?')) {
      onResetStandards();
      setCfg(JSON.parse(JSON.stringify(DEFAULT_STANDARDS)));
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 1200);
    }
  };

  const handleExportBackup = () => {
    try {
      const recordsRaw = localStorage.getItem('sangkhlaburi_nursing_records_v2') || '[]';
      const standardsRaw = localStorage.getItem('sangkhlaburi_nursing_standards_v2') || JSON.stringify(cfg);
      const usersRaw = localStorage.getItem('sangkhlaburi_nursing_users_v1') || '[]';

      const backupData = {
        app: 'Sangkhlaburi Hospital Smart Workload System',
        exportedAt: new Date().toISOString(),
        hospital: 'โรงพยาบาลสังขละบุรี',
        records: JSON.parse(recordsRaw),
        standards: JSON.parse(standardsRaw),
        users: JSON.parse(usersRaw),
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `sangkhlaburi_nursing_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch {
      alert('ไม่สามารถส่งออกไฟล์สำรองได้');
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.records && Array.isArray(json.records)) {
          localStorage.setItem('sangkhlaburi_nursing_records_v2', JSON.stringify(json.records));
        }
        if (json.standards) {
          localStorage.setItem('sangkhlaburi_nursing_standards_v2', JSON.stringify(json.standards));
          setCfg(json.standards);
          onSaveStandards(json.standards);
        }
        if (json.users && Array.isArray(json.users)) {
          localStorage.setItem('sangkhlaburi_nursing_users_v1', JSON.stringify(json.users));
        }
        setSavedToast(true);
        setTimeout(() => {
          setSavedToast(false);
          window.location.reload();
        }, 1000);
      } catch {
        alert('ไฟล์สำรองไม่ถูกต้องหรือไม่รองรับ');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-base">ปรับแต่งเกณฑ์เวลามาตรฐาน (Standard Weights)</h3>
              <p className="text-xs text-slate-400">กำหนดค่าน้ำหนักชั่วโมงการพยาบาลสำหรับ รพ.สังขละบุรี</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {savedToast && (
          <div className="bg-emerald-600 text-white px-5 py-2.5 flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-top">
            <CheckCircle2 className="w-4 h-4" />
            <span>บันทึกการตั้งค่าเกณฑ์มาตรฐานเรียบร้อยแล้ว</span>
          </div>
        )}

        <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          
          {/* General Config */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <h4 className="font-bold text-slate-800 dark:text-slate-200">เกณฑ์คำนวณทั่วไป (General)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-500 block mb-1">เวลาปฏิบัติงานจริงสุทธิ/เวร (ชม.)</label>
                <input
                  type="number"
                  step="0.5"
                  value={cfg.general.productiveHoursPerShift}
                  onChange={(e) => setCfg({
                    ...cfg,
                    general: { ...cfg.general, productiveHoursPerShift: parseFloat(e.target.value) || 7.0 },
                  })}
                  className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 font-mono font-bold"
                />
              </div>
              <div>
                <label className="text-slate-500 block mb-1">สัมประสิทธิ์วันหยุด/ลา (DFTE Factor)</label>
                <input
                  type="number"
                  step="0.05"
                  value={cfg.general.dfteReliefFactor}
                  onChange={(e) => setCfg({
                    ...cfg,
                    general: { ...cfg.general, dfteReliefFactor: parseFloat(e.target.value) || 1.25 },
                  })}
                  className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 font-mono font-bold"
                />
              </div>
            </div>
          </div>

          {/* ER Triage Weights */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <h4 className="font-bold text-rose-600 dark:text-rose-400">ER: น้ำหนักเวลาการดูแลผู้ป่วยฉุกเฉิน (ชั่วโมง/ราย)</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="text-slate-500">Triage 1 (แดง-กู้ชีพ)</label>
                <input
                  type="number"
                  step="0.25"
                  value={cfg.er.triage1Hours}
                  onChange={(e) => setCfg({ ...cfg, er: { ...cfg.er, triage1Hours: parseFloat(e.target.value) || 0 } })}
                  className="w-full p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 font-mono"
                />
              </div>
              <div>
                <label className="text-slate-500">Triage 2 (ฉุกเฉินมาก)</label>
                <input
                  type="number"
                  step="0.25"
                  value={cfg.er.triage2Hours}
                  onChange={(e) => setCfg({ ...cfg, er: { ...cfg.er, triage2Hours: parseFloat(e.target.value) || 0 } })}
                  className="w-full p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 font-mono"
                />
              </div>
              <div>
                <label className="text-slate-500">Triage 3 (เร่งด่วน)</label>
                <input
                  type="number"
                  step="0.1"
                  value={cfg.er.triage3Hours}
                  onChange={(e) => setCfg({ ...cfg, er: { ...cfg.er, triage3Hours: parseFloat(e.target.value) || 0 } })}
                  className="w-full p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 font-mono"
                />
              </div>
              <div>
                <label className="text-slate-500">Triage 4 (กึ่งฉุกเฉิน)</label>
                <input
                  type="number"
                  step="0.05"
                  value={cfg.er.triage4Hours}
                  onChange={(e) => setCfg({ ...cfg, er: { ...cfg.er, triage4Hours: parseFloat(e.target.value) || 0 } })}
                  className="w-full p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 font-mono"
                />
              </div>
              <div>
                <label className="text-slate-500">Triage 5 (ไม่ฉุกเฉิน)</label>
                <input
                  type="number"
                  step="0.05"
                  value={cfg.er.triage5Hours}
                  onChange={(e) => setCfg({ ...cfg, er: { ...cfg.er, triage5Hours: parseFloat(e.target.value) || 0 } })}
                  className="w-full p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 font-mono"
                />
              </div>
              <div>
                <label className="text-slate-500">ส่งต่อ Ambulance (Refer)</label>
                <input
                  type="number"
                  step="0.5"
                  value={cfg.er.referralHours}
                  onChange={(e) => setCfg({ ...cfg, er: { ...cfg.er, referralHours: parseFloat(e.target.value) || 0 } })}
                  className="w-full p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 font-mono"
                />
              </div>
            </div>
          </div>

          {/* IPD PCS Weights */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <h4 className="font-bold text-emerald-600 dark:text-emerald-400">IPD: ชั่วโมงการพยาบาลมาตรฐานต่อคนต่อวัน (HPPN)</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="text-slate-500">PCS 1 (Self Care)</label>
                <input
                  type="number"
                  step="0.25"
                  value={cfg.ipd.pcs1HPPN}
                  onChange={(e) => setCfg({ ...cfg, ipd: { ...cfg.ipd, pcs1HPPN: parseFloat(e.target.value) || 0 } })}
                  className="w-full p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 font-mono"
                />
              </div>
              <div>
                <label className="text-slate-500">PCS 2 (Moderate)</label>
                <input
                  type="number"
                  step="0.25"
                  value={cfg.ipd.pcs2HPPN}
                  onChange={(e) => setCfg({ ...cfg, ipd: { ...cfg.ipd, pcs2HPPN: parseFloat(e.target.value) || 0 } })}
                  className="w-full p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 font-mono"
                />
              </div>
              <div>
                <label className="text-slate-500">PCS 3 (Maximum)</label>
                <input
                  type="number"
                  step="0.5"
                  value={cfg.ipd.pcs3HPPN}
                  onChange={(e) => setCfg({ ...cfg, ipd: { ...cfg.ipd, pcs3HPPN: parseFloat(e.target.value) || 0 } })}
                  className="w-full p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 font-mono"
                />
              </div>
              <div>
                <label className="text-slate-500">PCS 4 (Intensive)</label>
                <input
                  type="number"
                  step="0.5"
                  value={cfg.ipd.pcs4HPPN}
                  onChange={(e) => setCfg({ ...cfg, ipd: { ...cfg.ipd, pcs4HPPN: parseFloat(e.target.value) || 0 } })}
                  className="w-full p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 font-mono"
                />
              </div>
              <div>
                <label className="text-slate-500">PCS 5 (Ventilator)</label>
                <input
                  type="number"
                  step="1.0"
                  value={cfg.ipd.pcs5HPPN}
                  onChange={(e) => setCfg({ ...cfg, ipd: { ...cfg.ipd, pcs5HPPN: parseFloat(e.target.value) || 0 } })}
                  className="w-full p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Supabase Cloud PostgreSQL Database Section */}
          <div className="p-4 rounded-xl bg-linear-to-r from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-cyan-950/30 border border-emerald-300 dark:border-emerald-700 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5">
                <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-xs">
                  <div className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center font-black text-[11px] shadow-xs">
                    S
                  </div>
                  <span className="text-emerald-900 dark:text-emerald-200 font-extrabold text-sm">
                    Supabase PostgreSQL Cloud Database
                  </span>
                  {supabaseReady ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold shadow-xs flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      พร้อมใช้งาน (Configured)
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold border border-amber-300">
                      รอตั้งค่าคีย์ใน Environment Variables
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  เชื่อมต่อฐานข้อมูลภายนอกแบบ Relational Database (PostgreSQL) ซิงค์ข้อมูลข้ามเครื่องอัตโนมัติ
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={handleTestSupabase}
                  disabled={testingSupabase}
                  className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-slate-700 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingSupabase ? 'animate-spin text-emerald-600' : ''}`} />
                  <span>{testingSupabase ? 'กำลังตรวจสอบ...' : 'ทดสอบการเชื่อมต่อ'}</span>
                </button>

                {supabaseReady && (
                  <button
                    type="button"
                    onClick={handleSyncSupabase}
                    disabled={syncingSupabase}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <Cloud className={`w-3.5 h-3.5 ${syncingSupabase ? 'animate-bounce' : ''}`} />
                    <span>{syncingSupabase ? 'กำลังซิงค์...' : 'ซิงค์ข้อมูลขึ้น Supabase'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCopySchema}
                  className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>{copySchemaSuccess ? 'คัดลอก SQL แล้ว!' : 'คัดลอก SQL สร้างตาราง'}</span>
                </button>
              </div>
            </div>

            {/* Status Message Alert */}
            {supabaseStatus && (
              <div
                className={`p-2.5 rounded-lg text-xs font-medium flex items-center gap-2 border animate-in fade-in duration-200 ${
                  supabaseStatus.success
                    ? 'bg-emerald-100/80 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
                    : 'bg-amber-100/80 dark:bg-amber-950/70 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                }`}
              >
                {supabaseStatus.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                )}
                <span>{supabaseStatus.message}</span>
              </div>
            )}

            {/* Quick Setup Instructions */}
            <div className="p-3 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-emerald-200 dark:border-emerald-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <span>📋 ขั้นตอนการตั้งค่าเชื่อมต่อ Supabase ง่ายๆ 3 ขั้นตอน:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 pl-1">
                <li>
                  เปิดโปรเจกต์ที่ <span className="font-semibold text-emerald-700 dark:text-emerald-400">supabase.com</span> แล้วไปที่เมนู <strong>SQL Editor</strong>
                </li>
                <li>
                  กดปุ่ม <strong>"คัดลอก SQL สร้างตาราง"</strong> ด้านบน แล้วนำไปวางใน SQL Editor จากนั้นกดปุ่ม <strong>Run</strong> เพื่อสร้างตารางอัตโนมัติ
                </li>
                <li>
                  ไปที่ <strong>Project Settings -&gt; API</strong> นำ <strong>Project URL</strong> และ <strong>anon public key</strong> มาใส่ในไฟล์ <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[10px]">.env</code> หรือ Environment Variables บน Host ของคุณ (<code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[10px]">VITE_SUPABASE_URL</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[10px]">VITE_SUPABASE_ANON_KEY</code>)
                </li>
              </ol>
            </div>
          </div>

          {/* Standalone Hospital Local Database & Backup Section */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 text-xs">
                  <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>ระบบฐานข้อมูลภายในโรงพยาบาลสังขละบุรี (Standalone Local Storage)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                    ปลอดภัยในเครื่อง
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  ระบบทำงานแบบออฟไลน์ 100% บันทึกข้อมูลปลอดภัยในบราวเซอร์ ไม่เชื่อมต่อคลาวด์ภายนอกใดๆ
                </p>
              </div>
            </div>

            {/* Backup & Restore Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleExportBackup}
                className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>สำรองข้อมูลลงเครื่อง (Backup JSON)</span>
              </button>

              <label className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs">
                <Upload className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>กู้คืนข้อมูล (Restore JSON)</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Database Maintenance Section */}
          {onClearAllRecords && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <div className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ล้างข้อมูลบันทึกทั้งหมด (เคลียระบบเป็น 0)</span>
                </div>
                <div className="text-[11px] text-rose-600 dark:text-rose-400">
                  ลบข้อมูลเวรทดสอบทั้งหมดในระบบ เพื่อเริ่มต้นบันทึกข้อมูลจริง
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (confirm('ยืนยัน: คุณต้องการลบข้อมูลเวรทั้งหมดในระบบ และเคลียฐานข้อมูลให้เป็น 0 เพื่อบันทึกข้อมูลจริงใช่หรือไม่?')) {
                    onClearAllRecords();
                    setSavedToast(true);
                    setTimeout(() => setSavedToast(false), 1500);
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
              >
                <Trash2 className="w-3 h-3" />
                <span>เคลียข้อมูลเป็น 0</span>
              </button>
            </div>
          )}

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={handleReset}
              className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>คืนค่ามาตรฐาน สธ.</span>
            </button>

            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>บันทึกเกณฑ์มาตรฐาน</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
