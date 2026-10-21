/**
 * Types and Models for Nursing Workload & Staffing Calculation System
 * โรงพยาบาลสังขละบุรี (Sangkhlaburi Hospital)
 * 3-Part Workload Model:
 * 1. งานหลัก (Direct Care)
 * 2. งานรอง (Indirect Care) - ปริมาณงาน x เวลามาตรฐาน
 * 3. งานสนับสนุน (Support Work) - ความถี่กิจกรรม x เวลาที่ใช้จริง
 * พร้อมความสามารถ เพิ่ม ลบ แก้ไข ประเภทงานรองและสนับสนุน
 */

export type DepartmentKey = 'ER' | 'OPD' | 'IPD1' | 'IPD2' | 'LR';

export type ShiftKey = 'morning' | 'afternoon' | 'night';

export interface ShiftStaff {
  morning: number;
  afternoon: number;
  night: number;
}

// โครงสร้างประเภทงานรอง (Indirect Care Item)
// ภาระงานรอง = ∑ (ปริมาณงาน x เวลามาตรฐานต่อหน่วย)
export interface IndirectCareItem {
  id: string;
  name: string;                // เช่น บันทึกชาร์จ (Documentation), เตรียมยา (Medication Preparation)
  category: 'documentation' | 'medication' | 'coordination' | 'handover' | 'custom';
  count: number;               // ปริมาณงาน (เคส/ครั้ง/รอบ)
  unitTimeMinutes: number;     // เวลามาตรฐานต่อหน่วย (นาที)
  unitLabel?: string;          // หน่วย เช่น ราย, ครั้ง, เวร
  note?: string;               // รายละเอียดเพิ่มเติม
  templateId?: string;         // รหัสอ้างอิงแม่แบบส่วนกลาง
}

// โครงสร้างประเภทงานสนับสนุน (Support Work Item)
// ภาระงานสนับสนุน = ∑ (ความถี่กิจกรรม x เวลาที่ใช้จริงต่อกิจกรรม)
export interface SupportWorkItem {
  id: string;
  name: string;                // เช่น บริหารวอร์ด, ตรวจเครื่องมือแพทย์, IC, CQI/HA
  category: 'ward_management' | 'equipment_check' | 'ic' | 'cqi_ha' | 'custom';
  frequencyType: 'daily' | 'weekly' | 'monthly' | 'custom'; // ความถี่
  frequencyCount: number;      // จำนวนครั้งตามช่วงเวลา
  timeMinutesPerSession: number; // เวลาที่ใช้จริงต่อกิจกรรม (นาที)
  note?: string;               // รายละเอียดเพิ่มเติม
  templateId?: string;         // รหัสอ้างอิงแม่แบบส่วนกลาง
}

export type WorkloadPartType = 'indirect' | 'support';

