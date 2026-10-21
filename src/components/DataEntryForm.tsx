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
  ActivityTemplate,
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
  Database,
  Cloud,
  Link2,
  RotateCw,
  ListFilter,
  Tag,
  Info,
  ExternalLink,
  Search,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AppUser, canUserEditDepartment, canUserAddRecord, ROLE_LABELS, DEPARTMENT_LABELS } from '../types/auth';

export const INDIRECT_CATEGORY_LABELS: Record<string, { label: string; badgeColor: string }> = {
  documentation: {
    label: 'เวชระเบียน / บันทึกชาร์จ',
    badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
  },
  medication: {
    label: 'เตรียมยา / สารน้ำ',
    badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
  },
  coordination: {
    label: 'ประสานงาน / ส่งต่อ',
    badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
  },
  handover: {
    label: 'ส่งมอบเวรข้ามกะ',
    badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800',
  },
  custom: {
    label: 'งานรองเฉพาะด้าน',
    badgeColor: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
  },
};

export const SUPPORT_CATEGORY_LABELS: Record<string, { label: string; badgeColor: string }> = {
  ward_management: {
    label: 'บริหารวอร์ด / ตรวจเวร',
    badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800',
  },
  equipment_check: {
    label: 'ตรวจเครื่องมือ / รถช่วยชีวิต',
    badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
  },
  ic: {
    label: 'ป้องกันการติดเชื้อ (IC)',
    badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border border-teal-200 dark:border-teal-800',
  },
  cqi_ha: {
    label: 'พัฒนาคุณภาพ (CQI / HA)',
    badgeColor: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300 border border-violet-200 dark:border-violet-800',
  },
  custom: {
    label: 'งานสนับสนุนทั่วไป',
    badgeColor: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
  },
};

interface DataEntryFormProps {
  currentRecord: DailyRecord;
  onSaveRecord: (updated: DailyRecord) => void;
  onAddNewDateRecord: (dateStr: string) => void;
  standardsConfig: StandardWeightsConfig;
  initialDept?: DepartmentKey;
  onOpenStandards: () => void;
  appUser?: AppUser | null;
  activityTemplates?: ActivityTemplate[];
  onSaveActivityTemplate?: (template: ActivityTemplate, linkAllDates?: boolean) => Promise<void>;
  onDeleteActivityTemplate?: (templateId: string, removeFromAllDates?: boolean) => Promise<void>;
  onSyncAllDatesWithTemplates?: () => Promise<void>;
}

