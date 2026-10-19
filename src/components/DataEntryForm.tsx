import React, { useState } from 'react';
import {
  DailyRecord,
  DepartmentKey,
  ERWorkloadData,
  IndirectCareItem,
  IPDWorkloadData,
  LRWorkloadData,
  OPDWorkloadData,
  ShiftStaff,
  StandardWeightsConfig,
  SupportWorkItem,
} from '../types/nursing';
import {
  calculateER,
  calculateOPD,
  calculateIPD,
  calculateLR,
  calculateIndirectDailyHours,
  calculateSupportDailyHours,
  createDefaultIndirectItems,
  createDefaultSupportItems,
} from '../utils/calculator';
import {
  Save,
  Calendar,
  Clock,
  User,
  Ambulance,
  Stethoscope,
  BedDouble,
  Baby,
  Plus,
  Minus,
  CheckCircle2,
  Sparkles,
  Layers,
  Edit2,
  Trash2,
  HelpCircle,
  FilePlus2,
  FolderPlus,
  Check,
  X,
  Lock,
  ShieldCheck,
  ShieldAlert,
  Star,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AppUser, canUserEditDepartment, canUserAddRecord, ROLE_LABELS, DEPARTMENT_LABELS } from '../types/auth';

interface DataEntryFormProps {
  currentRecord: DailyRecord;
  onSaveRecord: (updated: DailyRecord) => void;
  onAddNewDateRecord: (dateStr: string) => void;
  standardsConfig: StandardWeightsConfig;
  initialDept?: DepartmentKey;
  onOpenStandards: () => void;
  appUser?: AppUser | null;
}

