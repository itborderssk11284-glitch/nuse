/**
 * Storage & Initial Seed Data for Sangkhlaburi Hospital
 * Configured with 3-Part Workload Model (Direct, Indirect, Support)
 */

import { DailyRecord, StandardWeightsConfig } from '../types/nursing';
import {
  DEFAULT_STANDARDS,
  createDefaultIndirectItems,
  createDefaultSupportItems,
} from './calculator';

const STORAGE_KEY_RECORDS = 'sangkhlaburi_nursing_records_v2';
const STORAGE_KEY_STANDARDS = 'sangkhlaburi_nursing_standards_v2';
const STORAGE_KEY_THEME = 'sangkhlaburi_nursing_theme';

export function formatDateISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Create a clean blank new daily record with all counts set to 0 for real data entry
export function createNewDailyRecord(dateStr: string, recorderName = ''): DailyRecord {
  return {
    id: `sk-rec-${dateStr}`,
    date: dateStr,
    recorderName,
    recorderPosition: '',
    recorderPhone: '',
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
      indirectItems: createDefaultIndirectItems(0),
      supportItems: createDefaultSupportItems(),
      actualStaff: { morning: 0, afternoon: 0, night: 0 },
    },
    opd: {
      generalPatients: 0,
      chronicPatients: 0,
      minorSurgery: 0,
      specialClinic: 0,
      screeningPatients: 0,
      indirectItems: createDefaultIndirectItems(0),
      supportItems: createDefaultSupportItems(),
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
      indirectItems: createDefaultIndirectItems(0),
      supportItems: createDefaultSupportItems(),
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
      indirectItems: createDefaultIndirectItems(0),
      supportItems: createDefaultSupportItems(),
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
      indirectItems: createDefaultIndirectItems(0),
      supportItems: createDefaultSupportItems(),
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
      return clean.map((r: DailyRecord) => {
        if (!r.er.indirectItems) r.er.indirectItems = createDefaultIndirectItems(0);
        if (!r.er.supportItems) r.er.supportItems = createDefaultSupportItems();
        if (!r.opd.indirectItems) r.opd.indirectItems = createDefaultIndirectItems(0);
        if (!r.opd.supportItems) r.opd.supportItems = createDefaultSupportItems();
        if (!r.ipd1.indirectItems) r.ipd1.indirectItems = createDefaultIndirectItems(0);
        if (!r.ipd1.supportItems) r.ipd1.supportItems = createDefaultSupportItems();
        if (!r.ipd2.indirectItems) r.ipd2.indirectItems = createDefaultIndirectItems(0);
        if (!r.ipd2.supportItems) r.ipd2.supportItems = createDefaultSupportItems();
        if (!r.lr.indirectItems) r.lr.indirectItems = createDefaultIndirectItems(0);
        if (!r.lr.supportItems) r.lr.supportItems = createDefaultSupportItems();
        return r;
      });
    }
    return [];
  } catch (err) {
    console.error('Failed to load records from storage', err);
    return [];
  }
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

