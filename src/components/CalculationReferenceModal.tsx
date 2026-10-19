import React from 'react';
import { StandardWeightsConfig } from '../types/nursing';
import {
  Calculator,
  X,
  Ambulance,
  Stethoscope,
  BedDouble,
  Baby,
  BookOpen,
  Layers,
  ShieldCheck,
  FileText,
  Activity,
  CheckCircle,
  Clock,
  Settings,
} from 'lucide-react';

interface CalculationReferenceModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  standardsConfig: StandardWeightsConfig;
  isStandaloneTab?: boolean;
}

export const CalculationReferenceModal: React.FC<CalculationReferenceModalProps> = ({
  isOpen = true,
  onClose,
  standardsConfig,
  isStandaloneTab = false,
}) => {
  if (!isOpen && !isStandaloneTab) return null;

  const content = (
    <div className="space-y-6">
      
      {/* Overview Banner: 3-Part Workload Model */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-5 rounded-2xl border border-emerald-700/50 space-y-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-emerald-300" />
          <h3 className="font-bold text-base sm:text-lg">
            สูตรการคำนวณค่างาน 3 ส่วน ตามมาตรฐานสภาการพยาบาล
          </h3>
        </div>
        <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
          อ้างอิงมาตรฐานกำหนดตำแหน่งและกรอบอัตรากำลังของสภาการพยาบาล และกลุ่มภารกิจด้านการพยาบาล กระทรวงสาธารณสุข
          โดยจำแนกภาระงานเป็น 3 องค์ประกอบหลัก: <strong>งานหลัก (Direct Care)</strong>, <strong>งานรอง (Indirect Care)</strong>, และ <strong>งานสนับสนุน (Support Work)</strong>
        </p>
      </div>

      {/* Part 1, 2, 3 Summary Box */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <Layers className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
            1. โครงสร้างค่างานการพยาบาลรวม (Total Nursing Hours: TNH)
          </h4>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-mono text-xs border border-slate-200/60 dark:border-slate-700 text-slate-800 dark:text-slate-200 space-y-1">
          <div className="text-emerald-700 dark:text-emerald-300 font-bold">
            TNH รวม = งานหลัก (Direct Care) + งานรอง (Indirect Care) + งานสนับสนุน (Support Work)
          </div>
          <div className="text-slate-500">
            FTE ที่ต้องการ = (TNH รวม / เวลาทำงานจริงสุทธิ 7.0 ชม.) × 1.25 (สัมประสิทธิ์วันหยุด/ลา DFTE)
          </div>
        </div>
      </div>

      {/* Detailed Formula for Part 2: งานรอง (Indirect Care) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-blue-200/80 dark:border-blue-900/40 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
              2. สูตรการคิดภาระงานรอง (Indirect Care)
            </h4>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
            มาตรฐานสภาการพยาบาล
          </span>
        </div>

        {/* Math Formula Card */}
        <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/60 font-mono text-xs space-y-2">
          <div className="text-blue-950 dark:text-blue-200 font-bold text-sm">
            ภาระงานรอง (ชั่วโมง/ปี) = ∑ (ปริมาณงานต่อปี × เวลามาตรฐานต่อหน่วย)
          </div>
          <div className="text-[11px] text-blue-800/80 dark:text-blue-300/80 font-sans">
            (แปลงเป็นชั่วโมงต่อวัน = ภาระงานรองต่อปี ÷ 365 วัน หรือคิดจากสถิติผู้ป่วยประจำวัน)
          </div>
        </div>

        {/* Variables & Data Collection Table */}
        <div className="space-y-2.5 text-xs">
          <div className="font-bold text-slate-800 dark:text-slate-200">
            ตัวแปรและการเก็บข้อมูลเพื่อแทนค่าสูตรงานรอง:
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* 1. บันทึกชาร์จ */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700 space-y-1">
              <span className="font-bold text-blue-700 dark:text-blue-300 block">
                • บันทึกชาร์จ (Documentation)
              </span>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                (จำนวนผู้ป่วยทั้งหมดต่อปี × เวลาที่ใช้เขียนชาร์จเฉลี่ยต่อราย เช่น 10–15 นาที)
              </p>
              <div className="text-[10px] text-slate-400">
                ครอบคลุม: เขียนบันทึกทางการพยาบาล (Nursing Focus Note), บันทึกสัญญาณชีพ, สรุปจำหน่าย
              </div>
            </div>

            {/* 2. เตรียมยา */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700 space-y-1">
              <span className="font-bold text-blue-700 dark:text-blue-300 block">
                • เตรียมยา (Medication Preparation)
              </span>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                (จำนวนครั้งที่แจกยาต่อปี × เวลาเตรียมยาและเช็กความปลอดภัยเฉลี่ยต่อครั้ง เช่น 5 นาที)
              </p>
              <div className="text-[10px] text-slate-400">
                ครอบคลุม: ตรวจสอบ 7 Rights, เตรียมยาฉีด/ยาเม็ด/สารน้ำ IV, Double Check ยาเสี่ยงสูง (HAD)
              </div>
            </div>

            {/* 3. ประสานงาน */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700 space-y-1">
              <span className="font-bold text-blue-700 dark:text-blue-300 block">
                • ประสานงาน (Communication & Coordination)
              </span>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                (จำนวนเคส Admit/Discharge/Refer/ตามผล Lab หรือ Consultation ต่อปี × เวลาส่งต่อข้อมูลเฉลี่ย เช่น 10–20 นาที)
              </p>
              <div className="text-[10px] text-slate-400">
                ครอบคลุม: โทรประสานแพทย์, ตามผลเลือด/เอกซเรย์, ปรึกษาเฉพาะทาง, ติดต่อศูนย์ส่งต่อ Refer
              </div>
            </div>

            {/* 4. ส่งเวร */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700 space-y-1">
              <span className="font-bold text-blue-700 dark:text-blue-300 block">
                • ส่งเวร (Handover / Endorsement)
              </span>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                (จำนวนผู้ป่วยเฉลี่ยต่อเวร × 3 เวรต่อวัน × 365 วัน × เวลาส่งเวรเฉลี่ยต่อเคส หรือคิดเป็นเวลาเหมาจ่ายรายเวร เช่น เวรละ 30–45 นาที)
              </p>
              <div className="text-[10px] text-slate-400">
                ครอบคลุม: ส่งมอบสถานะทางคลินิกข้างเตียง (Bedside Handover), รายงานสัญญาณเตือนวิกฤต (MEWS)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Formula for Part 3: งานสนับสนุน (Support Work) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-purple-200/80 dark:border-purple-900/40 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-purple-500" />
            <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
              3. สูตรการคิดภาระงานสนับสนุน (Support Work)
            </h4>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
            มาตรฐานสภาการพยาบาล
          </span>
        </div>

        {/* Math Formula Card */}
        <div className="p-4 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/60 font-mono text-xs space-y-2">
          <div className="text-purple-950 dark:text-purple-200 font-bold text-sm">
            ภาระงานสนับสนุน (ชั่วโมง/ปี) = ∑ (ความถี่กิจกรรมต่อปี × เวลาที่ใช้จริงต่อกิจกรรม)
          </div>
          <div className="text-[11px] text-purple-800/80 dark:text-purple-300/80 font-sans">
            (แปลงเป็นชั่วโมงเฉลี่ยต่อวัน = ภาระงานสนับสนุนต่อปี ÷ 365 วัน)
          </div>
        </div>

        {/* Variables & Data Collection Table */}
        <div className="space-y-2.5 text-xs">
          <div className="font-bold text-slate-800 dark:text-slate-200">
            ตัวแปรและการเก็บข้อมูลเพื่อแทนค่าสูตรงานสนับสนุน:
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* 1. บริหารวอร์ด */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700 space-y-1">
              <span className="font-bold text-purple-700 dark:text-purple-300 block">
                • บริหารวอร์ด (Ward Management)
              </span>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                การจัดตารางเวร, ประชุมประจำเดือน, สรุปสถิติวอร์ด (เช่น 2 ชั่วโมง/สัปดาห์ หรือ 8 ชั่วโมง/เดือน)
              </p>
              <div className="text-[10px] text-slate-400">
                ครอบคลุม: จัดสรรอัตรากำลัง, แก้ไขปัญหาความขัดแย้ง, รายงานสถิติผู้ป่วยครองเตียง
              </div>
            </div>

            {/* 2. ตรวจเครื่องมือ */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700 space-y-1">
              <span className="font-bold text-purple-700 dark:text-purple-300 block">
                • ตรวจเครื่องมือ (Equipment Check)
              </span>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                ตรวจสอบและทดสอบรถ Emergency, เครื่อง Defibrillator, เครื่องมือแพทย์ทุกชิ้นในวอร์ด (เช่น ทำทุกวัน วันละ 20–30 นาที × 365 วัน)
              </p>
              <div className="text-[10px] text-slate-400">
                ครอบคลุม: ทดสอบ Battery แบตเตอรี่, ตรวจสอบสาย Defib, ตรวจความพร้อมท่อช่วยหายใจ
              </div>
            </div>

            {/* 3. IC */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700 space-y-1">
              <span className="font-bold text-purple-700 dark:text-purple-300 block">
                • IC (Infection Control)
              </span>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                ตรวจประเมินความปลอดภัย, การคัดแยกขยะติดเชื้อ, ตรวจตู้เย็นเก็บยา/สุ่มตรวจการล้างมือ (เช่น สัปดาห์ละ 1 ครั้ง ครั้งละ 1 ชั่วโมง)
              </p>
              <div className="text-[10px] text-slate-400">
                ครอบคลุม: บันทึกอุณหภูมิตู้เย็นเก็บยา, สุ่มสำรวจ 5 Moments of Hand Hygiene, ตรวจห้องแยกโรค
              </div>
            </div>

            {/* 4. CQI / HA */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700 space-y-1">
              <span className="font-bold text-purple-700 dark:text-purple-300 block">
                • CQI / HA (Quality & Accreditation)
              </span>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                การประชุมทีมพัฒนาคุณภาพ, การทบทวนข้างเตียง (Trigger Tool), การเขียนแบบประเมินตนเอง (SAR) (มักคิดเป็นเวลาเหมาจ่ายสะสม เช่น 4–8 ชั่วโมงต่อสัปดาห์ หรือตามชั่วโมงประชุมจริง)
              </p>
              <div className="text-[10px] text-slate-400">
                ครอบคลุม: ทบทวนอุบัติการณ์ความเสี่ยง (Incident Report), การเขียน Flow การดูแลผู้ป่วยสำคัญ
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );

  if (isStandaloneTab) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-emerald-800 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/15 rounded-xl">
              <Calculator className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="font-bold text-base">สูตรคำนวณค่างาน 3 ส่วน (สภาการพยาบาล)</h3>
              <p className="text-xs text-emerald-200/90">โรงพยาบาลสังขละบุรี</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {content}
        </div>

        {onClose && (
          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-900/50">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl"
            >
              เข้าใจแล้ว ปิดหน้าต่าง
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
