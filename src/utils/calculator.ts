/**
 * Calculation Engine for Nursing Workload & Staffing
 * Standardized based on Thailand Nursing and Midwifery Council guidelines
 * 3-Part Workload Model:
 * 1. งานหลัก (Direct Care)
 * 2. งานรอง (Indirect Care) = ∑ (ปริมาณงาน x เวลามาตรฐานต่อหน่วย)
 * 3. งานสนับสนุน (Support Work) = ∑ (ความถี่กิจกรรม x เวลาที่ใช้จริง)
 */

import {
  DepartmentCalculation,
  DepartmentKey,
  ERWorkloadData,
  HospitalOverallCalculation,
  IndirectCareItem,
  IPDWorkloadData,
  LRWorkloadData,
  OPDWorkloadData,
  ShiftStaff,
  StandardWeightsConfig,
  SupportWorkItem,
} from '../types/nursing';

/// Default Factory Presets for Indirect Care (งานรอง)
export function createDefaultIndirectItems(patientCount = 0): IndirectCareItem[] {
  return [
    {
      id: 'ind-doc',
      name: 'บันทึกชาร์จ (Documentation)',
      category: 'documentation',
      count: patientCount,
      unitTimeMinutes: 12,
      unitLabel: 'ราย',
      note: 'เขียนชาร์จ สรุปอาการ พยาบาล Focus Note',
    },
    {
      id: 'ind-med',
      name: 'เตรียมยา (Medication Preparation)',
      category: 'medication',
      count: patientCount === 0 ? 0 : Math.round(patientCount * 1.5),
      unitTimeMinutes: 5,
      unitLabel: 'ครั้ง',
      note: 'จัดเตรียมยา ตรวจสอบ 7 Rights ตรวจสอบสารน้ำ',
    },
    {
      id: 'ind-coord',
      name: 'ประสานงาน (Communication & Coordination)',
      category: 'coordination',
      count: patientCount === 0 ? 0 : Math.round(patientCount * 0.25),
      unitTimeMinutes: 15,
      unitLabel: 'เคส',
      note: 'รับใหม่ จำหน่าย ส่งต่อ ตามผล Lab / X-Ray',
    },
    {
      id: 'ind-handover',
      name: 'ส่งเวร (Handover & Endorsement)',
      category: 'handover',
      count: patientCount === 0 ? 0 : 3,
      unitTimeMinutes: 35,
      unitLabel: 'เวร',
      note: 'ส่งมอบข้อมูลผู้ป่วยข้ามเวร เช้า-บ่าย-ดึก',
    },
  ];
}

// Default Factory Presets for Support Work (งานสนับสนุน)
export function createDefaultSupportItems(): SupportWorkItem[] {
  return [
    {
      id: 'sup-ward',
      name: 'บริหารวอร์ด (Ward Management)',
      category: 'ward_management',
      frequencyType: 'weekly',
      frequencyCount: 0,
      timeMinutesPerSession: 120, // 2 ชม./สัปดาห์
      note: 'จัดตารางเวร ประชุมประจำเดือน สรุปสถิติวอร์ด',
    },
    {
      id: 'sup-equip',
      name: 'ตรวจเครื่องมือ (Equipment Check)',
      category: 'equipment_check',
      frequencyType: 'daily',
      frequencyCount: 0,
      timeMinutesPerSession: 25, // 25 นาที/วัน
      note: 'ตรวจรถ Emergency, เครื่อง Defibrillator, เครื่องมือแพทย์',
    },
    {
      id: 'sup-ic',
      name: 'ควบคุมการติดเชื้อ (Infection Control - IC)',
      category: 'ic',
      frequencyType: 'weekly',
      frequencyCount: 0,
      timeMinutesPerSession: 60, // 1 ชม./สัปดาห์
      note: 'ตรวจคัดแยกขยะติดเชื้อ อุณหภูมิตู้เย็น สุ่มตรวจล้างมือ',
    },
    {
      id: 'sup-cqi',
      name: 'พัฒนาคุณภาพ (CQI / HA)',
      category: 'cqi_ha',
      frequencyType: 'weekly',
      frequencyCount: 0,
      timeMinutesPerSession: 90, // 1.5 ชม./สัปดาห์
      note: 'ประชุมพัฒนาคุณภาพ ทบทวนข้างเตียง Trigger Tool, SAR',
    },
  ];
}

