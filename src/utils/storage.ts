/**
 * Storage & Initial Seed Data for Sangkhlaburi Hospital
 * Configured with 3-Part Workload Model (Direct, Indirect, Support)
 */

import {
  DailyRecord,
  StandardWeightsConfig,
  ActivityTemplate,
  DepartmentKey,
  IndirectCareItem,
  SupportWorkItem,
} from '../types/nursing';
import {
  DEFAULT_STANDARDS,
  createDefaultIndirectItems,
  createDefaultSupportItems,
} from './calculator';

const STORAGE_KEY_RECORDS = 'sangkhlaburi_nursing_records_v2';
const STORAGE_KEY_STANDARDS = 'sangkhlaburi_nursing_standards_v2';
const STORAGE_KEY_TEMPLATES = 'sangkhlaburi_activity_templates_v2';
const STORAGE_KEY_THEME = 'sangkhlaburi_nursing_theme';

export function formatDateISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * แม่แบบประเภทกิจกรรมส่วนกลางเริ่มต้น (Master Activity Catalog Presets)
 * โรงพยาบาลสังขละบุรี
 */
export const DEFAULT_ACTIVITY_TEMPLATES: ActivityTemplate[] = [
  // --- ส่วนที่ 2: งานรอง (Indirect Care) ---
  {
    id: 'tpl-ind-doc',
    department: 'ALL',
    workloadPart: 'indirect',
    name: 'บันทึกชาร์จและเวชระเบียน (Documentation & Focus Note)',
    category: 'documentation',
    unitTimeMinutes: 12,
    unitLabel: 'ราย',
    note: 'เขียนชาร์จ สรุปอาการ Focus Note ประเมินทางการพยาบาล',
    isActive: true,
    isSystemDefault: true,
  },
  {
    id: 'tpl-ind-med',
    department: 'ALL',
    workloadPart: 'indirect',
    name: 'จัดเตรียมยาและสารน้ำ (Medication Preparation & 7 Rights)',
    category: 'medication',
    unitTimeMinutes: 5,
    unitLabel: 'ครั้ง',
    note: 'จัดเตรียมยา ตรวจสอบ 7 Rights ตรวจสอบฉลากและสารน้ำ',
    isActive: true,
    isSystemDefault: true,
  },
  {
    id: 'tpl-ind-coord',
    department: 'ALL',
    workloadPart: 'indirect',
    name: 'ติดต่อประสานงานและส่งต่อ (Care Coordination & Referral)',
    category: 'coordination',
    unitTimeMinutes: 15,
    unitLabel: 'เคส',
    note: 'รับใหม่ จำหน่าย ส่งต่อ ตามผล Lab / X-Ray / แพทย์เวร',
    isActive: true,
    isSystemDefault: true,
  },
  {
    id: 'tpl-ind-handover',
    department: 'ALL',
    workloadPart: 'indirect',
    name: 'การส่งมอบเวรและรายงานข้ามกะ (Shift Handover & Endorsement)',
    category: 'handover',
    unitTimeMinutes: 35,
    unitLabel: 'เวร',
    note: 'ส่งมอบข้อมูลผู้ป่วยข้ามเวร เช้า-บ่าย-ดึก',
    isActive: true,
    isSystemDefault: true,
  },
  {
    id: 'tpl-ind-er-triage',
    department: 'ER',
    workloadPart: 'indirect',
    name: 'คัดกรองซักประวัติและระบุระดับฉุกเฉิน (Triage Assessment)',
    category: 'documentation',
    unitTimeMinutes: 8,
    unitLabel: 'ราย',
    note: 'วัด V/S คัดกรองอาการนำ ประเมิน Triage ระดับ 1-5',
    isActive: true,
    isSystemDefault: true,
  },
  {
    id: 'tpl-ind-discharge',
    department: 'ALL',
    workloadPart: 'indirect',
    name: 'วางแผนจำหน่ายและสุขศึกษาผู้ป่วย (D/C Planning & Health Edu)',
    category: 'documentation',
    unitTimeMinutes: 20,
    unitLabel: 'ราย',
    note: 'วางแผนจำหน่าย ให้คำแนะนำยา การดูแลแผล การนัดตรวจต่อเนื่อง',
    isActive: true,
    isSystemDefault: true,
  },
  {
    id: 'tpl-ind-lr-parto',
    department: 'LR',
    workloadPart: 'indirect',
    name: 'บันทึกกราฟความก้าวหน้าการคลอด (Partograph Recording)',
    category: 'documentation',
    unitTimeMinutes: 15,
    unitLabel: 'เคส',
    note: 'บันทึก FHS, Uterine Contraction, Cervical Dilation ในห้องคลอด',
    isActive: true,
    isSystemDefault: true,
  },
  {
    id: 'tpl-ind-proc-set',
    department: 'ALL',
    workloadPart: 'indirect',
    name: 'จัดเตรียมชุดหัตถการและอุปกรณ์ปลอดเชื้อ (Procedure Set Prep)',
    category: 'medication',
    unitTimeMinutes: 10,
    unitLabel: 'ชุด',
    note: 'เตรียม Set ทำแผล, Set ให้สารน้ำ, Set เจาะเลือด/ใส่สายสวน',
    isActive: true,
    isSystemDefault: true,
  },

  // --- ส่วนที่ 3: งานสนับสนุน (Support Work / Ward Management) ---
  {
    id: 'tpl-sup-ward',
    department: 'ALL',
    workloadPart: 'support',
    name: 'บริหารจัดการหอผู้ป่วยและตรวจเวร (Ward Management & Briefing)',
    category: 'ward_management',
    frequencyType: 'daily',
    defaultFrequencyCount: 1,
    unitTimeMinutes: 20,
    unitLabel: 'วัน',
    note: 'จัดสรรเตียง มอบหมายภาระงาน ตรวจความพร้อมหอผู้ป่วย',
    isActive: true,
    isSystemDefault: true,
  },
  {
    id: 'tpl-sup-equip',
    department: 'ALL',
    workloadPart: 'support',
    name: 'ตรวจเช็ครถช่วยชีวิตและเครื่องมือแพทย์ (Emergency Cart & Defib)',
    category: 'equipment_check',
    frequencyType: 'daily',
    defaultFrequencyCount: 1,
    unitTimeMinutes: 25,
    unitLabel: 'วัน',
    note: 'ตรวจยาและเวชภัณฑ์ CPR, เครื่อง Defibrillator, Suction, Oxygen',
    isActive: true,
    isSystemDefault: true,
  },
  {
    id: 'tpl-sup-ic',
    department: 'ALL',
    workloadPart: 'support',
    name: 'งานควบคุมและป้องกันการติดเชื้อ (Infection Control - IC)',
    category: 'ic',
    frequencyType: 'weekly',
    defaultFrequencyCount: 1,
    unitTimeMinutes: 60,
    unitLabel: 'สัปดาห์',
    note: 'สุ่มตรวจความสะอาด คัดแยกขยะติดเชื้อ อุณหภูมิตู้เย็นยา สุ่มตรวจล้างมือ',
    isActive: true,
    isSystemDefault: true,
  },
  {
    id: 'tpl-sup-cqi',
    department: 'ALL',
    workloadPart: 'support',
    name: 'พัฒนาคุณภาพการพยาบาลและความเสี่ยง (CQI / HA / Risk Review)',
    category: 'cqi_ha',
    frequencyType: 'weekly',
    defaultFrequencyCount: 1,
    unitTimeMinutes: 90,
    unitLabel: 'สัปดาห์',
    note: 'ประชุมพัฒนาคุณภาพ ทบทวนเวชระเบียน ทบทวนอุบัติการณ์ Trigger Tool',
    isActive: true,
    isSystemDefault: true,
  },
  {
    id: 'tpl-sup-stock',
    department: 'ALL',
    workloadPart: 'support',
    name: 'ตรวจนับและเบิกจ่ายคลังเวชภัณฑ์ (Pharmacy Stock & Requisition)',
    category: 'ward_management',
    frequencyType: 'weekly',
    defaultFrequencyCount: 1,
    unitTimeMinutes: 60,
    unitLabel: 'สัปดาห์',
    note: 'ตรวจนับยาสำรอง ยาเสพติด เบิกสารน้ำและเวชภัณฑ์สิ้นเปลือง',
    isActive: true,
    isSystemDefault: true,
  },
  {
    id: 'tpl-sup-cssd',
    department: 'ALL',
    workloadPart: 'support',
    name: 'ส่งเครื่องมือและเบิกชุดอุปกรณ์ปลอดเชื้อ (CSSD Exchange)',
    category: 'equipment_check',
    frequencyType: 'daily',
    defaultFrequencyCount: 1,
    unitTimeMinutes: 20,
    unitLabel: 'วัน',
    note: 'นำส่งเครื่องมือล้างทำลายเชื้อ รับชุดเครื่องมือปราศจากเชื้อ',
    isActive: true,
    isSystemDefault: true,
  },
];

