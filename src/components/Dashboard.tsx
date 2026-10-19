import React from 'react';
import {
  DailyRecord,
  DepartmentCalculation,
  HospitalOverallCalculation,
  StandardWeightsConfig,
} from '../types/nursing';
import { calculateHospitalOverall } from '../utils/calculator';
import {
  Users,
  Clock,
  Activity,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  FileSpreadsheet,
  BedDouble,
  Baby,
  Stethoscope,
  Ambulance,
  ArrowRight,
  ChevronRight,
  Calendar,
  Sparkles,
  Info,
  Layers,
  HeartPulse,
} from 'lucide-react';

interface DashboardProps {
  currentRecord: DailyRecord;
  records: DailyRecord[];
  onSelectDate: (date: string) => void;
  onNavigateToEntry: (dept?: string) => void;
  onExportExcel: () => void;
  onOpenStandards: () => void;
  standardsConfig: StandardWeightsConfig;
}

export const Dashboard: React.FC<DashboardProps> = ({
  currentRecord,
  records,
  onSelectDate,
  onNavigateToEntry,
  onExportExcel,
  onOpenStandards,
  standardsConfig,
}) => {
  const calc: HospitalOverallCalculation = calculateHospitalOverall(
    currentRecord,
    standardsConfig
  );

  const thaiDateFormatted = new Date(currentRecord.date).toLocaleDateString('th-TH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Calculate 7-day trend history
  const recentRecords = [...records]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-7);

  const trendData = recentRecords.map((r) => {
    const c = calculateHospitalOverall(r, standardsConfig);
    return {
      date: r.date,
      label: new Date(r.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }),
      hours: c.totalNursingHours,
      direct: c.totalDirectCareHours,
      indirect: c.totalIndirectCareHours,
      support: c.totalSupportCareHours,
      actual: c.totalActualStaff,
      required: c.totalRequiredStaff,
    };
  });

  const maxHours = Math.max(...trendData.map((d) => d.hours), 100);

  // Proportions of 3 parts in total
  const directPct = calc.totalNursingHours > 0
    ? Math.round((calc.totalDirectCareHours / calc.totalNursingHours) * 100)
    : 0;
  const indirectPct = calc.totalNursingHours > 0
    ? Math.round((calc.totalIndirectCareHours / calc.totalNursingHours) * 100)
    : 0;
  const supportPct = Math.max(0, 100 - directPct - indirectPct);

  return (
    <div className="space-y-5">
      
      {/* Top Banner & Control Bar (Eye-Care Soft Contrast) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 dark:from-emerald-950 dark:via-slate-900 dark:to-slate-950 text-white p-4 sm:p-5 rounded-2xl shadow-md border border-emerald-600/30">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/15 text-emerald-100 text-xs font-semibold backdrop-blur-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>โรงพยาบาลสังขละบุรี • ประเมินค่างาน 3 ส่วนตามเกณฑ์สภาการพยาบาล</span>
          </div>
          <h2 className="text-base sm:text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
            Sangkhlaburi Hospital Smart Workload and Workforce Assessment System
          </h2>
          <p className="text-emerald-100/90 text-xs sm:text-sm flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 font-semibold text-white">
              <Calendar className="w-3.5 h-3.5 text-emerald-300" />
              <span>{thaiDateFormatted}</span>
            </span>
            <span className="text-emerald-300/50">•</span>
            <span>ผู้ตรวจนับ: <strong className="text-white font-medium">{currentRecord.recorderName || 'พยาบาลตรวจการเวร'}</strong></span>
          </p>
        </div>

        {/* Date Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Date Switcher */}
          <div className="flex items-center bg-white/15 dark:bg-black/40 backdrop-blur-xs rounded-xl px-2.5 py-1.5 border border-white/20">
            <span className="text-xs text-emerald-200 pr-1.5 font-medium">วันที่ตรวจ:</span>
            <input
              type="date"
              value={currentRecord.date}
              onChange={(e) => onSelectDate(e.target.value)}
              className="bg-transparent text-white text-xs font-bold font-mono focus:outline-hidden cursor-pointer [color-scheme:dark]"
            />
          </div>

          {/* Quick Export Excel */}
          <button
            onClick={onExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/20 hover:bg-white/30 text-white border border-white/25 transition-all shadow-2xs active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            <span>ส่งออก Excel</span>
          </button>
        </div>
      </div>

      {/* 3-Part Workload Summary Header Ribbon */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              สัดส่วนค่างาน 3 ส่วน ตามเกณฑ์สภาการพยาบาล (Total Nursing Hours: TNH)
            </h3>
          </div>
          <div className="text-xs text-slate-500 font-mono">
            TNH รวม = <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{calc.totalNursingHours}</strong> ชั่วโมง
          </div>
        </div>

        {/* Multi-segment Progress Bar */}
        <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800 mb-3">
          <div
            title={`งานหลัก (Direct Care): ${calc.totalDirectCareHours} ชม. (${directPct}%)`}
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${directPct}%` }}
          />
          <div
            title={`งานรอง (Indirect Care): ${calc.totalIndirectCareHours} ชม. (${indirectPct}%)`}
            className="h-full bg-blue-500 transition-all duration-500"
            style={{ width: `${indirectPct}%` }}
          />
          <div
            title={`งานสนับสนุน (Support Work): ${calc.totalSupportCareHours} ชม. (${supportPct}%)`}
            className="h-full bg-purple-500 transition-all duration-500"
            style={{ width: `${supportPct}%` }}
          />
        </div>

        {/* 3 Cards for the 3 Care Parts */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* 1. Direct Care */}
          <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 font-bold text-emerald-900 dark:text-emerald-200">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>1. งานหลัก (Direct Care)</span>
              </div>
              <div className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                กิจกรรมดูแลผู้ป่วยโดยตรง ณ เตียง
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-extrabold font-mono text-emerald-800 dark:text-emerald-200">
                {calc.totalDirectCareHours}
              </span>
              <span className="text-[11px] text-emerald-600 block">ชม. ({directPct}%)</span>
            </div>
          </div>

          {/* 2. Indirect Care */}
          <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 font-bold text-blue-900 dark:text-blue-200">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span>2. งานรอง (Indirect Care)</span>
              </div>
              <div className="text-[11px] text-blue-700/80 dark:text-blue-400/80 mt-0.5">
                บันทึกชาร์จ, เตรียมยา, ประสานงาน, ส่งเวร
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-extrabold font-mono text-blue-800 dark:text-blue-200">
                {calc.totalIndirectCareHours}
              </span>
              <span className="text-[11px] text-blue-600 block">ชม. ({indirectPct}%)</span>
            </div>
          </div>

          {/* 3. Support Care */}
          <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/60 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 font-bold text-purple-900 dark:text-purple-200">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span>3. งานสนับสนุน (Support)</span>
              </div>
              <div className="text-[11px] text-purple-700/80 dark:text-purple-400/80 mt-0.5">
                บริหารวอร์ด, ตรวจเครื่องมือ, IC, CQI, HA
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-extrabold font-mono text-purple-800 dark:text-purple-200">
                {calc.totalSupportCareHours}
              </span>
              <span className="text-[11px] text-purple-600 block">ชม. ({supportPct}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Core Overall KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4.5">
        
        {/* KPI 1: Total Nursing Care Hours */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">ค่างานรวม (TNH 24 ชม.)</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
              {calc.totalNursingHours}
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">ชั่วโมง/วัน</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>ต้องการ FTE:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{calc.totalRequiredFTE} อัตรา</span>
          </div>
        </div>

        {/* KPI 2: Actual vs Required Staff */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">พยาบาลจริง / พยาบาลที่ควรมี</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-blue-700 dark:text-blue-400 font-mono">
              {calc.totalActualStaff}
            </span>
            <span className="text-slate-400 dark:text-slate-600 font-light text-xl">/</span>
            <span className="text-xl font-bold text-slate-700 dark:text-slate-300 font-mono">
              {calc.totalRequiredStaff}
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">คน</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span>นับรวมเวร เช้า • บ่าย • ดึก 4 แผนก</span>
          </div>
        </div>

        {/* KPI 3: Staffing Deficit / Surplus */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">ส่วนต่างกำลังคน (Gap)</span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              calc.overallGap < 0
                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
            }`}>
              {calc.overallGap < 0 ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold font-mono ${
              calc.overallGap < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              {calc.overallGap > 0 ? `+${calc.overallGap}` : calc.overallGap}
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">คน</span>
          </div>
          <div className="mt-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
              calc.overallGap < 0
                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                : calc.overallGap === 0
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
            }`}>
              {calc.overallStatus === 'balanced'
                ? '🟢 กำลังคนสมดุลพอเหมาะ'
                : calc.overallStatus === 'understaffed'
                ? '🔴 กำลังคนขาดแคลน/งานล้น'
                : '🟡 กำลังคนสูงกว่าเกณฑ์'}
            </span>
          </div>
        </div>

        {/* KPI 4: Productivity Rate */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">อัตราผลิตภาพรวม</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-purple-700 dark:text-purple-400 font-mono">
              {calc.averageProductivityRate}%
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">เป้าหมาย 85-115%</span>
          </div>
          <div className="mt-2.5 w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                calc.averageProductivityRate > 120
                  ? 'bg-rose-500'
                  : calc.averageProductivityRate >= 85
                  ? 'bg-emerald-500'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(100, (calc.averageProductivityRate / 130) * 100)}%` }}
            />
          </div>
        </div>

      </div>

      {/* Main Grid: Department Workload Cards with 3 Care Parts */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>สถานะค่างาน 4 แผนกหลัก รพ.สังขละบุรี</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              วิเคราะห์จำแนกงานหลัก, งานรอง, งานสนับสนุน และอัตรากำลังพยาบาลต่อเวร
            </p>
          </div>
          <button
            onClick={() => onNavigateToEntry()}
            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
          >
            <span>กรอกสถิติค่างาน</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* 1. ER Card */}
          <DepartmentCard
            calc={calc.departments.ER}
            icon={Ambulance}
            accentColor="rose"
            onEdit={() => onNavigateToEntry('ER')}
            details={[
              { label: 'Triage 1 (แดง-กู้ชีพ)', value: `${currentRecord.er.triage1_resus || 0} ราย` },
              { label: 'Triage 2 (ฉุกเฉินมาก)', value: `${currentRecord.er.triage2_emergency || 0} ราย` },
              { label: 'Triage 3-5', value: `${(currentRecord.er.triage3_urgency || 0) + (currentRecord.er.triage4_semiUrgent || 0) + (currentRecord.er.triage5_nonUrgent || 0)} ราย` },
              { label: 'เคสส่งต่อ Ambulance', value: `${currentRecord.er.ambulanceReferral || 0} เคส` },
            ]}
          />

          {/* 2. OPD Card */}
          <DepartmentCard
            calc={calc.departments.OPD}
            icon={Stethoscope}
            accentColor="blue"
            onEdit={() => onNavigateToEntry('OPD')}
            details={[
              { label: 'ตรวจโรคทั่วไป', value: `${currentRecord.opd.generalPatients || 0} ราย` },
              { label: 'คลินิกเรื้อรัง (NCDs)', value: `${currentRecord.opd.chronicPatients || 0} ราย` },
              { label: 'หัตถการ/ผ่าตัดเล็ก', value: `${currentRecord.opd.minorSurgery || 0} ราย` },
              { label: 'เฉพาะทาง/คัดกรอง', value: `${(currentRecord.opd.specialClinic || 0) + (currentRecord.opd.screeningPatients || 0)} ราย` },
            ]}
          />

          {/* 3. IPD 1 Card */}
          <DepartmentCard
            calc={calc.departments.IPD1}
            icon={BedDouble}
            accentColor="emerald"
            onEdit={() => onNavigateToEntry('IPD1')}
            subBadge={`ครองเตียง ${calc.departments.IPD1.bedOccupancyRate}%`}
            details={[
              { label: 'ครองเตียง (Census)', value: `${currentRecord.ipd1.currentCensus || 0} เตียง` },
              { label: 'PCS ระดับ 1-2', value: `${(currentRecord.ipd1.pcs1_selfCare || 0) + (currentRecord.ipd1.pcs2_moderateCare || 0)} คน` },
              { label: 'PCS ระดับ 3 (Max)', value: `${currentRecord.ipd1.pcs3_maximumCare || 0} คน` },
              { label: 'PCS ระดับ 4-5 (Critical)', value: `${(currentRecord.ipd1.pcs4_intensiveCare || 0) + (currentRecord.ipd1.pcs5_ventilator || 0)} คน` },
            ]}
          />

          {/* 4. IPD 2 Card */}
          <DepartmentCard
            calc={calc.departments.IPD2}
            icon={BedDouble}
            accentColor="teal"
            onEdit={() => onNavigateToEntry('IPD2')}
            subBadge={`ครองเตียง ${calc.departments.IPD2.bedOccupancyRate}%`}
            details={[
              { label: 'ครองเตียง (Census)', value: `${currentRecord.ipd2.currentCensus || 0} เตียง` },
              { label: 'PCS ระดับ 1-2', value: `${(currentRecord.ipd2.pcs1_selfCare || 0) + (currentRecord.ipd2.pcs2_moderateCare || 0)} คน` },
              { label: 'PCS ระดับ 3 (Max)', value: `${currentRecord.ipd2.pcs3_maximumCare || 0} คน` },
              { label: 'PCS ระดับ 4-5 (Critical/Vent)', value: `${(currentRecord.ipd2.pcs4_intensiveCare || 0) + (currentRecord.ipd2.pcs5_ventilator || 0)} คน` },
            ]}
          />

          {/* 5. LR Card */}
          <DepartmentCard
            calc={calc.departments.LR}
            icon={Baby}
            accentColor="amber"
            onEdit={() => onNavigateToEntry('LR')}
            details={[
              { label: 'รอคลอด Latent/Active', value: `${(currentRecord.lr.stage1Latent || 0) + (currentRecord.lr.stage1Active || 0)} ราย` },
              { label: 'ทำคลอด Stage 2', value: `${currentRecord.lr.stage2Delivery || 0} ราย` },
              { label: 'หลังคลอด 2 ชม.', value: `${currentRecord.lr.postpartumRecovery || 0} ราย` },
              { label: 'ครรภ์เสี่ยงสูง/ทารกวิกฤต', value: `${(currentRecord.lr.highRiskCases || 0) + (currentRecord.lr.newbornResuscitation || 0)} ราย` },
            ]}
          />

          {/* 6. Formula & Standard Card */}
          <div className="bg-gradient-to-br from-slate-900 to-emerald-950 text-white p-5 rounded-2xl border border-slate-800 flex flex-col justify-between shadow-xs">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                  เกณฑ์สภาการพยาบาล
                </span>
                <Sparkles className="w-4 h-4 text-emerald-300" />
              </div>
              <h4 className="text-sm sm:text-base font-bold text-white">
                โครงสร้างค่างาน 3 ส่วน (TNH)
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                TNH = Direct Care (งานหลัก) + Indirect Care (งานรอง 25%) + Support (งานสนับสนุน 12%)
              </p>
              <div className="p-2 rounded-xl bg-white/10 text-[11px] font-mono text-emerald-200 border border-white/10">
                FTE = (TNH รวม / 7.0 ชม.) × 1.25 (DFTE)
              </div>
            </div>

            <button
              onClick={onOpenStandards}
              className="mt-3 flex items-center justify-between w-full px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors"
            >
              <span>ดูเกณฑ์มาตรฐานและสัดส่วนสภาฯ</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>

      {/* Visual Analytics Section: 7-Day Trend Chart & Department Workload Share */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* 7-Day Trend Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>แนวโน้มค่างาน 3 ส่วน 7 วันย้อนหลัง</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                โรงพยาบาลสังขละบุรี (เปรียบเทียบภาระงานรวมรายวัน)
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                <span>งานหลัก</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
                <span>งานรอง</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-purple-500" />
                <span>งานสนับสนุน</span>
              </span>
            </div>
          </div>

          {/* Simple Visual Bar Chart */}
          <div className="h-52 flex items-end justify-between gap-2 pt-6 pb-2 border-b border-slate-100 dark:border-slate-800">
            {trendData.map((d) => {
              const heightPercent = Math.min(100, Math.round((d.hours / maxHours) * 100));
              const isSelected = d.date === currentRecord.date;
              return (
                <div
                  key={d.date}
                  onClick={() => onSelectDate(d.date)}
                  className="flex-1 flex flex-col items-center gap-2 h-full justify-end cursor-pointer group"
                >
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-center bg-slate-800 text-white dark:bg-slate-700 px-1.5 py-0.5 rounded pointer-events-none whitespace-nowrap shadow-sm">
                    {d.hours} ชม. (จริง {d.actual} คน)
                  </div>

                  <div className="w-full max-w-[44px] bg-slate-100 dark:bg-slate-800/80 rounded-t-lg overflow-hidden flex flex-col justify-end h-full">
                    <div
                      className={`w-full rounded-t-md transition-all duration-300 ${
                        isSelected
                          ? 'bg-emerald-600 dark:bg-emerald-500 ring-2 ring-emerald-400/50'
                          : 'bg-emerald-500/80 dark:bg-emerald-700/80 group-hover:bg-emerald-500'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>

                  <span className={`text-[11px] font-medium transition-colors ${
                    isSelected
                      ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              คลิกที่แท่งกราฟเพื่อดูรายละเอียดของวันนั้น
            </span>
            <span>เฉลี่ย: {Math.round(trendData.reduce((acc, curr) => acc + curr.hours, 0) / (trendData.length || 1))} ชม./วัน</span>
          </div>
        </div>

        {/* Workload Distribution by Department */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1">
              สัดส่วนค่างานแยกรายแผนก
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              คิดเป็นร้อยละของค่างานรวมทั้งหมด (TNH)
            </p>

            <div className="space-y-3">
              {[
                { name: 'ห้องฉุกเฉิน (ER)', hours: calc.departments.ER.totalNursingHours, color: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400' },
                { name: 'ผู้ป่วยนอก (OPD)', hours: calc.departments.OPD.totalNursingHours, color: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' },
                { name: 'IPD 1 (หญิง/กุมาร)', hours: calc.departments.IPD1.totalNursingHours, color: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
                { name: 'IPD 2 (ชาย/พิเศษ)', hours: calc.departments.IPD2.totalNursingHours, color: 'bg-teal-500', text: 'text-teal-600 dark:text-teal-400' },
                { name: 'ห้องคลอด (LR)', hours: calc.departments.LR.totalNursingHours, color: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
              ].map((item) => {
                const percent = calc.totalNursingHours > 0
                  ? Math.round((item.hours / calc.totalNursingHours) * 100)
                  : 0;
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{item.name}</span>
                      <span className={`font-mono font-semibold ${item.text}`}>
                        {item.hours} ชม. ({percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full`} style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>ค่างานรวมทั้ง 4 แผนก</span>
            <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
              {calc.totalNursingHours} ชม.
            </span>
          </div>
        </div>

      </div>

    </div>
  );
};

// Sub-component for individual Department Workload Cards
interface DepartmentCardProps {
  calc: DepartmentCalculation;
  icon: React.ElementType;
  accentColor: 'rose' | 'blue' | 'emerald' | 'teal' | 'amber';
  onEdit: () => void;
  subBadge?: string;
  details: { label: string; value: string }[];
}

const DepartmentCard: React.FC<DepartmentCardProps> = ({
  calc,
  icon: Icon,
  accentColor,
  onEdit,
  subBadge,
  details,
}) => {
  const colorMap = {
    rose: {
      bg: 'bg-rose-50 dark:bg-rose-950/40',
      text: 'text-rose-600 dark:text-rose-400',
    },
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      text: 'text-blue-600 dark:text-blue-400',
    },
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      text: 'text-emerald-600 dark:text-emerald-400',
    },
    teal: {
      bg: 'bg-teal-50 dark:bg-teal-950/40',
      text: 'text-teal-600 dark:text-teal-400',
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      text: 'text-amber-600 dark:text-amber-400',
    },
  };

  const c = colorMap[accentColor];

  const statusBadge =
    calc.status === 'balanced'
      ? { label: '🟢 พอเหมาะ', class: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' }
      : calc.status === 'understaffed'
      ? { label: '🔴 ขาดแคลน', class: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300' }
      : { label: '🟡 เกินเกณฑ์', class: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300' };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-xl ${c.bg} ${c.text} flex items-center justify-center shrink-0 shadow-2xs`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                {calc.departmentName}
              </h4>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`text-[11px] px-2 py-0.5 rounded-md font-bold ${statusBadge.class}`}>
                  {statusBadge.label}
                </span>
                {subBadge && (
                  <span className="text-[11px] px-2 py-0.5 rounded-md font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {subBadge}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onEdit}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors"
            title="แก้ไขสถิติข้อมูล"
          >
            แก้ไข
          </button>
        </div>

        {/* 3-Part Care Breakdown in Card */}
        <div className="mt-3.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 space-y-1.5 text-xs">
          <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-200">
            <span>ค่างานรวม (TNH):</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-extrabold text-sm sm:text-base">
              {calc.totalNursingHours} ชม.
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-xs text-center pt-1.5 border-t border-slate-200/80 dark:border-slate-700/80">
            <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 text-[11px] block">งานหลัก</span>
              <span className="font-extrabold font-mono text-emerald-600 dark:text-emerald-400">{calc.directCareHours}</span>
            </div>
            <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 text-[11px] block">งานรอง</span>
              <span className="font-extrabold font-mono text-blue-600 dark:text-blue-400">{calc.indirectCareHours}</span>
            </div>
            <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 text-[11px] block">งานสนับสนุน</span>
              <span className="font-extrabold font-mono text-purple-600 dark:text-purple-400">{calc.supportCareHours}</span>
            </div>
          </div>
        </div>

        {/* Workload Metric Numbers */}
        <div className="grid grid-cols-2 gap-2 my-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">อัตรากำลัง FTE</div>
            <div className="text-base font-extrabold font-mono text-slate-900 dark:text-white mt-0.5">
              {calc.requiredFTE} <span className="text-xs font-normal text-slate-500">อัตรา</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">ผลิตภาพ: <strong className="text-slate-700 dark:text-slate-300">{calc.productivityRate}%</strong></div>
          </div>
          <div className="border-l border-slate-200 dark:border-slate-700/60 pl-3">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">จริง / ควรมี</div>
            <div className="text-base font-extrabold font-mono text-slate-900 dark:text-white mt-0.5">
              <span className={calc.staffingGap < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                {calc.totalActualStaff}
              </span>
              <span className="text-slate-400 font-light"> / </span>
              {calc.totalRequiredStaff}
              <span className="text-xs font-normal text-slate-500"> คน</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Gap: <strong className={calc.staffingGap < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                {calc.staffingGap > 0 ? `+${calc.staffingGap}` : calc.staffingGap} คน
              </strong>
            </div>
          </div>
        </div>

        {/* Shift-by-Shift Breakdown */}
        <div className="mb-3">
          <div className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 flex justify-between">
            <span>เวร: จริง / ควรมี</span>
            <span className="text-slate-400 text-[11px] font-normal">(เช้า • บ่าย • ดึก)</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
            <div className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200/50 dark:border-slate-700/50">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">เช้า</div>
              <div className="font-mono font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm mt-0.5">
                {calc.actualStaffPerShift.morning}/{calc.requiredStaffPerShift.morning}
              </div>
            </div>
            <div className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200/50 dark:border-slate-700/50">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">บ่าย</div>
              <div className="font-mono font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm mt-0.5">
                {calc.actualStaffPerShift.afternoon}/{calc.requiredStaffPerShift.afternoon}
              </div>
            </div>
            <div className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200/50 dark:border-slate-700/50">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">ดึก</div>
              <div className="font-mono font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm mt-0.5">
                {calc.actualStaffPerShift.night}/{calc.requiredStaffPerShift.night}
              </div>
            </div>
          </div>
        </div>

        {/* Key Department Statistics Snapshot */}
        <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          {details.map((d, i) => (
            <div key={i} className="flex justify-between py-0.5 text-slate-600 dark:text-slate-400">
              <span>{d.label}</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{d.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex justify-end">
        <button
          onClick={onEdit}
          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 flex items-center gap-1"
        >
          <span>บันทึกข้อมูลเวร</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