// Helper: Calculate total daily hours from Indirect Care items
export function calculateIndirectDailyHours(items?: IndirectCareItem[]): number {
  if (!items || items.length === 0) return 0;
  const totalMinutes = items.reduce((sum, item) => {
    return sum + (Number(item.count || 0) * Number(item.unitTimeMinutes || 0));
  }, 0);
  return Number((totalMinutes / 60).toFixed(2));
}

// Helper: Calculate total daily hours from Support Work items
export function calculateSupportDailyHours(items?: SupportWorkItem[]): number {
  if (!items || items.length === 0) return 0;
  const totalMinutes = items.reduce((sum, item) => {
    const sessionMin = Number(item.timeMinutesPerSession || 0);
    const count = Number(item.frequencyCount || 0);
    let dailyMin = 0;
    if (item.frequencyType === 'daily') {
      dailyMin = count * sessionMin;
    } else if (item.frequencyType === 'weekly') {
      dailyMin = (count * sessionMin) / 7;
    } else if (item.frequencyType === 'monthly') {
      dailyMin = (count * sessionMin) / 30;
    } else {
      dailyMin = count * sessionMin;
    }
    return sum + dailyMin;
  }, 0);
  return Number((totalMinutes / 60).toFixed(2));
}

// Default Standard Weights configuration
export const DEFAULT_STANDARDS: StandardWeightsConfig = {
  er: {
    triage1Hours: 3.0,       // 180 นาที
    triage2Hours: 1.0,       // 60 นาที
    triage3Hours: 0.5,       // 30 นาที
    triage4Hours: 0.25,      // 15 นาที
    triage5Hours: 0.16,      // 10 นาที
    cprBonusHours: 2.0,      // 120 นาที
    referralHours: 3.5,      // 210 นาที (สังขละบุรี - กาญจนบุรี ทางภูเขา)
    observationHours: 1.0,   // 60 นาที
  },
  opd: {
    generalHours: 0.16,      // ~10 นาที
    chronicHours: 0.30,      // ~18 นาที
    minorSurgeryHours: 0.42, // ~25 นาที
    specialClinicHours: 0.25,// ~15 นาที
    screeningHours: 0.08,    // ~5 นาที
  },
  ipd: {
    pcs1HPPN: 1.5,           // ชม./วัน
    pcs2HPPN: 3.5,           // ชม./วัน
    pcs3HPPN: 6.0,           // ชม./วัน
    pcs4HPPN: 10.0,          // ชม./วัน
    pcs5HPPN: 14.0,          // ชม./วัน
    admissionHours: 0.75,    // ชม./ราย
    dischargeHours: 0.50,    // ชม./ราย
  },
  lr: {
    stage1LatentHours: 2.0,  // ชม./เคส
    stage1ActiveHours: 4.5,  // ชม./เคส
    stage2Hours: 3.0,        // ชม./เคส
    stage3Hours: 2.0,        // ชม./เคส
    postpartumHours: 2.0,    // ชม./เคส
    highRiskHours: 4.0,      // ชม./เคส
    newbornHours: 1.5,       // ชม./เคส
    referralHours: 2.5,      // ชม./เคส
  },
  general: {
    productiveHoursPerShift: 7.0, // เวลาปฏิบัติงานจริงสุทธิ (หักพัก/ส่งเวร)
    shiftHours: 8.0,              // ความยาวเวรปกติ
    dfteReliefFactor: 1.25,       // สัมประสิทธิ์ชดเชยวันหยุด/วันลาตามสภาการพยาบาล
    shiftRatio: {
      morning: 0.40,              // เวรเช้า 40%
      afternoon: 0.35,            // เวรบ่าย 35%
      night: 0.25,                // เวรดึก 25%
    },
  },
};

