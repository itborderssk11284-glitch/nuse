import React, { useState, useMemo } from 'react';
import { DailyRecord, DepartmentKey, StandardWeightsConfig } from '../types/nursing';
import { calculateHospitalOverall, calculateER, calculateOPD, calculateIPD, calculateLR } from '../utils/calculator';
import { exportToExcel } from '../utils/exportUtils';
import { HospitalLogo } from './HospitalLogo';
import { AppUser, canUserPrintReport, DEPARTMENT_LABELS } from '../types/auth';
import {
  FileSpreadsheet,
  Printer,
  Calendar,
  Search,
  Filter,
  Eye,
  Trash2,
  Download,
  CalendarDays,
  CalendarRange,
  Clock,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  TableProperties,
  ArrowRight,
  ShieldCheck,
  Building2,
} from 'lucide-react';

export type ReportPeriodType = 'daily' | 'monthly' | 'yearly';
export type ViewMode = 'a4_template' | 'table';

export const DEPARTMENT_NAMES: Record<DepartmentKey, string> = {
  ER: 'งานอุบัติเหตุ-ฉุกเฉิน (ER)',
  OPD: 'งานผู้ป่วยนอก (OPD)',
  IPD1: 'หอผู้ป่วยใน 1 (IPD 1 สามัญ/หญิง-เด็ก)',
  IPD2: 'หอผู้ป่วยใน 2 (IPD 2 ชาย/พิเศษ)',
  LR: 'งานห้องคลอดและทารกแรกเกิด (LR)',
};

export const getDeptCensusSummary = (r: DailyRecord, deptKey: DepartmentKey): string => {
  if (deptKey === 'ER') {
    const totalER = r.er.triage1_resus + r.er.triage2_emergency + r.er.triage3_urgency + r.er.triage4_semiUrgent + r.er.triage5_nonUrgent;
    return `รวม ${totalER} ราย (วิกฤต/ฉุกเฉิน ${r.er.triage1_resus + r.er.triage2_emergency}, สังเกต ${r.er.observationCases}, รีเฟอร์ ${r.er.ambulanceReferral})`;
  }
  if (deptKey === 'OPD') {
    const totalOPD = r.opd.generalPatients + r.opd.chronicPatients + r.opd.minorSurgery + r.opd.specialClinic;
    return `รวม ${totalOPD} ราย (ทั่วไป ${r.opd.generalPatients}, NCDs ${r.opd.chronicPatients}, หัตถการ ${r.opd.minorSurgery})`;
  }
  if (deptKey === 'IPD1') {
    return `ครองเตียง ${r.ipd1.currentCensus}/${r.ipd1.bedCapacity} เตียง (ประเภท 4-5: ${r.ipd1.pcs4_intensiveCare + r.ipd1.pcs5_ventilator} ราย, รับใหม่ ${r.ipd1.admissions})`;
  }
  if (deptKey === 'IPD2') {
    return `ครองเตียง ${r.ipd2.currentCensus}/${r.ipd2.bedCapacity} เตียง (ประเภท 4-5: ${r.ipd2.pcs4_intensiveCare + r.ipd2.pcs5_ventilator} ราย, รับใหม่ ${r.ipd2.admissions})`;
  }
  if (deptKey === 'LR') {
    return `รอคลอด/ทำคลอด ${r.lr.stage1Latent + r.lr.stage1Active + r.lr.stage2Delivery} ราย (คลอด ${r.lr.stage2Delivery}, เสี่ยงสูง ${r.lr.highRiskCases})`;
  }
  return '';
};

