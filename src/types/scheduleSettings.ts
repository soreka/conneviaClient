// src/types/scheduleSettings.ts

export interface WorkPeriod {
  id: string;
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
}

export interface DaySettings {
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  enabled: boolean;
  workPeriods: WorkPeriod[];
}

export interface ScheduleSettingsResponse {
  ok: boolean;
  timezone: string;
  weekStart: 'sunday' | 'saturday' | 'monday';
  days: DaySettings[];
}

export interface UpdateSettingsRequest {
  days: DaySettings[];
}

export interface GenerateSessionsRequest {
  durationMinutes: number;
  dayOfWeeks: number[];
  range?: {
    startDate?: string; // YYYY-MM-DD
    weeks?: number;
  };
  dryRun?: boolean;
}

export interface GenerateSessionsResponse {
  ok: boolean;
  created: number;
  skipped: number;
  wouldCreate?: number;
  details: Array<{
    dayOfWeek: number;
    periodId: string;
    created: number;
    skipped: number;
  }>;
}

// Arabic day names mapping
export const ARABIC_DAY_NAMES: Record<number, string> = {
  0: 'الأحد',
  1: 'الإثنين',
  2: 'الثلاثاء',
  3: 'الأربعاء',
  4: 'الخميس',
  5: 'الجمعة',
  6: 'السبت',
};

// Duration presets
export const DURATION_PRESETS = [
  { value: 45, label: '45 دقيقة' },
  { value: 60, label: '60 دقيقة' },
  { value: 90, label: '90 دقيقة' },
  { value: 0, label: 'مخصص' },
];
