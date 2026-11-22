/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  getDocFromServer,
  setDoc, 
  onSnapshot, 
  Firestore 
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { CBTAppState, AdminConfig, Question, Participant } from './types';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with custom databaseId if provided
export const db: Firestore = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);
export const auth = getAuth(app);

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
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

/**
 * Recursively remove undefined values so Firestore setDoc never rejects objects/arrays
 * containing optional properties set to undefined (e.g. options?: ..., image?: ...).
 */
export function sanitizeForFirestore<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .filter(item => item !== undefined)
      .map(item => sanitizeForFirestore(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const cleaned: Record<string, any> = {};
    Object.entries(value as Record<string, any>).forEach(([key, val]) => {
      if (val !== undefined) {
        cleaned[key] = sanitizeForFirestore(val);
      }
    });
    return cleaned as T;
  }
  return value;
}

const CBT_STATE_DOC = 'cbt_main_state';
const CBT_COLLECTION = 'cbt_system';

// Known default dummy participant IDs from initialData
const DUMMY_PARTICIPANT_IDS = new Set(['P01', 'P02', 'P03', 'P04', 'P05']);
// Known default dummy question IDs from initialData
const DUMMY_QUESTION_IDS = new Set(['Q01', 'Q02', 'Q03', 'Q04', 'Q05', 'Q06', 'Q07', 'Q08']);

/**
 * Check if a participant array is merely the initial default dummy seed
 */
export function isDummyParticipantList(list?: any[]): boolean {
  if (!list || list.length === 0) return true;
  if (list.length <= 5 && list.every(p => DUMMY_PARTICIPANT_IDS.has(p.id))) {
    return true;
  }
  return false;
}

/**
 * Check if a question array is merely the initial default dummy seed
 */
export function isDummyQuestionList(list?: any[]): boolean {
  if (!list || list.length === 0) return true;
  if (list.length <= 8 && list.every(q => DUMMY_QUESTION_IDS.has(q.id))) {
    return true;
  }
  return false;
}

/**
 * Emergency local backup keeper - ensures questions and participants are NEVER lost
 */
export function saveEmergencyLocalBackup(data: Partial<CBTAppState>) {
  if (typeof localStorage === 'undefined') return;
  try {
    if (data.participants && data.participants.length > 0 && !isDummyParticipantList(data.participants)) {
      localStorage.setItem('cbt_backup_students', JSON.stringify(data.participants));
      localStorage.setItem('cbt_backup_students_ts', new Date().toISOString());
    }
    if (data.questions && data.questions.length > 0 && !isDummyQuestionList(data.questions)) {
      localStorage.setItem('cbt_backup_questions', JSON.stringify(data.questions));
      localStorage.setItem('cbt_backup_questions_ts', new Date().toISOString());
    }
    if (data.tests && data.tests.length > 0) {
      localStorage.setItem('cbt_backup_tests', JSON.stringify(data.tests));
    }
    if (data.groups && data.groups.length > 0) {
      localStorage.setItem('cbt_backup_groups', JSON.stringify(data.groups));
    }
    if (data.topics && data.topics.length > 0) {
      localStorage.setItem('cbt_backup_topics', JSON.stringify(data.topics));
    }
  } catch (e) {
    console.warn('Gagal menyimpan emergency local backup:', e);
  }
}

/**
 * Retrieve emergency backup from localStorage if cloud is ever offline
 */
export function getEmergencyLocalBackup(): Partial<CBTAppState> | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const rawStudents = localStorage.getItem('cbt_backup_students');
    const rawQuestions = localStorage.getItem('cbt_backup_questions');
    const rawTests = localStorage.getItem('cbt_backup_tests');
    const rawGroups = localStorage.getItem('cbt_backup_groups');
    const rawTopics = localStorage.getItem('cbt_backup_topics');

    if (rawStudents || rawQuestions) {
      return {
        participants: rawStudents ? JSON.parse(rawStudents) : undefined,
        questions: rawQuestions ? JSON.parse(rawQuestions) : undefined,
        tests: rawTests ? JSON.parse(rawTests) : undefined,
        groups: rawGroups ? JSON.parse(rawGroups) : undefined,
        topics: rawTopics ? JSON.parse(rawTopics) : undefined,
      };
    }
  } catch (e) {
    console.warn('Gagal membaca emergency local backup:', e);
  }
  return null;
}

