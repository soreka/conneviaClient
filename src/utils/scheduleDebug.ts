// src/utils/scheduleDebug.ts
// Dev-only verification helper for schedule data consistency

import { SessionCore, WEEKDAY_ORDER } from '../types/scheduleCore';

/**
 * Validation result for a single session
 */
export interface SessionValidationResult {
  sessionId: string;
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * Comparison result between consumer and admin sessions
 */
export interface SessionComparisonResult {
  sessionId: string;
  matches: boolean;
  differences: {
    field: string;
    consumer: any;
    admin: any;
  }[];
}

/**
 * Validate a single session for data integrity
 */
export const validateSession = (session: SessionCore): SessionValidationResult => {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check occupiedCount <= capacityTotal
  if (session.occupiedCount > session.capacityTotal) {
    errors.push(
      `[ERROR] occupiedCount (${session.occupiedCount}) > capacityTotal (${session.capacityTotal})`
    );
  }

  // Check startTime < endTime
  const [startH, startM] = session.startTime.split(':').map(Number);
  const [endH, endM] = session.endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes >= endMinutes) {
    errors.push(
      `[ERROR] startTime (${session.startTime}) >= endTime (${session.endTime})`
    );
  }

  // Check valid weekday
  if (!WEEKDAY_ORDER.includes(session.weekday)) {
    errors.push(`[ERROR] Unknown weekday: ${session.weekday}`);
  }

  // Check time format
  if (!/^\d{2}:\d{2}$/.test(session.startTime)) {
    warnings.push(`[WARN] startTime format invalid: ${session.startTime}`);
  }
  if (!/^\d{2}:\d{2}$/.test(session.endTime)) {
    warnings.push(`[WARN] endTime format invalid: ${session.endTime}`);
  }

  // Check required fields
  if (!session.id) {
    errors.push('[ERROR] Missing session id');
  }
  if (!session.titleAr) {
    warnings.push('[WARN] Missing titleAr');
  }
  if (session.capacityTotal <= 0) {
    warnings.push(`[WARN] capacityTotal is ${session.capacityTotal}`);
  }

  return {
    sessionId: session.id,
    isValid: errors.length === 0,
    warnings,
    errors,
  };
};

/**
 * Compare a consumer session with an admin session
 */
export const compareSessions = (
  consumer: SessionCore,
  admin: SessionCore
): SessionComparisonResult => {
  const differences: SessionComparisonResult['differences'] = [];

  const fieldsToCompare: (keyof SessionCore)[] = [
    'weekday',
    'startTime',
    'endTime',
    'capacityTotal',
    'occupiedCount',
    'titleAr',
  ];

  for (const field of fieldsToCompare) {
    if (consumer[field] !== admin[field]) {
      differences.push({
        field,
        consumer: consumer[field],
        admin: admin[field],
      });
    }
  }

  return {
    sessionId: consumer.id,
    matches: differences.length === 0,
    differences,
  };
};

/**
 * Log session validation results (dev only)
 */
export const logSessionValidation = (session: SessionCore): void => {
  if (!__DEV__) return;

  const result = validateSession(session);

  if (!result.isValid || result.warnings.length > 0) {
    console.group(`[Schedule Debug] Session ${session.id}`);
    
    if (result.errors.length > 0) {
      console.error('Errors:', result.errors);
    }
    
    if (result.warnings.length > 0) {
      console.warn('Warnings:', result.warnings);
    }
    
    console.log('Session data:', {
      id: session.id,
      weekday: session.weekday,
      startTime: session.startTime,
      endTime: session.endTime,
      capacityTotal: session.capacityTotal,
      occupiedCount: session.occupiedCount,
      titleAr: session.titleAr,
    });
    
    console.groupEnd();
  }
};

/**
 * Log comparison between consumer and admin sessions (dev only)
 */
export const logSessionComparison = (
  consumer: SessionCore,
  admin: SessionCore
): void => {
  if (!__DEV__) return;

  const result = compareSessions(consumer, admin);

  if (!result.matches) {
    console.group(`[Schedule Debug] Session Mismatch: ${result.sessionId}`);
    
    console.warn('Differences found:');
    result.differences.forEach((diff) => {
      console.log(`  ${diff.field}:`);
      console.log(`    Consumer: ${JSON.stringify(diff.consumer)}`);
      console.log(`    Admin:    ${JSON.stringify(diff.admin)}`);
    });
    
    console.groupEnd();
  }
};

/**
 * Validate all sessions in an array (dev only)
 */
export const validateSessions = (sessions: SessionCore[]): {
  totalCount: number;
  validCount: number;
  invalidCount: number;
  results: SessionValidationResult[];
} => {
  const results = sessions.map(validateSession);
  const validCount = results.filter((r) => r.isValid).length;

  if (__DEV__) {
    console.log(`[Schedule Debug] Validated ${sessions.length} sessions:`);
    console.log(`  Valid: ${validCount}`);
    console.log(`  Invalid: ${sessions.length - validCount}`);

    // Log details for invalid sessions
    results
      .filter((r) => !r.isValid)
      .forEach((r) => {
        console.error(`Session ${r.sessionId}:`, r.errors);
      });
  }

  return {
    totalCount: sessions.length,
    validCount,
    invalidCount: sessions.length - validCount,
    results,
  };
};

/**
 * Debug helper to log raw API response (dev only)
 */
export const logApiResponse = (label: string, data: any): void => {
  if (!__DEV__) return;

  console.group(`[Schedule Debug] API Response: ${label}`);
  console.log(JSON.stringify(data, null, 2));
  console.groupEnd();
};