interface ReportsViewProps {
  records: DailyRecord[];
  onSelectRecord: (date: string) => void;
  onDeleteRecord: (id: string) => void;
  standardsConfig: StandardWeightsConfig;
  appUser?: AppUser | null;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  records,
  onSelectRecord,
  onDeleteRecord,
  standardsConfig,
  appUser = null,
}) => {
  // Period Mode: 'daily' | 'monthly' | 'yearly'
  const [periodType, setPeriodType] = useState<ReportPeriodType>('daily');

  // View Mode: 'a4_template' (A4 Paper Template) vs 'table' (Interactive Table)
  const [viewMode, setViewMode] = useState<ViewMode>('a4_template');

  // A4 Zoom Scale for Screen Viewing
  const [previewScale, setPreviewScale] = useState<number>(100);

  // Selected Date, Month, Year
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);
  const currentMonthISO = today.toISOString().slice(0, 7); // YYYY-MM
  const currentYearStr = String(today.getFullYear());       // YYYY

  // Initial selected daily date from latest record or today
  const [selectedDailyDate, setSelectedDailyDate] = useState<string>(() => {
    if (records.length > 0) {
      const sorted = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return sorted[0].date;
    }
    return todayISO;
  });

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthISO);
  const [selectedYear, setSelectedYear] = useState<string>(currentYearStr);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'understaffed' | 'balanced'>('all');
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState<string>('all');

  // Check if current user is department head and enforce/suggest filter
  const isDeptHead = appUser?.role === 'department_head';
  const userDept = appUser?.department;

  // Filter records based on active period type
  const periodFilteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (periodType === 'daily') {
        return r.date === selectedDailyDate;
      } else if (periodType === 'monthly') {
        return r.date.startsWith(selectedMonth);
      } else if (periodType === 'yearly') {
        return r.date.startsWith(selectedYear);
      }
      return true;
    });
  }, [records, periodType, selectedDailyDate, selectedMonth, selectedYear]);

  // Selected single daily record for Daily A4 template
  const dailyRecord = useMemo(() => {
    return records.find((r) => r.date === selectedDailyDate) || records[0];
  }, [records, selectedDailyDate]);

  // Daily Overall Calculation
  const dailyCalc = useMemo(() => {
    if (!dailyRecord) return null;
    return calculateHospitalOverall(dailyRecord, standardsConfig);
  }, [dailyRecord, standardsConfig]);

  // Apply search and status filter for table list
  const displayedRecords = useMemo(() => {
    return periodFilteredRecords.filter((rec) => {
      const calc = calculateHospitalOverall(rec, standardsConfig);
      const matchSearch =
        rec.date.includes(searchTerm) ||
        (rec.recorderName && rec.recorderName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (rec.notes && rec.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchSearch) return false;

      if (statusFilter === 'understaffed') return calc.overallStatus === 'understaffed';
      if (statusFilter === 'balanced') return calc.overallStatus === 'balanced';
      return true;
    });
  }, [periodFilteredRecords, searchTerm, statusFilter, standardsConfig]);

  // Aggregate metrics for monthly/yearly period
  const aggregateMetrics = useMemo(() => {
    if (displayedRecords.length === 0) {
      return {
        totalDays: 0,
        totalTNH: 0,
        totalDirect: 0,
        totalIndirect: 0,
        totalSupport: 0,
        avgActualStaff: 0,
        avgRequiredStaff: 0,
        avgGap: 0,
        avgFTE: 0,
        avgProductivity: 0,
        understaffedDays: 0,
      };
    }

    let sumTNH = 0;
    let sumDirect = 0;
    let sumIndirect = 0;
    let sumSupport = 0;
    let sumActual = 0;
    let sumRequired = 0;
    let sumFTE = 0;
    let sumProd = 0;
    let underDays = 0;

    displayedRecords.forEach((r) => {
      const c = calculateHospitalOverall(r, standardsConfig);
      sumTNH += c.totalNursingHours;
      sumDirect += c.totalDirectCareHours;
      sumIndirect += c.totalIndirectCareHours;
      sumSupport += c.totalSupportCareHours;
      sumActual += c.totalActualStaff;
      sumRequired += c.totalRequiredStaff;
      sumFTE += c.totalRequiredFTE;
      sumProd += c.averageProductivityRate;
      if (c.overallStatus === 'understaffed') underDays++;
    });

    const count = displayedRecords.length;
    const avgActual = Math.round(sumActual / count);
    const avgReq = Math.round(sumRequired / count);
    return {
      totalDays: count,
      totalTNH: Number(sumTNH.toFixed(1)),
      totalDirect: Number(sumDirect.toFixed(1)),
      totalIndirect: Number(sumIndirect.toFixed(1)),
      totalSupport: Number(sumSupport.toFixed(1)),
      avgActualStaff: avgActual,
      avgRequiredStaff: avgReq,
      avgGap: Number((avgActual - avgReq).toFixed(1)),
      avgFTE: Number((sumFTE / count).toFixed(2)),
      avgProductivity: Math.round(sumProd / count),
      understaffedDays: underDays,
    };
  }, [displayedRecords, standardsConfig]);

  // Aggregate departmental metrics for monthly/yearly period
  const departmentSummaries = useMemo(() => {
    const depts: DepartmentKey[] = ['ER', 'OPD', 'IPD1', 'IPD2', 'LR'];
    const count = displayedRecords.length;
    if (count === 0) {
      const empty: Record<DepartmentKey, {
        key: DepartmentKey;
        name: string;
        totalDirect: number;
        totalIndirect: number;
        totalSupport: number;
        totalTNH: number;
        sharePercent: number;
        tnhSharePercent: number;
        avgActualStaff: number;
        avgRequiredStaff: number;
        avgGap: number;
        avgFTE: number;
        avgProductivity: number;
        status: 'balanced' | 'understaffed' | 'overstaffed';
        understaffedDays: number;
      }> = {} as any;
      depts.forEach((d) => {
        empty[d] = {
          key: d,
          name: DEPARTMENT_NAMES[d],
          totalDirect: 0,
          totalIndirect: 0,
          totalSupport: 0,
          totalTNH: 0,
          sharePercent: 0,
          tnhSharePercent: 0,
          avgActualStaff: 0,
          avgRequiredStaff: 0,
          avgGap: 0,
          avgFTE: 0,
          avgProductivity: 0,
          status: 'balanced',
          understaffedDays: 0,
        };
      });
      return empty;
    }

    let grandTNH = 0;
    const raw: Record<DepartmentKey, {
      direct: number;
      indirect: number;
      support: number;
      tnh: number;
      actual: number;
      required: number;
      fte: number;
      prod: number;
      under: number;
    }> = {
      ER: { direct: 0, indirect: 0, support: 0, tnh: 0, actual: 0, required: 0, fte: 0, prod: 0, under: 0 },
      OPD: { direct: 0, indirect: 0, support: 0, tnh: 0, actual: 0, required: 0, fte: 0, prod: 0, under: 0 },
      IPD1: { direct: 0, indirect: 0, support: 0, tnh: 0, actual: 0, required: 0, fte: 0, prod: 0, under: 0 },
      IPD2: { direct: 0, indirect: 0, support: 0, tnh: 0, actual: 0, required: 0, fte: 0, prod: 0, under: 0 },
      LR: { direct: 0, indirect: 0, support: 0, tnh: 0, actual: 0, required: 0, fte: 0, prod: 0, under: 0 },
    };

    displayedRecords.forEach((r) => {
      const c = calculateHospitalOverall(r, standardsConfig);
      grandTNH += c.totalNursingHours;
      depts.forEach((d) => {
        const dCalc = c.departments[d];
        raw[d].direct += dCalc.directCareHours;
        raw[d].indirect += dCalc.indirectCareHours;
        raw[d].support += dCalc.supportCareHours;
        raw[d].tnh += dCalc.totalNursingHours;
        raw[d].actual += dCalc.totalActualStaff;
        raw[d].required += dCalc.totalRequiredStaff;
        raw[d].fte += dCalc.requiredFTE;
        raw[d].prod += dCalc.productivityRate;
        if (dCalc.status === 'understaffed') raw[d].under++;
      });
    });

    const res: Record<DepartmentKey, {
      key: DepartmentKey;
      name: string;
      totalDirect: number;
      totalIndirect: number;
      totalSupport: number;
      totalTNH: number;
      sharePercent: number;
      tnhSharePercent: number;
      avgActualStaff: number;
      avgRequiredStaff: number;
      avgGap: number;
      avgFTE: number;
      avgProductivity: number;
      status: 'balanced' | 'understaffed' | 'overstaffed';
      understaffedDays: number;
    }> = {} as any;

    depts.forEach((d) => {
      const item = raw[d];
      const avgActual = Number((item.actual / count).toFixed(1));
      const avgReq = Number((item.required / count).toFixed(1));
      const avgGap = Number((avgActual - avgReq).toFixed(1));
      const avgProd = Math.round(item.prod / count);
      const share = grandTNH > 0 ? Number(((item.tnh / grandTNH) * 100).toFixed(1)) : 0;

      res[d] = {
        key: d,
        name: DEPARTMENT_NAMES[d],
        totalDirect: Number(item.direct.toFixed(1)),
        totalIndirect: Number(item.indirect.toFixed(1)),
        totalSupport: Number(item.support.toFixed(1)),
        totalTNH: Number(item.tnh.toFixed(1)),
        sharePercent: share,
        tnhSharePercent: share,
        avgActualStaff: avgActual,
        avgRequiredStaff: avgReq,
        avgGap,
        avgFTE: Number((item.fte / count).toFixed(2)),
        avgProductivity: avgProd,
        understaffedDays: item.under,
        status: avgGap < 0 ? 'understaffed' : avgProd > 115 ? 'overstaffed' : 'balanced',
      };
    });

    return res;
  }, [displayedRecords, standardsConfig]);

  // List of department summaries for easy rendering in tables and grids
  const departmentSummariesList = useMemo(() => {
    const depts: DepartmentKey[] = ['ER', 'OPD', 'IPD1', 'IPD2', 'LR'];
    return depts.map((d) => departmentSummaries[d]).filter(Boolean);
  }, [departmentSummaries]);

  // Active metrics based on whether All Departments or Specific Department is selected
  const activeMetrics = useMemo(() => {
    if (selectedDepartmentFilter === 'all') {
      return aggregateMetrics;
    }
    const d = departmentSummaries[selectedDepartmentFilter as DepartmentKey];
    if (!d) return aggregateMetrics;
    return {
      totalDays: displayedRecords.length,
      totalTNH: d.totalTNH,
      totalDirect: d.totalDirect,
      totalIndirect: d.totalIndirect,
      totalSupport: d.totalSupport,
      avgActualStaff: d.avgActualStaff,
      avgRequiredStaff: d.avgRequiredStaff,
      avgGap: d.avgGap,
      avgFTE: d.avgFTE,
      avgProductivity: d.avgProductivity,
      understaffedDays: d.understaffedDays,
    };
  }, [selectedDepartmentFilter, aggregateMetrics, departmentSummaries, displayedRecords.length]);

  const handlePrint = () => {
    window.print();
  };

  const handleExcelExport = () => {
    const deptSuffix = selectedDepartmentFilter !== 'all' ? `_แผนก${selectedDepartmentFilter}` : '_รวมทุกแผนก';
    const periodLabel =
      periodType === 'daily'
        ? `รายงานค่างานประจำวัน_${selectedDailyDate}${deptSuffix}`
        : periodType === 'monthly'
        ? `รายงานค่างานประจำเดือน_${selectedMonth}${deptSuffix}`
        : `รายงานค่างานประจำปี_${selectedYear}${deptSuffix}`;
    exportToExcel(displayedRecords, standardsConfig, periodLabel, selectedDepartmentFilter);
  };

  // Thai Period Display Title
  const periodTitle = useMemo(() => {
    if (periodType === 'daily') {
      const d = new Date(selectedDailyDate);
      return `รายงานประจำวัน: ${d.toLocaleDateString('th-TH', { dateStyle: 'long' })}`;
    } else if (periodType === 'monthly') {
      const [y, m] = selectedMonth.split('-');
      const d = new Date(parseInt(y), parseInt(m) - 1, 1);
      return `รายงานประจำเดือน: ${d.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}`;
    } else {
      const thaiYear = parseInt(selectedYear) + 543;
      return `รายงานประจำปี: พ.ศ. ${thaiYear} (ค.ศ. ${selectedYear})`;
    }
  }, [periodType, selectedDailyDate, selectedMonth, selectedYear]);

  // Dynamic Report Subtitle
  const reportPeriodTitle = useMemo(() => {
    if (selectedDepartmentFilter === 'all') {
      return `สรุปสถิติค่างานและอัตรากำลัง: ภาพรวม 5 ฝ่ายงาน (${periodTitle})`;
    }
    const deptName = DEPARTMENT_NAMES[selectedDepartmentFilter as DepartmentKey] || selectedDepartmentFilter;
    return `สรุปสถิติค่างานและอัตรากำลัง: ${deptName} (${periodTitle})`;
  }, [selectedDepartmentFilter, periodTitle]);

  // Departments list with friendly labels
  const departmentsData = useMemo(() => {
    if (!dailyRecord || !dailyCalc) return [];
    const depts: Array<{
      key: DepartmentKey;
      name: string;
      calc: any;
      patientCensus: string;
    }> = [
      {
        key: 'ER',
        name: 'งานอุบัติเหตุ-ฉุกเฉิน (ER)',
        calc: dailyCalc.departments.ER,
        patientCensus: `รวม ${
          dailyRecord.er.triage1_resus +
          dailyRecord.er.triage2_emergency +
          dailyRecord.er.triage3_urgency +
          dailyRecord.er.triage4_semiUrgent +
          dailyRecord.er.triage5_nonUrgent
        } ราย (วิกฤต/ฉุกเฉิน ${dailyRecord.er.triage1_resus + dailyRecord.er.triage2_emergency}, สังเกต ${dailyRecord.er.observationCases}, รีเฟอร์ ${dailyRecord.er.ambulanceReferral})`,
      },
      {
        key: 'OPD',
        name: 'งานผู้ป่วยนอก (OPD)',
        calc: dailyCalc.departments.OPD,
        patientCensus: `รวม ${
          dailyRecord.opd.generalPatients +
          dailyRecord.opd.chronicPatients +
          dailyRecord.opd.minorSurgery +
          dailyRecord.opd.specialClinic
        } ราย (ทั่วไป ${dailyRecord.opd.generalPatients}, เรื้อรัง ${dailyRecord.opd.chronicPatients}, ผ่าตัดเล็ก ${dailyRecord.opd.minorSurgery})`,
      },
      {
        key: 'IPD1',
        name: 'หอผู้ป่วยใน 1 (IPD 1 สามัญ/หญิง-เด็ก)',
        calc: dailyCalc.departments.IPD1,
        patientCensus: `ครองเตียง ${dailyRecord.ipd1.currentCensus}/${dailyRecord.ipd1.bedCapacity} เตียง (ประเภท 4-5: ${
          dailyRecord.ipd1.pcs4_intensiveCare + dailyRecord.ipd1.pcs5_ventilator
        } ราย, รับใหม่ ${dailyRecord.ipd1.admissions})`,
      },
      {
        key: 'IPD2',
        name: 'หอผู้ป่วยใน 2 (IPD 2 ชาย/พิเศษ)',
        calc: dailyCalc.departments.IPD2,
        patientCensus: `ครองเตียง ${dailyRecord.ipd2.currentCensus}/${dailyRecord.ipd2.bedCapacity} เตียง (ประเภท 4-5: ${
          dailyRecord.ipd2.pcs4_intensiveCare + dailyRecord.ipd2.pcs5_ventilator
        } ราย, รับใหม่ ${dailyRecord.ipd2.admissions})`,
      },
      {
        key: 'LR',
        name: 'งานห้องคลอด (Labor Room)',
        calc: dailyCalc.departments.LR,
        patientCensus: `รอคลอด/ทำคลอด ${
          dailyRecord.lr.stage1Latent +
          dailyRecord.lr.stage1Active +
          dailyRecord.lr.stage2Delivery
        } ราย (เสี่ยงสูง ${dailyRecord.lr.highRiskCases}, กู้ชีพทารก ${dailyRecord.lr.newbornResuscitation})`,
      },
    ];

    if (selectedDepartmentFilter === 'all') return depts;
    return depts.filter((d) => d.key === selectedDepartmentFilter);
  }, [dailyRecord, dailyCalc, selectedDepartmentFilter]);

  // Aggregate actual staff in morning, afternoon, night
  const dailyShiftStaff = useMemo(() => {
    if (!dailyRecord) return { morning: 0, afternoon: 0, night: 0 };
    return {
      morning: dailyRecord.er.actualStaff.morning + dailyRecord.opd.actualStaff.morning + dailyRecord.ipd1.actualStaff.morning + dailyRecord.ipd2.actualStaff.morning + dailyRecord.lr.actualStaff.morning,
      afternoon: dailyRecord.er.actualStaff.afternoon + dailyRecord.opd.actualStaff.afternoon + dailyRecord.ipd1.actualStaff.afternoon + dailyRecord.ipd2.actualStaff.afternoon + dailyRecord.lr.actualStaff.afternoon,
      night: dailyRecord.er.actualStaff.night + dailyRecord.opd.actualStaff.night + dailyRecord.ipd1.actualStaff.night + dailyRecord.ipd2.actualStaff.night + dailyRecord.lr.actualStaff.night,
    };
  }, [dailyRecord]);

  // Extract top indirect & support tasks for daily report notes
  const dailyTasksSummary = useMemo(() => {
    if (!dailyRecord) return { indirectCount: 0, supportCount: 0, sampleIndirect: '', sampleSupport: '' };
    const allIndirect = [
      ...dailyRecord.er.indirectItems,
      ...dailyRecord.opd.indirectItems,
      ...dailyRecord.ipd1.indirectItems,
      ...dailyRecord.ipd2.indirectItems,
      ...dailyRecord.lr.indirectItems,
    ];
    const allSupport = [
      ...dailyRecord.er.supportItems,
      ...dailyRecord.opd.supportItems,
      ...dailyRecord.ipd1.supportItems,
      ...dailyRecord.ipd2.supportItems,
      ...dailyRecord.lr.supportItems,
    ];

    const sampleInd = allIndirect.slice(0, 3).map((i) => `${i.name} (${i.count} ${i.unitLabel || 'ครั้ง'})`).join(', ');
    const sampleSup = allSupport.slice(0, 3).map((s) => `${s.name} (${s.frequencyCount} ครั้ง)`).join(', ');

    return {
      indirectCount: allIndirect.length,
      supportCount: allSupport.length,
      sampleIndirect: sampleInd,
      sampleSupport: sampleSup,
    };
  }, [dailyRecord]);

  return (
    <div className="space-y-4">

      {/* ========================================================================= */}
      {/* 1. Official Government A4 Print Sheet (Used directly for Print / PDF output) */}
      {/* ========================================================================= */}
      <div className="hidden print:block print-only">
        {periodType === 'daily' && dailyRecord && dailyCalc ? (
          // ================= A4 DAILY OFFICIAL REPORT TEMPLATE =================
          <div className="a4-print-sheet a4-single-page bg-white text-black text-[11px] leading-tight font-sans">
            {/* Header */}
            <div className="border-b-2 border-emerald-900 pb-2 mb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <HospitalLogo size={42} />
                  <div>
                    <h1 className="text-[14px] font-bold tracking-tight text-slate-900">
                      โรงพยาบาลสังขละบุรี จังหวัดกาญจนบุรี
                    </h1>
                    <p className="text-[11px] font-bold text-emerald-950">
                      Sangkhlaburi Hospital Smart Workload & Nursing Workforce Assessment System
                    </p>
                    <p className="text-[9.5px] text-gray-600">
                      กลุ่มงานการพยาบาล • การประเมินค่างาน 3 ส่วน (งานหลัก • งานรอง • งานสนับสนุน) ตามมาตรฐานสภาการพยาบาล
                    </p>
                  </div>
                </div>
                <div className="text-right border-l border-gray-300 pl-3">
                  <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-900 font-bold text-[10px] rounded">
                    แบบรายงานประจำวัน
                  </span>
                  <div className="text-[10px] text-gray-700 font-mono mt-0.5">
                    วันที่: {new Date(dailyRecord.date).toLocaleDateString('th-TH', { dateStyle: 'long' })}
                  </div>
                  <div className="text-[9px] text-gray-500">
                    เวลาออกรายงาน: {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Overall Hospital KPI Box */}
            <div className="grid grid-cols-5 gap-1.5 p-2 bg-slate-50 border border-slate-300 rounded mb-2 text-center">
              <div className="border-r border-slate-200 pr-1">
                <span className="text-[9.5px] text-gray-600 block">ค่างานรวม (TNH)</span>
                <span className="text-[13px] font-bold text-emerald-900 font-mono">
                  {dailyCalc.totalNursingHours}
                </span>
                <span className="text-[9px] text-gray-500 ml-0.5">ชม.</span>
              </div>
              <div className="border-r border-slate-200 pr-1">
                <span className="text-[9.5px] text-gray-600 block">สัดส่วนงาน 3 ส่วน</span>
                <span className="text-[10px] font-semibold text-slate-800">
                  {dailyCalc.totalDirectCareHours} / {dailyCalc.totalIndirectCareHours} / {dailyCalc.totalSupportCareHours}
                </span>
                <span className="text-[8.5px] text-gray-500 block">หลัก / รอง / หนุน</span>
              </div>
              <div className="border-r border-slate-200 pr-1">
                <span className="text-[9.5px] text-gray-600 block">กำลังคน (จริง / ควรมี)</span>
                <span className="text-[12px] font-bold text-blue-900 font-mono">
                  {dailyCalc.totalActualStaff}
                </span>
                <span className="text-gray-400"> / </span>
                <span className="text-[12px] font-bold text-slate-800 font-mono">
                  {dailyCalc.totalRequiredStaff}
                </span>
                <span className="text-[9px] text-gray-500 ml-0.5">คน</span>
              </div>
              <div className="border-r border-slate-200 pr-1">
                <span className="text-[9.5px] text-gray-600 block">ส่วนต่าง (Gap)</span>
                <span className={`text-[12px] font-bold font-mono ${dailyCalc.overallGap < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {dailyCalc.overallGap >= 0 ? `+${dailyCalc.overallGap}` : dailyCalc.overallGap} คน
                </span>
                <span className="text-[8.5px] text-gray-500 block">
                  FTE: {dailyCalc.totalRequiredFTE} อัตรา
                </span>
              </div>
              <div>
                <span className="text-[9.5px] text-gray-600 block">ผลิตภาพรวม</span>
                <span className="text-[13px] font-bold text-purple-900 font-mono">
                  {dailyCalc.averageProductivityRate}%
                </span>
                <span className="text-[8.5px] text-gray-500 block">
                  {dailyCalc.overallStatus === 'balanced' ? '🟢 พอเหมาะ' : dailyCalc.overallStatus === 'understaffed' ? '🔴 ขาดแคลน' : '🟡 เกินเกณฑ์'}
                </span>
              </div>
            </div>

            {/* Department Breakdown Table - Calibrated tightly for A4 */}
            <div className="mb-2">
              <div className="text-[10.5px] font-bold text-slate-800 mb-1 flex items-center justify-between">
                <span>ตารางจำแนกภาระงานและอัตรากำลังพยาบาลรายฝ่ายงาน (5 แผนกบริการ)</span>
                <span className="text-[9px] text-gray-500 font-normal">เป้าหมายผลิตภาพมาตรฐานสภาการพยาบาล: 85 - 115%</span>
              </div>
              <table className="w-full border-collapse border border-gray-400 text-[10px]">
                <thead>
                  <tr className="bg-slate-100 font-bold text-center">
                    <th className="border border-gray-400 p-1 text-left w-[24%]">ฝ่ายงาน / แผนกบริการ</th>
                    <th className="border border-gray-400 p-1 text-left w-[28%]">ปริมาณผู้รับบริการ / ครองเตียง</th>
                    <th className="border border-gray-400 p-1 w-[8%]">งานหลัก</th>
                    <th className="border border-gray-400 p-1 w-[8%]">งานรอง</th>
                    <th className="border border-gray-400 p-1 w-[8%]">งานหนุน</th>
                    <th className="border border-gray-400 p-1 w-[9%] bg-emerald-50">TNH รวม</th>
                    <th className="border border-gray-400 p-1 w-[8%]">จริง/ควรมี</th>
                    <th className="border border-gray-400 p-1 w-[7%]">Gap</th>
                    <th className="border border-gray-400 p-1 w-[7%]">ผลิตภาพ</th>
                  </tr>
                </thead>
                <tbody>
                  {departmentsData.map((d) => (
                    <tr key={d.key} className="text-center">
                      <td className="border border-gray-400 p-1 text-left font-semibold text-slate-900">
                        {d.name}
                      </td>
                      <td className="border border-gray-400 p-1 text-left text-[9px] text-gray-700">
                        {d.patientCensus}
                      </td>
                      <td className="border border-gray-400 p-1 font-mono">{d.calc.directCareHours}</td>
                      <td className="border border-gray-400 p-1 font-mono">{d.calc.indirectCareHours}</td>
                      <td className="border border-gray-400 p-1 font-mono">{d.calc.supportWorkHours}</td>
                      <td className="border border-gray-400 p-1 font-mono font-bold bg-emerald-50/50">
                        {d.calc.totalNursingHours}
                      </td>
                      <td className="border border-gray-400 p-1 font-mono">
                        {d.calc.totalActualStaff}/{d.calc.totalRequiredStaff}
                      </td>
                      <td className={`border border-gray-400 p-1 font-mono font-bold ${d.calc.gap < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                        {d.calc.gap >= 0 ? `+${d.calc.gap}` : d.calc.gap}
                      </td>
                      <td className="border border-gray-400 p-1 font-mono font-semibold">
                        {d.calc.productivityRate}%
                      </td>
                    </tr>
                  ))}
                  {/* Total Row */}
                  <tr className="bg-slate-100 font-bold text-center border-t-2 border-gray-500">
                    <td colSpan={2} className="border border-gray-400 p-1 text-right pr-2">
                      รวมทั้งโรงพยาบาล (Total Hospital)
                    </td>
                    <td className="border border-gray-400 p-1 font-mono">{dailyCalc.totalDirectCareHours}</td>
                    <td className="border border-gray-400 p-1 font-mono">{dailyCalc.totalIndirectCareHours}</td>
                    <td className="border border-gray-400 p-1 font-mono">{dailyCalc.totalSupportCareHours}</td>
                    <td className="border border-gray-400 p-1 font-mono font-bold bg-emerald-100 text-emerald-950">
                      {dailyCalc.totalNursingHours}
                    </td>
                    <td className="border border-gray-400 p-1 font-mono">
                      {dailyCalc.totalActualStaff}/{dailyCalc.totalRequiredStaff}
                    </td>
                    <td className={`border border-gray-400 p-1 font-mono font-bold ${dailyCalc.overallGap < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                      {dailyCalc.overallGap >= 0 ? `+${dailyCalc.overallGap}` : dailyCalc.overallGap}
                    </td>
                    <td className="border border-gray-400 p-1 font-mono font-bold text-purple-900">
                      {dailyCalc.averageProductivityRate}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Shift Distribution & Indirect/Support Summary */}
            <div className="grid grid-cols-2 gap-2 mb-3 text-[9.5px]">
              <div className="border border-gray-300 p-1.5 rounded bg-slate-50">
                <div className="font-bold text-slate-800 mb-0.5">การจัดเวรพยาบาลประจำวัน (Shift Staffing):</div>
                <div className="grid grid-cols-3 gap-1 text-center font-mono text-[9px]">
                  <div className="bg-white p-1 border rounded">เวรเช้า: {dailyShiftStaff.morning} คน</div>
                  <div className="bg-white p-1 border rounded">เวรบ่าย: {dailyShiftStaff.afternoon} คน</div>
                  <div className="bg-white p-1 border rounded">เวรดึก: {dailyShiftStaff.night} คน</div>
                </div>
              </div>

              <div className="border border-gray-300 p-1.5 rounded bg-slate-50">
                <div className="font-bold text-slate-800 mb-0.5">กิจกรรมงานรองและงานสนับสนุนสำคัญ:</div>
                <div className="text-gray-700 line-clamp-2">
                  งานรอง: {dailyTasksSummary.sampleIndirect || 'บันทึกชาร์จ, เตรียมยา, ส่งเวร'}<br />
                  งานหนุน: {dailyTasksSummary.sampleSupport || 'ตรวจเครื่องมือแพทย์, IC, บริหารวอร์ด'}
                </div>
              </div>
            </div>

            {/* Note & Remarks */}
            {dailyRecord.notes && (
              <div className="text-[9.5px] text-gray-700 bg-amber-50 border border-amber-200 p-1.5 rounded mb-3">
                <span className="font-bold text-amber-900">บันทึกเหตุการณ์เวรตรวจการ: </span>
                {dailyRecord.notes}
              </div>
            )}

            {/* Official 3-Party Signature Block - Scaled to strictly fit A4 height */}
            <div className="page-break-inside-avoid pt-4 border-t border-gray-300 text-center text-[10px]">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-6">
                  <div>ลงชื่อ..........................................................</div>
                  <div>
                    <p className="font-semibold">({dailyRecord.recorderName || 'พยาบาลตรวจการเวร'})</p>
                    <p className="text-gray-600 text-[9px]">พยาบาลตรวจการเวรผู้จัดทำ</p>
                    <p className="text-gray-400 text-[8.5px]">วันที่ ....../....../......</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>ลงชื่อ..........................................................</div>
                  <div>
                    <p className="font-semibold">(พว. หวานเพ็ญ   สาลี)</p>
                    <p className="text-gray-600 text-[9px]">หัวหน้ากลุ่มงานการพยาบาล</p>
                    <p className="text-gray-400 text-[8.5px]">วันที่ ....../....../......</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>ลงชื่อ..........................................................</div>
                  <div>
                    <p className="font-semibold">(นายแพทย์จิรวัฒน์   วงษ์สวัสดิ์)</p>
                    <p className="text-gray-600 text-[9px]">ผู้อำนวยการโรงพยาบาลสังขละบุรี</p>
                    <p className="text-gray-400 text-[8.5px]">วันที่ ....../....../......</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // ================= A4 PERIOD SUMMARY TEMPLATE (Monthly / Yearly) =================
          <div className="a4-print-sheet bg-white text-black text-[10.5px] leading-tight font-sans">
            {/* Header */}
            <div className="border-b-2 border-emerald-900 pb-2 mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HospitalLogo size={38} />
                <div>
                  <h1 className="text-[13px] font-bold text-slate-900">โรงพยาบาลสังขละบุรี จังหวัดกาญจนบุรี</h1>
                  <h2 className="text-[10.5px] font-bold text-emerald-950">
                    {reportPeriodTitle}
                  </h2>
                </div>
              </div>
              <div className="text-right text-[9px] text-gray-500">
                {periodTitle} • ออกรายงานเมื่อ {new Date().toLocaleDateString('th-TH')}
              </div>
            </div>

            {/* Aggregate summary KPI cards */}
            <div className="grid grid-cols-4 gap-2 border border-gray-300 p-2 rounded mb-2 text-center text-[10px]">
              <div>
                <span className="text-gray-500 block">จำนวนวันบันทึก</span>
                <span className="font-bold text-[12px]">{activeMetrics.totalDays} วัน</span>
              </div>
              <div>
                <span className="text-gray-500 block">
                  {selectedDepartmentFilter === 'all' ? 'ค่างานรวม รพ. (TNH)' : 'ค่างานแผนก (TNH)'}
                </span>
                <span className="font-bold text-[12px] text-emerald-800">{activeMetrics.totalTNH} ชม.</span>
                <span className="text-[8.5px] text-gray-500 block">
                  หลัก: {activeMetrics.totalDirect} • รอง: {activeMetrics.totalIndirect} • หนุน: {activeMetrics.totalSupport}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">พยาบาลเฉลี่ยจริง/ควรมี</span>
                <span className="font-bold text-[12px]">{activeMetrics.avgActualStaff} / {activeMetrics.avgRequiredStaff} คน</span>
                <span className="text-[8.5px] text-gray-500 block">
                  ส่วนต่าง: {activeMetrics.avgGap >= 0 ? `+${activeMetrics.avgGap}` : activeMetrics.avgGap} คน (FTE: {activeMetrics.avgFTE})
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">ผลิตภาพเฉลี่ย</span>
                <span className="font-bold text-[12px] text-purple-800">{activeMetrics.avgProductivity}%</span>
                <span className="text-[8.5px] text-gray-500 block">
                  {activeMetrics.avgProductivity >= 85 && activeMetrics.avgProductivity <= 115
                    ? '🟢 พอเหมาะ'
                    : activeMetrics.avgProductivity > 115
                    ? '🟡 เกินเกณฑ์'
                    : '🔴 ขาดแคลน'} (ขาด {activeMetrics.understaffedDays} วัน)
                </span>
              </div>
            </div>

            {/* SECTION A: If "All Departments" is selected -> Show 5-Department Summary Table First */}
            {selectedDepartmentFilter === 'all' && (
              <div className="mb-3">
                <div className="text-[10px] font-bold text-slate-900 mb-1 flex items-center justify-between">
                  <span>ตารางสรุปเปรียบเทียบค่างานและอัตรากำลังจำแนกราย 5 ฝ่ายงาน ({periodTitle})</span>
                  <span className="text-[9px] text-gray-500 font-normal">เป้าหมายผลิตภาพ: 85 - 115%</span>
                </div>
                <table className="w-full border-collapse border border-gray-400 text-[9px]">
                  <thead>
                    <tr className="bg-gray-100 font-bold text-center">
                      <th className="border border-gray-400 p-1 text-left">ฝ่ายงาน / แผนกบริการ</th>
                      <th className="border border-gray-400 p-1">งานหลัก</th>
                      <th className="border border-gray-400 p-1">งานรอง</th>
                      <th className="border border-gray-400 p-1">งานหนุน</th>
                      <th className="border border-gray-400 p-1 bg-emerald-50">TNH รวม</th>
                      <th className="border border-gray-400 p-1">สัดส่วน</th>
                      <th className="border border-gray-400 p-1">จริง/ควรมี</th>
                      <th className="border border-gray-400 p-1">Gap</th>
                      <th className="border border-gray-400 p-1">ผลิตภาพ</th>
                      <th className="border border-gray-400 p-1">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(['ER', 'OPD', 'IPD1', 'IPD2', 'LR'] as DepartmentKey[]).map((dKey) => {
                      const d = departmentSummaries[dKey];
                      return (
                        <tr key={dKey} className="text-center">
                          <td className="border border-gray-400 p-1 text-left font-semibold">{d.name}</td>
                          <td className="border border-gray-400 p-1 font-mono">{d.totalDirect}</td>
                          <td className="border border-gray-400 p-1 font-mono">{d.totalIndirect}</td>
                          <td className="border border-gray-400 p-1 font-mono">{d.totalSupport}</td>
                          <td className="border border-gray-400 p-1 font-mono font-bold bg-emerald-50/50">{d.totalTNH}</td>
                          <td className="border border-gray-400 p-1 font-mono">{d.sharePercent}%</td>
                          <td className="border border-gray-400 p-1 font-mono">{d.avgActualStaff}/{d.avgRequiredStaff}</td>
                          <td className={`border border-gray-400 p-1 font-mono font-bold ${d.avgGap < 0 ? 'text-rose-700' : 'text-emerald-800'}`}>
                            {d.avgGap >= 0 ? `+${d.avgGap}` : d.avgGap}
                          </td>
                          <td className="border border-gray-400 p-1 font-mono font-bold text-purple-900">{d.avgProductivity}%</td>
                          <td className="border border-gray-400 p-1 text-[8.5px]">
                            {d.status === 'balanced' ? '🟢 พอเหมาะ' : d.status === 'understaffed' ? '🔴 ขาดแคลน' : '🟡 เกินเกณฑ์'}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-gray-100 font-bold text-center border-t-2 border-gray-600">
                      <td className="border border-gray-400 p-1 text-right pr-2">รวมทั้งโรงพยาบาล (Total)</td>
                      <td className="border border-gray-400 p-1 font-mono">{aggregateMetrics.totalDirect}</td>
                      <td className="border border-gray-400 p-1 font-mono">{aggregateMetrics.totalIndirect}</td>
                      <td className="border border-gray-400 p-1 font-mono">{aggregateMetrics.totalSupport}</td>
                      <td className="border border-gray-400 p-1 font-mono font-bold bg-emerald-100 text-emerald-950">{aggregateMetrics.totalTNH}</td>
                      <td className="border border-gray-400 p-1 font-mono">100%</td>
                      <td className="border border-gray-400 p-1 font-mono">{aggregateMetrics.avgActualStaff}/{aggregateMetrics.avgRequiredStaff}</td>
                      <td className={`border border-gray-400 p-1 font-mono font-bold ${aggregateMetrics.avgActualStaff - aggregateMetrics.avgRequiredStaff < 0 ? 'text-rose-700' : 'text-emerald-800'}`}>
                        {aggregateMetrics.avgActualStaff - aggregateMetrics.avgRequiredStaff >= 0
                          ? `+${aggregateMetrics.avgActualStaff - aggregateMetrics.avgRequiredStaff}`
                          : aggregateMetrics.avgActualStaff - aggregateMetrics.avgRequiredStaff}
                      </td>
                      <td className="border border-gray-400 p-1 font-mono font-bold text-purple-900">{aggregateMetrics.avgProductivity}%</td>
                      <td className="border border-gray-400 p-1 text-[8.5px]">ภาพรวม 5 แผนก</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* SECTION B: Daily Records Breakdown Table */}
            <div className="mb-3">
              <div className="text-[10px] font-bold text-slate-900 mb-1 flex items-center justify-between">
                <span>
                  {selectedDepartmentFilter === 'all'
                    ? `ตารางบันทึกสถิติค่างานรายวันภาพรวมโรงพยาบาล (${periodTitle})`
                    : `ตารางบันทึกสถิติค่างานรายวัน: ${DEPARTMENT_NAMES[selectedDepartmentFilter as DepartmentKey]} (${periodTitle})`}
                </span>
                <span className="text-[9px] text-gray-500 font-normal">จำนวน {displayedRecords.length} วัน</span>
              </div>

              {selectedDepartmentFilter === 'all' ? (
                // Table for All Departments (Hospital Total)
                <table className="w-full border-collapse border border-gray-400 text-[9.5px]">
                  <thead>
                    <tr className="bg-gray-100 font-bold text-center">
                      <th className="border border-gray-400 p-1 w-20">วันที่</th>
                      <th className="border border-gray-400 p-1">งานหลัก</th>
                      <th className="border border-gray-400 p-1">งานรอง</th>
                      <th className="border border-gray-400 p-1">งานหนุน</th>
                      <th className="border border-gray-400 p-1 bg-emerald-50">TNH รวม</th>
                      <th className="border border-gray-400 p-1">จริง/ควรมี</th>
                      <th className="border border-gray-400 p-1">Gap</th>
                      <th className="border border-gray-400 p-1">ผลิตภาพ</th>
                      <th className="border border-gray-400 p-1">สถานะ</th>
                      <th className="border border-gray-400 p-1">ผู้ตรวจนับ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedRecords.map((r) => {
                      const c = calculateHospitalOverall(r, standardsConfig);
                      return (
                        <tr key={r.id} className="text-center">
                          <td className="border border-gray-400 p-0.5 font-mono">{r.date}</td>
                          <td className="border border-gray-400 p-0.5 font-mono">{c.totalDirectCareHours}</td>
                          <td className="border border-gray-400 p-0.5 font-mono">{c.totalIndirectCareHours}</td>
                          <td className="border border-gray-400 p-0.5 font-mono">{c.totalSupportCareHours}</td>
                          <td className="border border-gray-400 p-0.5 font-mono font-bold bg-emerald-50/40">{c.totalNursingHours}</td>
                          <td className="border border-gray-400 p-0.5 font-mono">{c.totalActualStaff}/{c.totalRequiredStaff}</td>
                          <td className={`border border-gray-400 p-0.5 font-mono font-bold ${c.overallGap < 0 ? 'text-rose-700' : 'text-emerald-800'}`}>
                            {c.overallGap >= 0 ? `+${c.overallGap}` : c.overallGap}
                          </td>
                          <td className="border border-gray-400 p-0.5 font-mono">{c.averageProductivityRate}%</td>
                          <td className="border border-gray-400 p-0.5 text-[8.5px]">
                            {c.overallStatus === 'balanced' ? 'พอเหมาะ' : c.overallStatus === 'understaffed' ? 'ขาดแคลน' : 'เกินเกณฑ์'}
                          </td>
                          <td className="border border-gray-400 p-0.5 text-left truncate max-w-[90px]">{r.recorderName || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                // Table for Specific Department
                <table className="w-full border-collapse border border-gray-400 text-[9.5px]">
                  <thead>
                    <tr className="bg-gray-100 font-bold text-center">
                      <th className="border border-gray-400 p-1 w-20">วันที่</th>
                      <th className="border border-gray-400 p-1 text-left">ปริมาณงาน / เคสบริการ</th>
                      <th className="border border-gray-400 p-1">งานหลัก</th>
                      <th className="border border-gray-400 p-1">งานรอง</th>
                      <th className="border border-gray-400 p-1">งานหนุน</th>
                      <th className="border border-gray-400 p-1 bg-emerald-50">TNH แผนก</th>
                      <th className="border border-gray-400 p-1">จริง/ควรมี</th>
                      <th className="border border-gray-400 p-1">Gap</th>
                      <th className="border border-gray-400 p-1">ผลิตภาพ</th>
                      <th className="border border-gray-400 p-1">สถานะ</th>
                      <th className="border border-gray-400 p-1">ผู้ตรวจนับ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedRecords.map((r) => {
                      const c = calculateHospitalOverall(r, standardsConfig);
                      const dKey = selectedDepartmentFilter as DepartmentKey;
                      const d = c.departments[dKey];
                      const census = getDeptCensusSummary(r, dKey);

                      return (
                        <tr key={r.id} className="text-center">
                          <td className="border border-gray-400 p-0.5 font-mono">{r.date}</td>
                          <td className="border border-gray-400 p-0.5 text-left text-[8.5px] text-gray-700 truncate max-w-[150px]">
                            {census}
                          </td>
                          <td className="border border-gray-400 p-0.5 font-mono">{d.directCareHours}</td>
                          <td className="border border-gray-400 p-0.5 font-mono">{d.indirectCareHours}</td>
                          <td className="border border-gray-400 p-0.5 font-mono">{d.supportCareHours}</td>
                          <td className="border border-gray-400 p-0.5 font-mono font-bold bg-emerald-50/40">{d.totalNursingHours}</td>
                          <td className="border border-gray-400 p-0.5 font-mono">{d.totalActualStaff}/{d.totalRequiredStaff}</td>
                          <td className={`border border-gray-400 p-0.5 font-mono font-bold ${d.staffingGap < 0 ? 'text-rose-700' : 'text-emerald-800'}`}>
                            {d.staffingGap >= 0 ? `+${d.staffingGap}` : d.staffingGap}
                          </td>
                          <td className="border border-gray-400 p-0.5 font-mono font-bold text-purple-900">{d.productivityRate}%</td>
                          <td className="border border-gray-400 p-0.5 text-[8.5px]">
                            {d.status === 'balanced' ? '🟢 พอเหมาะ' : d.status === 'understaffed' ? '🔴 ขาดแคลน' : '🟡 เกินเกณฑ์'}
                          </td>
                          <td className="border border-gray-400 p-0.5 text-left truncate max-w-[85px]">{r.recorderName || '-'}</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-gray-100 font-bold text-center border-t-2 border-gray-600">
                      <td colSpan={2} className="border border-gray-400 p-1 text-right pr-2">
                        รวม / เฉลี่ยประจำช่วง ({DEPARTMENT_NAMES[selectedDepartmentFilter as DepartmentKey]})
                      </td>
                      <td className="border border-gray-400 p-1 font-mono">{activeMetrics.totalDirect}</td>
                      <td className="border border-gray-400 p-1 font-mono">{activeMetrics.totalIndirect}</td>
                      <td className="border border-gray-400 p-1 font-mono">{activeMetrics.totalSupport}</td>
                      <td className="border border-gray-400 p-1 font-mono font-bold bg-emerald-100 text-emerald-950">{activeMetrics.totalTNH}</td>
                      <td className="border border-gray-400 p-1 font-mono">{activeMetrics.avgActualStaff}/{activeMetrics.avgRequiredStaff}</td>
                      <td className={`border border-gray-400 p-1 font-mono font-bold ${activeMetrics.avgGap < 0 ? 'text-rose-700' : 'text-emerald-800'}`}>
                        {activeMetrics.avgGap >= 0 ? `+${activeMetrics.avgGap}` : activeMetrics.avgGap}
                      </td>
                      <td className="border border-gray-400 p-1 font-mono font-bold text-purple-900">{activeMetrics.avgProductivity}%</td>
                      <td colSpan={2} className="border border-gray-400 p-1 text-[8.5px]">เฉลี่ยต่อวัน</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>

            {/* Official Signatures */}
            <div className="page-break-inside-avoid pt-6 border-t border-gray-300 text-center text-[10px]">
              {selectedDepartmentFilter !== 'all' ? (
                // 3 Signatures for Specific Department
                <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto">
                  <div className="space-y-6">
                    <div>ลงชื่อ..........................................................</div>
                    <div>
                      <p className="font-semibold">หัวหน้างาน/หัวหน้าตึก</p>
                      <p className="text-gray-600 text-[9px]">{DEPARTMENT_NAMES[selectedDepartmentFilter as DepartmentKey]}</p>
                      <p className="text-gray-400 text-[8px]">วันที่ ....../....../......</p>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div>ลงชื่อ..........................................................</div>
                    <div>
                      <p className="font-semibold">(พว. หวานเพ็ญ   สาลี)</p>
                      <p className="text-gray-600 text-[9px]">หัวหน้ากลุ่มงานการพยาบาล</p>
                      <p className="text-gray-400 text-[8px]">วันที่ ....../....../......</p>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div>ลงชื่อ..........................................................</div>
                    <div>
                      <p className="font-semibold">(นายแพทย์จิรวัฒน์   วงษ์สวัสดิ์)</p>
                      <p className="text-gray-600 text-[9px]">ผู้อำนวยการโรงพยาบาลสังขละบุรี</p>
                      <p className="text-gray-400 text-[8px]">วันที่ ....../....../......</p>
                    </div>
                  </div>
                </div>
              ) : (
                // 2 Signatures for Hospital Overall
                <div className="grid grid-cols-2 gap-8 max-w-lg mx-auto">
                  <div className="space-y-6">
                    <div>ลงชื่อ..........................................................</div>
                    <div>
                      <p className="font-semibold">(พว. หวานเพ็ญ   สาลี)</p>
                      <p className="text-gray-600 text-[9px]">หัวหน้ากลุ่มงานการพยาบาล</p>
                      <p className="text-gray-400 text-[8.5px]">วันที่ ....../....../......</p>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div>ลงชื่อ..........................................................</div>
                    <div>
                      <p className="font-semibold">(นายแพทย์จิรวัฒน์   วงษ์สวัสดิ์)</p>
                      <p className="text-gray-600 text-[9px]">ผู้อำนวยการโรงพยาบาลสังขละบุรี</p>
                      <p className="text-gray-400 text-[8.5px]">วันที่ ....../....../......</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. Screen Interface (Hidden when printing via .no-print)                  */}
      {/* ========================================================================= */}
      <div className="no-print space-y-4">
        
        {/* Top Header Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400">
                <FileSpreadsheet className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>ระบบเทมเพรตรายงานและพิมพ์เอกสาร A4</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold">
                    พอดี A4 100%
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  ปรับสัดส่วนเทมเพรตให้พอดีหน้ากระดาษ A4 มาตรฐาน สำหรับส่งผู้บริหารและสภาการพยาบาล
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons: Print & Excel */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Switcher: A4 Template vs Data Table */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('a4_template')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  viewMode === 'a4_template'
                    ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>มุมมองเทมเพรต A4</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <TableProperties className="w-3.5 h-3.5" />
                <span>ตารางข้อมูลระบบ</span>
              </button>
            </div>

            <button
              onClick={handleExcelExport}
              title="ส่งออกสถิติเป็นไฟล์ Excel (.xlsx)"
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-all"
            >
              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Excel</span>
            </button>

            <button
              onClick={handlePrint}
              title="สั่งพิมพ์เอกสาร A4 หรือบันทึกเป็น PDF"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>สั่งพิมพ์ / ออก PDF A4</span>
            </button>
          </div>
        </div>

        {/* Period Selector Tabs & Date Controls */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            
            {/* Period Type Segmented Controls */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
              <button
                onClick={() => setPeriodType('daily')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  periodType === 'daily'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>รายวัน (Daily A4 พอดี 1 แผ่น)</span>
              </button>

              <button
                onClick={() => setPeriodType('monthly')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  periodType === 'monthly'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>รายเดือน (Monthly)</span>
              </button>

              <button
                onClick={() => setPeriodType('yearly')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  periodType === 'yearly'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <CalendarRange className="w-3.5 h-3.5" />
                <span>รายปี (Yearly)</span>
              </button>
            </div>

            {/* Date Pickers */}
            <div className="flex flex-wrap items-center gap-2">
              {periodType === 'daily' && (
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">เลือกวันเวรตรวจ:</span>
                  <input
                    type="date"
                    value={selectedDailyDate}
                    onChange={(e) => setSelectedDailyDate(e.target.value)}
                    className="text-xs font-bold font-mono bg-transparent text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                  />
                </div>
              )}

              {periodType === 'monthly' && (
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <CalendarDays className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">เลือกเดือน:</span>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="text-xs font-bold font-mono bg-transparent text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                  />
                </div>
              )}

              {periodType === 'yearly' && (
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <CalendarRange className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">เลือกปี:</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="text-xs font-bold font-mono bg-transparent text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                  >
                    {[2024, 2025, 2026, 2027].map((y) => (
                      <option key={y} value={String(y)} className="dark:bg-slate-900">
                        พ.ศ. {y + 543} (ค.ศ. {y})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Department Filter for Head of Dept / Director */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-500">ฝ่ายงาน:</span>
                <select
                  value={selectedDepartmentFilter}
                  onChange={(e) => setSelectedDepartmentFilter(e.target.value)}
                  className="bg-transparent font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
                >
                  <option value="all" className="dark:bg-slate-900">รวมทุกฝ่ายงาน (5 แผนก)</option>
                  <option value="ER" className="dark:bg-slate-900">ห้องฉุกเฉิน (ER)</option>
                  <option value="OPD" className="dark:bg-slate-900">ผู้ป่วยนอก (OPD)</option>
                  <option value="IPD1" className="dark:bg-slate-900">ผู้ป่วยใน 1 (IPD 1)</option>
                  <option value="IPD2" className="dark:bg-slate-900">ผู้ป่วยใน 2 (IPD 2)</option>
                  <option value="LR" className="dark:bg-slate-900">ห้องคลอด (LR)</option>
                </select>
              </div>
            </div>

            {/* Quick Department Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mr-1">แยกดูรายแผนก:</span>
              {[
                { id: 'all', label: '🏥 รวมทุกฝ่ายงาน (5 แผนก)' },
                { id: 'ER', label: '🚨 ER ห้องฉุกเฉิน' },
                { id: 'OPD', label: '🩺 OPD ผู้ป่วยนอก' },
                { id: 'IPD1', label: '🛏️ IPD 1 ชาย/สามัญ' },
                { id: 'IPD2', label: '🛏️ IPD 2 หญิง/เด็ก' },
                { id: 'LR', label: '👶 LR ห้องคลอด' },
              ].map((dept) => {
                const isSelected = selectedDepartmentFilter === dept.id;
                return (
                  <button
                    key={dept.id}
                    onClick={() => setSelectedDepartmentFilter(dept.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {dept.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Notice & A4 Scale Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800 dark:text-slate-200">{periodTitle}</span>
              {isDeptHead && (
                <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium text-[11px]">
                  สิทธิ: {DEPARTMENT_LABELS[userDept as keyof typeof DEPARTMENT_LABELS]?.short || userDept}
                </span>
              )}
            </div>

            {viewMode === 'a4_template' && (
              <div className="flex items-center gap-2">
                <span className="text-[11px]">ขนาดแสดงผลเทมเพรตบนหน้าจอ:</span>
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                  <button
                    onClick={() => setPreviewScale(85)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium ${previewScale === 85 ? 'bg-white dark:bg-slate-700 shadow-xs text-emerald-600' : ''}`}
                  >
                    85%
                  </button>
                  <button
                    onClick={() => setPreviewScale(100)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium ${previewScale === 100 ? 'bg-white dark:bg-slate-700 shadow-xs text-emerald-600' : ''}`}
                  >
                    100% (พอดี A4)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ===================================================================== */}
        {/* VIEW MODE 1: A4 TEMPLATE PREVIEW ON SCREEN                           */}
        {/* ===================================================================== */}
        {viewMode === 'a4_template' && (
          <div className="space-y-3">
            {/* Instruction banner for perfect A4 printing */}
            <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-3 flex items-center justify-between gap-3 text-xs text-emerald-800 dark:text-emerald-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  <strong>การจัดหน้าเทมเพรต A4:</strong> จัดรูปเล่มพอดีกระดาษ A4 หน้าเดียว (ไม่ล้นหน้า ไม่ตกขอบ) พร้อมช่องลงนาม 3 ฝ่าย กดปุ่ม &quot;สั่งพิมพ์ / ออก PDF A4&quot; หรือ Ctrl+P / Cmd+P ได้ทันที
                </span>
              </div>
              <button
                onClick={handlePrint}
                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs"
              >
                พิมพ์ทันที
              </button>
            </div>

            {/* A4 Paper Canvas on Screen */}
            <div className="flex justify-center p-2 sm:p-6 bg-slate-200/70 dark:bg-slate-950 rounded-2xl border border-slate-300 dark:border-slate-800 overflow-x-auto">
              <div
                style={{
                  width: '210mm',
                  minHeight: '297mm',
                  transform: previewScale !== 100 ? `scale(${previewScale / 100})` : undefined,
                  transformOrigin: 'top center',
                }}
                className="bg-white text-slate-900 shadow-2xl rounded-xs p-[10mm] transition-transform box-border"
              >
                {periodType === 'daily' && dailyRecord && dailyCalc ? (
                  // Screen Daily Template
                  <div className="space-y-3 text-[11px] leading-tight select-none">
                    {/* Header */}
                    <div className="border-b-2 border-emerald-900 pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <HospitalLogo size={48} />
                          <div>
                            <h1 className="text-[15px] font-bold tracking-tight text-slate-900 font-serif">
                              โรงพยาบาลสังขละบุรี จังหวัดกาญจนบุรี
                            </h1>
                            <p className="text-[11.5px] font-bold text-emerald-950">
                              Sangkhlaburi Hospital Smart Workload & Workforce Assessment System
                            </p>
                            <p className="text-[10px] text-slate-600">
                              กลุ่มงานการพยาบาล • การประเมินค่างาน 3 ส่วน (งานหลัก • งานรอง • งานสนับสนุน) ตามมาตรฐานสภาการพยาบาล
                            </p>
                          </div>
                        </div>
                        <div className="text-right border-l-2 border-emerald-800/40 pl-3">
                          <span className="inline-block px-2.5 py-0.5 bg-emerald-100 text-emerald-900 font-bold text-[10px] rounded">
                            แบบรายงานประจำวัน
                          </span>
                          <div className="text-[10.5px] text-slate-800 font-mono font-bold mt-1">
                            {new Date(dailyRecord.date).toLocaleDateString('th-TH', { dateStyle: 'long' })}
                          </div>
                          <div className="text-[9.5px] text-slate-500">
                            ผู้บันทึก: {dailyRecord.recorderName || 'พยาบาลตรวจการเวร'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Overall Summary KPI Box */}
                    <div className="grid grid-cols-5 gap-2 p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-center">
                      <div className="border-r border-slate-200 pr-1">
                        <span className="text-[10px] text-slate-500 block">ค่างานรวม (TNH)</span>
                        <span className="text-[15px] font-extrabold text-emerald-800 font-mono">
                          {dailyCalc.totalNursingHours}
                        </span>
                        <span className="text-[9.5px] text-slate-500 ml-0.5">ชม.</span>
                      </div>
                      <div className="border-r border-slate-200 pr-1">
                        <span className="text-[10px] text-slate-500 block">งานหลัก / รอง / หนุน</span>
                        <span className="text-[11px] font-bold text-slate-800">
                          {dailyCalc.totalDirectCareHours} / {dailyCalc.totalIndirectCareHours} / {dailyCalc.totalSupportCareHours}
                        </span>
                        <span className="text-[9px] text-slate-500 block">ชั่วโมงภาระงาน</span>
                      </div>
                      <div className="border-r border-slate-200 pr-1">
                        <span className="text-[10px] text-slate-500 block">พยาบาล (จริง / ควรมี)</span>
                        <span className="text-[13px] font-bold text-blue-700 font-mono">
                          {dailyCalc.totalActualStaff}
                        </span>
                        <span className="text-slate-400"> / </span>
                        <span className="text-[13px] font-bold text-slate-800 font-mono">
                          {dailyCalc.totalRequiredStaff}
                        </span>
                        <span className="text-[9.5px] text-slate-500 ml-0.5">คน</span>
                      </div>
                      <div className="border-r border-slate-200 pr-1">
                        <span className="text-[10px] text-slate-500 block">ส่วนต่าง (Gap)</span>
                        <span className={`text-[13px] font-bold font-mono ${dailyCalc.overallGap < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {dailyCalc.overallGap >= 0 ? `+${dailyCalc.overallGap}` : dailyCalc.overallGap} คน
                        </span>
                        <span className="text-[9px] text-slate-500 block">
                          FTE: {dailyCalc.totalRequiredFTE}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">อัตราผลิตภาพ</span>
                        <span className="text-[15px] font-extrabold text-purple-800 font-mono">
                          {dailyCalc.averageProductivityRate}%
                        </span>
                        <span className="text-[9px] text-slate-500 block">
                          {dailyCalc.overallStatus === 'balanced' ? '🟢 พอเหมาะ' : dailyCalc.overallStatus === 'understaffed' ? '🔴 ขาดแคลน' : '🟡 เกินเกณฑ์'}
                        </span>
                      </div>
                    </div>

                    {/* Department Breakdown Table */}
                    <div>
                      <div className="text-[11px] font-bold text-slate-900 mb-1 flex items-center justify-between">
                        <span>ตารางจำแนกค่างานและอัตรากำลัง 5 ฝ่ายงาน</span>
                        <span className="text-[9.5px] text-slate-500 font-normal">เป้าหมายผลิตภาพ: 85 - 115%</span>
                      </div>
                      <table className="w-full border-collapse border border-slate-400 text-[10px]">
                        <thead>
                          <tr className="bg-slate-100 font-bold text-center">
                            <th className="border border-slate-400 p-1.5 text-left w-[24%]">ฝ่ายงาน / แผนกบริการ</th>
                            <th className="border border-slate-400 p-1.5 text-left w-[28%]">ปริมาณผู้รับบริการ / ครองเตียง</th>
                            <th className="border border-slate-400 p-1.5 w-[8%]">งานหลัก</th>
                            <th className="border border-slate-400 p-1.5 w-[8%]">งานรอง</th>
                            <th className="border border-slate-400 p-1.5 w-[8%]">งานหนุน</th>
                            <th className="border border-slate-400 p-1.5 w-[9%] bg-emerald-50">TNH รวม</th>
                            <th className="border border-slate-400 p-1.5 w-[8%]">จริง/ควรมี</th>
                            <th className="border border-slate-400 p-1.5 w-[7%]">Gap</th>
                            <th className="border border-slate-400 p-1.5 w-[7%]">ผลิตภาพ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {departmentsData.map((d) => (
                            <tr key={d.key} className="text-center hover:bg-slate-50">
                              <td className="border border-slate-400 p-1.5 text-left font-semibold text-slate-900">
                                {d.name}
                              </td>
                              <td className="border border-slate-400 p-1.5 text-left text-[9.5px] text-slate-700">
                                {d.patientCensus}
                              </td>
                              <td className="border border-slate-400 p-1.5 font-mono">{d.calc.directCareHours}</td>
                              <td className="border border-slate-400 p-1.5 font-mono">{d.calc.indirectCareHours}</td>
                              <td className="border border-slate-400 p-1.5 font-mono">{d.calc.supportWorkHours}</td>
                              <td className="border border-slate-400 p-1.5 font-mono font-bold bg-emerald-50/50">
                                {d.calc.totalNursingHours}
                              </td>
                              <td className="border border-slate-400 p-1.5 font-mono">
                                {d.calc.totalActualStaff}/{d.calc.totalRequiredStaff}
                              </td>
                              <td className={`border border-slate-400 p-1.5 font-mono font-bold ${d.calc.gap < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                                {d.calc.gap >= 0 ? `+${d.calc.gap}` : d.calc.gap}
                              </td>
                              <td className="border border-slate-400 p-1.5 font-mono font-semibold">
                                {d.calc.productivityRate}%
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-slate-100 font-bold text-center border-t-2 border-slate-600">
                            <td colSpan={2} className="border border-slate-400 p-1.5 text-right pr-2">
                              รวมทั้งโรงพยาบาล (Total Hospital)
                            </td>
                            <td className="border border-slate-400 p-1.5 font-mono">{dailyCalc.totalDirectCareHours}</td>
                            <td className="border border-slate-400 p-1.5 font-mono">{dailyCalc.totalIndirectCareHours}</td>
                            <td className="border border-slate-400 p-1.5 font-mono">{dailyCalc.totalSupportCareHours}</td>
                            <td className="border border-slate-400 p-1.5 font-mono font-bold bg-emerald-100 text-emerald-950">
                              {dailyCalc.totalNursingHours}
                            </td>
                            <td className="border border-slate-400 p-1.5 font-mono">
                              {dailyCalc.totalActualStaff}/{dailyCalc.totalRequiredStaff}
                            </td>
                            <td className={`border border-slate-400 p-1.5 font-mono font-bold ${dailyCalc.overallGap < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                              {dailyCalc.overallGap >= 0 ? `+${dailyCalc.overallGap}` : dailyCalc.overallGap}
                            </td>
                            <td className="border border-slate-400 p-1.5 font-mono font-bold text-purple-900">
                              {dailyCalc.averageProductivityRate}%
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Shift & Support Work Highlights */}
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="border border-slate-300 p-2 rounded-lg bg-slate-50">
                        <div className="font-bold text-slate-800 mb-1">การจัดเวรพยาบาลประจำวัน (Shift Staffing):</div>
                        <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[9.5px]">
                          <div className="bg-white p-1 border border-slate-200 rounded">เวรเช้า: {dailyShiftStaff.morning} คน</div>
                          <div className="bg-white p-1 border border-slate-200 rounded">เวรบ่าย: {dailyShiftStaff.afternoon} คน</div>
                          <div className="bg-white p-1 border border-slate-200 rounded">เวรดึก: {dailyShiftStaff.night} คน</div>
                        </div>
                      </div>

                      <div className="border border-slate-300 p-2 rounded-lg bg-slate-50">
                        <div className="font-bold text-slate-800 mb-1">กิจกรรมงานรองและงานสนับสนุนสำคัญ:</div>
                        <div className="text-slate-700 line-clamp-2">
                          งานรอง: {dailyTasksSummary.sampleIndirect || 'บันทึกชาร์จ, เตรียมยา, ส่งเวร'}<br />
                          งานหนุน: {dailyTasksSummary.sampleSupport || 'ตรวจเครื่องมือแพทย์, IC, บริหารวอร์ด'}
                        </div>
                      </div>
                    </div>

                    {/* Signature Block */}
                    <div className="pt-6 border-t border-slate-300 text-center text-[10.5px]">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-7">
                          <div>ลงชื่อ..........................................................</div>
                          <div>
                            <p className="font-semibold">({dailyRecord.recorderName || 'พยาบาลตรวจการเวร'})</p>
                            <p className="text-slate-600 text-[9.5px]">พยาบาลตรวจการเวรผู้จัดทำ</p>
                            <p className="text-slate-400 text-[9px]">วันที่ ....../....../......</p>
                          </div>
                        </div>

                        <div className="space-y-7">
                          <div>ลงชื่อ..........................................................</div>
                          <div>
                            <p className="font-semibold">(พว. หวานเพ็ญ   สาลี)</p>
                            <p className="text-slate-600 text-[9.5px]">หัวหน้ากลุ่มงานการพยาบาล</p>
                            <p className="text-slate-400 text-[9px]">วันที่ ....../....../......</p>
                          </div>
                        </div>

                        <div className="space-y-7">
                          <div>ลงชื่อ..........................................................</div>
                          <div>
                            <p className="font-semibold">(นายแพทย์จิรวัฒน์   วงษ์สวัสดิ์)</p>
                            <p className="text-slate-600 text-[9.5px]">ผู้อำนวยการโรงพยาบาลสังขละบุรี</p>
                            <p className="text-slate-400 text-[9px]">วันที่ ....../....../......</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Screen Period Summary Template
                  <div className="space-y-3 text-[10.5px] leading-tight select-none">
                    <div className="border-b-2 border-emerald-900 pb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <HospitalLogo size={42} />
                        <div>
                          <h1 className="text-[14px] font-bold text-slate-900 font-serif">โรงพยาบาลสังขละบุรี จังหวัดกาญจนบุรี</h1>
                          <h2 className="text-[11px] font-bold text-emerald-950">
                            {selectedDepartmentFilter !== 'all'
                              ? `สรุปรายงานสถิติค่างานและอัตรากำลัง: ${DEPARTMENT_NAMES[selectedDepartmentFilter as DepartmentKey]} (${periodTitle})`
                              : `สรุปรายงานสถิติค่างานและอัตรากำลังทางการพยาบาล (${periodTitle})`}
                          </h2>
                          <p className="text-[9.5px] text-slate-600">
                            กลุ่มงานการพยาบาล • การประเมินค่างาน 3 ส่วน (งานหลัก • งานรอง • งานสนับสนุน) ตามมาตรฐานสภาการพยาบาล
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-[9.5px] text-slate-500">
                        <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-900 font-bold text-[9.5px] rounded mb-1">
                          {selectedDepartmentFilter !== 'all' ? `แบบรายงาน ${DEPARTMENT_NAMES[selectedDepartmentFilter as DepartmentKey]}` : 'แบบรายงานรวมทุกฝ่ายงาน'}
                        </span>
                        <div>{periodTitle}</div>
                        <div>ออกรายงานเมื่อ {new Date().toLocaleDateString('th-TH')}</div>
                      </div>
                    </div>

                    {/* Aggregate stats */}
                    <div className="grid grid-cols-4 gap-2 border border-slate-300 p-2.5 rounded-lg text-center bg-slate-50">
                      <div>
                        <span className="text-slate-500 block text-[9.5px]">จำนวนวันบันทึก</span>
                        <span className="font-bold text-[13px]">{activeMetrics.totalDays} วัน</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9.5px]">ค่างานรวม (TNH)</span>
                        <span className="font-bold text-[13px] text-emerald-700">{activeMetrics.totalTNH} ชม.</span>
                        <span className="text-[9px] text-slate-500 block">
                          หลัก {activeMetrics.totalDirect} / รอง {activeMetrics.totalIndirect} / หนุน {activeMetrics.totalSupport}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9.5px]">พยาบาลเฉลี่ย (จริง/ควรมี)</span>
                        <span className="font-bold text-[13px] text-blue-700">{activeMetrics.avgActualStaff}</span>
                        <span className="text-slate-400"> / </span>
                        <span className="font-bold text-[13px] text-slate-800">{activeMetrics.avgRequiredStaff} คน</span>
                        <span className={`text-[9px] block font-bold ${activeMetrics.avgGap < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                          Gap เฉลี่ย: {activeMetrics.avgGap >= 0 ? `+${activeMetrics.avgGap}` : activeMetrics.avgGap} คน
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9.5px]">ผลิตภาพเฉลี่ยรวม</span>
                        <span className="font-bold text-[13px] text-purple-700">{activeMetrics.avgProductivity}%</span>
                        <span className="text-[9px] text-slate-500 block">
                          วันขาดแคลน: {activeMetrics.understaffedDays} วัน
                        </span>
                      </div>
                    </div>

                    {selectedDepartmentFilter === 'all' ? (
                      // Section 1: 5-Department Comparison Table
                      <div className="space-y-3">
                        <div>
                          <div className="text-[10.5px] font-bold text-slate-900 mb-1 flex items-center justify-between">
                            <span>1. ตารางสรุปเปรียบเทียบภาระงาน 5 ฝ่ายงาน ประจำช่วง ({periodTitle})</span>
                            <span className="text-[9px] text-slate-500">เป้าหมายผลิตภาพ: 85 - 115%</span>
                          </div>
                          <table className="w-full border-collapse border border-slate-400 text-[9px]">
                            <thead>
                              <tr className="bg-slate-100 font-bold text-center">
                                <th className="border border-slate-400 p-1 text-left w-[24%]">ฝ่ายงาน / แผนกบริการ</th>
                                <th className="border border-slate-400 p-1 w-[12%] bg-emerald-50">TNH รวม (ชม.)</th>
                                <th className="border border-slate-400 p-1 w-[9%]">สัดส่วนภาระ</th>
                                <th className="border border-slate-400 p-1 w-[9%]">งานหลัก</th>
                                <th className="border border-slate-400 p-1 w-[9%]">งานรอง</th>
                                <th className="border border-slate-400 p-1 w-[9%]">งานหนุน</th>
                                <th className="border border-slate-400 p-1 w-[10%]">เฉลี่ยจริง/ควรมี</th>
                                <th className="border border-slate-400 p-1 w-[8%]">Gap เฉลี่ย</th>
                                <th className="border border-slate-400 p-1 w-[8%]">ผลิตภาพ</th>
                                <th className="border border-slate-400 p-1 w-[8%]">วันขาดแคลน</th>
                              </tr>
                            </thead>
                            <tbody>
                              {departmentSummariesList.map((dept) => (
                                <tr key={dept.key} className="text-center hover:bg-slate-50">
                                  <td className="border border-slate-400 p-1 text-left font-semibold text-slate-900">
                                    {dept.name}
                                  </td>
                                  <td className="border border-slate-400 p-1 font-mono font-bold bg-emerald-50/50">
                                    {dept.totalTNH}
                                  </td>
                                  <td className="border border-slate-400 p-1 font-mono font-semibold text-slate-700">
                                    {dept.tnhSharePercent}%
                                  </td>
                                  <td className="border border-slate-400 p-1 font-mono">{dept.totalDirect}</td>
                                  <td className="border border-slate-400 p-1 font-mono">{dept.totalIndirect}</td>
                                  <td className="border border-slate-400 p-1 font-mono">{dept.totalSupport}</td>
                                  <td className="border border-slate-400 p-1 font-mono">
                                    {dept.avgActualStaff}/{dept.avgRequiredStaff}
                                  </td>
                                  <td className={`border border-slate-400 p-1 font-mono font-bold ${dept.avgGap < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                                    {dept.avgGap >= 0 ? `+${dept.avgGap}` : dept.avgGap}
                                  </td>
                                  <td className="border border-slate-400 p-1 font-mono font-semibold">
                                    {dept.avgProductivity}%
                                  </td>
                                  <td className="border border-slate-400 p-1 font-mono">
                                    {dept.understaffedDays} วัน
                                  </td>
                                </tr>
                              ))}
                              <tr className="bg-slate-100 font-bold text-center border-t-2 border-slate-600">
                                <td className="border border-slate-400 p-1 text-right pr-2 font-bold">รวมทั้งโรงพยาบาล</td>
                                <td className="border border-slate-400 p-1 font-mono font-bold bg-emerald-100 text-emerald-950">
                                  {aggregateMetrics.totalTNH}
                                </td>
                                <td className="border border-slate-400 p-1 font-mono font-bold">100.0%</td>
                                <td className="border border-slate-400 p-1 font-mono font-bold">{aggregateMetrics.totalDirect}</td>
                                <td className="border border-slate-400 p-1 font-mono font-bold">{aggregateMetrics.totalIndirect}</td>
                                <td className="border border-slate-400 p-1 font-mono font-bold">{aggregateMetrics.totalSupport}</td>
                                <td className="border border-slate-400 p-1 font-mono font-bold">
                                  {aggregateMetrics.avgActualStaff}/{aggregateMetrics.avgRequiredStaff}
                                </td>
                                <td className={`border border-slate-400 p-1 font-mono font-bold ${aggregateMetrics.avgGap < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                                  {aggregateMetrics.avgGap >= 0 ? `+${aggregateMetrics.avgGap}` : aggregateMetrics.avgGap}
                                </td>
                                <td className="border border-slate-400 p-1 font-mono font-bold text-purple-900">
                                  {aggregateMetrics.avgProductivity}%
                                </td>
                                <td className="border border-slate-400 p-1 font-mono font-bold text-rose-600">
                                  {aggregateMetrics.understaffedDays} วัน
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <div>
                          <div className="text-[10.5px] font-bold text-slate-900 mb-1 flex items-center justify-between">
                            <span>2. ตารางสถิติแนวโน้มรายวันรวมทั้งโรงพยาบาล</span>
                            <span className="text-[9px] text-slate-500">จำนวนบันทึก: {displayedRecords.length} วัน</span>
                          </div>
                          <table className="w-full border-collapse border border-slate-400 text-[9px]">
                            <thead>
                              <tr className="bg-slate-100 font-bold text-center">
                                <th className="border border-slate-400 p-1">วันที่</th>
                                <th className="border border-slate-400 p-1">งานหลัก</th>
                                <th className="border border-slate-400 p-1">งานรอง</th>
                                <th className="border border-slate-400 p-1">งานหนุน</th>
                                <th className="border border-slate-400 p-1 bg-emerald-50">TNH รวม</th>
                                <th className="border border-slate-400 p-1">จริง/ควรมี</th>
                                <th className="border border-slate-400 p-1">Gap</th>
                                <th className="border border-slate-400 p-1">ผลิตภาพ</th>
                                <th className="border border-slate-400 p-1">สถานะ</th>
                                <th className="border border-slate-400 p-1">ผู้ตรวจนับ</th>
                              </tr>
                            </thead>
                            <tbody>
                              {displayedRecords.map((r) => {
                                const c = calculateHospitalOverall(r, standardsConfig);
                                return (
                                  <tr key={r.id} className="text-center hover:bg-slate-50">
                                    <td className="border border-slate-400 p-1 font-mono">{r.date}</td>
                                    <td className="border border-slate-400 p-1 font-mono">{c.totalDirectCareHours}</td>
                                    <td className="border border-slate-400 p-1 font-mono">{c.totalIndirectCareHours}</td>
                                    <td className="border border-slate-400 p-1 font-mono">{c.totalSupportCareHours}</td>
                                    <td className="border border-slate-400 p-1 font-mono font-bold bg-emerald-50/50">{c.totalNursingHours}</td>
                                    <td className="border border-slate-400 p-1 font-mono">{c.totalActualStaff}/{c.totalRequiredStaff}</td>
                                    <td className="border border-slate-400 p-1 font-mono font-bold">{c.overallGap >= 0 ? `+${c.overallGap}` : c.overallGap}</td>
                                    <td className="border border-slate-400 p-1 font-mono">{c.averageProductivityRate}%</td>
                                    <td className="border border-slate-400 p-1 text-[9px]">
                                      {c.overallStatus === 'balanced' ? 'พอเหมาะ' : c.overallStatus === 'understaffed' ? 'ขาดแคลน' : 'เกินเกณฑ์'}
                                    </td>
                                    <td className="border border-slate-400 p-1 text-left truncate max-w-[90px]">{r.recorderName || '-'}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      // Section for Specific Department Daily Breakdown
                      <div>
                        <div className="text-[10.5px] font-bold text-slate-900 mb-1 flex items-center justify-between">
                          <span>ตารางสถิติค่างานรายวัน แผนก{DEPARTMENT_NAMES[selectedDepartmentFilter as DepartmentKey]}</span>
                          <span className="text-[9px] text-slate-500">จำนวนบันทึก: {displayedRecords.length} วัน</span>
                        </div>
                        <table className="w-full border-collapse border border-slate-400 text-[9px]">
                          <thead>
                            <tr className="bg-slate-100 font-bold text-center">
                              <th className="border border-slate-400 p-1 w-[12%]">วันที่</th>
                              <th className="border border-slate-400 p-1 text-left w-[26%]">ปริมาณผู้รับบริการ / ครองเตียง</th>
                              <th className="border border-slate-400 p-1 w-[9%]">งานหลัก</th>
                              <th className="border border-slate-400 p-1 w-[9%]">งานรอง</th>
                              <th className="border border-slate-400 p-1 w-[9%]">งานหนุน</th>
                              <th className="border border-slate-400 p-1 w-[10%] bg-emerald-50">TNH รวม</th>
                              <th className="border border-slate-400 p-1 w-[9%]">จริง/ควรมี</th>
                              <th className="border border-slate-400 p-1 w-[7%]">Gap</th>
                              <th className="border border-slate-400 p-1 w-[8%]">ผลิตภาพ</th>
                              <th className="border border-slate-400 p-1 w-[9%]">ผู้ตรวจนับ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {displayedRecords.map((r) => {
                              const overall = calculateHospitalOverall(r, standardsConfig);
                              const deptCalc = overall.departments[selectedDepartmentFilter as DepartmentKey];
                              const censusText = getDeptCensusSummary(r, selectedDepartmentFilter as DepartmentKey);
                              return (
                                <tr key={r.id} className="text-center hover:bg-slate-50">
                                  <td className="border border-slate-400 p-1 font-mono font-medium">{r.date}</td>
                                  <td className="border border-slate-400 p-1 text-left text-[8.5px] text-slate-700">{censusText}</td>
                                  <td className="border border-slate-400 p-1 font-mono">{deptCalc.directCareHours}</td>
                                  <td className="border border-slate-400 p-1 font-mono">{deptCalc.indirectCareHours}</td>
                                  <td className="border border-slate-400 p-1 font-mono">{deptCalc.supportCareHours}</td>
                                  <td className="border border-slate-400 p-1 font-mono font-bold bg-emerald-50/50">{deptCalc.totalNursingHours}</td>
                                  <td className="border border-slate-400 p-1 font-mono">{deptCalc.totalActualStaff}/{deptCalc.totalRequiredStaff}</td>
                                  <td className={`border border-slate-400 p-1 font-mono font-bold ${deptCalc.staffingGap < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                                    {deptCalc.staffingGap >= 0 ? `+${deptCalc.staffingGap}` : deptCalc.staffingGap}
                                  </td>
                                  <td className="border border-slate-400 p-1 font-mono">{deptCalc.productivityRate}%</td>
                                  <td className="border border-slate-400 p-1 text-left truncate max-w-[85px]">{r.recorderName || '-'}</td>
                                </tr>
                              );
                            })}
                            <tr className="bg-slate-100 font-bold text-center border-t-2 border-slate-600">
                              <td colSpan={2} className="border border-slate-400 p-1 text-right pr-2">
                                รวม / เฉลี่ยประจำช่วง ({DEPARTMENT_NAMES[selectedDepartmentFilter as DepartmentKey]})
                              </td>
                              <td className="border border-slate-400 p-1 font-mono">{activeMetrics.totalDirect}</td>
                              <td className="border border-slate-400 p-1 font-mono">{activeMetrics.totalIndirect}</td>
                              <td className="border border-slate-400 p-1 font-mono">{activeMetrics.totalSupport}</td>
                              <td className="border border-slate-400 p-1 font-mono font-bold bg-emerald-100 text-emerald-950">{activeMetrics.totalTNH}</td>
                              <td className="border border-slate-400 p-1 font-mono">{activeMetrics.avgActualStaff}/{activeMetrics.avgRequiredStaff}</td>
                              <td className={`border border-slate-400 p-1 font-mono font-bold ${activeMetrics.avgGap < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                                {activeMetrics.avgGap >= 0 ? `+${activeMetrics.avgGap}` : activeMetrics.avgGap}
                              </td>
                              <td className="border border-slate-400 p-1 font-mono font-bold text-purple-900">{activeMetrics.avgProductivity}%</td>
                              <td className="border border-slate-400 p-1 text-[8.5px] text-slate-500">เฉลี่ยต่อวัน</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Signatures */}
                    <div className="pt-6 border-t border-slate-300 text-center text-[10px]">
                      {selectedDepartmentFilter !== 'all' ? (
                        // 3 Signatures for Specific Department
                        <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto">
                          <div className="space-y-6">
                            <div>ลงชื่อ..........................................................</div>
                            <div>
                              <p className="font-semibold">หัวหน้างาน/หัวหน้าตึก</p>
                              <p className="text-slate-600 text-[9px]">{DEPARTMENT_NAMES[selectedDepartmentFilter as DepartmentKey]}</p>
                              <p className="text-slate-400 text-[8px]">วันที่ ....../....../......</p>
                            </div>
                          </div>
                          <div className="space-y-6">
                            <div>ลงชื่อ..........................................................</div>
                            <div>
                              <p className="font-semibold">(พว. หวานเพ็ญ   สาลี)</p>
                              <p className="text-slate-600 text-[9px]">หัวหน้ากลุ่มงานการพยาบาล</p>
                              <p className="text-slate-400 text-[8px]">วันที่ ....../....../......</p>
                            </div>
                          </div>
                          <div className="space-y-6">
                            <div>ลงชื่อ..........................................................</div>
                            <div>
                              <p className="font-semibold">(นายแพทย์จิรวัฒน์   วงษ์สวัสดิ์)</p>
                              <p className="text-slate-600 text-[9px]">ผู้อำนวยการโรงพยาบาลสังขละบุรี</p>
                              <p className="text-slate-400 text-[8px]">วันที่ ....../....../......</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        // 2 Signatures for Hospital Overall
                        <div className="grid grid-cols-2 gap-8 max-w-lg mx-auto">
                          <div className="space-y-6">
                            <div>ลงชื่อ..........................................................</div>
                            <div>
                              <p className="font-semibold">(พว. หวานเพ็ญ   สาลี)</p>
                              <p className="text-slate-600 text-[9.5px]">หัวหน้ากลุ่มงานการพยาบาล</p>
                              <p className="text-slate-400 text-[8.5px]">วันที่ ....../....../......</p>
                            </div>
                          </div>
                          <div className="space-y-6">
                            <div>ลงชื่อ..........................................................</div>
                            <div>
                              <p className="font-semibold">(นายแพทย์จิรวัฒน์   วงษ์สวัสดิ์)</p>
                              <p className="text-slate-600 text-[9.5px]">ผู้อำนวยการโรงพยาบาลสังขละบุรี</p>
                              <p className="text-slate-400 text-[8.5px]">วันที่ ....../....../......</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* VIEW MODE 2: INTERACTIVE DATA TABLE VIEW                              */}
        {/* ===================================================================== */}
        {viewMode === 'table' && (
          <div className="space-y-3.5">
            {/* Aggregate Analytics KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <div className="text-[11px] text-slate-500">
                  ค่างานรวม (TNH) {selectedDepartmentFilter !== 'all' ? `(${DEPARTMENT_NAMES[selectedDepartmentFilter as DepartmentKey]})` : 'รวม 5 แผนก'}
                </div>
                <div className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                  {activeMetrics.totalTNH} <span className="text-xs font-normal">ชม.</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  หลัก: {activeMetrics.totalDirect} • รอง: {activeMetrics.totalIndirect} • หนุน: {activeMetrics.totalSupport}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <div className="text-[11px] text-slate-500">
                  พยาบาลเฉลี่ย (จริง/ควรมี) {selectedDepartmentFilter !== 'all' ? `(${DEPARTMENT_NAMES[selectedDepartmentFilter as DepartmentKey]})` : ''}
                </div>
                <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white mt-1">
                  <span className="text-blue-600 dark:text-blue-400">{activeMetrics.avgActualStaff}</span>
                  <span className="text-slate-400 font-light"> / </span>
                  {activeMetrics.avgRequiredStaff}
                  <span className="text-xs font-normal text-slate-400"> คน/วัน</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Gap เฉลี่ย:{' '}
                  <span className={activeMetrics.avgGap < 0 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                    {activeMetrics.avgGap >= 0 ? `+${activeMetrics.avgGap}` : activeMetrics.avgGap} คน
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <div className="text-[11px] text-slate-500">อัตราผลิตภาพเฉลี่ย</div>
                <div className="text-2xl font-extrabold font-mono text-purple-600 dark:text-purple-400 mt-1">
                  {activeMetrics.avgProductivity}%
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  เป้าหมายสภาฯ: 85 - 115%
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <div className="text-[11px] text-slate-500">วันที่กำลังคนขาด/งานล้น</div>
                <div className="text-2xl font-extrabold font-mono text-rose-600 dark:text-rose-400 mt-1">
                  {activeMetrics.understaffedDays} <span className="text-xs font-normal">วัน</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  จากทั้งหมด {activeMetrics.totalDays} วันที่บันทึก
                </div>
              </div>
            </div>

            {/* 5-Department Overview Summary when 'all' is selected */}
            {selectedDepartmentFilter === 'all' && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
                <div className="text-xs font-bold text-slate-900 dark:text-white mb-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>สรุปเปรียบเทียบภาระงานและอัตรากำลัง 5 ฝ่ายงาน ({periodTitle})</span>
                  </div>
                  <span className="text-[11px] text-slate-400">คลิกที่ฝ่ายงานเพื่อดูรายงานเจาะลึกเฉพาะแผนก</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                  {departmentSummariesList.map((dept) => (
                    <button
                      key={dept.key}
                      onClick={() => setSelectedDepartmentFilter(dept.key)}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all cursor-pointer text-left group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                          {dept.name}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                          {dept.tnhSharePercent}%
                        </span>
                      </div>
                      <div className="mt-2 text-lg font-extrabold font-mono text-emerald-700 dark:text-emerald-400">
                        {dept.totalTNH} <span className="text-[10px] font-normal text-slate-500">ชม.</span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                        เฉลี่ย: <span className="font-semibold text-blue-600 dark:text-blue-400">{dept.avgActualStaff}</span>/{dept.avgRequiredStaff} คน
                      </div>
                      <div className="mt-0.5 flex items-center justify-between text-[10px]">
                        <span className={dept.avgGap < 0 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                          Gap: {dept.avgGap >= 0 ? `+${dept.avgGap}` : dept.avgGap}
                        </span>
                        <span className="font-semibold text-purple-600 dark:text-purple-400">
                          {dept.avgProductivity}%
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search & Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาวันที่, ผู้ตรวจนับ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-1 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    statusFilter === 'all'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  ทั้งหมด ({periodFilteredRecords.length})
                </button>
                <button
                  onClick={() => setStatusFilter('understaffed')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    statusFilter === 'understaffed'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  🔴 ขาดแคลน
                </button>
                <button
                  onClick={() => setStatusFilter('balanced')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    statusFilter === 'balanced'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  🟢 พอเหมาะ
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold">
                    <tr>
                      <th className="py-3 px-3">วันที่</th>
                      {selectedDepartmentFilter !== 'all' && (
                        <th className="py-3 px-2 text-left">ปริมาณผู้รับบริการ / ครองเตียง ({DEPARTMENT_NAMES[selectedDepartmentFilter as DepartmentKey]})</th>
                      )}
                      <th className="py-3 px-2 text-right">งานหลัก</th>
                      <th className="py-3 px-2 text-right">งานรอง</th>
                      <th className="py-3 px-2 text-right">งานหนุน</th>
                      <th className="py-3 px-2.5 text-right">TNH รวม</th>
                      <th className="py-3 px-2 text-center">จริง / ควรมี</th>
                      <th className="py-3 px-2 text-center">ส่วนต่าง (Gap)</th>
                      <th className="py-3 px-2 text-center">ผลิตภาพ</th>
                      <th className="py-3 px-2 text-center">สถานะ</th>
                      <th className="py-3 px-3">ผู้บันทึก</th>
                      <th className="py-3 px-3 text-center">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {displayedRecords.length === 0 ? (
                      <tr>
                        <td colSpan={selectedDepartmentFilter !== 'all' ? 12 : 11} className="py-8 text-center text-slate-400 text-xs">
                          ไม่พบข้อมูลบันทึกสถิติในรอบเวลา {periodTitle}
                        </td>
                      </tr>
                    ) : (
                      displayedRecords.map((r) => {
                        const overall = calculateHospitalOverall(r, standardsConfig);
                        const isSpecific = selectedDepartmentFilter !== 'all';
                        const deptCalc = isSpecific ? overall.departments[selectedDepartmentFilter as DepartmentKey] : null;
                        const censusText = isSpecific ? getDeptCensusSummary(r, selectedDepartmentFilter as DepartmentKey) : '';

                        const directH = isSpecific ? deptCalc!.directCareHours : overall.totalDirectCareHours;
                        const indirectH = isSpecific ? deptCalc!.indirectCareHours : overall.totalIndirectCareHours;
                        const supportH = isSpecific ? deptCalc!.supportCareHours : overall.totalSupportCareHours;
                        const tnh = isSpecific ? deptCalc!.totalNursingHours : overall.totalNursingHours;
                        const actStaff = isSpecific ? deptCalc!.totalActualStaff : overall.totalActualStaff;
                        const reqStaff = isSpecific ? deptCalc!.totalRequiredStaff : overall.totalRequiredStaff;
                        const gapVal = isSpecific ? deptCalc!.staffingGap : overall.overallGap;
                        const prodVal = isSpecific ? deptCalc!.productivityRate : overall.averageProductivityRate;
                        const statusVal = isSpecific ? deptCalc!.status : overall.overallStatus;

                        return (
                          <tr
                            key={r.id}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                              {r.date}
                            </td>
                            {isSpecific && (
                              <td className="py-3 px-2 text-left text-[11px] text-slate-600 dark:text-slate-300 max-w-[220px]">
                                {censusText}
                              </td>
                            )}
                            <td className="py-3 px-2 text-right font-mono text-emerald-600 dark:text-emerald-400">
                              {directH}
                            </td>
                            <td className="py-3 px-2 text-right font-mono text-blue-600 dark:text-blue-400">
                              {indirectH}
                            </td>
                            <td className="py-3 px-2 text-right font-mono text-purple-600 dark:text-purple-400">
                              {supportH}
                            </td>
                            <td className="py-3 px-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                              {tnh}
                            </td>
                            <td className="py-3 px-2 text-center font-mono">
                              <span className="font-bold text-blue-600 dark:text-blue-400">{actStaff}</span>
                              <span className="text-slate-400"> / </span>
                              <span>{reqStaff}</span>
                            </td>
                            <td className="py-3 px-2 text-center font-mono font-bold">
                              <span className={`px-1.5 py-0.5 rounded text-[11px] ${
                                gapVal < 0
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                  : gapVal === 0
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}>
                                {gapVal >= 0 ? `+${gapVal}` : gapVal}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-center font-mono text-purple-600 dark:text-purple-400 font-semibold">
                              {prodVal}%
                            </td>
                            <td className="py-3 px-2 text-center">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                statusVal === 'balanced'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : statusVal === 'understaffed'
                                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                              }`}>
                                {statusVal === 'balanced' ? '🟢 พอเหมาะ' : statusVal === 'understaffed' ? '🔴 ขาดแคลน' : '🟡 เกิน'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-600 dark:text-slate-400 truncate max-w-[120px]">
                              {r.recorderName || '-'}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => {
                                    setSelectedDailyDate(r.date);
                                    setPeriodType('daily');
                                    setViewMode('a4_template');
                                  }}
                                  title="เปิดดูเทมเพรต A4 วันนี้"
                                  className="p-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-600 dark:text-emerald-400"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => onSelectRecord(r.date)}
                                  title="ดูรายละเอียดวันที่นี้ในแดชบอร์ด"
                                  className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                {records.length > 1 && (
                                  <button
                                    onClick={() => {
                                      if (confirm(`ยืนยันการลบข้อมูลวันที่ ${r.date}?`)) {
                                        onDeleteRecord(r.id);
                                      }
                                    }}
                                    title="ลบข้อมูล"
                                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {displayedRecords.length > 0 && (
                    <tfoot className="bg-slate-100 dark:bg-slate-800/90 border-t-2 border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-white">
                      <tr>
                        <td colSpan={selectedDepartmentFilter !== 'all' ? 2 : 1} className="py-2.5 px-3 text-right">
                          รวม / เฉลี่ย ({selectedDepartmentFilter !== 'all' ? DEPARTMENT_NAMES[selectedDepartmentFilter as DepartmentKey] : 'รวมทั้งโรงพยาบาล'}):
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-emerald-600 dark:text-emerald-400">
                          {activeMetrics.totalDirect}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-blue-600 dark:text-blue-400">
                          {activeMetrics.totalIndirect}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-purple-600 dark:text-purple-400">
                          {activeMetrics.totalSupport}
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono font-extrabold text-slate-900 dark:text-white bg-emerald-50 dark:bg-emerald-950/40">
                          {activeMetrics.totalTNH}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono">
                          <span className="text-blue-600 dark:text-blue-400">{activeMetrics.avgActualStaff}</span>
                          <span className="text-slate-400 font-light"> / </span>
                          <span>{activeMetrics.avgRequiredStaff}</span>
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono">
                          <span className={`px-1.5 py-0.5 rounded text-[11px] ${
                            activeMetrics.avgGap < 0
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}>
                            {activeMetrics.avgGap >= 0 ? `+${activeMetrics.avgGap}` : activeMetrics.avgGap}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono text-purple-600 dark:text-purple-400">
                          {activeMetrics.avgProductivity}%
                        </td>
                        <td colSpan={3} className="py-2.5 px-3 text-center text-[10px] text-slate-500 font-normal">
                          เฉลี่ยต่อวัน • {activeMetrics.totalDays} วันที่บันทึก
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
