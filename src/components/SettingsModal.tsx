import React, { useState } from 'react';
import { StandardWeightsConfig, ActivityTemplate, DepartmentKey } from '../types/nursing';
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
  Plus,
  Search,
  Edit2,
  Link2,
  Layers,
  RotateCw,
  ListFilter,
  Check,
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
  activityTemplates?: ActivityTemplate[];
  onSaveActivityTemplate?: (template: ActivityTemplate, linkAllDates?: boolean) => Promise<void>;
  onDeleteActivityTemplate?: (templateId: string, removeFromAllDates?: boolean) => Promise<void>;
  onSyncAllDatesWithTemplates?: () => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  standardsConfig,
  onSaveStandards,
  onResetStandards,
  onClearAllRecords,
  activityTemplates = [],
  onSaveActivityTemplate,
  onDeleteActivityTemplate,
  onSyncAllDatesWithTemplates,
}) => {
  const [activeTab, setActiveTab] = useState<'weights' | 'templates' | 'database'>('weights');
  const [cfg, setCfg] = useState<StandardWeightsConfig>(JSON.parse(JSON.stringify(standardsConfig)));
  const [savedToast, setSavedToast] = useState(false);
  const [toastText, setToastText] = useState('บันทึกการตั้งค่าเกณฑ์มาตรฐานเรียบร้อยแล้ว');
  const [testingSupabase, setTestingSupabase] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [syncingSupabase, setSyncingSupabase] = useState(false);
  const [copySchemaSuccess, setCopySchemaSuccess] = useState(false);

  // Activity Templates Tab states
  const [tplSearch, setTplSearch] = useState('');
  const [tplPartFilter, setTplPartFilter] = useState<'all' | 'indirect' | 'support'>('all');
  const [tplDeptFilter, setTplDeptFilter] = useState<'all' | DepartmentKey | 'ALL'>('all');
  const [syncingTemplates, setSyncingTemplates] = useState(false);
  const [isEditingTemplate, setIsEditingTemplate] = useState<ActivityTemplate | null>(null);
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);

  // New Template form state
  const [formPart, setFormPart] = useState<'indirect' | 'support'>('indirect');
  const [formName, setFormName] = useState('');
  const [formDept, setFormDept] = useState<DepartmentKey | 'ALL'>('ALL');
  const [formUnitTime, setFormUnitTime] = useState(15);
  const [formUnitLabel, setFormUnitLabel] = useState('ครั้ง');
  const [formCategory, setFormCategory] = useState('custom');
  const [formNote, setFormNote] = useState('');
  const [formFreqType, setFormFreqType] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [formFreqCount, setFormFreqCount] = useState(1);

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

  const handleSaveTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('กรุณาระบุชื่อประเภทงาน');
      return;
    }
    const templateData: ActivityTemplate = {
      id: isEditingTemplate ? isEditingTemplate.id : `tpl-${formPart}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      workloadPart: formPart,
      name: formName.trim(),
      department: formDept,
      unitTimeMinutes: formUnitTime,
      unitLabel: formUnitLabel.trim() || (formPart === 'support' ? 'ครั้ง' : 'ราย'),
      category: formCategory,
      frequencyType: formFreqType,
      defaultFrequencyCount: formFreqCount,
      note: formNote.trim(),
      isActive: true,
      isSystemDefault: isEditingTemplate?.isSystemDefault ?? false,
    };

    if (onSaveActivityTemplate) {
      await onSaveActivityTemplate(templateData, true);
    }
    setIsAddingTemplate(false);
    setIsEditingTemplate(null);
    setToastText(`บันทึกประเภท "${templateData.name}" ลงฐานข้อมูลและเชื่อมโยงทุกวันสำเร็จ!`);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  const handleStartEditTemplate = (tpl: ActivityTemplate) => {
    setIsEditingTemplate(tpl);
    setIsAddingTemplate(true);
    setFormPart(tpl.workloadPart);
    setFormName(tpl.name);
    setFormDept(tpl.department);
    setFormUnitTime(tpl.unitTimeMinutes);
    setFormUnitLabel(tpl.unitLabel || 'ครั้ง');
    setFormCategory(tpl.category);
    setFormNote(tpl.note || '');
    setFormFreqType(tpl.frequencyType || 'daily');
    setFormFreqCount(tpl.defaultFrequencyCount || 1);
  };

  const handleDeleteTemplateClick = async (tpl: ActivityTemplate) => {
    if (confirm(`คุณต้องการลบประเภทงาน "${tpl.name}" ออกจากฐานข้อมูลและทุกวันที่บันทึกไว้ในระบบใช่หรือไม่?`)) {
      if (onDeleteActivityTemplate) {
        await onDeleteActivityTemplate(tpl.id, true);
      }
      setToastText(`ลบประเภทงาน "${tpl.name}" ออกจากระบบและทุกวันเรียบร้อย`);
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2500);
    }
  };

  const handleReSyncTemplates = async () => {
    if (onSyncAllDatesWithTemplates) {
      setSyncingTemplates(true);
      await onSyncAllDatesWithTemplates();
      setSyncingTemplates(false);
      setToastText('เชื่อมโยงและซิงค์ประเภทงานจากฐานข้อมูลกับทุกวันที่บันทึกเรียบร้อย');
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2500);
    }
  };

  const filteredTemplates = activityTemplates.filter((t) => {
    const matchSearch =
      t.name.toLowerCase().includes(tplSearch.toLowerCase()) ||
      (t.note && t.note.toLowerCase().includes(tplSearch.toLowerCase()));
    const matchPart = tplPartFilter === 'all' || t.workloadPart === tplPartFilter;
    const matchDept = tplDeptFilter === 'all' || t.department === tplDeptFilter || t.department === 'ALL';
    return matchSearch && matchPart && matchDept;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                <span>การตั้งค่าระบบและคลังประเภทงาน</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  รพ.สังขละบุรี
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">กำหนดเกณฑ์เวลามาตรฐาน, คลังประเภทงานรอง/งานสนับสนุน, และฐานข้อมูล</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 pt-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('weights')}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'weights'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 border-emerald-600 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>เกณฑ์เวลามาตรฐาน (Standard Weights)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'templates'
                ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 border-blue-600 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>คลังประเภทงานรอง & สนับสนุน (ส่วนที่ 2 & 3)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-black">
              {activityTemplates.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('database')}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'database'
                ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-400 border-purple-600 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>ฐานข้อมูล Supabase & สำรองข้อมูล</span>
          </button>
        </div>

        {savedToast && (
          <div className="bg-emerald-600 text-white px-5 py-2 flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-top">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastText}</span>
          </div>
        )}

        {/* Tab 1: Standard Weights Form */}
        {activeTab === 'weights' && (
          <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          
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

          <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={handleReset}
              className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>คืนค่ามาตรฐาน สธ.</span>
            </button>

            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>บันทึกเกณฑ์มาตรฐาน</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Activity Templates Catalog (ส่วนที่ 2 & ส่วนที่ 3) */}
      {activeTab === 'templates' && (
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Banner info */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50/60 to-purple-50 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-purple-950/40 border border-blue-200/80 dark:border-blue-800/60 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>คลังประเภทงานรอง (ส่วนที่ 2) และงานสนับสนุน (ส่วนที่ 3)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800">
                    Cloud Sync & Auto-Link
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-snug">
                  ประเภทงานที่เพิ่มหรือแก้ไขในคลังนี้ จะบันทึกลงในฐานข้อมูล <strong>Supabase (Cloud)</strong> และเชื่อมโยงกับทุกวันที่บันทึกในระบบ เพื่อให้พยาบาลทุกเวรทุกวันสามารถกรอกข้อมูลได้ทันที
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleReSyncTemplates}
                  disabled={syncingTemplates}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                  title="ซิงค์และเชื่อมโยงประเภทงานจากฐานข้อมูลเข้ากับทุกวันที่บันทึก"
                >
                  <RotateCw className={`w-3.5 h-3.5 text-blue-600 ${syncingTemplates ? 'animate-spin' : ''}`} />
                  <span>{syncingTemplates ? 'กำลังเชื่อมโยง...' : 'เชื่อมโยงทุกวัน'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsEditingTemplate(null);
                    setFormName('');
                    setFormNote('');
                    setFormUnitTime(15);
                    setFormUnitLabel('ครั้ง');
                    setIsAddingTemplate(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>เพิ่มประเภทงานใหม่</span>
                </button>
              </div>
            </div>
          </div>

          {/* Filter toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อประเภทงาน หรือคำอธิบาย..."
                  value={tplSearch}
                  onChange={(e) => setTplSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-lg bg-slate-200 dark:bg-slate-700 p-0.5 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setTplPartFilter('all')}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                    tplPartFilter === 'all'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  ทั้งหมด ({activityTemplates.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTplPartFilter('indirect')}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                    tplPartFilter === 'indirect'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  ส่วนที่ 2: งานรอง ({activityTemplates.filter((t) => t.workloadPart === 'indirect').length})
                </button>
                <button
                  type="button"
                  onClick={() => setTplPartFilter('support')}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                    tplPartFilter === 'support'
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  ส่วนที่ 3: งานสนับสนุน ({activityTemplates.filter((t) => t.workloadPart === 'support').length})
                </button>
              </div>

              <select
                value={tplDeptFilter}
                onChange={(e) => setTplDeptFilter(e.target.value as any)}
                className="px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg font-medium text-slate-700 dark:text-slate-200"
              >
                <option value="all">ทุกฝ่ายงาน</option>
                <option value="ALL">ใช้ได้ทุกฝ่าย (ALL)</option>
                <option value="ER">ห้องฉุกเฉิน (ER)</option>
                <option value="OPD">ผู้ป่วยนอก (OPD)</option>
                <option value="IPD1">ผู้ป่วยใน 1 (IPD1)</option>
                <option value="IPD2">ผู้ป่วยใน 2 (IPD2)</option>
                <option value="LR">ห้องคลอด (LR)</option>
              </select>
            </div>
          </div>

          {/* Inline Add / Edit Panel */}
          {isAddingTemplate && (
            <form
              onSubmit={handleSaveTemplateSubmit}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-blue-400 dark:border-blue-600 shadow-md space-y-3 animate-in fade-in zoom-in-95"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  {isEditingTemplate ? <Edit2 className="w-4 h-4 text-amber-500" /> : <Plus className="w-4 h-4 text-blue-600" />}
                  <span>{isEditingTemplate ? `แก้ไขประเภทงาน "${isEditingTemplate.name}"` : 'เพิ่มประเภทงานใหม่ลงฐานข้อมูลกลาง'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingTemplate(false);
                    setIsEditingTemplate(null);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    ส่วนงาน (Workload Part) *
                  </label>
                  <select
                    value={formPart}
                    onChange={(e) => setFormPart(e.target.value as 'indirect' | 'support')}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 font-semibold"
                  >
                    <option value="indirect">ส่วนที่ 2: งานรอง (Indirect Nursing Care)</option>
                    <option value="support">ส่วนที่ 3: งานสนับสนุน (Support Work / Ward Management)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    ขอบเขตฝ่ายงานที่ใช้งานได้ *
                  </label>
                  <select
                    value={formDept}
                    onChange={(e) => setFormDept(e.target.value as any)}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 font-semibold"
                  >
                    <option value="ALL">ใช้ได้ทุกฝ่ายงาน (ER, OPD, IPD1, IPD2, LR)</option>
                    <option value="ER">เฉพาะห้องฉุกเฉิน (ER)</option>
                    <option value="OPD">เฉพาะผู้ป่วยนอก (OPD)</option>
                    <option value="IPD1">เฉพาะผู้ป่วยใน 1 (IPD1)</option>
                    <option value="IPD2">เฉพาะผู้ป่วยใน 2 (IPD2)</option>
                    <option value="LR">เฉพาะห้องคลอด (LR)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    ชื่อประเภทกิจกรรม / ชื่องาน *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น เตรียมชุดหัตถการพิเศษ, ตรวจนับคลังสารน้ำประจำสัปดาห์, IC Surveillance"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    เวลามาตรฐานต่อหน่วย/ครั้ง (นาที) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formUnitTime}
                    onChange={(e) => setFormUnitTime(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 font-mono font-bold text-blue-600"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    หน่วยนับปริมาณงาน
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ราย, ครั้ง, เคส, กะ, เวร"
                    value={formUnitLabel}
                    onChange={(e) => setFormUnitLabel(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 font-medium"
                  />
                </div>

                {formPart === 'support' && (
                  <>
                    <div>
                      <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        รอบความถี่การปฏิบัติ
                      </label>
                      <select
                        value={formFreqType}
                        onChange={(e) => setFormFreqType(e.target.value as any)}
                        className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 font-semibold"
                      >
                        <option value="daily">รายวัน (Daily)</option>
                        <option value="weekly">รายสัปดาห์ (Weekly)</option>
                        <option value="monthly">รายเดือน (Monthly)</option>
                        <option value="custom">ตามรอบเฉพาะกิจ</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        จำนวนครั้งมาตรฐานตามรอบ
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formFreqCount}
                        onChange={(e) => setFormFreqCount(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 font-mono font-bold"
                      />
                    </div>
                  </>
                )}

                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    คำอธิบาย / รายละเอียดกิจกรรม
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ขั้นตอนและขอบเขตงาน เพื่อให้ทุกเวรปฏิบัติเป็นแนวทางเดียวกัน"
                    value={formNote}
                    onChange={(e) => setFormNote(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center gap-2 text-[11px] text-blue-800 dark:text-blue-300">
                <Check className="w-4 h-4 shrink-0 text-blue-600" />
                <span>
                  เมื่อคลิกบันทึก ระบบจะบันทึกลง <strong>Supabase PostgreSQL</strong> และเชื่อมโยง (Link) เข้าสู่ทุกวันที่บันทึกไว้ในระบบทันที
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingTemplate(false);
                    setIsEditingTemplate(null);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>บันทึกลงฐานข้อมูลและเชื่อมโยงทุกวัน</span>
                </button>
              </div>
            </form>
          )}

          {/* Templates Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
            <table className="w-full text-left border-collapse text-xs min-w-[720px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">ประเภทกิจกรรม</th>
                  <th className="py-2.5 px-3 text-center w-28">ส่วนงาน</th>
                  <th className="py-2.5 px-3 text-center w-28">ฝ่ายงาน</th>
                  <th className="py-2.5 px-3 text-center w-28">เวลามาตรฐาน</th>
                  <th className="py-2.5 px-3 text-center w-24">ฐานข้อมูล</th>
                  <th className="py-2.5 px-3 text-center w-20">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTemplates.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      ไม่พบประเภทงานที่ค้นหา
                    </td>
                  </tr>
                ) : (
                  filteredTemplates.map((tpl, idx) => {
                    const isIndirect = tpl.workloadPart === 'indirect';
                    return (
                      <tr
                        key={tpl.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-2 px-3 text-center font-mono text-slate-400 text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-bold text-slate-800 dark:text-slate-100">
                            {tpl.name}
                          </div>
                          {tpl.note && (
                            <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                              {tpl.note}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                              isIndirect
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                            }`}
                          >
                            {isIndirect ? 'ส่วนที่ 2: งานรอง' : 'ส่วนที่ 3: งานสนับสนุน'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {tpl.department}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-blue-600 dark:text-blue-400">
                          {tpl.unitTimeMinutes} นาที/{tpl.unitLabel || 'ครั้ง'}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
                            <Cloud className="w-3 h-3 text-emerald-600" />
                            <span>เชื่อมทุกวัน</span>
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStartEditTemplate(tpl)}
                              title="แก้ไขประเภทงานนี้"
                              className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTemplateClick(tpl)}
                              title="ลบประเภทงานนี้ออกจากฐานข้อมูลและทุกวัน"
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Database & Backup */}
      {activeTab === 'database' && (
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
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
        </div>
      )}

      </div>
    </div>
  );
};