export interface SyncCloudOptions {
  allowQuestionDeletion?: boolean;
  allowParticipantDeletion?: boolean;
  isProctorUpdate?: boolean;
}

const PENDING_SYNC_KEY = 'cbt_pending_cloud_sync';

function savePendingCloudSlice(slice: Partial<CBTAppState>, options?: SyncCloudOptions) {
  if (typeof localStorage === 'undefined') return;
  try {
    const existingRaw = localStorage.getItem(PENDING_SYNC_KEY);
    const existing = existingRaw ? JSON.parse(existingRaw) : {};
    const mergedSlice = { ...(existing.slice || {}), ...slice };
    const mergedOptions = { ...(existing.options || {}), ...(options || {}) };
    localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify({
      slice: mergedSlice,
      options: mergedOptions,
      ts: new Date().toISOString()
    }));
  } catch (e) {
    console.warn('Gagal mencatat antrean sinkronisasi lokal:', e);
  }
}

export function clearPendingCloudSlice() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(PENDING_SYNC_KEY);
  } catch {
    // ignore
  }
}

export function getPendingCloudSlice(): { slice: Partial<CBTAppState>; options?: SyncCloudOptions; ts?: string } | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PENDING_SYNC_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.slice && Object.keys(parsed.slice).length > 0) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Fetch the freshest document from Firestore Server (with cache fallback only if offline)
 */
async function getDocPreferServer(docRef: ReturnType<typeof doc>) {
  try {
    return await getDocFromServer(docRef);
  } catch (serverErr) {
    console.warn('[CBT Cloud] getDocFromServer fallback ke cache lokal:', serverErr);
    return await getDoc(docRef);
  }
}

/**
 * Save complete or partial state to Firestore for cross-device synchronization.
 * Includes IRON-CLAD ANTI-WIPE SHIELD so newly opened phones/laptops or student logins
 * can NEVER erase imported questions or participant data.
 */