export const DataEntryForm: React.FC<DataEntryFormProps> = ({
  currentRecord,
  onSaveRecord,
  onAddNewDateRecord,
  standardsConfig,
  initialDept = 'ER',
  onOpenStandards,
  appUser = null,
  activityTemplates = [],
  onSaveActivityTemplate,
  onDeleteActivityTemplate,
  onSyncAllDatesWithTemplates,
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

  // Master Activity Catalog Modal
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [catalogSearchTerm, setCatalogSearchTerm] = useState('');
  const [catalogPartFilter, setCatalogPartFilter] = useState<'all' | 'indirect' | 'support'>('all');
  const [catalogDeptFilter, setCatalogDeptFilter] = useState<'all' | DepartmentKey | 'ALL'>('all');

  // Unified Add / Edit Activity Type Modal (พร้อมบันทึกลงฐานข้อมูล Supabase และเชื่อมโยงทุกวัน)
  const [activityItemModal, setActivityItemModal] = useState<{
    isOpen: boolean;
    isNew: boolean;
    part: 'indirect' | 'support';
    id: string;
    templateId?: string;
    name: string;
    category: string;
    departmentScope: 'ALL' | DepartmentKey;
    unitTimeMinutes: number;
    unitLabel: string;
    frequencyType: 'daily' | 'weekly' | 'monthly' | 'custom';
    frequencyCount: number;
    note: string;
    linkToDatabase: boolean;
    todayCount: number;
  }>({
    isOpen: false,
    isNew: true,
    part: 'indirect',
    id: '',
    name: '',
    category: 'documentation',
    departmentScope: 'ALL',
    unitTimeMinutes: 10,
    unitLabel: 'ราย',
    frequencyType: 'daily',
    frequencyCount: 1,
    note: '',
    linkToDatabase: true,
    todayCount: 0,
  });

  // Delete Confirmation Dialog state
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    part: 'indirect' | 'support';
    id: string;
    templateId?: string;
    name: string;
    isLinked: boolean;
  }>({
    isOpen: false,
    part: 'indirect',
    id: '',
    name: '',
    isLinked: false,
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

  // --- CRUD for Indirect Care & Support Work Items (เชื่อมโยงฐานข้อมูลส่วนกลาง) ---
  const handleOpenAddModal = (part: 'indirect' | 'support') => {
    setActivityItemModal({
      isOpen: true,
      isNew: true,
      part,
      id: `${part === 'indirect' ? 'ind' : 'sup'}-${Date.now()}`,
      templateId: undefined,
      name: '',
      category: part === 'indirect' ? 'documentation' : 'ward_management',
      departmentScope: 'ALL',
      unitTimeMinutes: part === 'indirect' ? 10 : 30,
      unitLabel: part === 'indirect' ? 'ราย' : 'วัน',
      frequencyType: 'daily',
      frequencyCount: 1,
      note: '',
      linkToDatabase: true,
      todayCount: 0,
    });
  };

  const handleOpenEditIndirect = (item: IndirectCareItem) => {
    setActivityItemModal({
      isOpen: true,
      isNew: false,
      part: 'indirect',
      id: item.id,
      templateId: item.templateId,
      name: item.name,
      category: item.category || 'documentation',
      departmentScope: 'ALL',
      unitTimeMinutes: item.unitTimeMinutes,
      unitLabel: item.unitLabel || 'ราย',
      frequencyType: 'daily',
      frequencyCount: 1,
      note: item.note || '',
      linkToDatabase: !!item.templateId || true,
      todayCount: item.count,
    });
  };

  const handleOpenEditSupport = (item: SupportWorkItem) => {
    setActivityItemModal({
      isOpen: true,
      isNew: false,
      part: 'support',
      id: item.id,
      templateId: item.templateId,
      name: item.name,
      category: item.category || 'ward_management',
      departmentScope: 'ALL',
      unitTimeMinutes: item.timeMinutesPerSession,
      unitLabel: 'วัน',
      frequencyType: item.frequencyType || 'daily',
      frequencyCount: item.frequencyCount || 1,
      note: item.note || '',
      linkToDatabase: !!item.templateId || true,
      todayCount: item.frequencyCount || 1,
    });
  };

  const handleSaveActivityModal = async () => {
    const modal = activityItemModal;
    if (!modal.name.trim()) return;

    if (modal.part === 'indirect') {
      const templateId = modal.templateId || (modal.linkToDatabase ? `tpl-ind-${Date.now()}` : undefined);
      const newItem: IndirectCareItem = {
        id: modal.id || templateId || `ind-${Date.now()}`,
        templateId,
        name: modal.name.trim(),
        category: (modal.category as any) || 'custom',
        count: modal.todayCount ?? 0,
        unitTimeMinutes: Number(modal.unitTimeMinutes) || 1,
        unitLabel: modal.unitLabel || 'ราย',
        note: modal.note.trim(),
      };

      const currentList = currentDeptData.indirectItems || [];
      let updatedList: IndirectCareItem[];
      if (modal.isNew) {
        updatedList = [...currentList, newItem];
      } else {
        updatedList = currentList.map((i) => (i.id === modal.id ? { ...newItem, count: i.count } : i));
      }
      setIndirectItemsForActiveDept(updatedList);

      if (modal.linkToDatabase && onSaveActivityTemplate && templateId) {
        const template: ActivityTemplate = {
          id: templateId,
          department: modal.departmentScope,
          workloadPart: 'indirect',
          name: modal.name.trim(),
          category: modal.category,
          unitTimeMinutes: Number(modal.unitTimeMinutes) || 1,
          unitLabel: modal.unitLabel || 'ราย',
          note: modal.note.trim(),
          isActive: true,
        };
        await onSaveActivityTemplate(template, true);
      }
    } else {
      const templateId = modal.templateId || (modal.linkToDatabase ? `tpl-sup-${Date.now()}` : undefined);
      const newItem: SupportWorkItem = {
        id: modal.id || templateId || `sup-${Date.now()}`,
        templateId,
        name: modal.name.trim(),
        category: (modal.category as any) || 'custom',
        frequencyType: modal.frequencyType,
        frequencyCount: Number(modal.frequencyCount) || 1,
        timeMinutesPerSession: Number(modal.unitTimeMinutes) || 1,
        note: modal.note.trim(),
      };

      const currentList = currentDeptData.supportItems || [];
      let updatedList: SupportWorkItem[];
      if (modal.isNew) {
        updatedList = [...currentList, newItem];
      } else {
        updatedList = currentList.map((i) => (i.id === modal.id ? { ...newItem, frequencyCount: i.frequencyCount } : i));
      }
      setSupportItemsForActiveDept(updatedList);

      if (modal.linkToDatabase && onSaveActivityTemplate && templateId) {
        const template: ActivityTemplate = {
          id: templateId,
          department: modal.departmentScope,
          workloadPart: 'support',
          name: modal.name.trim(),
          category: modal.category,
          unitTimeMinutes: Number(modal.unitTimeMinutes) || 1,
          unitLabel: 'วัน',
          frequencyType: modal.frequencyType,
          defaultFrequencyCount: Number(modal.frequencyCount) || 1,
          note: modal.note.trim(),
          isActive: true,
        };
        await onSaveActivityTemplate(template, true);
      }
    }

    setActivityItemModal((prev) => ({ ...prev, isOpen: false }));
  };

  const handleRequestDelete = (part: 'indirect' | 'support', item: IndirectCareItem | SupportWorkItem) => {
    const isLinked = !!item.templateId || activityTemplates.some((t) => t.id === item.id || t.id === item.templateId);
    setDeleteDialog({
      isOpen: true,
      part,
      id: item.id,
      templateId: item.templateId,
      name: item.name,
      isLinked,
    });
  };

  const handleConfirmDelete = async (deleteFromDatabase: boolean) => {
    const { part, id, templateId } = deleteDialog;
    if (part === 'indirect') {
      const currentList = currentDeptData.indirectItems || [];
      setIndirectItemsForActiveDept(currentList.filter((i) => i.id !== id && i.templateId !== id));
      if (deleteFromDatabase && (templateId || id) && onDeleteActivityTemplate) {
        await onDeleteActivityTemplate(templateId || id, true);
      }
    } else {
      const currentList = currentDeptData.supportItems || [];
      setSupportItemsForActiveDept(currentList.filter((i) => i.id !== id && i.templateId !== id));
      if (deleteFromDatabase && (templateId || id) && onDeleteActivityTemplate) {
        await onDeleteActivityTemplate(templateId || id, true);
      }
    }
    setDeleteDialog((prev) => ({ ...prev, isOpen: false }));
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

            {/* ======================================================== */}
            {/* ส่วนที่ 2: ตารางบันทึกงานรอง (Indirect Nursing Care Table) */}
            {/* สูตร: ∑ (ปริมาณงาน x เวลามาตรฐานต่อหน่วย) ÷ 60           */}
            {/* ======================================================== */}
            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-blue-50/90 via-sky-50/70 to-blue-50/90 dark:from-blue-950/40 dark:via-sky-950/30 dark:to-blue-950/40 p-3.5 rounded-2xl border border-blue-200/70 dark:border-blue-800/60 shadow-2xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                    <span className="font-bold text-xs sm:text-sm text-blue-950 dark:text-blue-100 flex items-center gap-1.5">
                      <span>ส่วนที่ 2: งานรอง (Indirect Nursing Care)</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-700/60">
                        {currentDeptData.indirectItems?.length || 0} ประเภท
                      </span>
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 mt-1 leading-snug">
                    <strong>สูตร:</strong> ∑ (ปริมาณงานจริง × เวลามาตรฐานต่อหน่วย) ÷ 60 นาที • เช่น บันทึกชาร์จ, เตรียมยา, ประสานงาน, ส่งเวร
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <div className="px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-blue-200 dark:border-blue-800 flex items-center gap-1.5 shadow-2xs">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">ค่างานรองรวม:</span>
                    <span className="font-mono font-black text-sm text-blue-700 dark:text-blue-300">
                      {activeCalc.indirectCareHours}
                    </span>
                    <span className="text-[11px] text-slate-500">ชม./วัน</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsCatalogModalOpen(true)}
                    className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                    title="เปิดคลังประเภทงานที่บันทึกในฐานข้อมูล"
                  >
                    <Database className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>คลังประเภทงาน ({activityTemplates?.length || 0})</span>
                  </button>

                  {canEditActiveDept && (
                    <button
                      type="button"
                      onClick={() => handleOpenAddModal('indirect')}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>เพิ่มประเภทงานรอง</span>
                    </button>
                  )}
                </div>
              </div>

              {/* ตารางบันทึกส่วนที่ 2: งานรอง */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                <table className="w-full text-left border-collapse text-xs min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3">ประเภทกิจกรรมงานรอง</th>
                      <th className="py-2.5 px-3 text-center w-36">หมวดหมู่</th>
                      <th className="py-2.5 px-3 text-center w-32">เวลามาตรฐาน</th>
                      <th className="py-2.5 px-3 text-center w-48">ปริมาณงานจริงในเวร</th>
                      <th className="py-2.5 px-3 text-right w-28">ค่างาน (ชม.)</th>
                      <th className="py-2.5 px-3 text-center w-32">ฐานข้อมูล</th>
                      {canEditActiveDept && <th className="py-2.5 px-3 text-center w-20">จัดการ</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(currentDeptData.indirectItems || []).length === 0 ? (
                      <tr>
                        <td colSpan={canEditActiveDept ? 8 : 7} className="py-8 text-center text-slate-400">
                          <p className="font-medium text-xs">ยังไม่มีรายการงานรองในฝ่ายงานนี้</p>
                          {canEditActiveDept && (
                            <button
                              type="button"
                              onClick={() => handleOpenAddModal('indirect')}
                              className="mt-2 text-blue-600 hover:underline text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" /> เพิ่มประเภทงานรองแรก
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      (currentDeptData.indirectItems || []).map((item, idx) => {
                        const itemHours = Number(((item.count * item.unitTimeMinutes) / 60).toFixed(2));
                        const isLinked = !!item.templateId || activityTemplates.some((t) => t.id === item.id || t.id === item.templateId);
                        const catInfo = INDIRECT_CATEGORY_LABELS[item.category] || INDIRECT_CATEGORY_LABELS.custom;

                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors"
                          >
                            <td className="py-2.5 px-3 text-center font-mono text-slate-400 text-[11px]">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-800 dark:text-slate-100">
                                {item.name}
                              </div>
                              {item.note && (
                                <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                                  {item.note}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium ${catInfo.badgeColor}`}>
                                {catInfo.label}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-600 dark:text-slate-300">
                              <span className="font-bold text-blue-700 dark:text-blue-300">{item.unitTimeMinutes}</span> นาที/{item.unitLabel || 'ราย'}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const val = Math.max(0, (item.count || 0) - 1);
                                    const updated = (currentDeptData.indirectItems || []).map((i) =>
                                      i.id === item.id ? { ...i, count: val } : i
                                    );
                                    setIndirectItemsForActiveDept(updated);
                                  }}
                                  disabled={!canEditActiveDept || (item.count || 0) <= 0}
                                  className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 text-slate-700 dark:text-slate-200 flex items-center justify-center cursor-pointer transition-colors"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  value={item.count}
                                  disabled={!canEditActiveDept}
                                  onChange={(e) => {
                                    const val = Math.max(0, parseInt(e.target.value) || 0);
                                    const updated = (currentDeptData.indirectItems || []).map((i) =>
                                      i.id === item.id ? { ...i, count: val } : i
                                    );
                                    setIndirectItemsForActiveDept(updated);
                                  }}
                                  className="w-16 py-1 px-1 text-center font-mono font-black text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const val = (item.count || 0) + 1;
                                    const updated = (currentDeptData.indirectItems || []).map((i) =>
                                      i.id === item.id ? { ...i, count: val } : i
                                    );
                                    setIndirectItemsForActiveDept(updated);
                                  }}
                                  disabled={!canEditActiveDept}
                                  className="w-7 h-7 rounded-lg bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/60 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 flex items-center justify-center cursor-pointer transition-colors"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-[11px] text-slate-500 font-medium ml-1">
                                  {item.unitLabel || 'ราย'}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                                {itemHours.toFixed(2)}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {isLinked ? (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800" title="ประเภทนี้เชื่อมโยงกับฐานข้อมูล Supabase และแสดงในทุกวัน">
                                  <Cloud className="w-3 h-3 text-emerald-600" />
                                  <span>เชื่อมทุกวัน</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium" title="บันทึกเฉพาะวันนี้เท่านั้น">
                                  <span>เฉพาะวันนี้</span>
                                </span>
                              )}
                            </td>
                            {canEditActiveDept && (
                              <td className="py-2.5 px-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditIndirect(item)}
                                    title="แก้ไขประเภทงานรองนี้"
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors cursor-pointer"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRequestDelete('indirect', item)}
                                    title="ลบประเภทงานรองนี้"
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-blue-50/50 dark:bg-blue-950/30 border-t-2 border-blue-200 dark:border-blue-800 font-bold">
                      <td colSpan={4} className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                        รวมชั่วโมงภาระงานรองทั้งหมด (Total Indirect Care Hours):
                      </td>
                      <td colSpan={canEditActiveDept ? 4 : 3} className="py-2.5 px-4 text-right">
                        <span className="font-mono font-black text-sm text-blue-700 dark:text-blue-300 mr-1">
                          {activeCalc.indirectCareHours}
                        </span>
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">ชั่วโมง/วัน</span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* ======================================================== */}
            {/* ส่วนที่ 3: ตารางบันทึกงานสนับสนุน (Support Work Table)     */}
            {/* สูตร: ∑ (ความถี่ x เวลาต่อกิจกรรม) แปลงเฉลี่ยต่อวัน     */}
            {/* ======================================================== */}
            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-purple-50/90 via-fuchsia-50/70 to-purple-50/90 dark:from-purple-950/40 dark:via-fuchsia-950/30 dark:to-purple-950/40 p-3.5 rounded-2xl border border-purple-200/70 dark:border-purple-800/60 shadow-2xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse" />
                    <span className="font-bold text-xs sm:text-sm text-purple-950 dark:text-purple-100 flex items-center gap-1.5">
                      <span>ส่วนที่ 3: งานสนับสนุน (Support Work / Ward Management)</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 font-semibold border border-purple-200 dark:border-purple-700/60">
                        {currentDeptData.supportItems?.length || 0} ประเภท
                      </span>
                    </span>
                  </div>
                  <p className="text-[11px] text-purple-800/80 dark:text-purple-300/80 mt-1 leading-snug">
                    <strong>สูตร:</strong> ∑ (ความถี่กิจกรรม × เวลาต่อครั้ง) แปลงเป็นชั่วโมงเฉลี่ยต่อวัน • เช่น บริหารวอร์ด, ตรวจรถช่วยชีวิต, IC, CQI/HA, ตรวจนับคลังยา
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <div className="px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-purple-200 dark:border-purple-800 flex items-center gap-1.5 shadow-2xs">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">ค่างานสนับสนุนรวม:</span>
                    <span className="font-mono font-black text-sm text-purple-700 dark:text-purple-300">
                      {activeCalc.supportCareHours}
                    </span>
                    <span className="text-[11px] text-slate-500">ชม./วัน</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsCatalogModalOpen(true)}
                    className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                    title="เปิดคลังประเภทงานที่บันทึกในฐานข้อมูล"
                  >
                    <Database className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>คลังประเภทงาน ({activityTemplates?.length || 0})</span>
                  </button>

                  {canEditActiveDept && (
                    <button
                      type="button"
                      onClick={() => handleOpenAddModal('support')}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>เพิ่มประเภทงานสนับสนุน</span>
                    </button>
                  )}
                </div>
              </div>

              {/* ตารางบันทึกส่วนที่ 3: งานสนับสนุน */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                <table className="w-full text-left border-collapse text-xs min-w-[750px]">
                  <thead>
                    <tr className="bg-slate-50/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3">ประเภทกิจกรรมงานสนับสนุน / บริหารวอร์ด</th>
                      <th className="py-2.5 px-3 text-center w-36">หมวดหมู่</th>
                      <th className="py-2.5 px-3 text-center w-32">รอบความถี่</th>
                      <th className="py-2.5 px-3 text-center w-40">จำนวนครั้งตามรอบ</th>
                      <th className="py-2.5 px-3 text-center w-32">เวลาต่อครั้ง (นาที)</th>
                      <th className="py-2.5 px-3 text-right w-28">ค่างานเฉลี่ย (ชม./วัน)</th>
                      <th className="py-2.5 px-3 text-center w-32">ฐานข้อมูล</th>
                      {canEditActiveDept && <th className="py-2.5 px-3 text-center w-20">จัดการ</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(currentDeptData.supportItems || []).length === 0 ? (
                      <tr>
                        <td colSpan={canEditActiveDept ? 9 : 8} className="py-8 text-center text-slate-400">
                          <p className="font-medium text-xs">ยังไม่มีรายการงานสนับสนุนในฝ่ายงานนี้</p>
                          {canEditActiveDept && (
                            <button
                              type="button"
                              onClick={() => handleOpenAddModal('support')}
                              className="mt-2 text-purple-600 hover:underline text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" /> เพิ่มประเภทงานสนับสนุนแรก
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      (currentDeptData.supportItems || []).map((item, idx) => {
                        const sessionMin = Number(item.timeMinutesPerSession || 0);
                        const count = Number(item.frequencyCount || 0);
                        let dailyHours = 0;
                        if (item.frequencyType === 'daily') dailyHours = (count * sessionMin) / 60;
                        else if (item.frequencyType === 'weekly') dailyHours = ((count * sessionMin) / 60) / 7;
                        else if (item.frequencyType === 'monthly') dailyHours = ((count * sessionMin) / 60) / 30;
                        else dailyHours = (count * sessionMin) / 60;

                        const isLinked = !!item.templateId || activityTemplates.some((t) => t.id === item.id || t.id === item.templateId);
                        const catInfo = SUPPORT_CATEGORY_LABELS[item.category] || SUPPORT_CATEGORY_LABELS.custom;

                        const freqText =
                          item.frequencyType === 'daily'
                            ? 'ทุกวัน (Daily)'
                            : item.frequencyType === 'weekly'
                            ? 'ต่อสัปดาห์ (Weekly)'
                            : item.frequencyType === 'monthly'
                            ? 'ต่อเดือน (Monthly)'
                            : 'ตามจริง';

                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition-colors"
                          >
                            <td className="py-2.5 px-3 text-center font-mono text-slate-400 text-[11px]">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-800 dark:text-slate-100">
                                {item.name}
                              </div>
                              {item.note && (
                                <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                                  {item.note}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium ${catInfo.badgeColor}`}>
                                {catInfo.label}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                                {freqText}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const val = Math.max(0, (item.frequencyCount || 0) - 1);
                                    const updated = (currentDeptData.supportItems || []).map((i) =>
                                      i.id === item.id ? { ...i, frequencyCount: val } : i
                                    );
                                    setSupportItemsForActiveDept(updated);
                                  }}
                                  disabled={!canEditActiveDept || (item.frequencyCount || 0) <= 0}
                                  className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 text-slate-700 dark:text-slate-200 flex items-center justify-center cursor-pointer transition-colors"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  value={item.frequencyCount}
                                  disabled={!canEditActiveDept}
                                  onChange={(e) => {
                                    const val = Math.max(0, parseInt(e.target.value) || 0);
                                    const updated = (currentDeptData.supportItems || []).map((i) =>
                                      i.id === item.id ? { ...i, frequencyCount: val } : i
                                    );
                                    setSupportItemsForActiveDept(updated);
                                  }}
                                  className="w-16 py-1 px-1 text-center font-mono font-black text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500 shadow-2xs"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const val = (item.frequencyCount || 0) + 1;
                                    const updated = (currentDeptData.supportItems || []).map((i) =>
                                      i.id === item.id ? { ...i, frequencyCount: val } : i
                                    );
                                    setSupportItemsForActiveDept(updated);
                                  }}
                                  disabled={!canEditActiveDept}
                                  className="w-7 h-7 rounded-lg bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/60 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-300 flex items-center justify-center cursor-pointer transition-colors"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-[11px] text-slate-500 font-medium ml-1">ครั้ง</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-700 dark:text-slate-300">
                              <span className="text-purple-700 dark:text-purple-300 font-bold">{item.timeMinutesPerSession}</span> นาที
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <span className="font-mono font-bold text-xs text-purple-600 dark:text-purple-400">
                                {dailyHours.toFixed(2)}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {isLinked ? (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800" title="ประเภทนี้เชื่อมโยงกับฐานข้อมูล Supabase และแสดงในทุกวัน">
                                  <Cloud className="w-3 h-3 text-emerald-600" />
                                  <span>เชื่อมทุกวัน</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium" title="บันทึกเฉพาะวันนี้เท่านั้น">
                                  <span>เฉพาะวันนี้</span>
                                </span>
                              )}
                            </td>
                            {canEditActiveDept && (
                              <td className="py-2.5 px-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditSupport(item)}
                                    title="แก้ไขประเภทงานสนับสนุนนี้"
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950 transition-colors cursor-pointer"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRequestDelete('support', item)}
                                    title="ลบประเภทงานสนับสนุนนี้"
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-purple-50/50 dark:bg-purple-950/30 border-t-2 border-purple-200 dark:border-purple-800 font-bold">
                      <td colSpan={4} className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                        รวมชั่วโมงภาระงานสนับสนุนทั้งหมด (Total Support Care Hours):
                      </td>
                      <td colSpan={canEditActiveDept ? 5 : 4} className="py-2.5 px-4 text-right">
                        <span className="font-mono font-black text-sm text-purple-700 dark:text-purple-300 mr-1">
                          {activeCalc.supportCareHours}
                        </span>
                        <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold">ชั่วโมง/วัน</span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
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
      {/* Modal 1: เพิ่ม / แก้ไขประเภทงาน (ส่วนที่ 2: งานรอง & ส่วนที่ 3: งานสนับสนุน) */}
      {/* เชื่อมโยงฐานข้อมูลกลาง (Master Catalog) และลิงค์ทุกวันอัตโนมัติ */}
      {/* ======================================================== */}
      {activityItemModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-2xl text-xs max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                      activityItemModal.part === 'indirect'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 border-blue-200 dark:border-blue-700'
                        : 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 border-purple-200 dark:border-purple-700'
                    }`}
                  >
                    {activityItemModal.part === 'indirect'
                      ? 'ส่วนที่ 2: งานรอง (Indirect Care)'
                      : 'ส่วนที่ 3: งานสนับสนุน (Support Work)'}
                  </span>
                  {activityItemModal.templateId && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1 border border-emerald-200 dark:border-emerald-800">
                      <Cloud className="w-3 h-3 text-emerald-600" />
                      <span>เชื่อมฐานข้อมูลกลาง</span>
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    {activityItemModal.isNew
                      ? activityItemModal.part === 'indirect'
                        ? 'เพิ่มประเภทงานรองใหม่'
                        : 'เพิ่มประเภทงานสนับสนุนใหม่'
                      : 'แก้ไขประเภทงาน'}
                  </span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActivityItemModal((prev) => ({ ...prev, isOpen: false }))}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-3.5">
              <div>
                <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">
                  ชื่อประเภทกิจกรรม <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={
                    activityItemModal.part === 'indirect'
                      ? 'เช่น บันทึกชาร์จ, เตรียมยา/สารน้ำ, ส่งมอบเวร, ประสานงานส่งต่อเคส'
                      : 'เช่น ตรวจเช็ครถช่วยชีวิต Emergency, บริหารจัดการวอร์ด, งาน IC, พัฒนาคุณภาพ CQI/HA'
                  }
                  value={activityItemModal.name}
                  onChange={(e) => setActivityItemModal({ ...activityItemModal, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">
                    หมวดหมู่กิจกรรม
                  </label>
                  <select
                    value={activityItemModal.category}
                    onChange={(e) => setActivityItemModal({ ...activityItemModal, category: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    {activityItemModal.part === 'indirect' ? (
                      <>
                        <option value="documentation">เวชระเบียน / บันทึกชาร์จ</option>
                        <option value="medication">เตรียมยา / สารน้ำ</option>
                        <option value="coordination">ประสานงาน / ส่งต่อเคส</option>
                        <option value="handover">ส่งมอบเวรข้ามกะ</option>
                        <option value="custom">งานรองเฉพาะด้าน</option>
                      </>
                    ) : (
                      <>
                        <option value="ward_management">บริหารวอร์ด / ตรวจเวร</option>
                        <option value="equipment_check">ตรวจเครื่องมือ / รถช่วยชีวิต</option>
                        <option value="ic">ป้องกันการติดเชื้อ (IC)</option>
                        <option value="cqi_ha">พัฒนาคุณภาพ (CQI / HA)</option>
                        <option value="custom">งานสนับสนุนทั่วไป</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">
                    ขอบเขตฝ่ายงานที่ใช้
                  </label>
                  <select
                    value={activityItemModal.departmentScope}
                    onChange={(e) =>
                      setActivityItemModal({
                        ...activityItemModal,
                        departmentScope: e.target.value as any,
                      })
                    }
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">ใช้ร่วมกันทุกฝ่าย (ALL Departments)</option>
                    <option value="ER">เฉพาะฝ่ายอุบัติเหตุและฉุกเฉิน (ER)</option>
                    <option value="OPD">เฉพาะฝ่ายผู้ป่วยนอก (OPD)</option>
                    <option value="IPD1">เฉพาะฝ่ายผู้ป่วยใน 1 (IPD1)</option>
                    <option value="IPD2">เฉพาะฝ่ายผู้ป่วยใน 2 (IPD2)</option>
                    <option value="LR">เฉพาะฝ่ายห้องคลอด (LR)</option>
                  </select>
                </div>
              </div>

              {/* Specific inputs for Indirect vs Support */}
              {activityItemModal.part === 'indirect' ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">
                      เวลามาตรฐาน (นาที/หน่วย)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={activityItemModal.unitTimeMinutes}
                      onChange={(e) =>
                        setActivityItemModal({
                          ...activityItemModal,
                          unitTimeMinutes: Math.max(1, parseInt(e.target.value) || 1),
                        })
                      }
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">
                      หน่วยนับ
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น ราย, ครั้ง, เคส, ชาร์จ"
                      value={activityItemModal.unitLabel}
                      onChange={(e) => setActivityItemModal({ ...activityItemModal, unitLabel: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">
                      ปริมาณงานวันนี้
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={activityItemModal.todayCount}
                      onChange={(e) =>
                        setActivityItemModal({
                          ...activityItemModal,
                          todayCount: Math.max(0, parseInt(e.target.value) || 0),
                        })
                      }
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">
                      รอบความถี่
                    </label>
                    <select
                      value={activityItemModal.frequencyType}
                      onChange={(e) =>
                        setActivityItemModal({
                          ...activityItemModal,
                          frequencyType: e.target.value as any,
                        })
                      }
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="daily">ทุกวัน (Daily)</option>
                      <option value="weekly">ต่อสัปดาห์ (Weekly)</option>
                      <option value="monthly">ต่อเดือน (Monthly)</option>
                      <option value="custom">ตามครั้งจริง</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">
                      จำนวนครั้ง / รอบ
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={activityItemModal.frequencyCount}
                      onChange={(e) =>
                        setActivityItemModal({
                          ...activityItemModal,
                          frequencyCount: Math.max(1, parseInt(e.target.value) || 1),
                        })
                      }
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">
                      เวลาที่ใช้ต่อครั้ง (นาที)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={activityItemModal.unitTimeMinutes}
                      onChange={(e) =>
                        setActivityItemModal({
                          ...activityItemModal,
                          unitTimeMinutes: Math.max(1, parseInt(e.target.value) || 1),
                        })
                      }
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">
                  คำอธิบายหรือแนวทางปฏิบัติ (Note)
                </label>
                <input
                  type="text"
                  placeholder="เช่น กิจกรรมเขียน Focus Note และสรุปจำหน่าย หรือ แนวทางตรวจสอบรถ Defibrillator"
                  value={activityItemModal.note}
                  onChange={(e) => setActivityItemModal({ ...activityItemModal, note: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Database Link Checkbox */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-cyan-950/30 border border-emerald-300 dark:border-emerald-800/60 shadow-2xs">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activityItemModal.linkToDatabase}
                    onChange={(e) =>
                      setActivityItemModal({
                        ...activityItemModal,
                        linkToDatabase: e.target.checked,
                      })
                    }
                    className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <div>
                    <span className="font-bold text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>บันทึกลงฐานข้อมูลแม่แบบ และเชื่อมโยงกับทุกวันที่บันทึกในระบบ</span>
                    </span>
                    <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 mt-0.5 leading-snug">
                      เมื่อติ๊กเลือก ประเภทงานนี้จะถูกบันทึกเป็นแม่แบบกลาง (Master Activity Template) ในฐานข้อมูล และปรากฏในตารางของทุกวันที่บันทึกไว้ในระบบทันที
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActivityItemModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveActivityModal}
                disabled={!activityItemModal.name.trim()}
                className={`px-5 py-2 rounded-xl font-bold text-white shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 ${
                  activityItemModal.part === 'indirect'
                    ? 'bg-blue-600 hover:bg-blue-500'
                    : 'bg-purple-600 hover:bg-purple-500'
                }`}
              >
                บันทึกประเภทงาน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Modal 2: ยืนยันการลบประเภทงาน (Delete Confirmation Modal)   */}
      {/* ======================================================== */}
      {deleteDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  ยืนยันการลบประเภทงาน
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {deleteDialog.part === 'indirect' ? 'ส่วนที่ 2: งานรอง' : 'ส่วนที่ 3: งานสนับสนุน'}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                {deleteDialog.name}
              </p>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              คุณต้องการลบรายการนี้ออกจากระบบอย่างไร?
            </p>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => handleConfirmDelete(false)}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                <span>ลบเฉพาะวันที่บันทึกนี้เท่านั้น ({formData.date})</span>
              </button>

              <button
                type="button"
                onClick={() => handleConfirmDelete(true)}
                className="w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ลบออกจากฐานข้อมูลกลาง และทุกวันที่บันทึกไว้ในระบบทั้งหมด</span>
              </button>

              <button
                type="button"
                onClick={() => setDeleteDialog((prev) => ({ ...prev, isOpen: false }))}
                className="w-full py-2 text-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold text-xs cursor-pointer"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Modal 3: คลังประเภทงานมาตรฐาน (Master Activity Catalog)      */}
      {/* เปิดดูรายการแม่แบบทั้งหมดในฐานข้อมูล และเลือกนำเข้าได้ทันที     */}
      {/* ======================================================== */}
      {isCatalogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[88vh] overflow-hidden text-xs">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-linear-to-r from-blue-50/80 via-indigo-50/50 to-purple-50/80 dark:from-slate-800/90 dark:via-slate-800/70 dark:to-slate-800/90 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-md">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <span>คลังประเภทงานมาตรฐานในฐานข้อมูล</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-semibold">
                      {activityTemplates.length} รายการ
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    ฝ่ายที่กำลังเปิด: <strong className="text-blue-600 dark:text-blue-400">{DEPARTMENT_LABELS[activeDept]?.short || activeDept}</strong> • เลือกนำเข้า หรือ ซิงค์เชื่อมโยงกับทุกวัน
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {onSyncAllDatesWithTemplates && (
                  <button
                    type="button"
                    onClick={async () => {
                      await onSyncAllDatesWithTemplates();
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    title="เชื่อมโยงประเภทงานทั้งหมดในฐานข้อมูลกับทุกวันที่บันทึก"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">ซิงค์กับทุกวัน</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsCatalogModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-2.5">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อประเภทกิจกรรม..."
                  value={catalogSearchTerm}
                  onChange={(e) => setCatalogSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500">ส่วนงาน:</span>
                <div className="inline-flex rounded-xl p-0.5 bg-slate-200/80 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setCatalogPartFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      catalogPartFilter === 'all'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    ทั้งหมด
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatalogPartFilter('indirect')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      catalogPartFilter === 'indirect'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    งานรอง (ส่วน 2)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatalogPartFilter('support')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      catalogPartFilter === 'support'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    งานสนับสนุน (ส่วน 3)
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500">ฝ่าย:</span>
                <select
                  value={catalogDeptFilter}
                  onChange={(e) => setCatalogDeptFilter(e.target.value as any)}
                  className="py-1 px-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-medium"
                >
                  <option value="all">ทุกฝ่ายงาน</option>
                  <option value="ALL">ส่วนกลาง (ALL)</option>
                  <option value="ER">ER</option>
                  <option value="OPD">OPD</option>
                  <option value="IPD1">IPD1</option>
                  <option value="IPD2">IPD2</option>
                  <option value="LR">LR</option>
                </select>
              </div>
            </div>

            {/* Template List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {activityTemplates
                .filter((tpl) => {
                  if (catalogPartFilter !== 'all' && tpl.workloadPart !== catalogPartFilter) return false;
                  if (catalogDeptFilter !== 'all' && tpl.department !== catalogDeptFilter) return false;
                  if (catalogSearchTerm.trim()) {
                    const q = catalogSearchTerm.toLowerCase();
                    return (
                      tpl.name.toLowerCase().includes(q) ||
                      (tpl.note && tpl.note.toLowerCase().includes(q))
                    );
                  }
                  return true;
                })
                .map((tpl) => {
                  const isIndirect = tpl.workloadPart === 'indirect';
                  const alreadyInDept = isIndirect
                    ? (currentDeptData.indirectItems || []).some(
                        (i) => i.templateId === tpl.id || i.id === tpl.id || i.name === tpl.name
                      )
                    : (currentDeptData.supportItems || []).some(
                        (i) => i.templateId === tpl.id || i.id === tpl.id || i.name === tpl.name
                      );

                  return (
                    <div
                      key={tpl.id}
                      className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all shadow-2xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                              isIndirect
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 border-blue-200 dark:border-blue-700'
                                : 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 border-purple-200 dark:border-purple-700'
                            }`}
                          >
                            {isIndirect ? 'งานรอง (ส่วน 2)' : 'งานสนับสนุน (ส่วน 3)'}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                            {tpl.department === 'ALL' ? 'ทุกฝ่ายงาน (ALL)' : tpl.department}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            {isIndirect
                              ? `${tpl.unitTimeMinutes} นาที/${tpl.unitLabel || 'ราย'}`
                              : `${tpl.unitTimeMinutes} นาที/ครั้ง (${tpl.frequencyType === 'daily' ? 'ทุกวัน' : tpl.frequencyType === 'weekly' ? 'ต่อสัปดาห์' : tpl.frequencyType === 'monthly' ? 'ต่อเดือน' : 'ตามจริง'})`}
                          </span>
                        </div>
                        <p className="font-bold text-xs text-slate-900 dark:text-white">
                          {tpl.name}
                        </p>
                        {tpl.note && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {tpl.note}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {alreadyInDept ? (
                          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>อยู่ในเวรนี้แล้ว</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (isIndirect) {
                                const newItem: IndirectCareItem = {
                                  id: tpl.id,
                                  templateId: tpl.id,
                                  name: tpl.name,
                                  category: (tpl.category as any) || 'custom',
                                  count: 0,
                                  unitTimeMinutes: tpl.unitTimeMinutes,
                                  unitLabel: tpl.unitLabel || 'ราย',
                                  note: tpl.note || '',
                                };
                                setIndirectItemsForActiveDept([...(currentDeptData.indirectItems || []), newItem]);
                              } else {
                                const newItem: SupportWorkItem = {
                                  id: tpl.id,
                                  templateId: tpl.id,
                                  name: tpl.name,
                                  category: (tpl.category as any) || 'custom',
                                  frequencyType: tpl.frequencyType || 'daily',
                                  frequencyCount: tpl.defaultFrequencyCount || 1,
                                  timeMinutesPerSession: tpl.unitTimeMinutes,
                                  note: tpl.note || '',
                                };
                                setSupportItemsForActiveDept([...(currentDeptData.supportItems || []), newItem]);
                              }
                            }}
                            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ นำเข้าสู่เวรนี้</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

              {activityTemplates.length === 0 && (
                <div className="py-12 text-center text-slate-400">
                  <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="font-semibold text-xs">ยังไม่มีแม่แบบในฐานข้อมูล</p>
                  <p className="text-[11px] mt-1">
                    คุณสามารถกดปุ่ม "เพิ่มประเภทงานรอง" หรือ "เพิ่มประเภทงานสนับสนุน" ในแบบฟอร์มเพื่อบันทึกประเภทใหม่ลงในฐานข้อมูล
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                แม่แบบที่เพิ่มจะเชื่อมโยงกับฐานข้อมูล Supabase PostgreSQL และบันทึกของทุกวัน
              </span>
              <button
                type="button"
                onClick={() => setIsCatalogModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
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