/**
 * Load activity templates from localStorage
 */
export function loadActivityTemplates(): ActivityTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TEMPLATES);
    if (!raw) {
      saveActivityTemplates(DEFAULT_ACTIVITY_TEMPLATES);
      return DEFAULT_ACTIVITY_TEMPLATES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_ACTIVITY_TEMPLATES;
  } catch (err) {
    console.error('Failed to load activity templates', err);
    return DEFAULT_ACTIVITY_TEMPLATES;
  }
}

/**
 * Save activity templates to localStorage
 */
export function saveActivityTemplates(templates: ActivityTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(templates));
  } catch (err) {
    console.error('Failed to save activity templates', err);
  }
}

/**
 * Build initial indirect care items for a department using active templates
 */
export function buildDepartmentIndirectItems(dept: DepartmentKey, templates: ActivityTemplate[]): IndirectCareItem[] {
  return templates
    .filter((t) => t.isActive && t.workloadPart === 'indirect' && (t.department === 'ALL' || t.department === dept))
    .map((t) => ({
      id: t.id,
      templateId: t.id,
      name: t.name,
      category: (t.category as any) || 'custom',
      count: 0,
      unitTimeMinutes: t.unitTimeMinutes,
      unitLabel: t.unitLabel,
      note: t.note,
    }));
}

