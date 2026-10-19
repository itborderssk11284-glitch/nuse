/**
 * Supabase Database Client & Synchronization Layer
 * โรงพยาบาลสังขละบุรี (Sangkhlaburi Hospital)
 * Nursing Workload & Staffing Assessment System
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DailyRecord, StandardWeightsConfig } from '../types/nursing';
import { AppUser } from '../types/auth';

// Read environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let cachedClient: SupabaseClient | null = null;

/**
 * Check whether Supabase environment variables are configured
 */
export function isSupabaseConfigured(): boolean {
  return (
    typeof supabaseUrl === 'string' &&
    supabaseUrl.trim().length > 0 &&
    typeof supabaseAnonKey === 'string' &&
    supabaseAnonKey.trim().length > 0 &&
    !supabaseUrl.includes('your-project-url') &&
    !supabaseAnonKey.includes('your-anon-key')
  );
}

/**
 * Get Supabase Client instance (singleton)
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!cachedClient) {
    cachedClient = createClient(supabaseUrl.trim(), supabaseAnonKey.trim(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return cachedClient;
}

/**
 * Test connectivity to Supabase
 */
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message: 'ยังไม่ได้ระบุ VITE_SUPABASE_URL หรือ VITE_SUPABASE_ANON_KEY ในระบบ',
    };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'ไม่สามารถสร้าง Supabase Client ได้' };
  }

  try {
    const { error } = await client
      .from('daily_records')
      .select('id')
      .limit(1);

    if (error) {
      if (error.code === '42P01') {
        return {
          success: false,
          message: 'เชื่อมต่อ Supabase ได้แล้ว แต่ยังไม่ได้สร้างตาราง (กรุณารันคำสั่งใน supabase_schema.sql ใน SQL Editor)',
        };
      }
      return { success: false, message: `Supabase Error: ${error.message}` };
    }

    return {
      success: true,
      message: 'เชื่อมต่อฐานข้อมูล Supabase PostgreSQL สำเร็จเรียบร้อย!',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `ไม่สามารถเชื่อมต่อได้: ${err.message || 'Network Error'}`,
    };
  }
}

/**
 * Fetch all daily workload records from Supabase
 */
export async function fetchRecordsFromSupabase(): Promise<DailyRecord[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('daily_records')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.warn('Failed to fetch from Supabase daily_records:', error.message);
      return [];
    }

    if (!data || !Array.isArray(data)) return [];

    return data.map((row) => ({
      id: row.id,
      date: row.date,
      recorderName: row.recorder_name || '',
      recorderPosition: row.recorder_position || '',
      recorderPhone: row.recorder_phone || '',
      notes: row.notes || '',
      shiftType: row.shift_type || 'all_day',
      er: row.er || {},
      opd: row.opd || {},
      ipd1: row.ipd1 || {},
      ipd2: row.ipd2 || {},
      lr: row.lr || {},
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    }));
  } catch (err) {
    console.error('Error in fetchRecordsFromSupabase:', err);
    return [];
  }
}

/**
 * Save or update a daily record to Supabase
 */
export async function saveRecordToSupabase(record: DailyRecord): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const row = {
      id: record.id,
      date: record.date,
      recorder_name: record.recorderName || '',
      recorder_position: record.recorderPosition || '',
      recorder_phone: record.recorderPhone || '',
      notes: record.notes || '',
      shift_type: record.shiftType || 'all_day',
      er: record.er,
      opd: record.opd,
      ipd1: record.ipd1,
      ipd2: record.ipd2,
      lr: record.lr,
      updated_at: new Date().toISOString(),
    };

    const { error } = await client
      .from('daily_records')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.error('Failed to save to Supabase daily_records:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error in saveRecordToSupabase:', err);
    return false;
  }
}

/**
 * Delete a daily record from Supabase
 */
export async function deleteRecordFromSupabase(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('daily_records')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete from Supabase daily_records:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error in deleteRecordFromSupabase:', err);
    return false;
  }
}

/**
 * Fetch standard weights config from Supabase
 */
export async function fetchStandardsFromSupabase(): Promise<StandardWeightsConfig | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('standards_config')
      .select('config')
      .eq('id', 'active_config')
      .maybeSingle();

    if (error || !data) {
      return null;
    }
    return data.config as StandardWeightsConfig;
  } catch (err) {
    console.error('Error in fetchStandardsFromSupabase:', err);
    return null;
  }
}

