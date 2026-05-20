/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { 
  initializeFirestore, 
  doc, 
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  deleteDoc
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Initialize Firestore with strictly forced long polling to ensure reliable connection in sandboxed preview environments
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signIn = () => signInWithPopup(auth, googleProvider);
export const signOut = () => auth.signOut();

export async function deleteUserAccount() {
  const user = auth.currentUser;
  if (!user) throw new Error("No user signed in");

  const uid = user.uid;
  const collections = ['sleepLogs', 'mealLogs', 'activityLogs', 'loopScores', 'nutritionNudges', 'weeklyInsights'];
  
  try {
     // 1. Delete all user-related documents
     for (const collName of collections) {
       const q = query(collection(db, collName), where('userId', '==', uid));
       const snap = await getDocs(q);
       
       // Handle large collections with multiple batches if needed (500 limit)
       let count = 0;
       let batch = writeBatch(db);
       
       for (const doc of snap.docs) {
         batch.delete(doc.ref);
         count++;
         if (count === 500) {
           await batch.commit();
           batch = writeBatch(db);
           count = 0;
         }
       }
       if (count > 0) await batch.commit();
     }

     // 2. Delete user profile
     await deleteDoc(doc(db, 'users', uid));

     // 3. Delete auth user
     await user.delete();
     
     console.log("Account and all data deleted successfully");
  } catch (err) {
    console.error("Deletion error:", err);
    if (err && typeof err === 'object' && 'code' in err && err.code === 'auth/requires-recent-login') {
      // eslint-disable-next-line preserve-caught-error
      throw new Error("REAUTH_REQUIRED");
    }
    throw err;
  }
}

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
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
