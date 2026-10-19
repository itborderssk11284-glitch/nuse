/**
 * Export Utilities: Excel (.xlsx) and Official PDF/Print Generator
 * For Sangkhlaburi Hospital Nursing Administration
 * Supports 3-Part Workload (Direct Care, Indirect Care, Support)
 * and Daily / Monthly / Yearly reports
 */

import * as XLSX from 'xlsx';
import { DailyRecord, HospitalOverallCalculation, StandardWeightsConfig } from '../types/nursing';
import { calculateHospitalOverall } from './calculator';

// Export records to formatted Excel (.xlsx)
export function exportToExcel(
  records: DailyRecord[],
  config: StandardWeightsConfig,
  reportPeriodName = 'รายงานค่างานและอัตรากำลังพยาบาล_รพ.สังขละบุรี'
) {
  const wb = XLSX.utils.book_new();

  // 1. Summary Sheet with 3-Part Care Breakdown
  const summaryRows = records.map((rec) => {
    const calc = calculateHospitalOverall(rec, config);
    return {
      'วันที่': rec.date,
      'พยาบาลผู้บันทึก': rec.recorderName || '-',
      'งานหลัก Direct Care (ชม.)': calc.totalDirectCareHours,
      'งานรอง Indirect Care (ชม.)': calc.totalIndirectCareHours,
      'งานสนับสนุน Support (ชม.)': calc.totalSupportCareHours,
      'ค่างานรวม TNH (ชม.)': calc.totalNursingHours,
      'พยาบาลจริงรวม (คน)': calc.totalActualStaff,
      'พยาบาลที่ควรมี (คน)': calc.totalRequiredStaff,
      'FTE ที่ต้องการ': calc.totalRequiredFTE,
      'ส่วนต่างกำลังคน (Gap)': calc.overallGap,
      'สถานะกำลังคน': calc.overallStatus === 'balanced' ? 'พอเหมาะ' : calc.overallStatus === 'understaffed' ? 'ขาดแคลน' : 'เกินเกณฑ์',
      'อัตราผลิตภาพ (%)': `${calc.averageProductivityRate}%`,
      'ER ค่างานรวม (ชม.)': calc.departments.ER.totalNursingHours,
      'ER (งานหลัก/รอง/หนุน)': `${calc.departments.ER.directCareHours}/${calc.departments.ER.indirectCareHours}/${calc.departments.ER.supportCareHours}`,
      'ER พยาบาลจริง/ควรมี': `${calc.departments.ER.totalActualStaff}/${calc.departments.ER.totalRequiredStaff}`,
      'OPD ค่างานรวม (ชม.)': calc.departments.OPD.totalNursingHours,
      'OPD (งานหลัก/รอง/หนุน)': `${calc.departments.OPD.directCareHours}/${calc.departments.OPD.indirectCareHours}/${calc.departments.OPD.supportCareHours}`,
      'OPD พยาบาลจริง/ควรมี': `${calc.departments.OPD.totalActualStaff}/${calc.departments.OPD.totalRequiredStaff}`,
      'IPD1 ค่างานรวม (ชม.)': calc.departments.IPD1.totalNursingHours,
      'IPD1 ครองเตียง (%)': `${calc.departments.IPD1.bedOccupancyRate}%`,
      'IPD1 พยาบาลจริง/ควรมี': `${calc.departments.IPD1.totalActualStaff}/${calc.departments.IPD1.totalRequiredStaff}`,
      'IPD2 ค่างานรวม (ชม.)': calc.departments.IPD2.totalNursingHours,
      'IPD2 ครองเตียง (%)': `${calc.departments.IPD2.bedOccupancyRate}%`,
      'IPD2 พยาบาลจริง/ควรมี': `${calc.departments.IPD2.totalActualStaff}/${calc.departments.IPD2.totalRequiredStaff}`,
      'LR ค่างานรวม (ชม.)': calc.departments.LR.totalNursingHours,
      'LR (งานหลัก/รอง/หนุน)': `${calc.departments.LR.directCareHours}/${calc.departments.LR.indirectCareHours}/${calc.departments.LR.supportCareHours}`,
      'LR พยาบาลจริง/ควรมี': `${calc.departments.LR.totalActualStaff}/${calc.departments.LR.totalRequiredStaff}`,
      'หมายเหตุ': rec.notes || '',
    };
  });

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'ภาพรวมค่างาน 3 ส่วน');

  // 2. Departmental Breakdown Sheet
  const deptRows: any[] = [];
  records.forEach((rec) => {
    const calc = calculateHospitalOverall(rec, config);
    Object.values(calc.departments).forEach((dept) => {
      deptRows.push({
        'วันที่': rec.date,
        'แผนก': dept.departmentName,
        'งานหลัก Direct Care (ชม.)': dept.directCareHours,
        'งานรอง Indirect Care (ชม.)': dept.indirectCareHours,
        'งานสนับสนุน Support (ชม.)': dept.supportCareHours,
        'ค่างานรวม TNH (ชม.)': dept.totalNursingHours,
        'พยาบาลจริง (คน)': dept.totalActualStaff,
        'พยาบาลที่ควรมี (คน)': dept.totalRequiredStaff,
        'เวรเช้า (จริง/ควรมี)': `${dept.actualStaffPerShift.morning}/${dept.requiredStaffPerShift.morning}`,
        'เวรบ่าย (จริง/ควรมี)': `${dept.actualStaffPerShift.afternoon}/${dept.requiredStaffPerShift.afternoon}`,
        'เวรดึก (จริง/ควรมี)': `${dept.actualStaffPerShift.night}/${dept.requiredStaffPerShift.night}`,
        'ส่วนต่าง (Gap)': dept.staffingGap,
        'ผลิตภาพ (%)': `${dept.productivityRate}%`,
        'สถานะ': dept.status === 'balanced' ? 'พอเหมาะ' : dept.status === 'understaffed' ? 'ขาดแคลน' : 'เกินเกณฑ์',
      });
    });
  });

  const wsDept = XLSX.utils.json_to_sheet(deptRows);
  XLSX.utils.book_append_sheet(wb, wsDept, 'รายละเอียดรายแผนก');

  // Download
  XLSX.writeFile(wb, `${reportPeriodName}.xlsx`);
}
