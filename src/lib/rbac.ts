/**
 * RBAC helpers for BuzzNa UI
 * - Provides a simple, case-insensitive role check used by components.
 * - Matches the User.role values defined in src/types.ts ('OWNER' | 'MANAGER' | 'CASHIER').
 */

import { User } from '../types';

function normalizeRole(r?: string | null): string {
  return (r || '').toString().trim().toUpperCase();
}

/**
 * Returns true if the provided user has any of the allowed roles.
 *
 * Usage:
 *   hasRole(currentUser, 'owner', 'manager')
 *   hasRole(currentUser, 'OWNER')
 */
export function hasRole(user: User | null | undefined, ...allowedRoles: Array<string>): boolean {
  if (!user) return false;
  const userRole = normalizeRole(user.role as unknown as string);
  return allowedRoles.some(r => normalizeRole(r) === userRole);
}

// Convenience helpers (optional)
export const isOwner = (user?: User | null) => hasRole(user, 'OWNER');
export const isManager = (user?: User | null) => hasRole(user, 'MANAGER');
export const isCashier = (user?: User | null) => hasRole(user, 'CASHIER');