/**
 * Calculate ER Workload with 3-part breakdown
 */
export function calculateER(
  data: ERWorkloadData,
  config: StandardWeightsConfig = DEFAULT_STANDARDS
): DepartmentCalculation {
  const w = config.er;
  const g = config.general;

  // 1. งานหลัก (Direct Care)
  const hoursFromTriage =
    (data.triage1_resus || 0) * w.triage1Hours +
    (data.triage2_emergency || 0) * w.triage2Hours +
    (data.triage3_urgency || 0) * w.triage3Hours +
    (data.triage4_semiUrgent || 0) * w.triage4Hours +
    (data.triage5_nonUrgent || 0) * w.triage5Hours;

  const bonusHours =
    (data.cprCount || 0) * w.cprBonusHours +
    (data.ambulanceReferral || 0) * w.referralHours +
    (data.observationCases || 0) * w.observationHours;

  const directCareHours = Number((hoursFromTriage + bonusHours).toFixed(2));

  // 2. งานรอง (Indirect Care) = ∑ (ปริมาณงาน x เวลามาตรฐาน)
  const indirectCareHours = calculateIndirectDailyHours(data.indirectItems);

  // 3. งานสนับสนุน (Support Work) = ∑ (ความถี่ x เวลาต่อครั้ง)
  const supportCareHours = calculateSupportDailyHours(data.supportItems);

  // ค่างานรวม (Total Nursing Hours) = Direct + Indirect + Support
  const totalNursingHours = Number((directCareHours + indirectCareHours + supportCareHours).toFixed(2));

  const baseStaffNeeded24h = totalNursingHours / g.productiveHoursPerShift;
  const requiredFTE = Number((baseStaffNeeded24h * g.dfteReliefFactor).toFixed(2));

  const rawMorning = Math.max(2, Math.round(baseStaffNeeded24h * g.shiftRatio.morning));
  const rawAfternoon = Math.max(2, Math.round(baseStaffNeeded24h * g.shiftRatio.afternoon));
  const rawNight = Math.max(1, Math.round(baseStaffNeeded24h * g.shiftRatio.night));

  const requiredStaffPerShift: ShiftStaff = {
    morning: rawMorning,
    afternoon: rawAfternoon,
    night: rawNight,
  };

  const totalRequiredStaff = rawMorning + rawAfternoon + rawNight;
  const actualStaff = data.actualStaff || { morning: 0, afternoon: 0, night: 0 };
  const totalActualStaff = actualStaff.morning + actualStaff.afternoon + actualStaff.night;

  const actualAvailableHours = totalActualStaff * g.productiveHoursPerShift;
  const productivityRate = actualAvailableHours > 0
    ? Math.round((totalNursingHours / actualAvailableHours) * 100)
    : 0;

  const staffingGap = totalActualStaff - totalRequiredStaff;

  let status: 'balanced' | 'understaffed' | 'overstaffed' = 'balanced';
  if (staffingGap < 0 || productivityRate > 115) {
    status = 'understaffed';
  } else if (staffingGap > 1 && productivityRate < 85) {
    status = 'overstaffed';
  }

  let workloadLevel: 'low' | 'moderate' | 'high' | 'critical' = 'moderate';
  if (productivityRate > 125) workloadLevel = 'critical';
  else if (productivityRate >= 105) workloadLevel = 'high';
  else if (productivityRate >= 85) workloadLevel = 'moderate';
  else workloadLevel = 'low';

  return {
    departmentKey: 'ER',
    departmentName: 'ห้องฉุกเฉิน (ER)',
    directCareHours,
    indirectCareHours,
    supportCareHours,
    totalNursingHours,
    requiredFTE,
    requiredStaffPerShift,
    actualStaffPerShift: actualStaff,
    totalActualStaff,
    totalRequiredStaff,
    staffingGap,
    status,
    productivityRate,
    workloadLevel,
  };
}

