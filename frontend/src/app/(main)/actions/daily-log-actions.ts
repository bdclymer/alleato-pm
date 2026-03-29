"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createDailyLog(params: {
  projectId: number;
  logDate: string; // YYYY-MM-DD
  weatherConditions?: unknown;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_logs")
    .insert({
      project_id: params.projectId,
      log_date: params.logDate,
      weather_conditions: params.weatherConditions ?? null,
    })
    .select()
    .single();
  if (error) return { error: error.message };
  revalidatePath(`/${params.projectId}/daily-log`);
  return { success: true, data } as const;
}

export async function createDailyLogManpower(params: {
  dailyLogId: string;
  companyId?: string;
  trade?: string;
  workersCount: number;
  hoursWorked?: number;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_log_manpower")
    .insert({
      daily_log_id: params.dailyLogId,
      company_id: params.companyId ?? null,
      trade: params.trade ?? null,
      workers_count: params.workersCount,
      hours_worked: params.hoursWorked ?? null,
    })
    .select()
    .single();
  if (error) return { error: error.message };
  revalidatePath(`/`); // generic revalidate; parent page should also revalidate
  return { success: true, data } as const;
}

export async function createDailyLogEquipment(params: {
  dailyLogId: string;
  equipmentName: string;
  hoursOperated?: number;
  hoursIdle?: number;
  notes?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_log_equipment")
    .insert({
      daily_log_id: params.dailyLogId,
      equipment_name: params.equipmentName,
      hours_operated: params.hoursOperated ?? null,
      hours_idle: params.hoursIdle ?? null,
      notes: params.notes ?? null,
    })
    .select()
    .single();
  if (error) return { error: error.message };
  revalidatePath(`/`);
  return { success: true, data } as const;
}

export async function createDailyLogNote(params: {
  dailyLogId: string;
  category?: string;
  description: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_log_notes")
    .insert({
      daily_log_id: params.dailyLogId,
      category: params.category ?? null,
      description: params.description,
    })
    .select()
    .single();
  if (error) return { error: error.message };
  revalidatePath(`/`);
  return { success: true, data } as const;
}