export async function syncStateToCloud(
  state: Partial<CBTAppState>,
  options?: SyncCloudOptions
): Promise<boolean> {
  const docPath = `${CBT_COLLECTION}/${CBT_STATE_DOC}`;
  try {
    const docRef = doc(db, CBT_COLLECTION, CBT_STATE_DOC);

    // Save to emergency local backup first
    saveEmergencyLocalBackup(state);

    // Fetch existing document from server to guard against inadvertent wipes
    let existingData: any = null;
    let existingFetchSucceeded = false;
    try {
      const existingSnap = await getDocPreferServer(docRef);
      existingFetchSucceeded = true;
      if (existingSnap.exists()) {
        existingData = existingSnap.data();
      }
    } catch (fetchErr) {
      console.warn('[CBT Cloud] Tidak dapat mengambil data eksisting saat validasi guard:', fetchErr);
    }

    // If we could not verify the cloud document while writing questions or participants,
    // queue locally and abort rather than risking overwriting cloud data blindly!
    if (!existingFetchSucceeded && (state.questions !== undefined || state.participants !== undefined)) {
      savePendingCloudSlice(state, options);
      return false;
    }

    const safeState: Partial<CBTAppState> = { ...state };

    // 1. ANTI-WIPE GUARD FOR PARTICIPANTS
    if (safeState.participants !== undefined) {
      if (isDummyParticipantList(safeState.participants)) {
        if (!existingData || (existingData?.participants && !isDummyParticipantList(existingData.participants))) {
          console.warn('[CBT Firestore Guard] Menolak penimpaan siswa riil dengan dummy data.');
          delete safeState.participants;
        }
      } else if (safeState.participants.length === 0 && !options?.allowParticipantDeletion) {
        if (existingData?.participants && existingData.participants.length > 0) {
          console.warn('[CBT Firestore Guard] Menolak penimpaan siswa dengan list kosong.');
          delete safeState.participants;
        }
      }
    }

    // 2. IRON-CLAD ANTI-WIPE GUARD FOR QUESTIONS
    if (safeState.questions !== undefined) {
      if (isDummyQuestionList(safeState.questions)) {
        // NEVER overwrite real cloud questions (or an unverified doc) with dummy seed!
        if (!existingData || (existingData?.questions && !isDummyQuestionList(existingData.questions) && existingData.questions.length > 0)) {
          console.warn('[CBT Firestore Guard] Menolak penimpaan bank soal riil oleh soal dummy seed.');
          delete safeState.questions;
        }
      } else if (safeState.questions.length === 0 && !options?.allowQuestionDeletion) {
        if (existingData?.questions && existingData.questions.length > 0) {
          console.warn('[CBT Firestore Guard] Menolak penimpaan bank soal riil dengan list kosong.');
          delete safeState.questions;
        }
      } else if (!options?.allowQuestionDeletion && existingData?.questions && Array.isArray(existingData.questions) && existingData.questions.length > 0) {
        // MERGE LOGIC: Prevent accidental dropping of questions!
        const existingQs = existingData.questions as Question[];
        const incomingQs = safeState.questions as Question[];

        const qMap = new Map<string, Question>();
        existingQs.forEach(q => {
          if (!isDummyQuestionList([q])) {
            qMap.set(q.id, q);
          }
        });
        incomingQs.forEach(q => {
          qMap.set(q.id, q);
        });

        safeState.questions = Array.from(qMap.values());
        saveEmergencyLocalBackup({ questions: safeState.questions });
      }
    }

    // Clean undefined fields and prepare payload
    const rawPayload: Record<string, any> = {
      updatedAt: new Date().toISOString()
    };

    if (safeState.adminConfig !== undefined) rawPayload.adminConfig = safeState.adminConfig;
    if (safeState.topics !== undefined) rawPayload.topics = safeState.topics;
    if (safeState.questions !== undefined) rawPayload.questions = safeState.questions;
    if (safeState.groups !== undefined) rawPayload.groups = safeState.groups;
    if (safeState.participants !== undefined) rawPayload.participants = safeState.participants;
    if (safeState.tests !== undefined) rawPayload.tests = safeState.tests;
    if (safeState.testAttempts !== undefined) rawPayload.testAttempts = safeState.testAttempts;
    if (safeState.teachers !== undefined) rawPayload.teachers = safeState.teachers;
    if (safeState.currentToken !== undefined) rawPayload.currentToken = safeState.currentToken;

    // Skip empty write if all guarded fields were stripped
    if (Object.keys(rawPayload).length <= 1) {
      return true;
    }

    const payload = sanitizeForFirestore(rawPayload);
    await setDoc(docRef, payload, { merge: true });
    clearPendingCloudSlice();
    return true;
  } catch (error) {
    savePendingCloudSlice(state, options);
    handleFirestoreError(error, OperationType.WRITE, docPath);
    console.warn('Gagal sinkronisasi ke Firebase Cloud:', error);
    return false;
  }
}

/**
 * Flush any locally queued state mutations that previously failed while offline
 */
export async function flushPendingCloudSync(): Promise<boolean> {
  const pending = getPendingCloudSlice();
  if (!pending) return true;
  return syncStateToCloud(pending.slice, pending.options);
}

/**
 * Explicitly delete a single question from Cloud without triggering anti-wipe false positives
 */
export async function deleteQuestionFromCloud(questionId: string): Promise<boolean> {
  const docPath = `${CBT_COLLECTION}/${CBT_STATE_DOC}`;
  try {
    const docRef = doc(db, CBT_COLLECTION, CBT_STATE_DOC);
    const snap = await getDocPreferServer(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const current = (data.questions || []) as Question[];
      const updated = current.filter(q => q.id !== questionId);
      await setDoc(docRef, sanitizeForFirestore({ questions: updated, updatedAt: new Date().toISOString() }), { merge: true });
      saveEmergencyLocalBackup({ questions: updated });
      return true;
    }
    return false;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, docPath);
    console.warn('Gagal menghapus soal dari cloud:', err);
    return false;
  }
}

/**
 * Explicitly delete multiple questions from Cloud
 */