/**
 * Calculate OPD Workload with 3-part breakdown
 */
export function calculateOPD(
  data: OPDWorkloadData,
  config: StandardWeightsConfig = DEFAULT_STANDARDS
): DepartmentCalculation {
  const w = config.opd;
  const g = config.general;

  // 1. งานหลัก (Direct Care)
  const directCareHours = Number((
    (data.generalPatients || 0) * w.generalHours +
    (data.chronicPatients || 0) * w.chronicHours +
    (data.minorSurgery || 0) * w.minorSurgeryHours +
    (data.specialClinic || 0) * w.specialClinicHours +
    (data.screeningPatients || 0) * w.screeningHours
  ).toFixed(2));

  // 2. งานรอง (Indirect Care)
  const indirectCareHours = calculateIndirectDailyHours(data.indirectItems);

  // 3. งานสนับสนุน (Support Work)
  const supportCareHours = calculateSupportDailyHours(data.supportItems);

  // ค่างานรวม (Total Nursing Hours)
  const totalNursingHours = Number((directCareHours + indirectCareHours + supportCareHours).toFixed(2));

  const baseStaffNeeded = totalNursingHours / g.productiveHoursPerShift;
  const requiredFTE = Number((baseStaffNeeded * g.dfteReliefFactor).toFixed(2));

  const morningReq = Math.max(2, Math.round(baseStaffNeeded * 0.75));
  const afternoonReq = Math.max(1, Math.round(baseStaffNeeded * 0.25));
  const nightReq = 0;

  const requiredStaffPerShift: ShiftStaff = {
    morning: morningReq,
    afternoon: afternoonReq,
    night: nightReq,
  };

  const totalRequiredStaff = morningReq + afternoonReq + nightReq;
  const actualStaff = data.actualStaff || { morning: 0, afternoon: 0, night: 0 };
  const totalActualStaff = actualStaff.morning + actualStaff.afternoon + actualStaff.night;

  const actualAvailableHours = totalActualStaff * g.productiveHoursPerShift;
  const productivityRate = actualAvailableHours > 0
    ? Math.round((totalNursingHours / actualAvailableHours) * 100)
    : 0;

  const staffingGap = totalActualStaff - totalRequiredStaff;

  let status: 'balanced' | 'understaffed' | 'overstaffed' = 'balanced';
  if (staffingGap < 0 || productivityRate > 115) {
    status = 'understaffed';
  } else if (staffingGap > 1 && productivityRate < 85) {
    status = 'overstaffed';
  }

  let workloadLevel: 'low' | 'moderate' | 'high' | 'critical' = 'moderate';
  if (productivityRate > 125) workloadLevel = 'critical';
  else if (productivityRate >= 105) workloadLevel = 'high';
  else if (productivityRate >= 85) workloadLevel = 'moderate';
  else workloadLevel = 'low';

  return {
    departmentKey: 'OPD',
    departmentName: 'แผนกผู้ป่วยนอก (OPD)',
    directCareHours,
    indirectCareHours,
    supportCareHours,
    totalNursingHours,
    requiredFTE,
    requiredStaffPerShift,
    actualStaffPerShift: actualStaff,
    totalActualStaff,
    totalRequiredStaff,
    staffingGap,
    status,
    productivityRate,
    workloadLevel,
  };
}

/**
 * Calculate IPD Workload with 3-part breakdown
 */