/**
 * Build initial support work items for a department using active templates
 */
export function buildDepartmentSupportItems(dept: DepartmentKey, templates: ActivityTemplate[]): SupportWorkItem[] {
  return templates
    .filter((t) => t.isActive && t.workloadPart === 'support' && (t.department === 'ALL' || t.department === dept))
    .map((t) => ({
      id: t.id,
      templateId: t.id,
      name: t.name,
      category: (t.category as any) || 'custom',
      frequencyType: t.frequencyType || 'daily',
      frequencyCount: t.defaultFrequencyCount || 0,
      timeMinutesPerSession: t.unitTimeMinutes,
      note: t.note,
    }));
}

/**
 * ผสานข้อมูลกิจกรรมในวันบันทึก (DailyRecord) เข้ากับแม่แบบส่วนกลาง (ActivityTemplates)
 * เพื่อให้ทุกลำดับ/ประเภทที่เพิ่มในฐานข้อมูลเชื่อมโยง (Link) เข้ากับทุกวันที่บันทึกอย่างอัตโนมัติ
 * โดยคงค่าตัวเลขจำนวนงานเดิมที่พยาบาลเคยบันทึกไว้ในวันนั้นๆ 100%
 */
export function mergeRecordWithActivityTemplates(
  record: DailyRecord,
  templates: ActivityTemplate[] = loadActivityTemplates()
): DailyRecord {
  const depts: DepartmentKey[] = ['ER', 'OPD', 'IPD1', 'IPD2', 'LR'];
  const newRecord = { ...record };

  depts.forEach((dept) => {
    const deptKey = dept.toLowerCase() as 'er' | 'opd' | 'ipd1' | 'ipd2' | 'lr';
    const deptData = { ...newRecord[deptKey] };

    // 1. Indirect items (งานรอง)
    const activeIndirectTemplates = templates.filter(
      (t) => t.isActive && t.workloadPart === 'indirect' && (t.department === 'ALL' || t.department === dept)
    );
    const existingIndirect = deptData.indirectItems || [];
    const mergedIndirect: IndirectCareItem[] = [];

    activeIndirectTemplates.forEach((tpl) => {
      const found = existingIndirect.find(
        (item) => item.templateId === tpl.id || item.id === tpl.id || item.name === tpl.name
      );
      if (found) {
        mergedIndirect.push({
          ...found,
          id: found.id || tpl.id,
          templateId: tpl.id,
          name: tpl.name,
          category: (tpl.category as any) || found.category,
          unitTimeMinutes: tpl.unitTimeMinutes,
          unitLabel: tpl.unitLabel,
          note: tpl.note !== undefined ? tpl.note : found.note,
          count: found.count ?? 0,
        });
      } else {
        mergedIndirect.push({
          id: tpl.id,
          templateId: tpl.id,
          name: tpl.name,
          category: (tpl.category as any) || 'custom',
          unitTimeMinutes: tpl.unitTimeMinutes,
          unitLabel: tpl.unitLabel,
          note: tpl.note,
          count: 0,
        });
      }
    });

    // รักษา custom items เดิมที่ผู้ใช้เคยเพิ่มไว้
    existingIndirect.forEach((item) => {
      if (!mergedIndirect.some((m) => m.id === item.id || m.templateId === item.id || m.name === item.name)) {
        mergedIndirect.push(item);
      }
    });

    deptData.indirectItems = mergedIndirect;

    // 2. Support items (งานสนับสนุน)
    const activeSupportTemplates = templates.filter(
      (t) => t.isActive && t.workloadPart === 'support' && (t.department === 'ALL' || t.department === dept)
    );
    const existingSupport = deptData.supportItems || [];
    const mergedSupport: SupportWorkItem[] = [];

    activeSupportTemplates.forEach((tpl) => {
      const found = existingSupport.find(
        (item) => item.templateId === tpl.id || item.id === tpl.id || item.name === tpl.name
      );
      if (found) {
        mergedSupport.push({
          ...found,
          id: found.id || tpl.id,
          templateId: tpl.id,
          name: tpl.name,
          category: (tpl.category as any) || found.category,
          timeMinutesPerSession: tpl.unitTimeMinutes,
          frequencyType: tpl.frequencyType || found.frequencyType || 'daily',
          note: tpl.note !== undefined ? tpl.note : found.note,
          frequencyCount: found.frequencyCount ?? (tpl.defaultFrequencyCount || 0),
        });
      } else {
        mergedSupport.push({
          id: tpl.id,
          templateId: tpl.id,
          name: tpl.name,
          category: (tpl.category as any) || 'custom',
          timeMinutesPerSession: tpl.unitTimeMinutes,
          frequencyType: tpl.frequencyType || 'daily',
          note: tpl.note,
          frequencyCount: tpl.defaultFrequencyCount || 0,
        });
      }
    });

    existingSupport.forEach((item) => {
      if (!mergedSupport.some((m) => m.id === item.id || m.templateId === item.id || m.name === item.name)) {
        mergedSupport.push(item);
      }
    });

    deptData.supportItems = mergedSupport;
    (newRecord as any)[deptKey] = deptData;
  });

  return newRecord;
}

