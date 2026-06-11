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

// Automatic (nightly cron) session generation settings (AUTOGEN-UI).
// When `enabled`, the server's midnight cron auto-generates sessions from the
// enabled days' work periods through `horizonDays` ahead.
export interface AutoGenerationSettings {
  enabled: boolean;
  durationMinutes: number; // 15-180
  capacity: number; // 1-12 (beds per session)
  horizonDays: number; // 1-28, default 14
}

export interface ScheduleSettingsResponse {
  ok: boolean;
  timezone: string;
  weekStart: 'sunday' | 'saturday' | 'monday';
  days: DaySettings[];
  autoGeneration?: AutoGenerationSettings;
}

export interface UpdateSettingsRequest {
  days: DaySettings[];
  autoGeneration?: AutoGenerationSettings;
}

export interface GenerateSessionsRequest {
  durationMinutes: number;
  dayOfWeeks: number[];
  capacity?: number; // Number of beds (1-12), default 4
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