export function calculateIPD(
  data: IPDWorkloadData,
  departmentKey: 'IPD1' | 'IPD2' = 'IPD1',
  config: StandardWeightsConfig = DEFAULT_STANDARDS
): DepartmentCalculation {
  const w = config.ipd;
  const g = config.general;

  // 1. งานหลัก (Direct Care จาก PCS + Admit/DC)
  const hoursFromPCS =
    (data.pcs1_selfCare || 0) * w.pcs1HPPN +
    (data.pcs2_moderateCare || 0) * w.pcs2HPPN +
    (data.pcs3_maximumCare || 0) * w.pcs3HPPN +
    (data.pcs4_intensiveCare || 0) * w.pcs4HPPN +
    (data.pcs5_ventilator || 0) * w.pcs5HPPN;

  const admissionDischargeHours =
    (data.admissions || 0) * w.admissionHours +
    (data.discharges || 0) * w.dischargeHours;

  const directCareHours = Number((hoursFromPCS + admissionDischargeHours).toFixed(2));

  // 2. งานรอง (Indirect Care)
  const indirectCareHours = calculateIndirectDailyHours(data.indirectItems);

  // 3. งานสนับสนุน (Support Work)
  const supportCareHours = calculateSupportDailyHours(data.supportItems);

  // ค่างานรวม (Total Nursing Hours)
  const totalNursingHours = Number((directCareHours + indirectCareHours + supportCareHours).toFixed(2));

  const baseStaffNeeded24h = totalNursingHours / g.productiveHoursPerShift;
  const requiredFTE = Number((baseStaffNeeded24h * g.dfteReliefFactor).toFixed(2));

  const minFloor = 2;
  const rawMorning = Math.max(minFloor, Math.round(baseStaffNeeded24h * g.shiftRatio.morning));
  const rawAfternoon = Math.max(minFloor, Math.round(baseStaffNeeded24h * g.shiftRatio.afternoon));
  const rawNight = Math.max(1, Math.round(baseStaffNeeded24h * g.shiftRatio.night));

  const requiredStaffPerShift: ShiftStaff = {
    morning: rawMorning,
    afternoon: rawAfternoon,
    night: rawNight,
  };

  const totalRequiredStaff = rawMorning + rawAfternoon + rawNight;
  const actualStaff = data.actualStaff || { morning: 0, afternoon: 0, night: 0 };
  const totalActualStaff = actualStaff.morning + actualStaff.afternoon + actualStaff.night;

  const actualAvailableHours = totalActualStaff * g.productiveHoursPerShift;
  const productivityRate = actualAvailableHours > 0
    ? Math.round((totalNursingHours / actualAvailableHours) * 100)
    : 0;

  const staffingGap = totalActualStaff - totalRequiredStaff;

  const bedCapacity = data.bedCapacity || 30;
  const currentCensus = data.currentCensus || (
    (data.pcs1_selfCare || 0) +
    (data.pcs2_moderateCare || 0) +
    (data.pcs3_maximumCare || 0) +
    (data.pcs4_intensiveCare || 0) +
    (data.pcs5_ventilator || 0)
  );
  const bedOccupancyRate = bedCapacity > 0
    ? Math.round((currentCensus / bedCapacity) * 100)
    : 0;

  let status: 'balanced' | 'understaffed' | 'overstaffed' = 'balanced';
  if (staffingGap < 0 || productivityRate > 115) {
    status = 'understaffed';
  } else if (staffingGap > 1 && productivityRate < 85) {
    status = 'overstaffed';
  }

  let workloadLevel: 'low' | 'moderate' | 'high' | 'critical' = 'moderate';
  if (productivityRate > 125) workloadLevel = 'critical';
  else if (productivityRate >= 105) workloadLevel = 'high';
  else if (productivityRate >= 85) workloadLevel = 'moderate';
  else workloadLevel = 'low';

  const defaultTitle = departmentKey === 'IPD1'
    ? 'หอผู้ป่วยใน 1 (IPD1 หญิง/กุมาร)'
    : 'หอผู้ป่วยใน 2 (IPD2 ชาย/พิเศษ)';

  return {
    departmentKey,
    departmentName: data.wardName || defaultTitle,
    directCareHours,
    indirectCareHours,
    supportCareHours,
    totalNursingHours,
    requiredFTE,
    requiredStaffPerShift,
    actualStaffPerShift: actualStaff,
    totalActualStaff,
    totalRequiredStaff,
    staffingGap,
    status,
    productivityRate,
    bedOccupancyRate,
    workloadLevel,
  };
}

