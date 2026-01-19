// src/utils/formatPrice.ts
// Price formatting utilities for subscription system
// All prices are stored as integer agorot in DB (25000 = 250 NIS, 45000 = 450 NIS)

/**
 * Convert agorot (integer) to formatted NIS string for display
 * @param amountAgorot - Price in agorot (e.g., 25000 for 250 NIS)
 * @returns Formatted string (e.g., "250 ₪")
 */
export function formatAgorotToNis(amountAgorot: number): string {
  // Convert to NIS (no decimals since our prices are whole numbers)
  const nis = Math.round(amountAgorot / 100);
  return `${nis} ₪`;
}

/**
 * Get just the numeric NIS value from agorot
 * @param amountAgorot - Price in agorot (e.g., 25000 for 250 NIS)
 * @returns Number in NIS (e.g., 250)
 */
export function agorotToNis(amountAgorot: number): number {
  return Math.round(amountAgorot / 100);
}
