/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Laptop, GraduationCap, ShieldCheck, Lock, Users, Key, AlertTriangle, User, Eye, EyeOff, CloudCheck, RefreshCw } from 'lucide-react';
import { CBTAppState, Participant, TestAttempt, StudentAnswer } from './types';
import { initialCBTState } from './data/initialData';
import { 
  syncStateToCloud, 
  subscribeToCloudState, 
  fetchStateFromCloud, 
  flushPendingCloudSync,
  getEmergencyLocalBackup, 
  saveEmergencyLocalBackup,
  isDummyQuestionList,
  isDummyParticipantList
} from './firebase';

import AdminPortal from './components/AdminPortal';
import StudentExamPortal from './components/StudentExamPortal';

export default function App() {
  const [role, setRole] = useState<'gateway' | 'admin' | 'guru' | 'student'>('gateway');
  const [activeGatewayTab, setActiveGatewayTab] = useState<'siswa' | 'guru' | 'proktor'>('siswa');
  
  // App state initialized from localStorage or seed
  const [appState, setAppState] = useState<CBTAppState>(() => {
    const cached = localStorage.getItem('cbt_app_state');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (!parsed.teachers) {
          parsed.teachers = [
            { id: 'TCH-01', name: 'Guru Penguji Utama', username: 'guru', passwordHash: 'guru' }
          ];
        }
        if (!parsed.adminConfig) {
          parsed.adminConfig = {
            username: 'admin',
            passwordHash: 'admin',
            name: 'Proktor / Operator Utama',
            schoolName: 'SMA / SMK Negeri Mandiri'
          };
        }
        return parsed;
      } catch {
        return initialCBTState;
      }
    }
    return initialCBTState;
  });

  // Admin routing states
  const [activeMenu, setActiveMenu] = useState('overview');
  const [activeSubMenu, setActiveSubMenu] = useState('');

  // Logged-in Student state
  const [currentStudent, setCurrentStudent] = useState<Participant | null>(null);

  // Student login form states
  const [studentUser, setStudentUser] = useState('');
  const [studentPass, setStudentPass] = useState('');
  const [showStudentPass, setShowStudentPass] = useState(false);
  const [studentError, setStudentError] = useState('');
  const [sessionTakeoverStudent, setSessionTakeoverStudent] = useState<Participant | null>(null);
  const [isStudentLoggingIn, setIsStudentLoggingIn] = useState(false);

  // Guru login states
  const [guruUser, setGuruUser] = useState('');
  const [guruPass, setGuruPass] = useState('');
  const [showGuruPass, setShowGuruPass] = useState(false);
  const [guruError, setGuruError] = useState('');

  // Admin login states
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [adminError, setAdminError] = useState('');

  // Cloud sync status state
  const [cloudSynced, setCloudSynced] = useState<boolean>(false);
  const [isCloudLoading, setIsCloudLoading] = useState<boolean>(true);
  const [cloudSyncError, setCloudSyncError] = useState<string | null>(null);

  // Sync state with localStorage safely
  useEffect(() => {
    try {
      localStorage.setItem('cbt_app_state', JSON.stringify(appState));
      saveEmergencyLocalBackup(appState);
    } catch (e) {
      console.warn('localStorage setItem caught error:', e);
    }
  }, [appState]);

  // Initial cloud fetch and real-time Firestore sync subscription
  useEffect(() => {
    let isMounted = true;

    // 1. Flush any pending unsynced local changes, then fetch fresh state from Cloud Server
    (async () => {
      try {
        await flushPendingCloudSync();
        const cloudData = await fetchStateFromCloud();
        if (!isMounted) return;
        if (cloudData) {
          setAppState(prev => {
            const finalQuestions = (cloudData.questions && !isDummyQuestionList(cloudData.questions))
              ? cloudData.questions
              : (prev.questions && !isDummyQuestionList(prev.questions)
                  ? prev.questions
                  : (cloudData.questions || prev.questions));

            const finalParticipants = (cloudData.participants && !isDummyParticipantList(cloudData.participants))
              ? cloudData.participants
              : (prev.participants && !isDummyParticipantList(prev.participants)
                  ? prev.participants
                  : (cloudData.participants || prev.participants));

            const next = {
              ...prev,
              ...cloudData,
              questions: finalQuestions,
              participants: finalParticipants,
              adminConfig: cloudData.adminConfig || prev.adminConfig
            };
            saveEmergencyLocalBackup(next);
            return next;
          });
          setCloudSynced(true);
          setCloudSyncError(null);
        } else {
          const backup = getEmergencyLocalBackup();
          if (backup && (backup.participants || backup.questions)) {
            setAppState(prev => ({
              ...prev,
              ...backup,
              questions: (backup.questions && !isDummyQuestionList(backup.questions)) ? backup.questions : prev.questions,
              participants: (backup.participants && !isDummyParticipantList(backup.participants)) ? backup.participants : prev.participants
            }));
          }
        }
      } catch {
        if (!isMounted) return;
        const backup = getEmergencyLocalBackup();
        if (backup) {
          setAppState(prev => ({
            ...prev,
            ...backup,
            questions: (backup.questions && !isDummyQuestionList(backup.questions)) ? backup.questions : prev.questions,
            participants: (backup.participants && !isDummyParticipantList(backup.participants)) ? backup.participants : prev.participants
          }));
        }
      } finally {
        if (isMounted) setIsCloudLoading(false);
      }
    })();

    // 2. Real-time multi-device sync listener
    const unsubscribe = subscribeToCloudState((incomingState) => {
      if (!incomingState || !isMounted) return;
      setAppState(prev => {
        // Protect real questions against incoming dummy questions
        const finalQuestions = (incomingState.questions && !isDummyQuestionList(incomingState.questions))
          ? incomingState.questions
          : (prev.questions && !isDummyQuestionList(prev.questions) ? prev.questions : (incomingState.questions || prev.questions));

        // Protect real participants against incoming dummy participants
        const finalParticipants = (incomingState.participants && !isDummyParticipantList(incomingState.participants))
          ? incomingState.participants
          : (prev.participants && !isDummyParticipantList(prev.participants) ? prev.participants : (incomingState.participants || prev.participants));

        const next = {
          ...prev,
          ...incomingState,
          adminConfig: incomingState.adminConfig || prev.adminConfig,
          participants: finalParticipants,
          questions: finalQuestions,
          tests: incomingState.tests || prev.tests,
          topics: incomingState.topics || prev.topics,
          groups: incomingState.groups || prev.groups,
          teachers: incomingState.teachers || prev.teachers,
          testAttempts: incomingState.testAttempts || prev.testAttempts
        };
        saveEmergencyLocalBackup(next);
        return next;
      });
      setCloudSynced(true);
    });

    return () => {
      isMounted = false;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const handleUpdateState = (newState: CBTAppState, changedSlice?: Partial<CBTAppState>, options?: any) => {
    setAppState(newState);
    // Push immediately to Firebase Cloud for cross-device updates and surface any failure
    const sliceToSync = changedSlice || newState;
    syncStateToCloud(sliceToSync, options).then((ok) => {
      if (ok) {
        setCloudSynced(true);
        setCloudSyncError(null);
      } else {
        setCloudSyncError('Perubahan tersimpan di browser ini, namun gagal tersinkron ke Database Cloud. Periksa koneksi atau ukuran gambar lalu klik Coba Sinkron Ulang.');
      }
    });
  };

  const handleRetryCloudSync = async () => {
    setIsCloudLoading(true);
    try {
      const ok = await flushPendingCloudSync();
      if (ok) {
        setCloudSyncError(null);
        await handleManualRefreshCloud();
      } else {
        setCloudSyncError('Sinkronisasi ke Database Cloud masih gagal. Pastikan koneksi internet stabil dan ukuran total gambar soal tidak melebihi batas dokumen Cloud.');
      }
    } finally {
      setIsCloudLoading(false);
    }
  };

  // Manual refresh helper for students or proctors on mobile/laptop
  const handleManualRefreshCloud = async () => {
    setIsCloudLoading(true);
    try {
      await flushPendingCloudSync();
      const data = await fetchStateFromCloud();
      if (data) {
        setAppState(prev => {
          const finalQuestions = (data.questions && !isDummyQuestionList(data.questions))
            ? data.questions
            : (prev.questions && !isDummyQuestionList(prev.questions)
                ? prev.questions
                : (data.questions || prev.questions));

          const finalParticipants = (data.participants && !isDummyParticipantList(data.participants))
            ? data.participants
            : (prev.participants && !isDummyParticipantList(prev.participants)
                ? prev.participants
                : (data.participants || prev.participants));

          const next = {
            ...prev,
            ...data,
            questions: finalQuestions,
            participants: finalParticipants,
            adminConfig: data.adminConfig || prev.adminConfig
          };
          saveEmergencyLocalBackup(next);
          return next;
        });
        setCloudSynced(true);
        setCloudSyncError(null);
      }
    } catch (e) {
      console.warn('Gagal memuat ulang data cloud:', e);
    } finally {
      setIsCloudLoading(false);
    }
  };

  // Helper to complete successful student login
  const proceedStudentLogin = (student: Participant) => {
    const updatedParticipants = (appState.participants || []).map(p => 
      p.id === student.id ? { ...p, isLoggedIn: true } : p
    );
    const updatedState: CBTAppState = {
      ...appState,
      participants: updatedParticipants
    };
    setAppState(updatedState);
    syncStateToCloud({ participants: updatedParticipants });

    setCurrentStudent({ ...student, isLoggedIn: true });
    setRole('student');
    setStudentUser('');
    setStudentPass('');
    setStudentError('');
    setSessionTakeoverStudent(null);
  };

  // 1. SISWA LOGIN HANDLER (Mobile & Laptop Robust, with Instant Cloud Verify & Session Takeover)
  const handleStudentLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError('');
    setSessionTakeoverStudent(null);
    setIsStudentLoggingIn(true);

    const inputUser = studentUser.trim().toLowerCase();
    const inputPass = studentPass.trim();

    if (!inputUser || !inputPass) {
      setStudentError('Harap isi username / no. peserta dan kata sandi.');
      setIsStudentLoggingIn(false);
      return;
    }

    try {
      // Step A: Search in local state
      let currentParticipants = appState.participants || [];
      let found = currentParticipants.find(
        p => (p.username || '').trim().toLowerCase() === inputUser ||
             (p.examCardNo || '').trim().toLowerCase() === inputUser ||
             (p.name || '').trim().toLowerCase() === inputUser
      );

      // Step B: If not found or if participants list is only default dummy seed, fetch latest from Cloud
      if (!found) {
        const cloudData = await fetchStateFromCloud();
        if (cloudData?.participants && cloudData.participants.length > 0) {
          setAppState(prev => ({ ...prev, ...cloudData }));
          currentParticipants = cloudData.participants;
          found = currentParticipants.find(
            p => (p.username || '').trim().toLowerCase() === inputUser ||
                 (p.examCardNo || '').trim().toLowerCase() === inputUser ||
                 (p.name || '').trim().toLowerCase() === inputUser
          );
        }
      }

      if (!found) {
        setStudentError('Username / Nomor Kartu atau NIS siswa tidak ditemukan di daftar peserta. Periksa kembali kartu ujian Anda atau pastikan data siswa telah disinkronkan oleh Proktor.');
        setIsStudentLoggingIn(false);
        return;
      }

      // Step C: Validate password (tolerant to whitespace and numeric casing)
      const expectedPass = (found.passwordHash || '').trim();
      const passMatches = expectedPass === inputPass || expectedPass.toLowerCase() === inputPass.toLowerCase();

      if (!passMatches) {
        setStudentError('Sandi (Password) tidak sesuai dengan kartu ujian. Periksa kembali huruf besar/kecil.');
        setIsStudentLoggingIn(false);
        return;
      }

      // Step D: Verify Lockout (with live cloud verification)
      if (found.isLocked) {
        const cloudData = await fetchStateFromCloud();
        const verified = cloudData?.participants?.find(p => p.id === found.id);
        if (verified && !verified.isLocked) {
          found = verified;
        } else {
          setStudentError(`Akun Anda TERKUNCI (${found.lockedReason || 'Pelanggaran anti-curang'}). Silakan minta Proktor di menu Daftar Peserta untuk menekan tombol "Buka Kunci".`);
          setIsStudentLoggingIn(false);
          return;
        }
      }

      // Step E: Verify Active Session (Fixes "di daftar peserta sudah di reset tp masih ga bisa login")
      if (found.isLoggedIn) {
        // Check Cloud: Proctor might have ALREADY clicked reset on their PC!
        const cloudData = await fetchStateFromCloud();
        const verified = cloudData?.participants?.find(p => p.id === found.id);
        if (verified && !verified.isLoggedIn) {
          // Cloud is already reset!
          found = verified;
        } else {
          // Still active on previous device/browser tab
          // Offer immediate session takeover so student on HP/laptop can proceed without obstacle!
          setSessionTakeoverStudent(found);
          setStudentError('Sesi akun ini terdeteksi aktif sebelumnya (di perangkat lain atau jendela belum keluar). Jika Anda menggunakan HP/Laptop ini sekarang, klik "Lanjutkan Sesi di Perangkat Ini" di bawah.');
          setIsStudentLoggingIn(false);
          return;
        }
      }

      // All good! Proceed with login
      proceedStudentLogin(found);
    } catch (err) {
      console.error('Error during student login:', err);
      setStudentError('Terjadi kendala koneksi saat verifikasi login. Coba tekan tombol Segarkan Data lalu masuk kembali.');
    } finally {
      setIsStudentLoggingIn(false);
    }
  };

  // Handler for session takeover (when student switches from laptop to HP or refreshes)
  const handleTakeoverSession = () => {
    if (!sessionTakeoverStudent) return;
    proceedStudentLogin(sessionTakeoverStudent);
  };

  // Handler to re-check if proctor reset the student in Cloud
  const handleRecheckResetStatus = async () => {
    if (!sessionTakeoverStudent) return;
    setIsCloudLoading(true);
    try {
      const cloudData = await fetchStateFromCloud();
      const verified = cloudData?.participants?.find(p => p.id === sessionTakeoverStudent.id);
      if (verified && !verified.isLoggedIn && !verified.isLocked) {
        proceedStudentLogin(verified);
      } else {
        setStudentError('Status di server belum di-reset oleh Proktor. Anda dapat langsung mengklik "Lanjutkan Sesi di Perangkat Ini" untuk masuk seketika.');
      }
    } catch (e) {
      console.warn('Re-check error:', e);
    } finally {
      setIsCloudLoading(false);
    }
  };

  // 2. GURU LOGIN HANDLER (Only Data Modul access)
  const handleGuruLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGuruError('');

    const teachersList = appState.teachers || [];
    const matchedTeacher = teachersList.find(
      t => t.username.toLowerCase() === guruUser.trim().toLowerCase() && t.passwordHash === guruPass
    );

    if (matchedTeacher) {
      setRole('guru');
      setActiveMenu('data_modul');
      setActiveSubMenu('topik');
      setGuruError('');
      setGuruUser('');
      setGuruPass('');
    } else {
      setGuruError('Akun guru tidak ditemukan atau sandi salah.');
    }
  };

  // 3. ADMIN / PROKTOR LOGIN HANDLER
  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');

    const expectedAdminUser = (appState.adminConfig?.username || 'admin').trim().toLowerCase();
    const expectedAdminPass = appState.adminConfig?.passwordHash || 'admin';

    if (adminUser.trim().toLowerCase() === expectedAdminUser && adminPass === expectedAdminPass) {
      setRole('admin');
      setActiveMenu('overview');
      setActiveSubMenu('');
      setAdminError('');
      setAdminUser('');
      setAdminPass('');
    } else {
      setAdminError('Kombinasi username atau sandi Proktor/Admin salah.');
    }
  };

  const handleParticipantLogin = (id: string, state: boolean) => {
    setAppState(prev => {
      const updatedParticipants = prev.participants.map(p => p.id === id ? { ...p, isLoggedIn: state } : p);
      // ONLY sync participants slice to cloud - never send questions!
      syncStateToCloud({ participants: updatedParticipants });
      return {
        ...prev,
        participants: updatedParticipants
      };
    });
  };

  const handleLockParticipant = (participantId: string, attemptId?: string, reason?: string) => {
    const timestamp = new Date().toISOString();
    const finalReason = reason || 'Terdeteksi membuka aplikasi lain / berpindah tab saat ujian berlangsung';

    setAppState(prev => {
      const updatedParticipants = prev.participants.map(p => {
        if (p.id === participantId) {
          return {
            ...p,
            isLoggedIn: false,
            isLocked: true,
            lockedReason: finalReason,
            lockedAt: timestamp,
            violationsCount: (p.violationsCount || 0) + 1
          };
        }
        return p;
      });
      const updatedAttempts = prev.testAttempts.map(att => {
        if (att.id === attemptId || (att.participantId === participantId && att.status === 'mengerjakan')) {
          return {
            ...att,
            isLocked: true,
            lockReason: finalReason,
            lockedAt: timestamp,
            violationsCount: (att.violationsCount || 0) + 1
          };
        }
        return att;
      });
      // ONLY sync participants & testAttempts - never questions!
      syncStateToCloud({ participants: updatedParticipants, testAttempts: updatedAttempts });
      return {
        ...prev,
        participants: updatedParticipants,
        testAttempts: updatedAttempts
      };
    });
  };

  const handleResetParticipantLogin = (id: string, resetAttempt?: boolean) => {
    setAppState(prev => {
      const updatedParticipants = prev.participants.map(p => 
        p.id === id 
          ? { ...p, isLoggedIn: false, isLocked: false, lockedReason: undefined, lockedAt: undefined, violationsCount: 0 } 
          : p
      );
      const updatedAttempts = resetAttempt 
        ? prev.testAttempts.filter(a => a.participantId !== id)
        : prev.testAttempts.map(a => 
            a.participantId === id 
              ? { ...a, isLocked: false, lockReason: undefined, lockedAt: undefined, violationsCount: 0 } 
              : a
          );
      // ONLY sync participants & testAttempts - never questions!
      syncStateToCloud({ participants: updatedParticipants, testAttempts: updatedAttempts });
      return {
        ...prev,
        participants: updatedParticipants,
        testAttempts: updatedAttempts
      };
    });
  };

  const handleRecordViolationWarning = (participantId: string, attemptId?: string, count?: number) => {
    setAppState(prev => {
      const updatedParticipants = prev.participants.map(p => 
        p.id === participantId ? { ...p, violationsCount: count || (p.violationsCount || 0) + 1 } : p
      );
      const updatedAttempts = prev.testAttempts.map(att => 
        (att.id === attemptId || (att.participantId === participantId && att.status === 'mengerjakan'))
          ? { ...att, violationsCount: count || (att.violationsCount || 0) + 1 }
          : att
      );
      // ONLY sync participants & testAttempts - never questions!
      syncStateToCloud({ participants: updatedParticipants, testAttempts: updatedAttempts });
      return {
        ...prev,
        participants: updatedParticipants,
        testAttempts: updatedAttempts
      };
    });
  };

  const handleAddAttempt = (attempt: TestAttempt) => {
    setAppState(prev => {
      const exists = prev.testAttempts.some(a => a.id === attempt.id);
      let updatedAttempts: TestAttempt[];
      if (exists) {
        updatedAttempts = prev.testAttempts.map(a => a.id === attempt.id ? attempt : a);
      } else {
        updatedAttempts = [...prev.testAttempts, attempt];
      }

      // If finished, mark student as logged out
      const updatedParticipants = attempt.status === 'selesai'
        ? prev.participants.map(p => p.id === attempt.participantId ? { ...p, isLoggedIn: false } : p)
        : prev.participants;

      // ONLY sync testAttempts & participants - never questions!
      syncStateToCloud({
        testAttempts: updatedAttempts,
        participants: updatedParticipants
      });
      return {
        ...prev,
        testAttempts: updatedAttempts,
        participants: updatedParticipants
      };
    });
  };

  const handleUpdateAttemptAnswers = (attemptId: string, answers: StudentAnswer[]) => {
    setAppState(prev => {
      const updatedAttempts = prev.testAttempts.map(att => 
        att.id === attemptId 
          ? { ...att, answers } 
          : att
      );
      // ONLY sync testAttempts - never questions!
      syncStateToCloud({ testAttempts: updatedAttempts });
      return {
        ...prev,
        testAttempts: updatedAttempts
      };
    });
  };

  const changeAdminMenu = (menu: string, submenu: string) => {
    setActiveMenu(menu);
    setActiveSubMenu(submenu);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 antialiased selection:bg-emerald-100">
      
      {/* 1. PROFESSIONAL ROLE-BASED LOGIN GATEWAY */}
      {role === 'gateway' && (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex flex-col justify-between p-4 sm:p-8 relative overflow-hidden font-sans">
          
          {/* Subtle Ambient Background Orbs */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse pointer-events-none"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl animate-pulse pointer-events-none"></div>

          {/* Top Header */}
          <header className="flex justify-between items-center relative z-10 w-full max-w-5xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20 shadow-xs">
                <Laptop className="h-6 w-6" />
              </div>
              <div>
                <h1 className="font-black text-white tracking-wider text-base leading-none">CBT MANDIRI</h1>
                <p className="text-[10px] text-emerald-400 font-bold mt-1 uppercase tracking-widest">Sistem Ujian Online Terintegrasi</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={handleManualRefreshCloud}
                title="Segarkan data dari Cloud Server"
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 cursor-pointer transition-all active:scale-95"
              >
                <RefreshCw className={`h-3 w-3 ${isCloudLoading ? 'animate-spin text-emerald-400' : ''}`} />
                <span className="hidden sm:inline">Segarkan Data</span>
              </button>
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>{cloudSynced ? `${appState.participants?.length || 0} Siswa • ${appState.questions?.length || 0} Soal Siap` : 'Menghubungkan Server...'}</span>
              </span>
            </div>
          </header>

          {/* Main Login Card with Role Switcher Tabs */}
          <main className="max-w-md mx-auto w-full py-8 relative z-10">
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6">
              
              {/* Role Navigation Tabs */}
              <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => { setActiveGatewayTab('siswa'); setStudentError(''); setSessionTakeoverStudent(null); }}
                  className={`py-2 px-2 text-xs font-bold rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                    activeGatewayTab === 'siswa'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <GraduationCap className="h-4 w-4" />
                  <span>Siswa</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveGatewayTab('guru'); setGuruError(''); }}
                  className={`py-2 px-2 text-xs font-bold rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                    activeGatewayTab === 'guru'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Users className="h-4 w-4" />
                  <span>Guru</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveGatewayTab('proktor'); setAdminError(''); }}
                  className={`py-2 px-2 text-xs font-bold rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                    activeGatewayTab === 'proktor'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Proktor</span>
                </button>
              </div>

              {/* TAB 1: FORM LOGIN SISWA */}
              {activeGatewayTab === 'siswa' && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div className="text-left space-y-1">
                    <div className="flex justify-between items-center">
                      <h2 className="text-lg font-black text-white flex items-center gap-2">
                        <GraduationCap className="h-5 w-5 text-emerald-400" />
                        Login Siswa (Peserta Ujian)
                      </h2>
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                        HP / Laptop
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Masukkan identitas pada kartu ujian untuk melihat jadwal ujian dan mulai mengerjakan.
                    </p>
                  </div>

                  <form onSubmit={handleStudentLoginSubmit} className="space-y-4 text-left">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                        Username / NIS / No. Peserta
                      </label>
                      <div className="relative">
                        <User className="h-4 w-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          required
                          placeholder="Masukkan username, NIS, atau no. peserta"
                          value={studentUser}
                          onChange={(e) => setStudentUser(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden transition-all placeholder-slate-600"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                        Sandi (Password Ujian)
                      </label>
                      <div className="relative">
                        <Lock className="h-4 w-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type={showStudentPass ? 'text' : 'password'}
                          required
                          placeholder="Masukkan sandi kartu ujian"
                          value={studentPass}
                          onChange={(e) => setStudentPass(e.target.value)}
                          className="w-full pl-10 pr-11 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden transition-all placeholder-slate-600"
                        />
                        <button
                          type="button"
                          onClick={() => setShowStudentPass(!showStudentPass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-400 p-1 cursor-pointer transition-colors"
                          title={showStudentPass ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                        >
                          {showStudentPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4 text-slate-400" />}
                        </button>
                      </div>
                    </div>

                    {studentError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 font-medium leading-relaxed flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                        <span>{studentError}</span>
                      </div>
                    )}

                    {/* Quick Session Takeover Action for HP / Laptop Switches */}
                    {sessionTakeoverStudent && (
                      <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2.5 animate-in fade-in">
                        <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                          <ShieldCheck className="h-4 w-4 shrink-0" />
                          <span>Ambil Alih Sesi: {sessionTakeoverStudent.name}</span>
                        </div>
                        <p className="text-[11px] text-amber-200/90 leading-relaxed">
                          Jika Anda berpindah perangkat ke HP / Laptop ini atau sesi sebelumnya belum ditutup, klik tombol di bawah untuk melanjutkan ujian Anda:
                        </p>
                        <div className="flex flex-col gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handleTakeoverSession}
                            className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                          >
                            <Laptop className="h-4 w-4" /> Lanjutkan Sesi di Perangkat Ini (HP / Laptop)
                          </button>
                          <button
                            type="button"
                            onClick={handleRecheckResetStatus}
                            className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${isCloudLoading ? 'animate-spin text-emerald-400' : ''}`} /> Cek Status Reset dari Server
                          </button>
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isStudentLoggingIn}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                    >
                      {isStudentLoggingIn ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" /> Memverifikasi Data...
                        </>
                      ) : (
                        <>
                          <GraduationCap className="h-4 w-4" /> Masuk &amp; Lihat Jadwal Ujian
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 2: FORM LOGIN GURU */}
              {activeGatewayTab === 'guru' && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div className="text-left space-y-1">
                    <h2 className="text-lg font-black text-white flex items-center gap-2">
                      <Users className="h-5 w-5 text-emerald-400" />
                      Login Guru (Pendidik)
                    </h2>
                    <p className="text-xs text-slate-400">
                      Akses khusus pengelolaan modul topik, bank soal, dan berkas ujian.
                    </p>
                  </div>

                  <form onSubmit={handleGuruLoginSubmit} className="space-y-4 text-left">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                        Username Guru
                      </label>
                      <div className="relative">
                        <User className="h-4 w-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          required
                          placeholder="Masukkan username guru"
                          value={guruUser}
                          onChange={(e) => setGuruUser(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden transition-all placeholder-slate-600"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                        Sandi (Password)
                      </label>
                      <div className="relative">
                        <Lock className="h-4 w-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type={showGuruPass ? 'text' : 'password'}
                          required
                          placeholder="Masukkan sandi guru"
                          value={guruPass}
                          onChange={(e) => setGuruPass(e.target.value)}
                          className="w-full pl-10 pr-11 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden transition-all placeholder-slate-600"
                        />
                        <button
                          type="button"
                          onClick={() => setShowGuruPass(!showGuruPass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-400 p-1 cursor-pointer transition-colors"
                          title={showGuruPass ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                        >
                          {showGuruPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4 text-slate-400" />}
                        </button>
                      </div>
                    </div>

                    {guruError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 font-medium leading-relaxed flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                        <span>{guruError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                    >
                      <Users className="h-4 w-4" /> Masuk Portal Guru (Data Modul)
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 3: FORM LOGIN PROKTOR / ADMIN */}
              {activeGatewayTab === 'proktor' && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div className="text-left space-y-1">
                    <h2 className="text-lg font-black text-white flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-emerald-400" />
                      Login Proktor / Administrator
                    </h2>
                    <p className="text-xs text-slate-400">
                      Panel kendali penuh peserta, rilis token ujian, dan reset sesi siswa.
                    </p>
                  </div>

                  <form onSubmit={handleAdminLoginSubmit} className="space-y-4 text-left">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                        Username Admin / Proktor
                      </label>
                      <div className="relative">
                        <User className="h-4 w-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          required
                          placeholder="Masukkan username admin"
                          value={adminUser}
                          onChange={(e) => setAdminUser(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden transition-all placeholder-slate-600"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                        Sandi (Password Admin)
                      </label>
                      <div className="relative">
                        <Lock className="h-4 w-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type={showAdminPass ? 'text' : 'password'}
                          required
                          placeholder="Masukkan sandi admin"
                          value={adminPass}
                          onChange={(e) => setAdminPass(e.target.value)}
                          className="w-full pl-10 pr-11 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden transition-all placeholder-slate-600"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAdminPass(!showAdminPass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-400 p-1 cursor-pointer transition-colors"
                          title={showAdminPass ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                        >
                          {showAdminPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4 text-slate-400" />}
                        </button>
                      </div>
                    </div>

                    {adminError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 font-medium leading-relaxed flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                        <span>{adminError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                    >
                      <ShieldCheck className="h-4 w-4" /> Masuk Panel Proktor CBT
                    </button>
                  </form>
                </div>
              )}

            </div>
          </main>

          {/* Footer Rights */}
          <footer className="text-center relative z-10 text-slate-500 text-xs mt-6">
            &copy; 2026 Sistem CBT Mandiri Terintegrasi &bull; Hak Cipta Terlindungi
          </footer>

        </div>
      )}

      {/* 2. ADMINISTRATOR & GURU SYSTEM PANEL */}
      {(role === 'admin' || role === 'guru') && (
        <AdminPortal 
          appState={appState}
          onUpdateState={handleUpdateState}
          onLogoutAdmin={() => setRole('gateway')}
          activeMenu={activeMenu}
          activeSubMenu={activeSubMenu}
          onChangeMenu={changeAdminMenu}
          userRole={role}
          cloudSyncError={cloudSyncError}
          onRetryCloudSync={handleRetryCloudSync}
        />
      )}

      {/* 3. STUDENT EXAM TAKING ENGINE */}
      {role === 'student' && (
        <StudentExamPortal 
          participants={appState.participants}
          tests={appState.tests}
          questions={appState.questions}
          testAttempts={appState.testAttempts}
          groups={appState.groups}
          initialStudent={currentStudent}
          adminPassword={appState.adminConfig?.passwordHash || 'admin'}
          onParticipantLogin={handleParticipantLogin}
          onLockParticipant={handleLockParticipant}
          onRecordViolationWarning={handleRecordViolationWarning}
          onResetParticipantLogin={handleResetParticipantLogin}
          onSubmitAttempt={handleAddAttempt}
          onUpdateAttemptAnswers={handleUpdateAttemptAnswers}
          onReturnToGateway={() => {
            setCurrentStudent(null);
            setRole('gateway');
          }}
        />
      )}

    </div>
  );
}