/**
 * Calculate LR Workload with 3-part breakdown
 */
export function calculateLR(
  data: LRWorkloadData,
  config: StandardWeightsConfig = DEFAULT_STANDARDS
): DepartmentCalculation {
  const w = config.lr;
  const g = config.general;

  // 1. งานหลัก (Direct Care)
  const directCareHours = Number((
    (data.stage1Latent || 0) * w.stage1LatentHours +
    (data.stage1Active || 0) * w.stage1ActiveHours +
    (data.stage2Delivery || 0) * w.stage2Hours +
    (data.stage3Placenta || 0) * w.stage3Hours +
    (data.postpartumRecovery || 0) * w.postpartumHours +
    (data.highRiskCases || 0) * w.highRiskHours +
    (data.newbornResuscitation || 0) * w.newbornHours +
    (data.referralCases || 0) * w.referralHours
  ).toFixed(2));

  // 2. งานรอง (Indirect Care)
  const indirectCareHours = calculateIndirectDailyHours(data.indirectItems);

  // 3. งานสนับสนุน (Support Work)
  const supportCareHours = calculateSupportDailyHours(data.supportItems);

  // ค่างานรวม (Total Nursing Hours)
  const totalNursingHours = Number((directCareHours + indirectCareHours + supportCareHours).toFixed(2));

  const baseStaffNeeded24h = totalNursingHours / g.productiveHoursPerShift;
  const requiredFTE = Number((baseStaffNeeded24h * g.dfteReliefFactor).toFixed(2));

  const rawMorning = Math.max(1, Math.round(baseStaffNeeded24h * g.shiftRatio.morning));
  const rawAfternoon = Math.max(1, Math.round(baseStaffNeeded24h * g.shiftRatio.afternoon));
  const rawNight = Math.max(1, Math.round(baseStaffNeeded24h * g.shiftRatio.night));

  const requiredStaffPerShift: ShiftStaff = {
    morning: rawMorning,
    afternoon: rawAfternoon,
    night: rawNight,
  };

  const totalRequiredStaff = rawMorning + rawAfternoon + rawNight;
  const actualStaff = data.actualStaff || { morning: 0, afternoon: 0, night: 0 };
  const totalActualStaff = actualStaff.morning + actualStaff.afternoon + actualStaff.night;

  const actualAvailableHours = totalActualStaff * g.productiveHoursPerShift;
  const productivityRate = actualAvailableHours > 0
    ? Math.round((totalNursingHours / actualAvailableHours) * 100)
    : 0;

  const staffingGap = totalActualStaff - totalRequiredStaff;

  let status: 'balanced' | 'understaffed' | 'overstaffed' = 'balanced';
  if (staffingGap < 0 || productivityRate > 115) {
    status = 'understaffed';
  } else if (staffingGap > 1 && productivityRate < 85) {
    status = 'overstaffed';
  }

  let workloadLevel: 'low' | 'moderate' | 'high' | 'critical' = 'moderate';
  if (productivityRate > 125) workloadLevel = 'critical';
  else if (productivityRate >= 105) workloadLevel = 'high';
  else if (productivityRate >= 85) workloadLevel = 'moderate';
  else workloadLevel = 'low';

  return {
    departmentKey: 'LR',
    departmentName: 'ห้องคลอด (LR)',
    directCareHours,
    indirectCareHours,
    supportCareHours,
    totalNursingHours,
    requiredFTE,
    requiredStaffPerShift,
    actualStaffPerShift: actualStaff,
    totalActualStaff,
    totalRequiredStaff,
    staffingGap,
    status,
    productivityRate,
    workloadLevel,
  };
}

