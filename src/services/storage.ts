import { User, Expense } from '../types';
import { deduplicateCustomCategories, normalizeCategoryInput } from '../utils/categories';
import { getLocalTodayDateString } from '../utils/dates';
import {
  auth,
  saveUserToFirestore,
  addExpenseToFirestore,
  updateExpenseInFirestore,
  deleteExpenseFromFirestore,
  getUserFromFirestore,
  getExpensesFromFirestore,
} from './firebase';

const USERS_KEY = 'monthly_expense_tracker_users';
const SESSION_KEY = 'monthly_expense_tracker_active_user_id';
const EXPENSES_PREFIX = 'monthly_expense_tracker_expenses_';
const CUSTOM_CATEGORIES_PREFIX = 'monthly_expense_tracker_custom_categories_';

// Initial check (no forced mock demo user created)
export function initSeedDataIfEmpty(): void {
  // Clean initialization without injecting demo accounts
}

export function getUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveUser(user: User): void {
  const users = getUsers();
  const index = users.findIndex((u) => u.id === user.id);
  if (index >= 0) {
    users[index] = user;
  } else {
    users.push(user);
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(users));

  // Sync to Firebase Firestore if authenticated with Firebase
  if (auth.currentUser && auth.currentUser.uid === user.id) {
    saveUserToFirestore(user).catch((err) => {
      console.warn('Could not sync user to Firestore:', err);
    });
  }
}

export function findUserByEmail(email: string): User | undefined {
  const users = getUsers();
  return users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
}