export async function deleteQuestionsBulkFromCloud(questionIds: string[]): Promise<boolean> {
  const docPath = `${CBT_COLLECTION}/${CBT_STATE_DOC}`;
  try {
    const docRef = doc(db, CBT_COLLECTION, CBT_STATE_DOC);
    const snap = await getDocPreferServer(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const current = (data.questions || []) as Question[];
      const idSet = new Set(questionIds);
      const updated = current.filter(q => !idSet.has(q.id));
      await setDoc(docRef, sanitizeForFirestore({ questions: updated, updatedAt: new Date().toISOString() }), { merge: true });
      saveEmergencyLocalBackup({ questions: updated });
      return true;
    }
    return false;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, docPath);
    console.warn('Gagal menghapus masal soal dari cloud:', err);
    return false;
  }
}

/**
 * Explicitly delete a single participant from Cloud
 */
export async function deleteParticipantFromCloud(participantId: string): Promise<boolean> {
  const docPath = `${CBT_COLLECTION}/${CBT_STATE_DOC}`;
  try {
    const docRef = doc(db, CBT_COLLECTION, CBT_STATE_DOC);
    const snap = await getDocPreferServer(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const current = (data.participants || []) as Participant[];
      const updated = current.filter(p => p.id !== participantId);
      await setDoc(docRef, sanitizeForFirestore({ participants: updated, updatedAt: new Date().toISOString() }), { merge: true });
      saveEmergencyLocalBackup({ participants: updated });
      return true;
    }
    return false;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, docPath);
    console.warn('Gagal menghapus siswa dari cloud:', err);
    return false;
  }
}

/**
 * Explicitly delete multiple participants from Cloud
 */
export async function deleteParticipantsBulkFromCloud(participantIds: string[]): Promise<boolean> {
  const docPath = `${CBT_COLLECTION}/${CBT_STATE_DOC}`;
  try {
    const docRef = doc(db, CBT_COLLECTION, CBT_STATE_DOC);
    const snap = await getDocPreferServer(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const current = (data.participants || []) as Participant[];
      const idSet = new Set(participantIds);
      const updated = current.filter(p => !idSet.has(p.id));
      await setDoc(docRef, sanitizeForFirestore({ participants: updated, updatedAt: new Date().toISOString() }), { merge: true });
      saveEmergencyLocalBackup({ participants: updated });
      return true;
    }
    return false;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, docPath);
    console.warn('Gagal menghapus masal siswa dari cloud:', err);
    return false;
  }
}

/**
 * Specifically save proctor adminConfig to Cloud for instant cross-device login
 */
export async function syncAdminConfigToCloud(adminConfig: AdminConfig): Promise<boolean> {
  const docPath = `${CBT_COLLECTION}/${CBT_STATE_DOC}`;
  try {
    const docRef = doc(db, CBT_COLLECTION, CBT_STATE_DOC);
    await setDoc(docRef, sanitizeForFirestore({
      adminConfig,
      updatedAt: new Date().toISOString()
    }), { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
    console.warn('Gagal sinkronisasi kredensial proktor ke cloud:', error);
    return false;
  }
}

/**
 * Fetch latest state directly from Cloud Server on startup & manual refresh
 */
export async function fetchStateFromCloud(): Promise<Partial<CBTAppState> | null> {
  const docPath = `${CBT_COLLECTION}/${CBT_STATE_DOC}`;
  try {
    const docRef = doc(db, CBT_COLLECTION, CBT_STATE_DOC);
    const snap = await getDocPreferServer(docRef);
    if (snap.exists()) {
      return snap.data() as Partial<CBTAppState>;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docPath);
    console.warn('Gagal memuat data dari cloud pada inisialisasi:', error);
    return null;
  }
}

/**
 * Real-time listener for multi-device sync
 */
export function subscribeToCloudState(
  onUpdate: (cloudState: Partial<CBTAppState>) => void
) {
  const docPath = `${CBT_COLLECTION}/${CBT_STATE_DOC}`;
  try {
    const docRef = doc(db, CBT_COLLECTION, CBT_STATE_DOC);
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as Partial<CBTAppState>;
          onUpdate(data);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, docPath);
        console.warn('Realtime listener error:', error);
      }
    );
  } catch (error) {
    console.warn('Gagal memasang realtime listener:', error);
    return () => {};
  }
}