/**
 * Calculate Overall Hospital Nursing Metrics
 */
export function calculateHospitalOverall(
  record: {
    date: string;
    er: ERWorkloadData;
    opd: OPDWorkloadData;
    ipd1: IPDWorkloadData;
    ipd2: IPDWorkloadData;
    lr: LRWorkloadData;
  },
  config: StandardWeightsConfig = DEFAULT_STANDARDS
): HospitalOverallCalculation {
  const erCalc = calculateER(record.er, config);
  const opdCalc = calculateOPD(record.opd, config);
  const ipd1Calc = calculateIPD(record.ipd1, 'IPD1', config);
  const ipd2Calc = calculateIPD(record.ipd2, 'IPD2', config);
  const lrCalc = calculateLR(record.lr, config);

  const departments: Record<DepartmentKey, DepartmentCalculation> = {
    ER: erCalc,
    OPD: opdCalc,
    IPD1: ipd1Calc,
    IPD2: ipd2Calc,
    LR: lrCalc,
  };

  const totalDirectCareHours = Number((
    erCalc.directCareHours +
    opdCalc.directCareHours +
    ipd1Calc.directCareHours +
    ipd2Calc.directCareHours +
    lrCalc.directCareHours
  ).toFixed(2));

  const totalIndirectCareHours = Number((
    erCalc.indirectCareHours +
    opdCalc.indirectCareHours +
    ipd1Calc.indirectCareHours +
    ipd2Calc.indirectCareHours +
    lrCalc.indirectCareHours
  ).toFixed(2));

  const totalSupportCareHours = Number((
    erCalc.supportCareHours +
    opdCalc.supportCareHours +
    ipd1Calc.supportCareHours +
    ipd2Calc.supportCareHours +
    lrCalc.supportCareHours
  ).toFixed(2));

  const totalNursingHours = Number((
    totalDirectCareHours +
    totalIndirectCareHours +
    totalSupportCareHours
  ).toFixed(2));

  const totalActualStaff =
    erCalc.totalActualStaff +
    opdCalc.totalActualStaff +
    ipd1Calc.totalActualStaff +
    ipd2Calc.totalActualStaff +
    lrCalc.totalActualStaff;

  const totalRequiredStaff =
    erCalc.totalRequiredStaff +
    opdCalc.totalRequiredStaff +
    ipd1Calc.totalRequiredStaff +
    ipd2Calc.totalRequiredStaff +
    lrCalc.totalRequiredStaff;

  const totalRequiredFTE = Number((
    erCalc.requiredFTE +
    opdCalc.requiredFTE +
    ipd1Calc.requiredFTE +
    ipd2Calc.requiredFTE +
    lrCalc.requiredFTE
  ).toFixed(2));

  const overallGap = totalActualStaff - totalRequiredStaff;
  const totalProductiveHours = totalActualStaff * config.general.productiveHoursPerShift;
  const averageProductivityRate = totalProductiveHours > 0
    ? Math.round((totalNursingHours / totalProductiveHours) * 100)
    : 0;

  let overallStatus: 'balanced' | 'understaffed' | 'overstaffed' = 'balanced';
  if (overallGap < 0 || averageProductivityRate > 115) {
    overallStatus = 'understaffed';
  } else if (overallGap > 2 && averageProductivityRate < 85) {
    overallStatus = 'overstaffed';
  }

  return {
    date: record.date,
    departments,
    totalDirectCareHours,
    totalIndirectCareHours,
    totalSupportCareHours,
    totalNursingHours,
    totalActualStaff,
    totalRequiredStaff,
    totalRequiredFTE,
    overallGap,
    overallStatus,
    averageProductivityRate,
  };
}