export function getActiveSessionUserId(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function setActiveSessionUserId(userId: string | null): void {
  try {
    if (userId) {
      localStorage.setItem(SESSION_KEY, userId);
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  } catch (err) {
    console.error('Failed to set active session:', err);
  }
}

export function getCurrentUser(): User | null {
  const userId = getActiveSessionUserId();
  if (!userId) return null;
  const users = getUsers();
  return users.find((u) => u.id === userId) || null;
}

export function getUserExpenses(userId: string): Expense[] {
  try {
    const raw = localStorage.getItem(`${EXPENSES_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveUserExpenses(userId: string, expenses: Expense[]): void {
  try {
    localStorage.setItem(`${EXPENSES_PREFIX}${userId}`, JSON.stringify(expenses));
  } catch (err) {
    console.error('Failed to save expenses:', err);
  }
}

export function getUserCustomCategories(userId: string): string[] {
  try {
    const raw = localStorage.getItem(`${CUSTOM_CATEGORIES_PREFIX}${userId}`);
    const stored: string[] = raw ? JSON.parse(raw) : [];
    // Also scan existing expenses for any custom categories
    const expenses = getUserExpenses(userId);
    const fromExpenses = expenses.map((e) => e.category);
    return deduplicateCustomCategories([...stored, ...fromExpenses]);
  } catch {
    return [];
  }
}

export function saveUserCustomCategory(userId: string, category: string): void {
  try {
    const existing = getUserCustomCategories(userId);
    const normalized = normalizeCategoryInput(category, existing);
    if (normalized === 'Other') return;

    const merged = deduplicateCustomCategories([...existing, normalized]);
    localStorage.setItem(`${CUSTOM_CATEGORIES_PREFIX}${userId}`, JSON.stringify(merged));

    // Sync custom categories to user's Firestore document
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.id === userId && auth.currentUser && auth.currentUser.uid === userId) {
      const updatedUser: User = {
        ...currentUser,
        customCategories: merged,
      };
      saveUserToFirestore(updatedUser).catch((err) => {
        console.warn('Could not sync custom categories to Firestore:', err);
      });
    }
  } catch (err) {
    console.error('Failed to save custom category:', err);
  }
}

export function addExpense(
  userId: string,
  expense: Omit<Expense, 'id' | 'userId' | 'createdAt'>
): Expense {
  const expenses = getUserExpenses(userId);
  const userCustom = getUserCustomCategories(userId);
  const normalizedCategory = normalizeCategoryInput(expense.category, userCustom);

  const newExpense: Expense = {
    ...expense,
    category: normalizedCategory,
    id: 'exp_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
    userId,
    createdAt: new Date().toISOString(),
  };

  expenses.unshift(newExpense);
  saveUserExpenses(userId, expenses);

  if (normalizedCategory !== 'Other') {
    saveUserCustomCategory(userId, normalizedCategory);
  }

  // Push to Firebase Firestore
  if (auth.currentUser && auth.currentUser.uid === userId) {
    addExpenseToFirestore(userId, newExpense).catch((err) => {
      console.warn('Failed to add expense to Firestore:', err);
    });
  }

  return newExpense;
}

export function updateExpense(userId: string, updated: Expense): void {
  const expenses = getUserExpenses(userId);
  const index = expenses.findIndex((e) => e.id === updated.id);
  if (index >= 0) {
    const userCustom = getUserCustomCategories(userId);
    const normalizedCategory = normalizeCategoryInput(updated.category, userCustom);

    // Keep the original createdAt timestamp
    const originalCreatedAt = expenses[index].createdAt || updated.createdAt || new Date().toISOString();

    const fullyUpdated: Expense = {
      ...updated,
      category: normalizedCategory,
      createdAt: originalCreatedAt,
    };

    expenses[index] = fullyUpdated;
    saveUserExpenses(userId, expenses);

    if (normalizedCategory !== 'Other') {
      saveUserCustomCategory(userId, normalizedCategory);
    }

    // Push update to Firebase Firestore
    if (auth.currentUser && auth.currentUser.uid === userId) {
      updateExpenseInFirestore(userId, fullyUpdated).catch((err) => {
        console.warn('Failed to update expense in Firestore:', err);
      });
    }
  }
}

export function deleteExpense(userId: string, expenseId: string): void {
  const expenses = getUserExpenses(userId);
  const filtered = expenses.filter((e) => e.id !== expenseId);
  saveUserExpenses(userId, filtered);

  // Push deletion to Firebase Firestore
  if (auth.currentUser && auth.currentUser.uid === userId) {
    deleteExpenseFromFirestore(userId, expenseId).catch((err) => {
      console.warn('Failed to delete expense from Firestore:', err);
    });
  }
}

// Cloud sync helper: pull user data & expenses from Firestore and store in local cache
export async function syncFromFirestore(userId: string): Promise<{ user: User | null; expenses: Expense[] }> {
  try {
    const [cloudUser, cloudExpenses] = await Promise.all([
      getUserFromFirestore(userId),
      getExpensesFromFirestore(userId),
    ]);

    if (cloudUser) {
      saveUser(cloudUser);
      if (cloudUser.customCategories) {
        localStorage.setItem(
          `${CUSTOM_CATEGORIES_PREFIX}${userId}`,
          JSON.stringify(cloudUser.customCategories)
        );
      }
    }
    if (cloudExpenses && cloudExpenses.length > 0) {
      saveUserExpenses(userId, cloudExpenses);
    }

    return { user: cloudUser, expenses: cloudExpenses || [] };
  } catch (err) {
    console.error('Error synchronizing from Firestore:', err);
    return { user: null, expenses: [] };
  }
}

// Backup Export & Import (JSON)
export function exportUserDataBackup(user: User): void {
  const expenses = getUserExpenses(user.id);
  const customCategories = getUserCustomCategories(user.id);

  const backupPayload = {
    app: 'monthly-expense-tracker',
    version: 1,
    exportedAt: new Date().toISOString(),
    user: {
      name: user.name,
      email: user.email,
      monthlyBudget: user.monthlyBudget,
      currency: user.currency,
      profileCompleted: user.profileCompleted,
    },
    customCategories,
    expenses,
  };

  const jsonString = JSON.stringify(backupPayload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const dateStr = getLocalTodayDateString();
  link.download = `monthly_expense_backup_${user.name.toLowerCase().replace(/\s+/g, '_')}_${dateStr}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface BackupValidationResult {
  valid: boolean;
  error?: string;
  data?: {
    user: {
      name: string;
      email?: string;
      monthlyBudget: number;
      currency: string;
      profileCompleted?: boolean;
    };
    expenses: Expense[];
    customCategories?: string[];
  };
}

export function validateBackupData(parsed: any): BackupValidationResult {
  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, error: 'Backup file must contain valid JSON.' };
  }

  if (!parsed.user || typeof parsed.user !== 'object') {
    return { valid: false, error: 'Backup file is missing user profile data.' };
  }

  if (typeof parsed.user.name !== 'string' || !parsed.user.name.trim()) {
    return { valid: false, error: 'Backup profile has an invalid user name.' };
  }

  if (typeof parsed.user.monthlyBudget !== 'number' || parsed.user.monthlyBudget <= 0) {
    return { valid: false, error: 'Backup profile has an invalid monthly budget.' };
  }

  if (typeof parsed.user.currency !== 'string') {
    return { valid: false, error: 'Backup profile has an invalid currency code.' };
  }

  if (!Array.isArray(parsed.expenses)) {
    return { valid: false, error: 'Backup file is missing expenses array.' };
  }

  for (const exp of parsed.expenses) {
    if (!exp.name || typeof exp.name !== 'string') {
      return { valid: false, error: 'One or more expenses has an invalid name.' };
    }
    if (typeof exp.amount !== 'number' || isNaN(exp.amount)) {
      return { valid: false, error: 'One or more expenses has an invalid amount.' };
    }
    if (!exp.date || typeof exp.date !== 'string') {
      return { valid: false, error: 'One or more expenses has an invalid date.' };
    }
  }

  return {
    valid: true,
    data: {
      user: {
        name: parsed.user.name.trim(),
        email: parsed.user.email,
        monthlyBudget: parsed.user.monthlyBudget,
        currency: parsed.user.currency,
        profileCompleted: parsed.user.profileCompleted ?? true,
      },
      expenses: parsed.expenses,
      customCategories: Array.isArray(parsed.customCategories) ? parsed.customCategories : [],
    },
  };
}

export function importUserDataBackup(
  currentUserId: string,
  backupData: NonNullable<BackupValidationResult['data']>
): User {
  const users = getUsers();
  const existingUserIndex = users.findIndex((u) => u.id === currentUserId);
  const currentUser = users[existingUserIndex];

  const updatedUser: User = {
    id: currentUserId,
    name: backupData.user.name,
    email: currentUser ? currentUser.email : (backupData.user.email || 'user@example.com'),
    password: currentUser ? currentUser.password : 'password123',
    monthlyBudget: backupData.user.monthlyBudget,
    currency: backupData.user.currency,
    profileCompleted: true,
    createdAt: currentUser ? currentUser.createdAt : new Date().toISOString(),
  };

  saveUser(updatedUser);

  // Map expenses to target user ID
  const normalizedExpenses: Expense[] = backupData.expenses.map((e, idx) => ({
    id: e.id || `exp_imported_${Date.now()}_${idx}`,
    userId: currentUserId,
    name: e.name.trim(),
    amount: e.amount,
    category: e.category,
    date: e.date,
    notes: e.notes,
    createdAt: e.createdAt || new Date().toISOString(),
  }));

  saveUserExpenses(currentUserId, normalizedExpenses);

  // Save custom categories
  const customCats = deduplicateCustomCategories([
    ...(backupData.customCategories || []),
    ...normalizedExpenses.map((e) => e.category),
  ]);
  localStorage.setItem(`${CUSTOM_CATEGORIES_PREFIX}${currentUserId}`, JSON.stringify(customCats));

  // If user is a Firebase user, upload to Firestore
  if (auth.currentUser && auth.currentUser.uid === currentUserId) {
    saveUserToFirestore(updatedUser).catch(console.warn);
    for (const exp of normalizedExpenses) {
      addExpenseToFirestore(currentUserId, exp).catch(console.warn);
    }
  }

  return updatedUser;
}
