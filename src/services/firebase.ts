import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { User, Expense } from '../types';

// 1. Initialize Firebase App & Services
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// 2. Validate Connection to Firestore on Boot
async function testConnection() {
  try {
    if (db) {
      await getDocFromServer(doc(db, 'test', 'connection'));
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or connecting.');
    }
    // Silently continue so initial UI boot is never blocked
  }
}
testConnection();

// 3. Error Handling conforming to FirestoreErrorInfo
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// 4. Authentication Methods
const googleProvider = new GoogleAuthProvider();

export async function loginWithGoogle(): Promise<User> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    const fbUser = cred.user;
    
    // Check if user already exists in Firestore
    const existingDoc = await getUserFromFirestore(fbUser.uid);
    if (existingDoc) {
      return existingDoc;
    }

    // Create fresh user in Firestore
    const newUser: User = {
      id: fbUser.uid,
      name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
      email: fbUser.email || '',
      monthlyBudget: 0,
      currency: 'INR',
      profileCompleted: false,
      createdAt: new Date().toISOString(),
      customCategories: [],
      photoURL: fbUser.photoURL || undefined,
      isFirebaseUser: true,
    };

    await saveUserToFirestore(newUser);
    return newUser;
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
}

export async function logoutFirebase(): Promise<void> {
  await signOut(auth);
}

export function onFirebaseAuthStateChange(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// 5. Firestore User Operations (/users/{userId})
export async function getUserFromFirestore(userId: string): Promise<User | null> {
  const path = `users/${userId}`;
  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: userId,
      name: data.name || '',
      email: data.email || '',
      monthlyBudget: typeof data.monthlyBudget === 'number' ? data.monthlyBudget : 0,
      currency: data.currency || 'INR',
      profileCompleted: Boolean(data.profileCompleted),
      createdAt: data.createdAt || new Date().toISOString(),
      customCategories: Array.isArray(data.customCategories) ? data.customCategories : [],
      photoURL: data.photoURL,
      isFirebaseUser: true,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function saveUserToFirestore(user: User): Promise<void> {
  const path = `users/${user.id}`;
  try {
    const userRef = doc(db, 'users', user.id);
    const payload: Record<string, any> = {
      name: user.name.slice(0, 100),
      email: user.email.slice(0, 150),
      monthlyBudget: Number(user.monthlyBudget) || 0,
      currency: user.currency.slice(0, 10),
      profileCompleted: Boolean(user.profileCompleted),
      createdAt: user.createdAt || new Date().toISOString(),
    };
    if (user.customCategories && Array.isArray(user.customCategories)) {
      payload.customCategories = user.customCategories.slice(0, 50);
    }
    if (user.photoURL) {
      payload.photoURL = user.photoURL;
    }
    await setDoc(userRef, payload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// 6. Firestore Expenses Operations (/users/{userId}/expenses/{expenseId})
export async function getExpensesFromFirestore(userId: string): Promise<Expense[]> {
  const path = `users/${userId}/expenses`;
  try {
    const colRef = collection(db, 'users', userId, 'expenses');
    const snap = await getDocs(query(colRef, orderBy('date', 'desc')));
    return snap.docs.map((docSnap) => {
      const d = docSnap.data();
      return {
        id: docSnap.id,
        userId,
        name: d.name,
        amount: d.amount,
        category: d.category,
        date: d.date,
        notes: d.notes || '',
        createdAt: d.createdAt || new Date().toISOString(),
      };
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function addExpenseToFirestore(userId: string, expense: Expense): Promise<Expense> {
  const path = `users/${userId}/expenses/${expense.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'expenses', expense.id);
    const payload = {
      userId,
      name: expense.name.slice(0, 150),
      amount: Number(expense.amount),
      category: expense.category.slice(0, 50),
      date: expense.date,
      notes: expense.notes ? expense.notes.slice(0, 300) : '',
      createdAt: expense.createdAt || new Date().toISOString(),
    };
    await setDoc(docRef, payload);
    return expense;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateExpenseInFirestore(userId: string, expense: Expense): Promise<void> {
  const path = `users/${userId}/expenses/${expense.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'expenses', expense.id);
    const payload = {
      userId,
      name: expense.name.slice(0, 150),
      amount: Number(expense.amount),
      category: expense.category.slice(0, 50),
      date: expense.date,
      notes: expense.notes ? expense.notes.slice(0, 300) : '',
      createdAt: expense.createdAt,
    };
    await setDoc(docRef, payload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteExpenseFromFirestore(userId: string, expenseId: string): Promise<void> {
  const path = `users/${userId}/expenses/${expenseId}`;
  try {
    const docRef = doc(db, 'users', userId, 'expenses', expenseId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export function subscribeToUserExpenses(
  userId: string,
  onUpdate: (expenses: Expense[]) => void,
  onError?: (err: unknown) => void
) {
  const path = `users/${userId}/expenses`;
  const colRef = collection(db, 'users', userId, 'expenses');
  const q = query(colRef, orderBy('date', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: Expense[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          userId,
          name: d.name,
          amount: d.amount,
          category: d.category,
          date: d.date,
          notes: d.notes || '',
          createdAt: d.createdAt || new Date().toISOString(),
        };
      });
      onUpdate(items);
    },
    (err) => {
      if (onError) {
        onError(err);
      }
      handleFirestoreError(err, OperationType.GET, path);
    }
  );
}