export const DataEntryForm: React.FC<DataEntryFormProps> = ({
  currentRecord,
  onSaveRecord,
  onAddNewDateRecord,
  standardsConfig,
  initialDept = 'ER',
  onOpenStandards,
  appUser = null,
}) => {
  // If user is department head, default initial department to their own department
  const defaultDept = React.useMemo<DepartmentKey>(() => {
    if (appUser?.role === 'department_head' && (appUser.department === 'ER' || appUser.department === 'OPD' || appUser.department === 'IPD1' || appUser.department === 'IPD2' || appUser.department === 'LR')) {
      return appUser.department as DepartmentKey;
    }
    return initialDept;
  }, [appUser, initialDept]);

  const [activeDept, setActiveDept] = useState<DepartmentKey>(defaultDept);
  const [formData, setFormData] = useState<DailyRecord>(JSON.parse(JSON.stringify(currentRecord)));
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Permission check for active department
  const canEditActiveDept = canUserEditDepartment(appUser, activeDept);
  const canAddDate = canUserAddRecord(appUser);

  // New Date Modal / Popover state
  const [isNewDateModalOpen, setIsNewDateModalOpen] = useState(false);
  const [newDateInput, setNewDateInput] = useState(() => new Date().toISOString().slice(0, 10));

  // Edit / Add Item Modal for Indirect Care (งานรอง)
  const [editingIndirectItem, setEditingIndirectItem] = useState<{
    isOpen: boolean;
    isNew: boolean;
    item: IndirectCareItem;
  }>({
    isOpen: false,
    isNew: false,
    item: {
      id: '',
      name: '',
      category: 'custom',
      count: 1,
      unitTimeMinutes: 10,
      unitLabel: 'ครั้ง',
      note: '',
    },
  });

  // Edit / Add Item Modal for Support Work (งานสนับสนุน)
  const [editingSupportItem, setEditingSupportItem] = useState<{
    isOpen: boolean;
    isNew: boolean;
    item: SupportWorkItem;
  }>({
    isOpen: false,
    isNew: false,
    item: {
      id: '',
      name: '',
      category: 'custom',
      frequencyType: 'weekly',
      frequencyCount: 1,
      timeMinutesPerSession: 60,
      note: '',
    },
  });

  React.useEffect(() => {
    const clone = JSON.parse(JSON.stringify(currentRecord));
    if (!clone.recorderName && appUser) {
      clone.recorderName = appUser.name;
      clone.recorderPosition = appUser.position || '';
      clone.recorderPhone = appUser.phone || '';
    }
    setFormData(clone);
  }, [currentRecord, appUser]);

  // Helpers to get and set current active department data
  const currentDeptData = formData[activeDept.toLowerCase() as 'er' | 'opd' | 'ipd1' | 'ipd2' | 'lr'];

  const setIndirectItemsForActiveDept = (items: IndirectCareItem[]) => {
    setFormData((prev) => ({
      ...prev,
      [activeDept.toLowerCase()]: {
        ...prev[activeDept.toLowerCase() as 'er' | 'opd' | 'ipd1' | 'ipd2' | 'lr'],
        indirectItems: items,
      },
    }));
  };

  const setSupportItemsForActiveDept = (items: SupportWorkItem[]) => {
    setFormData((prev) => ({
      ...prev,
      [activeDept.toLowerCase()]: {
        ...prev[activeDept.toLowerCase() as 'er' | 'opd' | 'ipd1' | 'ipd2' | 'lr'],
        supportItems: items,
      },
    }));
  };

  // Direct Care Updaters for ER
  const updateERField = (field: keyof ERWorkloadData, val: number) => {
    setFormData((prev) => ({
      ...prev,
      er: { ...prev.er, [field]: Math.max(0, val) },
    }));
  };
  const updateERStaff = (shift: keyof ShiftStaff, val: number) => {
    setFormData((prev) => ({
      ...prev,
      er: { ...prev.er, actualStaff: { ...prev.er.actualStaff, [shift]: Math.max(0, val) } },
    }));
  };

  // Direct Care Updaters for OPD
  const updateOPDField = (field: keyof OPDWorkloadData, val: number) => {
    setFormData((prev) => ({
      ...prev,
      opd: { ...prev.opd, [field]: Math.max(0, val) },
    }));
  };
  const updateOPDStaff = (shift: keyof ShiftStaff, val: number) => {
    setFormData((prev) => ({
      ...prev,
      opd: { ...prev.opd, actualStaff: { ...prev.opd.actualStaff, [shift]: Math.max(0, val) } },
    }));
  };

  // Direct Care Updaters for IPD1
  const updateIPD1Field = (field: keyof IPDWorkloadData, val: number | string) => {
    setFormData((prev) => ({
      ...prev,
      ipd1: { ...prev.ipd1, [field]: typeof val === 'number' ? Math.max(0, val) : val },
    }));
  };
  const updateIPD1Staff = (shift: keyof ShiftStaff, val: number) => {
    setFormData((prev) => ({
      ...prev,
      ipd1: { ...prev.ipd1, actualStaff: { ...prev.ipd1.actualStaff, [shift]: Math.max(0, val) } },
    }));
  };

  // Direct Care Updaters for IPD2
  const updateIPD2Field = (field: keyof IPDWorkloadData, val: number | string) => {
    setFormData((prev) => ({
      ...prev,
      ipd2: { ...prev.ipd2, [field]: typeof val === 'number' ? Math.max(0, val) : val },
    }));
  };
  const updateIPD2Staff = (shift: keyof ShiftStaff, val: number) => {
    setFormData((prev) => ({
      ...prev,
      ipd2: { ...prev.ipd2, actualStaff: { ...prev.ipd2.actualStaff, [shift]: Math.max(0, val) } },
    }));
  };

  // Direct Care Updaters for LR
  const updateLRField = (field: keyof LRWorkloadData, val: number) => {
    setFormData((prev) => ({
      ...prev,
      lr: { ...prev.lr, [field]: Math.max(0, val) },
    }));
  };
  const updateLRStaff = (shift: keyof ShiftStaff, val: number) => {
    setFormData((prev) => ({
      ...prev,
      lr: { ...prev.lr, actualStaff: { ...prev.lr.actualStaff, [shift]: Math.max(0, val) } },
    }));
  };

  // --- CRUD for Indirect Care Items (งานรอง) ---
  const handleOpenAddIndirect = () => {
    setEditingIndirectItem({
      isOpen: true,
      isNew: true,
      item: {
        id: `ind-custom-${Date.now()}`,
        name: '',
        category: 'custom',
        count: 10,
        unitTimeMinutes: 10,
        unitLabel: 'ราย',
        note: '',
      },
    });
  };

  const handleOpenEditIndirect = (item: IndirectCareItem) => {
    setEditingIndirectItem({
      isOpen: true,
      isNew: false,
      item: { ...item },
    });
  };

  const handleSaveIndirectItem = () => {
    const currentList = currentDeptData.indirectItems || [];
    let updated: IndirectCareItem[];
    if (editingIndirectItem.isNew) {
      updated = [...currentList, editingIndirectItem.item];
    } else {
      updated = currentList.map((i) => (i.id === editingIndirectItem.item.id ? editingIndirectItem.item : i));
    }
    setIndirectItemsForActiveDept(updated);
    setEditingIndirectItem({ ...editingIndirectItem, isOpen: false });
  };

  const handleDeleteIndirectItem = (id: string) => {
    if (confirm('คุณต้องการลบรายการงานรองนี้ใช่หรือไม่?')) {
      const currentList = currentDeptData.indirectItems || [];
      setIndirectItemsForActiveDept(currentList.filter((i) => i.id !== id));
    }
  };

  // --- CRUD for Support Work Items (งานสนับสนุน) ---
  const handleOpenAddSupport = () => {
    setEditingSupportItem({
      isOpen: true,
      isNew: true,
      item: {
        id: `sup-custom-${Date.now()}`,
        name: '',
        category: 'custom',
        frequencyType: 'weekly',
        frequencyCount: 1,
        timeMinutesPerSession: 60,
        note: '',
      },
    });
  };

  const handleOpenEditSupport = (item: SupportWorkItem) => {
    setEditingSupportItem({
      isOpen: true,
      isNew: false,
      item: { ...item },
    });
  };

  const handleSaveSupportItem = () => {
    const currentList = currentDeptData.supportItems || [];
    let updated: SupportWorkItem[];
    if (editingSupportItem.isNew) {
      updated = [...currentList, editingSupportItem.item];
    } else {
      updated = currentList.map((i) => (i.id === editingSupportItem.item.id ? editingSupportItem.item : i));
    }
    setSupportItemsForActiveDept(updated);
    setEditingSupportItem({ ...editingSupportItem, isOpen: false });
  };

  const handleDeleteSupportItem = (id: string) => {
    if (confirm('คุณต้องการลบรายการงานสนับสนุนนี้ใช่หรือไม่?')) {
      const currentList = currentDeptData.supportItems || [];
      setSupportItemsForActiveDept(currentList.filter((i) => i.id !== id));
    }
  };

  // Live calculation for currently active department
  const activeCalc = React.useMemo(() => {
    switch (activeDept) {
      case 'ER':
        return calculateER(formData.er, standardsConfig);
      case 'OPD':
        return calculateOPD(formData.opd, standardsConfig);
      case 'IPD1':
        return calculateIPD(formData.ipd1, 'IPD1', standardsConfig);
      case 'IPD2':
        return calculateIPD(formData.ipd2, 'IPD2', standardsConfig);
      case 'LR':
        return calculateLR(formData.lr, standardsConfig);
    }
  }, [formData, activeDept, standardsConfig]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...formData,
      updatedAt: new Date().toISOString(),
    };
    onSaveRecord(updated);

    try {
      confetti({
        particleCount: 75,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 4000);
  };

  const handleCreateNewDate = () => {
    if (!newDateInput) return;
    onAddNewDateRecord(newDateInput);
    setIsNewDateModalOpen(false);
  };

  return (
    <div className="space-y-5">
      
      {/* Top Header Card: Date, Recorder, and "เพิ่มบันทึกข้อมูลค่าใหม่" button */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                บันทึกค่างานพยาบาล 3 ส่วน (สภาการพยาบาล)
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              โรงพยาบาลสังขละบุรี • งานหลัก (Direct) • งานรอง (Indirect) • งานสนับสนุน (Support)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            
            {/* Action: ปุ่มเพิ่มบันทึกข้อมูลค่าใหม่ (New Date Record) - เฉพาะผู้มีสิทธิ์เพิ่ม */}
            {canAddDate ? (
              <button
                type="button"
                onClick={() => setIsNewDateModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <FilePlus2 className="w-4 h-4" />
                <span>+ เพิ่มบันทึกข้อมูลวันใหม่</span>
              </button>
            ) : (
              <div
                title="หัวหน้ากลุ่มการพยาบาลไม่มีสิทธิ์เพิ่ม ลบ หรือแก้ไขข้อมูล"
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-medium flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>โหมดดูข้อมูล (ปิดการเพิ่มวัน)</span>
              </div>
            )}

            {/* Current Active Date Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">วันที่:</span>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => {
                  setFormData({ ...formData, date: e.target.value });
                  onAddNewDateRecord(e.target.value);
                }}
                className="text-xs font-bold font-mono bg-transparent text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
              />
            </div>

            {/* Recorder Name */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                disabled={!canEditActiveDept}
                placeholder="ชื่อพยาบาลผู้ตรวจนับ"
                value={formData.recorderName || appUser?.name || ''}
                onChange={(e) => setFormData({ ...formData, recorderName: e.target.value })}
                className="text-xs font-medium bg-transparent text-slate-800 dark:text-slate-200 focus:outline-hidden w-36 sm:w-44 disabled:opacity-75"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Role Access & Permission Status Banner */}
      {appUser && (
        <div
          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs shadow-xs transition-colors ${
            appUser.role === 'nursing_director'
              ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200'
              : appUser.role === 'department_head'
              ? canEditActiveDept
                ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
              : 'bg-purple-50/90 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {appUser.role === 'nursing_director' && <ShieldAlert className="w-5 h-5 text-blue-600 shrink-0" />}
            {appUser.role === 'department_head' &&
              (canEditActiveDept ? (
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <Lock className="w-5 h-5 text-amber-600 shrink-0" />
              ))}
            {appUser.role === 'admin' && <ShieldCheck className="w-5 h-5 text-purple-600 shrink-0" />}

            <div>
              <div className="font-bold text-xs sm:text-sm flex items-center gap-2">
                <span>{appUser.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/80 dark:bg-slate-800 shadow-2xs border border-current">
                  {ROLE_LABELS[appUser.role]?.badge}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-200/60 dark:bg-slate-700/60">
                  {DEPARTMENT_LABELS[appUser.department]?.short || appUser.department}
                </span>
              </div>
              <div className="text-[11px] opacity-90 mt-0.5">
                {appUser.role === 'nursing_director' &&
                  '🔍 สิทธิ์หัวหน้ากลุ่มการพยาบาล: ตรวจสอบและดูข้อมูลภาพรวมได้ทุกฝ่ายงาน แต่ไม่สามารถ เพิ่ม ลบ หรือแก้ไขข้อมูลได้ตามระเบียบสภาการพยาบาล'}
                {appUser.role === 'department_head' &&
                  (canEditActiveDept
                    ? `✏️ ฝ่ายงานของคุณ (${DEPARTMENT_LABELS[appUser.department]?.short}): คุณมีสิทธิ์เพิ่ม ลบ แก้ไข และบันทึกข้อมูลของฝ่ายงานนี้ได้อย่างสมบูรณ์`
                    : `🔒 ฝ่ายงานอื่น: คุณเป็นหัวหน้าฝ่ายงาน ${DEPARTMENT_LABELS[appUser.department]?.short} สามารถดูข้อมูลฝ่ายงาน ${activeDept} ได้เท่านั้น (ไม่มีสิทธิ์แก้ไข)`)}
                {appUser.role === 'admin' &&
                  '👑 สิทธิ์ผู้ดูแลระบบ (Admin): มีสิทธิ์บันทึก เพิ่ม ลบ และแก้ไขข้อมูลได้ทุกฝ่ายงานอย่างสมบูรณ์'}
              </div>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-current">
            {canEditActiveDept ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>อนุญาตให้แก้ไข</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>โหมดอ่านอย่างเดียว</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Save Success Alert Notification */}
      {saveSuccess && (
        <div className="bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-md animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs sm:text-sm">บันทึกข้อมูลค่างานสำเร็จเรียบร้อย!</div>
              <div className="text-[11px] text-emerald-700 dark:text-emerald-300">
                ระบบคำนวณค่างาน 3 ส่วน และอัปเดตสถิติประจำวันที่ {formData.date} เรียบร้อยแล้ว
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Department Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { key: 'ER' as DepartmentKey, label: '1. ห้องฉุกเฉิน (ER)', icon: Ambulance, color: 'text-rose-600 dark:text-rose-400' },
          { key: 'OPD' as DepartmentKey, label: '2. ผู้ป่วยนอก (OPD)', icon: Stethoscope, color: 'text-blue-600 dark:text-blue-400' },
          { key: 'IPD1' as DepartmentKey, label: '3. IPD 1 (หญิง/กุมาร)', icon: BedDouble, color: 'text-emerald-600 dark:text-emerald-400' },
          { key: 'IPD2' as DepartmentKey, label: '4. IPD 2 (ชาย/พิเศษ)', icon: BedDouble, color: 'text-teal-600 dark:text-teal-400' },
          { key: 'LR' as DepartmentKey, label: '5. ห้องคลอด (LR)', icon: Baby, color: 'text-amber-600 dark:text-amber-400' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeDept === tab.key;
          const isOwnDept = appUser?.role === 'department_head' && appUser.department === tab.key;
          const isOtherDept = appUser?.role === 'department_head' && appUser.department !== tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveDept(tab.key)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-700 text-white shadow-md shadow-emerald-900/20 dark:bg-emerald-600'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : tab.color}`} />
              <span>{tab.label}</span>
              {isOwnDept && (
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold flex items-center gap-0.5 ${
                    isActive
                      ? 'bg-white text-emerald-800'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}
                >
                  <Star className="w-2.5 h-2.5 fill-current" />
                  <span>ฝ่ายของคุณ</span>
                </span>
              )}
              {isOtherDept && (
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-md font-semibold flex items-center gap-0.5 opacity-80 ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  <Lock className="w-2.5 h-2.5" />
                  <span>อ่านอย่างเดียว</span>
                </span>
              )}
              {appUser?.role === 'nursing_director' && (
                <span className={`text-[9px] opacity-75 ${isActive ? 'text-white' : 'text-slate-400'}`}>
                  (อ่าน)
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Grid: Form Input Area & Live Calculation Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Left 2 Cols: Interactive Data Input per active department */}
        <div className="lg:col-span-2 space-y-5">
          <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
            
            {/* Active Department Title */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  {activeDept === 'ER' && <Ambulance className="w-5 h-5" />}
                  {activeDept === 'OPD' && <Stethoscope className="w-5 h-5" />}
                  {(activeDept === 'IPD1' || activeDept === 'IPD2') && <BedDouble className="w-5 h-5" />}
                  {activeDept === 'LR' && <Baby className="w-5 h-5" />}
                </span>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    {activeDept === 'ER' && 'ข้อมูลค่างานแผนกห้องฉุกเฉิน (Emergency Room)'}
                    {activeDept === 'OPD' && 'ข้อมูลค่างานแผนกผู้ป่วยนอก (Outpatient Department)'}
                    {activeDept === 'IPD1' && 'ข้อมูลค่างานหอผู้ป่วยใน 1 (IPD1 หญิงและกุมารเวช)'}
                    {activeDept === 'IPD2' && 'ข้อมูลค่างานหอผู้ป่วยใน 2 (IPD2 ชายและห้องพิเศษ)'}
                    {activeDept === 'LR' && 'ข้อมูลค่างานแผนกห้องคลอด (Labor Room)'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    คำนวณ 3 ส่วนตามสูตรสภาการพยาบาล: งานหลัก + งานรอง + งานสนับสนุน
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenStandards}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">เกณฑ์สภาฯ</span>
              </button>
            </div>

            {/* ========================================== */}
            {/* ส่วนที่ 1: งานหลัก (Direct Care) */}
            {/* ========================================== */}
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-emerald-50/70 dark:bg-emerald-950/40 px-3 py-2 rounded-xl border border-emerald-200/50 dark:border-emerald-800/50">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="font-bold text-xs text-emerald-950 dark:text-emerald-200">
                    ส่วนที่ 1: งานหลัก (Direct Nursing Care)
                  </span>
                </div>
                <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-300">
                  {activeCalc.directCareHours} ชม./วัน
                </span>
              </div>

              {/* ER Inputs */}
              {activeDept === 'ER' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <InputCounterCard
                    label="Triage 1: กู้ชีพทันที (Resuscitation - แดง)"
                    subtitle="หยุดหายใจ, ช็อกรุนแรง, หมดสติ (3.0 ชม./ราย)"
                    badge="แดง"
                    badgeColor="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                    value={formData.er.triage1_resus}
                    onChange={(v) => updateERField('triage1_resus', v)}
                  />
                  <InputCounterCard
                    label="Triage 2: ฉุกเฉินมาก (Emergency - ชมพู/ส้ม)"
                    subtitle="เจ็บอกรุนแรง, หอบเหนื่อยวิกฤต (1.0 ชม./ราย)"
                    badge="ชมพู"
                    badgeColor="bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300"
                    value={formData.er.triage2_emergency}
                    onChange={(v) => updateERField('triage2_emergency', v)}
                  />
                  <InputCounterCard
                    label="Triage 3: ฉุกเฉินเร่งด่วน (Urgency - เหลือง)"
                    subtitle="ปวดท้องเฉียบพลัน, ไข้สูงมีชัก, แผลเปิด (0.5 ชม./ราย)"
                    badge="เหลือง"
                    badgeColor="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    value={formData.er.triage3_urgency}
                    onChange={(v) => updateERField('triage3_urgency', v)}
                  />
                  <InputCounterCard
                    label="Triage 4: กึ่งฉุกเฉิน (Semi-urgent - เขียว)"
                    subtitle="แผลตื้น, ผื่นเฉียบพลัน, เคล็ดขัดยอก (0.25 ชม./ราย)"
                    badge="เขียว"
                    badgeColor="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    value={formData.er.triage4_semiUrgent}
                    onChange={(v) => updateERField('triage4_semiUrgent', v)}
                  />
                  <InputCounterCard
                    label="Triage 5: ไม่ฉุกเฉิน (Non-urgent - ขาว)"
                    subtitle="ตรวจสุขภาพ, ขอใบรับรองแพทย์, ยาหมด (0.16 ชม./ราย)"
                    badge="ขาว"
                    badgeColor="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                    value={formData.er.triage5_nonUrgent}
                    onChange={(v) => updateERField('triage5_nonUrgent', v)}
                  />
                  <InputCounterCard
                    label="เคสกู้ชีพ CPR / หัตถการขั้นสูง"
                    subtitle="ปั๊มหัวใจ ใส่ท่อช่วยหายใจ Intubation (+2.0 ชม.)"
                    value={formData.er.cprCount}
                    onChange={(v) => updateERField('cprCount', v)}
                  />
                  <InputCounterCard
                    label="เคสส่งต่อฉุกเฉิน (Ambulance Escort)"
                    subtitle="พยาบาลเดินทางส่งต่อ รพ.พหลฯ กาญจนบุรี (3.5 ชม.)"
                    badge="Refer"
                    badgeColor="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                    value={formData.er.ambulanceReferral}
                    onChange={(v) => updateERField('ambulanceReferral', v)}
                  />
                  <InputCounterCard
                    label="ผู้ป่วยนอนสังเกตอาการเตียงฉุกเฉิน"
                    subtitle="Observation beds ในห้องฉุกเฉิน (1.0 ชม./ราย)"
                    value={formData.er.observationCases}
                    onChange={(v) => updateERField('observationCases', v)}
                  />
                </div>
              )}

              {/* OPD Inputs */}
              {activeDept === 'OPD' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <InputCounterCard
                    label="ตรวจโรคทั่วไป (General OPD)"
                    subtitle="ผู้ป่วยนอกทั่วไป ซักประวัติ ฉีดยา พ่นยา (10 นาที/ราย)"
                    value={formData.opd.generalPatients}
                    onChange={(v) => updateOPDField('generalPatients', v)}
                  />
                  <InputCounterCard
                    label="คลินิกโรคเรื้อรัง (NCDs Clinic)"
                    subtitle="เบาหวาน ความดัน ไต หัวใจ ตรวจเท้า/จอตา (18 นาที/ราย)"
                    value={formData.opd.chronicPatients}
                    onChange={(v) => updateOPDField('chronicPatients', v)}
                  />
                  <InputCounterCard
                    label="หัตถการ / ผ่าตัดเล็ก (Minor Surgery)"
                    subtitle="เย็บแผล ล้างแผล ถอดเล็บ ตัดติ่งเนื้อ จี้หูด (25 นาที/ราย)"
                    value={formData.opd.minorSurgery}
                    onChange={(v) => updateOPDField('minorSurgery', v)}
                  />
                  <InputCounterCard
                    label="คลินิกเฉพาะทาง (ARI / ANC / จิตเวช)"
                    subtitle="คลินิกทางเดินหายใจ ฝากครรภ์ สุขภาพจิต (15 นาที/ราย)"
                    value={formData.opd.specialClinic}
                    onChange={(v) => updateOPDField('specialClinic', v)}
                  />
                  <InputCounterCard
                    label="คัดกรอง / ซักประวัติ / คัดแยกหน้าห้อง"
                    subtitle="Triage screening หน้าห้องตรวจ วัดสัญญาณชีพ (5 นาที/ราย)"
                    value={formData.opd.screeningPatients}
                    onChange={(v) => updateOPDField('screeningPatients', v)}
                  />
                </div>
              )}

              {/* IPD1 & IPD2 Inputs */}
              {(activeDept === 'IPD1' || activeDept === 'IPD2') && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <div>
                      <label className="text-xs text-slate-500 dark:text-slate-400">ชื่อหอผู้ป่วย</label>
                      <input
                        type="text"
                        value={activeDept === 'IPD1' ? formData.ipd1.wardName : formData.ipd2.wardName}
                        onChange={(e) => activeDept === 'IPD1' ? updateIPD1Field('wardName', e.target.value) : updateIPD2Field('wardName', e.target.value)}
                        className="w-full mt-1 px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 dark:text-slate-400">เตียงเปิดบริการ</label>
                      <input
                        type="number"
                        value={activeDept === 'IPD1' ? formData.ipd1.bedCapacity : formData.ipd2.bedCapacity}
                        onChange={(e) => activeDept === 'IPD1' ? updateIPD1Field('bedCapacity', parseInt(e.target.value) || 0) : updateIPD2Field('bedCapacity', parseInt(e.target.value) || 0)}
                        className="w-full mt-1 px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 dark:text-slate-400">ครองเตียง (Census)</label>
                      <input
                        type="number"
                        value={activeDept === 'IPD1' ? formData.ipd1.currentCensus : formData.ipd2.currentCensus}
                        onChange={(e) => activeDept === 'IPD1' ? updateIPD1Field('currentCensus', parseInt(e.target.value) || 0) : updateIPD2Field('currentCensus', parseInt(e.target.value) || 0)}
                        className="w-full mt-1 px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-emerald-600 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <InputCounterCard
                      label="PCS 1: ช่วยเหลือตนเองได้ดี (Self Care)"
                      subtitle="ต้องการการดูแลพื้นฐาน ให้สุขศึกษา (1.5 ชม./วัน)"
                      value={activeDept === 'IPD1' ? formData.ipd1.pcs1_selfCare : formData.ipd2.pcs1_selfCare}
                      onChange={(v) => activeDept === 'IPD1' ? updateIPD1Field('pcs1_selfCare', v) : updateIPD2Field('pcs1_selfCare', v)}
                    />
                    <InputCounterCard
                      label="PCS 2: ต้องการการดูแลปานกลาง (Moderate)"
                      subtitle="ช่วยเหลือตนเองได้บางส่วน มี On IV / ยาฉีด (3.5 ชม./วัน)"
                      value={activeDept === 'IPD1' ? formData.ipd1.pcs2_moderateCare : formData.ipd2.pcs2_moderateCare}
                      onChange={(v) => activeDept === 'IPD1' ? updateIPD1Field('pcs2_moderateCare', v) : updateIPD2Field('pcs2_moderateCare', v)}
                    />
                    <InputCounterCard
                      label="PCS 3: พึ่งพามาก / ดูแลใกล้ชิด (Maximum)"
                      subtitle="นอนติดเตียง ให้อาหารสายยาง ดูดเสมหะ (6.0 ชม./วัน)"
                      value={activeDept === 'IPD1' ? formData.ipd1.pcs3_maximumCare : formData.ipd2.pcs3_maximumCare}
                      onChange={(v) => activeDept === 'IPD1' ? updateIPD1Field('pcs3_maximumCare', v) : updateIPD2Field('pcs3_maximumCare', v)}
                    />
                    <InputCounterCard
                      label="PCS 4: วิกฤต / อาการเปลี่ยนแปลง (Intensive)"
                      subtitle="ใกล้ชิด V/S q 15-30 นาที, On Inotropic drug (10.0 ชม./วัน)"
                      value={activeDept === 'IPD1' ? formData.ipd1.pcs4_intensiveCare : formData.ipd2.pcs4_intensiveCare}
                      onChange={(v) => activeDept === 'IPD1' ? updateIPD1Field('pcs4_intensiveCare', v) : updateIPD2Field('pcs4_intensiveCare', v)}
                    />
                    <InputCounterCard
                      label="PCS 5: ใช้เครื่องช่วยหายใจ (Ventilator)"
                      subtitle="On Endotracheal Tube / Ventilator Care (14.0 ชม./วัน)"
                      value={activeDept === 'IPD1' ? formData.ipd1.pcs5_ventilator : formData.ipd2.pcs5_ventilator}
                      onChange={(v) => activeDept === 'IPD1' ? updateIPD1Field('pcs5_ventilator', v) : updateIPD2Field('pcs5_ventilator', v)}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <InputCounterCard
                        label="รับใหม่ (Admit)"
                        subtitle="0.75 ชม./ราย"
                        value={activeDept === 'IPD1' ? formData.ipd1.admissions : formData.ipd2.admissions}
                        onChange={(v) => activeDept === 'IPD1' ? updateIPD1Field('admissions', v) : updateIPD2Field('admissions', v)}
                      />
                      <InputCounterCard
                        label="จำหน่าย (D/C)"
                        subtitle="0.50 ชม./ราย"
                        value={activeDept === 'IPD1' ? formData.ipd1.discharges : formData.ipd2.discharges}
                        onChange={(v) => activeDept === 'IPD1' ? updateIPD1Field('discharges', v) : updateIPD2Field('discharges', v)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* LR Inputs */}
              {activeDept === 'LR' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <InputCounterCard
                    label="รอคลอดระยะแฝง (Stage 1: Latent Phase)"
                    subtitle="ปากมดลูกเปิด 0-3 ซม. ฟังเสียงหัวใจเด็ก (2.0 ชม./เคส)"
                    value={formData.lr.stage1Latent}
                    onChange={(v) => updateLRField('stage1Latent', v)}
                  />
                  <InputCounterCard
                    label="รอคลอดระยะเร่ง (Stage 1: Active Phase)"
                    subtitle="ปากมดลูกเปิด 4-10 ซม. เฝ้าระวังใกล้ชิด (4.5 ชม./เคส)"
                    value={formData.lr.stage1Active}
                    onChange={(v) => updateLRField('stage1Active', v)}
                  />
                  <InputCounterCard
                    label="ระยะเบ่งคลอด & ทำคลอด (Stage 2: Delivery)"
                    subtitle="เบ่งคลอด ทำคลอด ตัดเย็บฝีเย็บ (3.0 ชม./เคส)"
                    value={formData.lr.stage2Delivery}
                    onChange={(v) => updateLRField('stage2Delivery', v)}
                  />
                  <InputCounterCard
                    label="ระยะคลอดรก & ซ่อมแซม (Stage 3 & Repair)"
                    subtitle="คลอดรก ตรวจความสมบูรณ์รก ซ่อมแผล (2.0 ชม./เคส)"
                    value={formData.lr.stage3Placenta}
                    onChange={(v) => updateLRField('stage3Placenta', v)}
                  />
                  <InputCounterCard
                    label="เฝ้าระวังหลังคลอด 2 ชั่วโมง (Postpartum Care)"
                    subtitle="คลึงมดลูก วัดสัญญาณชีพ เฝ้าระวังตกเลือด PPH (2.0 ชม./เคส)"
                    value={formData.lr.postpartumRecovery}
                    onChange={(v) => updateLRField('postpartumRecovery', v)}
                  />
                  <InputCounterCard
                    label="หญิงตั้งครรภ์เสี่ยงสูง (High Risk Cases)"
                    subtitle="PIH ครรภ์เป็นพิษ, เบาหวาน, ตกเลือด, น้ำเดินนาน (4.0 ชม./เคส)"
                    badge="High Risk"
                    badgeColor="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                    value={formData.lr.highRiskCases}
                    onChange={(v) => updateLRField('highRiskCases', v)}
                  />
                </div>
              )}
            </div>

            {/* ========================================== */}
            {/* ส่วนที่ 2: งานรอง (Indirect Care) */}
            {/* สูตร: ∑ (ปริมาณงาน x เวลามาตรฐานต่อหน่วย) */}
            {/* ========================================== */}
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-blue-50/70 dark:bg-blue-950/40 p-3 rounded-xl border border-blue-200/50 dark:border-blue-800/50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span className="font-bold text-xs text-blue-950 dark:text-blue-200">
                      ส่วนที่ 2: งานรอง (Indirect Nursing Care)
                    </span>
                  </div>
                  <p className="text-[10px] text-blue-700/80 dark:text-blue-400/80 mt-0.5">
                    สูตร: ∑ (ปริมาณงาน × เวลามาตรฐานต่อหน่วย) • เช่น บันทึกชาร์จ, เตรียมยา, ประสานงาน, ส่งเวร
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-blue-800 dark:text-blue-300">
                    รวม: {activeCalc.indirectCareHours} ชม./วัน
                  </span>
                  {canEditActiveDept && (
                    <button
                      type="button"
                      onClick={handleOpenAddIndirect}
                      className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>เพิ่มประเภทงานรอง</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Indirect Care Items List */}
              <div className="space-y-2">
                {(currentDeptData.indirectItems || []).map((item) => {
                  const itemHours = Number(((item.count * item.unitTimeMinutes) / 60).toFixed(2));
                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                    >
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {item.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                            {item.unitTimeMinutes} นาที/{item.unitLabel || 'หน่วย'}
                          </span>
                        </div>
                        {item.note && (
                          <div className="text-[11px] text-slate-400">{item.note}</div>
                        )}
                      </div>

                      {/* Inputs & Controls */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 text-[11px]">ปริมาณ:</span>
                          <input
                            type="number"
                            min="0"
                            value={item.count}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              const updated = (currentDeptData.indirectItems || []).map((i) =>
                                i.id === item.id ? { ...i, count: val } : i
                              );
                              setIndirectItemsForActiveDept(updated);
                            }}
                            className="w-16 py-1 px-2 text-center font-mono font-bold text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                          />
                          <span className="text-slate-400 text-[11px]">{item.unitLabel || 'หน่วย'}</span>
                        </div>

                        <div className="text-right min-w-[70px]">
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">
                            {itemHours} ชม.
                          </span>
                        </div>

                        {/* Edit & Delete Buttons */}
                        {canEditActiveDept && (
                          <div className="flex items-center gap-1 pl-2 border-l border-slate-200 dark:border-slate-700">
                            <button
                              type="button"
                              onClick={() => handleOpenEditIndirect(item)}
                              title="แก้ไขประเภทงานรองนี้"
                              className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteIndirectItem(item.id)}
                              title="ลบประเภทงานรองนี้"
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ========================================== */}
            {/* ส่วนที่ 3: งานสนับสนุน (Support Work) */}
            {/* สูตร: ∑ (ความถี่กิจกรรม x เวลาที่ใช้จริงต่อกิจกรรม) */}
            {/* ========================================== */}
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-purple-50/70 dark:bg-purple-950/40 p-3 rounded-xl border border-purple-200/50 dark:border-purple-800/50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    <span className="font-bold text-xs text-purple-950 dark:text-purple-200">
                      ส่วนที่ 3: งานสนับสนุน (Support Work / Ward Management)
                    </span>
                  </div>
                  <p className="text-[10px] text-purple-700/80 dark:text-purple-400/80 mt-0.5">
                    สูตร: ∑ (ความถี่กิจกรรม × เวลาที่ใช้จริงต่อกิจกรรม) • บริหารวอร์ด, ตรวจเครื่องมือแพทย์, IC, CQI/HA
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-purple-800 dark:text-purple-300">
                    รวม: {activeCalc.supportCareHours} ชม./วัน
                  </span>
                  <button
                    type="button"
                    onClick={handleOpenAddSupport}
                    className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>เพิ่มประเภทงานสนับสนุน</span>
                  </button>
                </div>
              </div>

              {/* Support Work Items List */}
              <div className="space-y-2">
                {(currentDeptData.supportItems || []).map((item) => {
                  const sessionMin = Number(item.timeMinutesPerSession || 0);
                  const count = Number(item.frequencyCount || 0);
                  let dailyHours = 0;
                  if (item.frequencyType === 'daily') dailyHours = (count * sessionMin) / 60;
                  else if (item.frequencyType === 'weekly') dailyHours = ((count * sessionMin) / 60) / 7;
                  else if (item.frequencyType === 'monthly') dailyHours = ((count * sessionMin) / 60) / 30;
                  else dailyHours = (count * sessionMin) / 60;

                  const freqLabel =
                    item.frequencyType === 'daily'
                      ? 'ต่อวัน'
                      : item.frequencyType === 'weekly'
                      ? 'ต่อสัปดาห์'
                      : item.frequencyType === 'monthly'
                      ? 'ต่อเดือน'
                      : 'ครั้ง';

                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
                    >
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {item.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                            {item.timeMinutesPerSession} นาที/{freqLabel} ({item.frequencyCount} ครั้ง)
                          </span>
                        </div>
                        {item.note && (
                          <div className="text-[11px] text-slate-400">{item.note}</div>
                        )}
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 text-[11px]">เวลาต่อครั้ง:</span>
                          <input
                            type="number"
                            min="1"
                            value={item.timeMinutesPerSession}
                            onChange={(e) => {
                              const val = Math.max(1, parseInt(e.target.value) || 1);
                              const updated = (currentDeptData.supportItems || []).map((i) =>
                                i.id === item.id ? { ...i, timeMinutesPerSession: val } : i
                              );
                              setSupportItemsForActiveDept(updated);
                            }}
                            className="w-16 py-1 px-2 text-center font-mono font-bold text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                          />
                          <span className="text-slate-400 text-[11px]">นาที</span>
                        </div>

                        <div className="text-right min-w-[70px]">
                          <span className="font-mono font-bold text-purple-600 dark:text-purple-400 text-xs">
                            {dailyHours.toFixed(2)} ชม./วัน
                          </span>
                        </div>

                        {/* Edit & Delete Buttons */}
                        <div className="flex items-center gap-1 pl-2 border-l border-slate-200 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={() => handleOpenEditSupport(item)}
                            title="แก้ไขประเภทงานสนับสนุนนี้"
                            className="p-1 rounded text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSupportItem(item.id)}
                            title="ลบประเภทงานสนับสนุนนี้"
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actual Staff On Duty */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <ActualStaffSection
                title={`พยาบาลขึ้นเวรจริง (${activeDept})`}
                staff={
                  activeDept === 'ER'
                    ? formData.er.actualStaff
                    : activeDept === 'OPD'
                    ? formData.opd.actualStaff
                    : activeDept === 'IPD1'
                    ? formData.ipd1.actualStaff
                    : activeDept === 'IPD2'
                    ? formData.ipd2.actualStaff
                    : formData.lr.actualStaff
                }
                onChange={
                  activeDept === 'ER'
                    ? updateERStaff
                    : activeDept === 'OPD'
                    ? updateOPDStaff
                    : activeDept === 'IPD1'
                    ? updateIPD1Staff
                    : activeDept === 'IPD2'
                    ? updateIPD2Staff
                    : updateLRStaff
                }
                hideNight={activeDept === 'OPD'}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                หมายเหตุ / เหตุการณ์สำคัญประจำเวร
              </label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="ระบุเหตุการณ์สำคัญ เช่น มีเคสฉุกเฉินกู้ชีพ อุบัติเหตุหมู่ ส่งต่อทางรถพยาบาล หรือปัญหาอัตรากำลัง..."
                className="w-full mt-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Save Button */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                คำนวณ TNH รวม = งานหลัก + งานรอง + งานสนับสนุน
              </div>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-700/25 transition-all flex items-center gap-2 active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>บันทึกข้อมูลสถิติค่างาน</span>
              </button>
            </div>

          </form>
        </div>

        {/* Right 1 Col: Live Real-time Calculation Preview */}
        <div className="space-y-4">
          <div className="sticky top-16 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-md space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                  ผลคำนวณค่างาน ({activeDept})
                </h4>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                activeCalc.status === 'balanced'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : activeCalc.status === 'understaffed'
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}>
                {activeCalc.status === 'balanced' ? '🟢 พอเหมาะ' : activeCalc.status === 'understaffed' ? '🔴 ขาดแคลน' : '🟡 เกิน'}
              </span>
            </div>

            {/* Total Nursing Hours (TNH) Card */}
            <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50">
              <div className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
                ค่างานรวม (Total Nursing Hours: TNH)
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-900 dark:text-emerald-200 mt-0.5">
                {activeCalc.totalNursingHours} <span className="text-xs font-normal">ชั่วโมง</span>
              </div>
              <div className="text-[11px] text-emerald-700/80 dark:text-emerald-300/70 mt-1">
                FTE ที่ต้องการ: <strong>{activeCalc.requiredFTE} อัตรา</strong>
              </div>
            </div>

            {/* 3-Care Breakdown pill box */}
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 space-y-1.5 text-xs">
              <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                จำแนกค่างาน 3 ส่วน:
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  1. งานหลัก (Direct Care):
                </span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {activeCalc.directCareHours} ชม.
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  2. งานรอง (Indirect Care):
                </span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  {activeCalc.indirectCareHours} ชม.
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  3. งานสนับสนุน (Support):
                </span>
                <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                  {activeCalc.supportCareHours} ชม.
                </span>
              </div>
            </div>

            {/* Actual vs Required comparison */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">พยาบาลจริง (Actual):</span>
                <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                  {activeCalc.totalActualStaff} คน
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">พยาบาลที่ควรมี (Required):</span>
                <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                  {activeCalc.totalRequiredStaff} คน
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">ส่วนต่าง (Gap):</span>
                <span className={`font-bold font-mono ${
                  activeCalc.staffingGap < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {activeCalc.staffingGap > 0 ? `+${activeCalc.staffingGap}` : activeCalc.staffingGap} คน
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">ผลิตภาพ (Productivity):</span>
                <span className="font-bold font-mono text-purple-600 dark:text-purple-400">
                  {activeCalc.productivityRate}%
                </span>
              </div>
            </div>

            {/* Shift breakdown */}
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs space-y-1.5">
              <div className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                การจัดเวร: จริง / ควรมี
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="bg-white dark:bg-slate-900 p-1.5 rounded-lg">
                  <div className="text-[10px] text-slate-400">เช้า</div>
                  <div className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                    {activeCalc.actualStaffPerShift.morning}/{activeCalc.requiredStaffPerShift.morning}
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-1.5 rounded-lg">
                  <div className="text-[10px] text-slate-400">บ่าย</div>
                  <div className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                    {activeCalc.actualStaffPerShift.afternoon}/{activeCalc.requiredStaffPerShift.afternoon}
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-1.5 rounded-lg">
                  <div className="text-[10px] text-slate-400">ดึก</div>
                  <div className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                    {activeCalc.actualStaffPerShift.night}/{activeCalc.requiredStaffPerShift.night}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* Modal: เพิ่มบันทึกข้อมูลวันใหม่ (Add New Date Record Modal) */}
      {/* ======================================================== */}
      {isNewDateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <FilePlus2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>เพิ่มบันทึกข้อมูลค่างานวันใหม่</span>
              </h3>
              <button
                onClick={() => setIsNewDateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                เลือกวันที่ต้องการบันทึกข้อมูล:
              </label>
              <input
                type="date"
                value={newDateInput}
                onChange={(e) => setNewDateInput(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-bold text-sm text-slate-900 dark:text-white"
              />
              <p className="text-[11px] text-slate-400">
                หากวันที่นี้มีข้อมูลอยู่แล้ว ระบบจะเปิดข้อมูลเดิมให้ท่านแก้ไข หากยังไม่มี ระบบจะสร้างเทมเพลตวันใหม่ให้ทันที
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewDateModalOpen(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleCreateNewDate}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
              >
                เปิดหน้าบันทึกวันที่นี้
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Modal: เพิ่ม / แก้ไขประเภทงานรอง (Indirect Care Item Modal) */}
      {/* ======================================================== */}
      {editingIndirectItem.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xl text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>{editingIndirectItem.isNew ? 'เพิ่มประเภทงานรองใหม่' : 'แก้ไขประเภทงานรอง'}</span>
              </h3>
              <button
                onClick={() => setEditingIndirectItem({ ...editingIndirectItem, isOpen: false })}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-slate-600 dark:text-slate-400 font-semibold block mb-1">
                  ชื่อประเภทงานรอง
                </label>
                <input
                  type="text"
                  placeholder="เช่น บันทึกชาร์จ, เตรียมยา, ส่งต่อเคส..."
                  value={editingIndirectItem.item.name}
                  onChange={(e) =>
                    setEditingIndirectItem({
                      ...editingIndirectItem,
                      item: { ...editingIndirectItem.item, name: e.target.value },
                    })
                  }
                  className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 font-semibold block mb-1">
                    เวลามาตรฐานต่อหน่วย (นาที)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editingIndirectItem.item.unitTimeMinutes}
                    onChange={(e) =>
                      setEditingIndirectItem({
                        ...editingIndirectItem,
                        item: {
                          ...editingIndirectItem.item,
                          unitTimeMinutes: Math.max(1, parseInt(e.target.value) || 1),
                        },
                      })
                    }
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 font-semibold block mb-1">
                    หน่วยนับ
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ราย, ครั้ง, เวร"
                    value={editingIndirectItem.item.unitLabel || 'ราย'}
                    onChange={(e) =>
                      setEditingIndirectItem({
                        ...editingIndirectItem,
                        item: { ...editingIndirectItem.item, unitLabel: e.target.value },
                      })
                    }
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 font-semibold block mb-1">
                  ปริมาณงานเริ่มต้น
                </label>
                <input
                  type="number"
                  min="0"
                  value={editingIndirectItem.item.count}
                  onChange={(e) =>
                    setEditingIndirectItem({
                      ...editingIndirectItem,
                      item: {
                        ...editingIndirectItem.item,
                        count: Math.max(0, parseInt(e.target.value) || 0),
                      },
                    })
                  }
                  className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 font-semibold block mb-1">
                  คำอธิบายเพิ่มเติม
                </label>
                <input
                  type="text"
                  placeholder="เช่น กิจกรรมเขียน Focus Note และสรุปจำหน่าย"
                  value={editingIndirectItem.item.note || ''}
                  onChange={(e) =>
                    setEditingIndirectItem({
                      ...editingIndirectItem,
                      item: { ...editingIndirectItem.item, note: e.target.value },
                    })
                  }
                  className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingIndirectItem({ ...editingIndirectItem, isOpen: false })}
                className="px-3 py-1.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveIndirectItem}
                disabled={!editingIndirectItem.item.name.trim()}
                className="px-4 py-1.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-sm disabled:opacity-50"
              >
                บันทึกรายการ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Modal: เพิ่ม / แก้ไขประเภทงานสนับสนุน (Support Work Modal) */}
      {/* ======================================================== */}
      {editingSupportItem.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xl text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>{editingSupportItem.isNew ? 'เพิ่มประเภทงานสนับสนุนใหม่' : 'แก้ไขประเภทงานสนับสนุน'}</span>
              </h3>
              <button
                onClick={() => setEditingSupportItem({ ...editingSupportItem, isOpen: false })}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-slate-600 dark:text-slate-400 font-semibold block mb-1">
                  ชื่อประเภทงานสนับสนุน
                </label>
                <input
                  type="text"
                  placeholder="เช่น บริหารวอร์ด, ตรวจเครื่องมือ, IC, CQI..."
                  value={editingSupportItem.item.name}
                  onChange={(e) =>
                    setEditingSupportItem({
                      ...editingSupportItem,
                      item: { ...editingSupportItem.item, name: e.target.value },
                    })
                  }
                  className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 font-semibold block mb-1">
                    ความถี่
                  </label>
                  <select
                    value={editingSupportItem.item.frequencyType}
                    onChange={(e) =>
                      setEditingSupportItem({
                        ...editingSupportItem,
                        item: {
                          ...editingSupportItem.item,
                          frequencyType: e.target.value as any,
                        },
                      })
                    }
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-medium"
                  >
                    <option value="daily">ทุกวัน (Daily)</option>
                    <option value="weekly">ต่อสัปดาห์ (Weekly)</option>
                    <option value="monthly">ต่อเดือน (Monthly)</option>
                    <option value="custom">ตามครั้งจริง</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 font-semibold block mb-1">
                    จำนวนครั้ง
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editingSupportItem.item.frequencyCount}
                    onChange={(e) =>
                      setEditingSupportItem({
                        ...editingSupportItem,
                        item: {
                          ...editingSupportItem.item,
                          frequencyCount: Math.max(1, parseInt(e.target.value) || 1),
                        },
                      })
                    }
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 font-semibold block mb-1">
                  เวลาที่ใช้จริงต่อกิจกรรม (นาที)
                </label>
                <input
                  type="number"
                  min="1"
                  value={editingSupportItem.item.timeMinutesPerSession}
                  onChange={(e) =>
                    setEditingSupportItem({
                      ...editingSupportItem,
                      item: {
                        ...editingSupportItem.item,
                        timeMinutesPerSession: Math.max(1, parseInt(e.target.value) || 1),
                      },
                    })
                  }
                  className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 font-semibold block mb-1">
                  คำอธิบายรายละเอียด
                </label>
                <input
                  type="text"
                  placeholder="เช่น ตรวจสอบรถ Emergency และเครื่อง Defibrillator"
                  value={editingSupportItem.item.note || ''}
                  onChange={(e) =>
                    setEditingSupportItem({
                      ...editingSupportItem,
                      item: { ...editingSupportItem.item, note: e.target.value },
                    })
                  }
                  className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingSupportItem({ ...editingSupportItem, isOpen: false })}
                className="px-3 py-1.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveSupportItem}
                disabled={!editingSupportItem.item.name.trim()}
                className="px-4 py-1.5 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-sm disabled:opacity-50"
              >
                บันทึกรายการ
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// Sub-component: Input Counter Card with + / - buttons
interface InputCounterCardProps {
  label: string;
  subtitle: string;
  value: number;
  onChange: (val: number) => void;
  badge?: string;
  badgeColor?: string;
}

const InputCounterCard: React.FC<InputCounterCardProps> = ({
  label,
  subtitle,
  value,
  onChange,
  badge,
  badgeColor = 'bg-slate-100 text-slate-700',
}) => {
  return (
    <div className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between hover:border-emerald-400 dark:hover:border-emerald-600 transition-all shadow-2xs">
      <div className="mb-2">
        <div className="flex items-start justify-between gap-1.5">
          <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-tight">
            {label}
          </span>
          {badge && (
            <span className={`text-[11px] px-2 py-0.5 rounded-md font-semibold shrink-0 ${badgeColor}`}>
              {badge}
            </span>
          )}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
          {subtitle}
        </div>
      </div>

      <div className="flex items-center justify-between mt-2 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => onChange(value - 1)}
            disabled={value <= 0}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center disabled:opacity-30 active:scale-95 hover:bg-slate-100 dark:hover:bg-slate-600 transition-all shadow-xs"
          >
            <Minus className="w-4 h-4" />
          </button>
          
          <input
            type="number"
            min="0"
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value) || 0)}
            className="w-14 sm:w-16 text-center py-1 sm:py-1.5 font-mono font-bold text-sm sm:text-base bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs"
          />

          <button
            type="button"
            onClick={() => onChange(value + 1)}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center active:scale-95 transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">ราย</span>
      </div>
    </div>
  );
};

// Sub-component: Actual Staff On Duty Section
interface ActualStaffSectionProps {
  title: string;
  staff: ShiftStaff;
  onChange: (shift: keyof ShiftStaff, val: number) => void;
  hideNight?: boolean;
}

const ActualStaffSection: React.FC<ActualStaffSectionProps> = ({
  title,
  staff,
  onChange,
  hideNight = false,
}) => {
  return (
    <div className="p-3.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2.5">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>{title}</span>
        </h4>
        <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
          รวมจริง: {staff.morning + staff.afternoon + (hideNight ? 0 : staff.night)} คน
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
          <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-0.5">
            เวรเช้า (08.00 - 16.00)
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min="0"
              value={staff.morning}
              onChange={(e) => onChange('morning', parseInt(e.target.value) || 0)}
              className="w-full py-1 px-2 text-center font-mono font-bold text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
            />
            <span className="text-[11px] text-slate-400">คน</span>
          </div>
        </div>

        <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
          <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-0.5">
            เวรบ่าย (16.00 - 24.00)
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min="0"
              value={staff.afternoon}
              onChange={(e) => onChange('afternoon', parseInt(e.target.value) || 0)}
              className="w-full py-1 px-2 text-center font-mono font-bold text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
            />
            <span className="text-[11px] text-slate-400">คน</span>
          </div>
        </div>

        {!hideNight && (
          <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-0.5">
              เวรดึก (24.00 - 08.00)
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                value={staff.night}
                onChange={(e) => onChange('night', parseInt(e.target.value) || 0)}
                className="w-full py-1 px-2 text-center font-mono font-bold text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              />
              <span className="text-[11px] text-slate-400">คน</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