// Create a clean blank new daily record with all counts set to 0 for real data entry
export function createNewDailyRecord(
  dateStr: string,
  recorderName = '',
  recorderPosition = '',
  recorderPhone = ''
): DailyRecord {
  const templates = loadActivityTemplates();
  return {
    id: `sk-rec-${dateStr}`,
    date: dateStr,
    recorderName,
    recorderPosition,
    recorderPhone,
    notes: '',
    shiftType: 'all_day',
    er: {
      triage1_resus: 0,
      triage2_emergency: 0,
      triage3_urgency: 0,
      triage4_semiUrgent: 0,
      triage5_nonUrgent: 0,
      cprCount: 0,
      ambulanceReferral: 0,
      observationCases: 0,
      indirectItems: buildDepartmentIndirectItems('ER', templates),
      supportItems: buildDepartmentSupportItems('ER', templates),
      actualStaff: { morning: 0, afternoon: 0, night: 0 },
    },
    opd: {
      generalPatients: 0,
      chronicPatients: 0,
      minorSurgery: 0,
      specialClinic: 0,
      screeningPatients: 0,
      indirectItems: buildDepartmentIndirectItems('OPD', templates),
      supportItems: buildDepartmentSupportItems('OPD', templates),
      actualStaff: { morning: 0, afternoon: 0, night: 0 },
    },
    ipd1: {
      wardName: 'หอผู้ป่วยใน 1 (IPD1 หญิง/กุมาร)',
      bedCapacity: 30,
      currentCensus: 0,
      pcs1_selfCare: 0,
      pcs2_moderateCare: 0,
      pcs3_maximumCare: 0,
      pcs4_intensiveCare: 0,
      pcs5_ventilator: 0,
      admissions: 0,
      discharges: 0,
      indirectItems: buildDepartmentIndirectItems('IPD1', templates),
      supportItems: buildDepartmentSupportItems('IPD1', templates),
      actualStaff: { morning: 0, afternoon: 0, night: 0 },
    },
    ipd2: {
      wardName: 'หอผู้ป่วยใน 2 (IPD2 ชาย/พิเศษ)',
      bedCapacity: 28,
      currentCensus: 0,
      pcs1_selfCare: 0,
      pcs2_moderateCare: 0,
      pcs3_maximumCare: 0,
      pcs4_intensiveCare: 0,
      pcs5_ventilator: 0,
      admissions: 0,
      discharges: 0,
      indirectItems: buildDepartmentIndirectItems('IPD2', templates),
      supportItems: buildDepartmentSupportItems('IPD2', templates),
      actualStaff: { morning: 0, afternoon: 0, night: 0 },
    },
    lr: {
      stage1Latent: 0,
      stage1Active: 0,
      stage2Delivery: 0,
      stage3Placenta: 0,
      postpartumRecovery: 0,
      highRiskCases: 0,
      newbornResuscitation: 0,
      referralCases: 0,
      indirectItems: buildDepartmentIndirectItems('LR', templates),
      supportItems: buildDepartmentSupportItems('LR', templates),
      actualStaff: { morning: 0, afternoon: 0, night: 0 },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function loadRecords(): DailyRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RECORDS);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Filter out dummy/test records from previous simulations
      const clean = parsed.filter(
        (r: DailyRecord) =>
          !r.notes?.includes('รพ.พหลฯ') && !r.notes?.includes('สถานการณ์เวรปกติ')
      );
      const templates = loadActivityTemplates();
      return clean.map((r: DailyRecord) => mergeRecordWithActivityTemplates(r, templates));
    }
    return [];
  } catch (err) {
    console.error('Failed to load records from storage', err);
    return [];
  }
}

