/**
 * Shared utilities for the Room module.
 */

export const AVATAR_COLORS = [
  '#2563eb', '#16a34a', '#ea580c', '#7c3aed', '#db2777', '#0891b2', '#d97706',
];

/**
 * Deterministic avatar background colour based on username.
 */
export function getAvatarColor(username = '') {
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash += username.charCodeAt(i);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
