import { ExpenseCategory, StandardCategory } from '../types';
import {
  Utensils,
  Car,
  Home,
  Receipt,
  ShoppingBag,
  Film,
  HeartPulse,
  MoreHorizontal,
  Tag,
  LucideIcon,
} from 'lucide-react';

export interface CategoryMeta {
  category: ExpenseCategory;
  label: string;
  icon: LucideIcon;
  color: string;
  textColor: string;
  fillColor: string;
  borderColor: string;
}

export const CATEGORY_METAS: Record<StandardCategory, CategoryMeta> = {
  Food: {
    category: 'Food',
    label: 'Food & Dining',
    icon: Utensils,
    color: 'bg-emerald-50 text-emerald-700',
    textColor: 'text-emerald-700',
    fillColor: '#059669',
    borderColor: 'border-emerald-200',
  },
  Transport: {
    category: 'Transport',
    label: 'Transport',
    icon: Car,
    color: 'bg-sky-50 text-sky-700',
    textColor: 'text-sky-700',
    fillColor: '#0284c7',
    borderColor: 'border-sky-200',
  },
  Rent: {
    category: 'Rent',
    label: 'Rent & Housing',
    icon: Home,
    color: 'bg-teal-50 text-teal-800',
    textColor: 'text-teal-800',
    fillColor: '#0d9488',
    borderColor: 'border-teal-200',
  },
  Bills: {
    category: 'Bills',
    label: 'Bills & Utilities',
    icon: Receipt,
    color: 'bg-amber-50 text-amber-700',
    textColor: 'text-amber-700',
    fillColor: '#d97706',
    borderColor: 'border-amber-200',
  },
  Shopping: {
    category: 'Shopping',
    label: 'Shopping',
    icon: ShoppingBag,
    color: 'bg-rose-50 text-rose-700',
    textColor: 'text-rose-700',
    fillColor: '#e11d48',
    borderColor: 'border-rose-200',
  },
  Entertainment: {
    category: 'Entertainment',
    label: 'Entertainment',
    icon: Film,
    color: 'bg-purple-50 text-purple-700',
    textColor: 'text-purple-700',
    fillColor: '#9333ea',
    borderColor: 'border-purple-200',
  },
  Health: {
    category: 'Health',
    label: 'Health & Medical',
    icon: HeartPulse,
    color: 'bg-cyan-50 text-cyan-700',
    textColor: 'text-cyan-700',
    fillColor: '#0891b2',
    borderColor: 'border-cyan-200',
  },
  Other: {
    category: 'Other',
    label: 'Other Expenses',
    icon: MoreHorizontal,
    color: 'bg-slate-100 text-slate-700',
    textColor: 'text-slate-700',
    fillColor: '#64748b',
    borderColor: 'border-slate-200',
  },
};

export const CORE_CATEGORIES: StandardCategory[] = [
  'Food',
  'Transport',
  'Rent',
  'Bills',
  'Shopping',
  'Entertainment',
  'Health',
];

export const ALL_CATEGORIES: StandardCategory[] = [
  ...CORE_CATEGORIES,
  'Other',
];

// Rich, distinct color palette for custom categories
const DYNAMIC_PALETTE = [
  { fillColor: '#6366f1', color: 'bg-indigo-50 text-indigo-700', textColor: 'text-indigo-700', borderColor: 'border-indigo-200' },
  { fillColor: '#84cc16', color: 'bg-lime-50 text-lime-700', textColor: 'text-lime-700', borderColor: 'border-lime-200' },
  { fillColor: '#d946ef', color: 'bg-fuchsia-50 text-fuchsia-700', textColor: 'text-fuchsia-700', borderColor: 'border-fuchsia-200' },
  { fillColor: '#ea580c', color: 'bg-orange-50 text-orange-700', textColor: 'text-orange-700', borderColor: 'border-orange-200' },
  { fillColor: '#14b8a6', color: 'bg-teal-50 text-teal-700', textColor: 'text-teal-700', borderColor: 'border-teal-200' },
  { fillColor: '#ec4899', color: 'bg-pink-50 text-pink-700', textColor: 'text-pink-700', borderColor: 'border-pink-200' },
  { fillColor: '#8b5cf6', color: 'bg-violet-50 text-violet-700', textColor: 'text-violet-700', borderColor: 'border-violet-200' },
  { fillColor: '#ca8a04', color: 'bg-yellow-50 text-yellow-800', textColor: 'text-yellow-800', borderColor: 'border-yellow-200' },
  { fillColor: '#2563eb', color: 'bg-blue-50 text-blue-700', textColor: 'text-blue-700', borderColor: 'border-blue-200' },
  { fillColor: '#0d9488', color: 'bg-teal-50 text-teal-700', textColor: 'text-teal-700', borderColor: 'border-teal-200' },
  { fillColor: '#0284c7', color: 'bg-sky-50 text-sky-700', textColor: 'text-sky-700', borderColor: 'border-sky-200' },
  { fillColor: '#78716c', color: 'bg-stone-50 text-stone-700', textColor: 'text-stone-700', borderColor: 'border-stone-200' },
];

/**
 * Deduplicates custom categories case-insensitively, keeping the first spelling.
 * Excludes standard categories and 'Other' (case-insensitive).
 */
export function deduplicateCustomCategories(categories: string[]): string[] {
  const seenLower = new Set<string>();
  ALL_CATEGORIES.forEach((c) => seenLower.add(c.toLowerCase()));

  const result: string[] = [];
  for (const cat of categories) {
    const trimmed = (cat || '').trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();
    if (!seenLower.has(lower)) {
      seenLower.add(lower);
      result.push(trimmed);
    }
  }
  return result;
}

/**
 * Normalizes a custom category input:
 * If user typed "Other" (case-insensitive), treat it as normal "Other".
 * If it matches an existing custom category case-insensitively, reuse the existing spelling.
 * If it matches a standard category case-insensitively, return that standard category.
 */
export function normalizeCategoryInput(input: string, existingCustomCategories: string[] = []): string {
  const trimmed = (input || '').trim();
  if (!trimmed) return 'Other';
  const lower = trimmed.toLowerCase();

  if (lower === 'other') return 'Other';

  for (const std of ALL_CATEGORIES) {
    if (std.toLowerCase() === lower) return std;
  }

  for (const existing of existingCustomCategories) {
    if (existing.toLowerCase() === lower) return existing;
  }

  return trimmed;
}

/**
 * Returns options for the Category dropdown:
 * Core categories -> User's previously used custom categories -> 'Other'
 */
export function getCategoryDropdownOptions(userCustomCategories: string[] = []): string[] {
  const dedupedCustom = deduplicateCustomCategories(userCustomCategories);
  return [...CORE_CATEGORIES, ...dedupedCustom, 'Other'];
}

export function getCategoryMeta(categoryName: string): CategoryMeta {
  const trimmed = (categoryName || '').trim();
  const lower = trimmed.toLowerCase();

  // Check exact or case-insensitive match against standard categories
  for (const std of ALL_CATEGORIES) {
    if (std.toLowerCase() === lower) {
      return CATEGORY_METAS[std];
    }
  }

  // Generate deterministic index based on lowercase string hash for consistent colors
  let hash = 0;
  for (let i = 0; i < lower.length; i++) {
    hash = lower.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % DYNAMIC_PALETTE.length;
  const palette = DYNAMIC_PALETTE[index];

  return {
    category: trimmed,
    label: trimmed,
    icon: Tag,
    color: palette.color,
    textColor: palette.textColor,
    fillColor: palette.fillColor,
    borderColor: palette.borderColor,
  };
}