// แม่แบบประเภทกิจกรรมงานรองและงานสนับสนุนส่วนกลาง (Master Activity Template)
// จัดเก็บในฐานข้อมูล Supabase เพื่อเชื่อมโยง (Link) กับทุกวันที่บันทึก
export interface ActivityTemplate {
  id: string;
  department: DepartmentKey | 'ALL';
  workloadPart: WorkloadPartType;
  name: string;
  category: string;
  unitTimeMinutes: number;
  unitLabel: string;
  frequencyType?: 'daily' | 'weekly' | 'monthly' | 'custom';
  defaultFrequencyCount?: number;
  note?: string;
  isActive: boolean;
  isSystemDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Emergency Department Data Model
export interface ERWorkloadData {
  triage1_resus: number;        // ระดับ 1: กู้ชีพทันที (Resuscitation) - แดง
  triage2_emergency: number;    // ระดับ 2: ฉุกเฉินมาก (Emergency) - ชมพู/ส้ม
  triage3_urgency: number;      // ระดับ 3: ฉุกเฉินเร่งด่วน (Urgency) - เหลือง
  triage4_semiUrgent: number;   // ระดับ 4: กึ่งฉุกเฉิน (Semi-urgent) - เขียว
  triage5_nonUrgent: number;    // ระดับ 5: ไม่ฉุกเฉิน (Non-urgent) - ขาว
  cprCount: number;             // เคสทำ CPR/หัตถการกู้ชีพพิเศษ
  ambulanceReferral: number;    // เคสนำส่งต่อทางรถพยาบาล (Escort Referral)
  observationCases: number;     // ผู้ป่วยนอนสังเกตอาการเตียงฉุกเฉิน
  indirectItems: IndirectCareItem[]; // รายการงานรอง
  supportItems: SupportWorkItem[];   // รายการงานสนับสนุน
  actualStaff: ShiftStaff;      // พยาบาลปฏิบัติงานจริงแต่ละเวร
}

// Outpatient Department Data Model
export interface OPDWorkloadData {
  generalPatients: number;      // ตรวจโรคทั่วไป
  chronicPatients: number;      // คลินิกโรคเรื้อรัง (NCDs: DM, HT, CKD)
  minorSurgery: number;         // หัตถการ/ผ่าตัดเล็ก/เย็บแผล/ล้างแผล/ฉีดยา
  specialClinic: number;        // คลินิกเฉพาะทาง (ARI, ANC, จิตเวช, เด็กดี)
  screeningPatients: number;    // คัดกรอง ซักประวัติ วัดสัญญาณชีพ
  indirectItems: IndirectCareItem[];
  supportItems: SupportWorkItem[];
  actualStaff: ShiftStaff;      // พยาบาลปฏิบัติงานจริง
}

// Inpatient Department Data Model (IPD1: สามัญ/หญิง-เด็ก, IPD2: ชาย/พิเศษ)
export interface IPDWorkloadData {
  wardName: string;             // ชื่อหอผู้ป่วย
  bedCapacity: number;          // จำนวนเตียงเปิดให้บริการ
  currentCensus: number;        // ยอดผู้ป่วยครองเตียง ณ เวลาตรวจนับ (Midnight Census)
  pcs1_selfCare: number;        // ระดับ 1: ช่วยเหลือตนเองได้ดี
  pcs2_moderateCare: number;    // ระดับ 2: ต้องการการดูแลปานกลาง
  pcs3_maximumCare: number;     // ระดับ 3: พึ่งพามาก/ช่วยเหลือตนเองได้น้อย
  pcs4_intensiveCare: number;   // ระดับ 4: ผู้ป่วยวิกฤต/ต้องดูแลใกล้ชิด
  pcs5_ventilator: number;      // ระดับ 5: ผู้ป่วยใช้เครื่องช่วยหายใจ/ดูแลเข้มข้นพิเศษ
  admissions: number;           // รับใหม่ (Admit)
  discharges: number;          // จำหน่าย/ส่งต่อ/เสียชีวิต (D/C, Transfer)
  indirectItems: IndirectCareItem[];
  supportItems: SupportWorkItem[];
  actualStaff: ShiftStaff;      // พยาบาลปฏิบัติงานจริง
}

// Labor Room Data Model
export interface LRWorkloadData {
  stage1Latent: number;         // รอคลอดระยะแฝง (Latent Phase)
  stage1Active: number;         // รอคลอดระยะเร่ง (Active Phase)
  stage2Delivery: number;       // ระยะเบ่งคลอดและทำคลอด (Second Stage)
  stage3Placenta: number;       // ระยะคลอดรกและซ่อมแซมแผลฝีเย็บ (Third Stage)
  postpartumRecovery: number;   // สังเกตอาการหลังคลอด 2 ชั่วโมง (Postpartum Monitoring)
  highRiskCases: number;        // หญิงตั้งครรภ์เสี่ยงสูง (PIH, PPH, Preterm, PROM)
  newbornResuscitation: number; // กู้ชีพและบริบาลทารกแรกเกิดวิกฤต
  referralCases: number;        // เตรียมส่งต่อ/ส่งต่อผ่าตัดคลอด
  indirectItems: IndirectCareItem[];
  supportItems: SupportWorkItem[];
  actualStaff: ShiftStaff;      // พยาบาลปฏิบัติงานจริง
}

// Full Daily Record
export interface DailyRecord {
  id: string;
  date: string;                 // YYYY-MM-DD
  recorderName: string;         // ชื่อพยาบาลผู้บันทึก
  recorderPosition: string;     // ตำแหน่ง เช่น พยาบาลวิชาชีพปฏิบัติการ, หัวหน้าเวร
  recorderPhone: string;        // เบอร์โทรศัพท์พยาบาล
  notes: string;                // หมายเหตุ/เหตุการณ์สำคัญ
  shiftType: 'all_day' | 'morning' | 'afternoon' | 'night';
  er: ERWorkloadData;
  opd: OPDWorkloadData;
  ipd1: IPDWorkloadData;
  ipd2: IPDWorkloadData;
  lr: LRWorkloadData;
  createdAt: string;
  updatedAt: string;
}

// Standard Calculation Weights & Coefficients
export interface StandardWeightsConfig {
  er: {
    triage1Hours: number;       // default: 3.0
    triage2Hours: number;       // default: 1.0
    triage3Hours: number;       // default: 0.5
    triage4Hours: number;       // default: 0.25
    triage5Hours: number;       // default: 0.16
    cprBonusHours: number;      // default: 2.0
    referralHours: number;      // default: 3.5
    observationHours: number;   // default: 1.0
  };
  opd: {
    generalHours: number;       // default: 0.16
    chronicHours: number;       // default: 0.30
    minorSurgeryHours: number;  // default: 0.42
    specialClinicHours: number; // default: 0.25
    screeningHours: number;     // default: 0.08
  };
  ipd: {
    pcs1HPPN: number;           // default: 1.5 ชม./วัน
    pcs2HPPN: number;           // default: 3.5 ชม./วัน
    pcs3HPPN: number;           // default: 6.0 ชม./วัน
    pcs4HPPN: number;           // default: 10.0 ชม./วัน
    pcs5HPPN: number;           // default: 14.0 ชม./วัน
    admissionHours: number;     // default: 0.75 ชม./ราย
    dischargeHours: number;     // default: 0.50 ชม./ราย
  };
  lr: {
    stage1LatentHours: number;  // default: 2.0
    stage1ActiveHours: number;  // default: 4.5
    stage2Hours: number;        // default: 3.0
    stage3Hours: number;        // default: 2.0
    postpartumHours: number;    // default: 2.0
    highRiskHours: number;      // default: 4.0
    newbornHours: number;       // default: 1.5
    referralHours: number;      // default: 2.5
  };
  general: {
    productiveHoursPerShift: number; // 7.0 ชม.
    shiftHours: number;              // 8.0 ชม.
    dfteReliefFactor: number;        // 1.25
    shiftRatio: {
      morning: 0.40;              // เวรเช้า 40%
      afternoon: 0.35;            // เวรบ่าย 35%
      night: 0.25;                // เวรดึก 25%
    };
  };
}

// Calculation Outcome for a Department
export interface DepartmentCalculation {
  departmentKey: DepartmentKey;
  departmentName: string;
  directCareHours: number;          // งานหลัก (Direct Nursing Care)
  indirectCareHours: number;        // งานรอง (Indirect Nursing Care)
  supportCareHours: number;         // งานสนับสนุน (Support Care)
  totalNursingHours: number;        // ชั่วโมงการพยาบาลรวม (TNH = Direct + Indirect + Support)
  requiredFTE: number;              // อัตรากำลังพยาบาลที่ควรจะเป็น
  requiredStaffPerShift: ShiftStaff;// จำนวนพยาบาลที่ต้องการต่อเวร
  actualStaffPerShift: ShiftStaff;  // จำนวนพยาบาลจริงต่อเวร
  totalActualStaff: number;         // รวมพยาบาลจริง 24 ชม.
  totalRequiredStaff: number;       // รวมพยาบาลที่ควรมี 24 ชม.
  staffingGap: number;              // ส่วนต่าง (Actual - Required)
  status: 'balanced' | 'understaffed' | 'overstaffed';
  productivityRate: number;         // อัตราผลิตภาพ (%)
  bedOccupancyRate?: number;        // อัตราครองเตียง (%)
  workloadLevel: 'low' | 'moderate' | 'high' | 'critical';
}

// Summary Calculation across the Entire Hospital
export interface HospitalOverallCalculation {
  date: string;
  departments: Record<DepartmentKey, DepartmentCalculation>;
  totalDirectCareHours: number;
  totalIndirectCareHours: number;
  totalSupportCareHours: number;
  totalNursingHours: number;
  totalActualStaff: number;
  totalRequiredStaff: number;
  totalRequiredFTE: number;
  overallGap: number;
  overallStatus: 'balanced' | 'understaffed' | 'overstaffed';
  averageProductivityRate: number;
}