/**
 * เพิ่มหรือแก้ไขประเภทกิจกรรมแม่แบบ และเชื่อมโยง (Link) เข้าสู่ทุกวันที่บันทึกไว้ในระบบทันที
 */
export function addOrUpdateActivityTemplateAndLink(
  template: ActivityTemplate,
  linkAllDates = true
): { templates: ActivityTemplate[]; updatedRecords: DailyRecord[] } {
  const currentTemplates = loadActivityTemplates();
  const existingIdx = currentTemplates.findIndex((t) => t.id === template.id);

  let updatedTemplates: ActivityTemplate[];
  if (existingIdx >= 0) {
    updatedTemplates = [...currentTemplates];
    updatedTemplates[existingIdx] = { ...template, updatedAt: new Date().toISOString() };
  } else {
    updatedTemplates = [...currentTemplates, { ...template, createdAt: new Date().toISOString() }];
  }

  saveActivityTemplates(updatedTemplates);

  let updatedRecords: DailyRecord[] = [];
  if (linkAllDates) {
    const records = loadRecords();
    updatedRecords = records.map((r) => mergeRecordWithActivityTemplates(r, updatedTemplates));
    saveRecords(updatedRecords);
  }

  return { templates: updatedTemplates, updatedRecords };
}

/**
 * ลบประเภทกิจกรรมแม่แบบ และเชื่อมโยงลบออกจากทุกวันที่บันทึกไว้ในระบบ
 */