/**
 * Save standard weights config to Supabase
 */
export async function saveStandardsToSupabase(config: StandardWeightsConfig): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('standards_config')
      .upsert(
        {
          id: 'active_config',
          config,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

    if (error) {
      console.error('Failed to save standards to Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error in saveStandardsToSupabase:', err);
    return false;
  }
}

/**
 * Fetch users from Supabase
 */
export async function fetchUsersFromSupabase(): Promise<AppUser[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('hospital_users')
      .select('*')
      .order('created_at', { ascending: true });

    if (error || !data) return [];

    return data.map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      role: u.role,
      department: u.department,
      position: u.position || '',
      avatarColor: u.avatar_color || 'bg-emerald-600',
      phone: u.phone || '',
      password: u.password_hash || undefined,
      isActive: u.is_active !== false,
      createdAt: u.created_at || new Date().toISOString(),
    }));
  } catch (err) {
    console.error('Error in fetchUsersFromSupabase:', err);
    return [];
  }
}

/**
 * Save or update user in Supabase
 */
export async function saveUserToSupabase(user: AppUser): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const row: Record<string, any> = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      department: user.department,
      position: user.position || '',
      avatar_color: user.avatarColor || 'bg-emerald-600',
      phone: user.phone || '',
      password_hash: user.password || '',
      is_active: user.isActive,
      created_at: user.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let { error } = await client
      .from('hospital_users')
      .upsert(row, { onConflict: 'id' });

    // Fallback: If is_active column is missing in user's Supabase schema, retry without it
    if (error && (error.code === 'PGRST204' || error.message?.includes('is_active'))) {
      console.warn('is_active column not found in hospital_users. Retrying without is_active...');
      const fallbackRow = { ...row };
      delete fallbackRow.is_active;

      const retryRes = await client
        .from('hospital_users')
        .upsert(fallbackRow, { onConflict: 'id' });
      error = retryRes.error;
    }

    if (error) {
      console.error('Failed to save user to Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error in saveUserToSupabase:', err);
    return false;
  }
}

/**
 * Delete user from Supabase
 */
export async function deleteUserFromSupabase(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('hospital_users')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete user from Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error in deleteUserFromSupabase:', err);
    return false;
  }
}

/**
 * Synchronize all local storage data to Supabase in bulk
 */
export async function syncAllLocalToSupabase(): Promise<{
  success: boolean;
  recordsCount: number;
  usersCount: number;
  message: string;
}> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      recordsCount: 0,
      usersCount: 0,
      message: 'ยังไม่ได้ระบุ VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY',
    };
  }

  try {
    // 1. Records
    const rawRecs = localStorage.getItem('sangkhlaburi_nursing_records_v2') || '[]';
    const localRecords: DailyRecord[] = JSON.parse(rawRecs);
    let recordsSynced = 0;
    for (const r of localRecords) {
      const ok = await saveRecordToSupabase(r);
      if (ok) recordsSynced++;
    }

    // 2. Standards
    const rawStds = localStorage.getItem('sangkhlaburi_nursing_standards_v2');
    if (rawStds) {
      const localStds = JSON.parse(rawStds);
      await saveStandardsToSupabase(localStds);
    }

    // 3. Users
    const rawUsers = localStorage.getItem('sangkhlaburi_nursing_users_v1') || '[]';
    const localUsers: AppUser[] = JSON.parse(rawUsers);
    let usersSynced = 0;
    for (const u of localUsers) {
      const ok = await saveUserToSupabase(u);
      if (ok) usersSynced++;
    }

    return {
      success: true,
      recordsCount: recordsSynced,
      usersCount: usersSynced,
      message: `ซิงค์ข้อมูลไปยัง Supabase สำเร็จ (เวร ${recordsSynced} รายการ, ผู้ใช้ ${usersSynced} บัญชี)`,
    };
  } catch (err: any) {
    return {
      success: false,
      recordsCount: 0,
      usersCount: 0,
      message: `เกิดข้อผิดพลาดในการซิงค์: ${err.message || 'Unknown error'}`,
    };
  }
}
