-- ==============================================================================
-- สคริปต์สร้างฐานข้อมูล Supabase PostgreSQL
-- ระบบคำนวณค่างานและอัตรากำลังพยาบาล โรงพยาบาลสังขละบุรี
-- นำสคริปต์นี้ไปวางใน Supabase Dashboard -> SQL Editor แล้วกด RUN ได้ทันที
-- ==============================================================================

-- 1. สร้างตารางบันทึกค่างานประจำวัน (daily_records)
CREATE TABLE IF NOT EXISTS public.daily_records (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    recorder_name TEXT,
    recorder_position TEXT,
    recorder_phone TEXT,
    notes TEXT,
    shift_type TEXT DEFAULT 'all_day',
    er JSONB NOT NULL DEFAULT '{}'::jsonb,
    opd JSONB NOT NULL DEFAULT '{}'::jsonb,
    ipd1 JSONB NOT NULL DEFAULT '{}'::jsonb,
    ipd2 JSONB NOT NULL DEFAULT '{}'::jsonb,
    lr JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index สำหรับค้นหาตามวันที่
CREATE INDEX IF NOT EXISTS idx_daily_records_date ON public.daily_records(date DESC);

-- 2. สร้างตารางเกณฑ์มาตรฐาน สธ. (standards_config)
CREATE TABLE IF NOT EXISTS public.standards_config (
    id TEXT PRIMARY KEY DEFAULT 'active_config',
    config JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. สร้างตารางข้อมูลผู้ใช้งาน/บุคลากร (hospital_users)
CREATE TABLE IF NOT EXISTS public.hospital_users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    department TEXT NOT NULL,
    position TEXT,
    avatar_color TEXT,
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- เพิ่มคอลัมน์ is_active สำหรับผู้ที่สร้างตารางไว้ก่อนหน้าแล้ว
ALTER TABLE public.hospital_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- ==============================================================================
-- การตั้งค่าความปลอดภัย Row Level Security (RLS)
-- อนุญาตให้อ่านและบันทึกข้อมูลผ่าน Supabase Public Anon Key
-- ==============================================================================

-- เปิดใช้งาน RLS
ALTER TABLE public.daily_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.standards_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_users ENABLE ROW LEVEL SECURITY;

-- สร้าง Policy สำหรับ daily_records
CREATE POLICY "Allow public read daily_records" 
ON public.daily_records FOR SELECT USING (true);

CREATE POLICY "Allow public insert daily_records" 
ON public.daily_records FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update daily_records" 
ON public.daily_records FOR UPDATE USING (true);

CREATE POLICY "Allow public delete daily_records" 
ON public.daily_records FOR DELETE USING (true);

-- สร้าง Policy สำหรับ standards_config
CREATE POLICY "Allow public read standards_config" 
ON public.standards_config FOR SELECT USING (true);

CREATE POLICY "Allow public insert standards_config" 
ON public.standards_config FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update standards_config" 
ON public.standards_config FOR UPDATE USING (true);

-- สร้าง Policy สำหรับ hospital_users
CREATE POLICY "Allow public read hospital_users" 
ON public.hospital_users FOR SELECT USING (true);

CREATE POLICY "Allow public insert hospital_users" 
ON public.hospital_users FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update hospital_users" 
ON public.hospital_users FOR UPDATE USING (true);

CREATE POLICY "Allow public delete hospital_users" 
ON public.hospital_users FOR DELETE USING (true);

-- ==============================================================================
-- สิ้นสุดสคริปต์
-- ==============================================================================