export function deleteActivityTemplateAndLink(
  templateId: string,
  removeFromDates = true
): { templates: ActivityTemplate[]; updatedRecords: DailyRecord[] } {
  const currentTemplates = loadActivityTemplates();
  const updatedTemplates = currentTemplates.filter((t) => t.id !== templateId);
  saveActivityTemplates(updatedTemplates);

  let updatedRecords: DailyRecord[] = [];
  if (removeFromDates) {
    const records = loadRecords();
    updatedRecords = records.map((r) => {
      const newRec = { ...r };
      const depts: ('er' | 'opd' | 'ipd1' | 'ipd2' | 'lr')[] = ['er', 'opd', 'ipd1', 'ipd2', 'lr'];
      depts.forEach((d) => {
        newRec[d].indirectItems = (newRec[d].indirectItems || []).filter(
          (item) => item.templateId !== templateId && item.id !== templateId
        );
        newRec[d].supportItems = (newRec[d].supportItems || []).filter(
          (item) => item.templateId !== templateId && item.id !== templateId
        );
      });
      return newRec;
    });
    saveRecords(updatedRecords);
  }

  return { templates: updatedTemplates, updatedRecords };
}

export function clearAllRecords(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_RECORDS);
    saveRecords([]);
  } catch (err) {
    console.error('Failed to clear records from storage', err);
  }
}

export function saveRecords(records: DailyRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
  } catch (err) {
    console.error('Failed to save records to storage', err);
  }
}

export function loadStandards(): StandardWeightsConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STANDARDS);
    if (!raw) return DEFAULT_STANDARDS;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_STANDARDS;
  }
}

export function saveStandards(config: StandardWeightsConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_STANDARDS, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save standards config', err);
  }
}

export function resetStandards(): StandardWeightsConfig {
  saveStandards(DEFAULT_STANDARDS);
  return DEFAULT_STANDARDS;
}

export function getThemePreference(): 'light' | 'dark' {
  try {
    const val = localStorage.getItem(STORAGE_KEY_THEME);
    if (val === 'dark' || val === 'light') return val;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function saveThemePreference(theme: 'light' | 'dark'): void {
  try {
    localStorage.setItem(STORAGE_KEY_THEME, theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {
    console.error(e);
  }
}

export type FontScale = 'normal' | 'comfort' | 'large';
const STORAGE_KEY_FONT_SCALE = 'sangkhlaburi_font_scale_v2';

export function getFontScalePreference(): FontScale {
  try {
    const val = localStorage.getItem(STORAGE_KEY_FONT_SCALE);
    if (val === 'comfort' || val === 'large' || val === 'normal') return val as FontScale;
    return 'comfort'; // default to comfort for pleasing legibility
  } catch {
    return 'comfort';
  }
}

export function saveFontScalePreference(scale: FontScale): void {
  try {
    localStorage.setItem(STORAGE_KEY_FONT_SCALE, scale);
    document.documentElement.setAttribute('data-font-scale', scale);
  } catch (e) {
    console.error(e);
  }
}

