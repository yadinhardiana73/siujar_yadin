/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LogIn, Key, GraduationCap, AlertCircle, Clock, ChevronLeft, ChevronRight, 
  CheckCircle, Award, List, ShieldAlert, Lock, AlertTriangle, ShieldCheck, 
  Maximize, RefreshCw, XCircle, ArrowLeft, Info, FileText, Users, Eye, BarChart, Check, X,
  CheckCircle2, Sparkles, BookOpen
} from 'lucide-react';
import { Participant, Test, Question, TestAttempt, StudentAnswer, Group } from '../types';

interface LockedViolationInfo {
  reason: string;
  timestamp: string;
  testName: string;
  questionNumber: number;
}

interface StudentExamPortalProps {
  participants: Participant[];
  tests: Test[];
  questions: Question[];
  testAttempts: TestAttempt[];
  groups: Group[];
  initialStudent?: Participant | null;
  onParticipantLogin: (id: string, state: boolean) => void;
  onLockParticipant?: (participantId: string, attemptId?: string, reason?: string) => void;
  onRecordViolationWarning?: (participantId: string, attemptId?: string, count?: number) => void;
  onResetParticipantLogin?: (id: string, resetAttempt?: boolean) => void;
  adminPassword?: string;
  onSubmitAttempt: (attempt: TestAttempt) => void;
  onUpdateAttemptAnswers: (attemptId: string, answers: StudentAnswer[]) => void;
  onReturnToGateway?: () => void;
}

export default function StudentExamPortal({
  participants,
  tests,
  questions,
  testAttempts,
  groups,
  initialStudent,
  onParticipantLogin,
  onLockParticipant,
  onRecordViolationWarning,
  onResetParticipantLogin,
  adminPassword,
  onSubmitAttempt,
  onUpdateAttemptAnswers,
  onReturnToGateway
}: StudentExamPortalProps) {
  // Portal States
  const [currentStudent, setCurrentStudent] = useState<Participant | null>(initialStudent || null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [lockedStudentErrorModal, setLockedStudentErrorModal] = useState<Participant | null>(null);

  // 3-Time Violation Tolerance System & Warning Modals
  const [violationsCount, setViolationsCount] = useState<number>(0);
  const [warningModalInfo, setWarningModalInfo] = useState<{
    show: boolean;
    count: number;
    maxCount: number;
    reason: string;
    time: string;
  } | null>(null);
  const lastViolationTimeRef = React.useRef<number>(0);

  // Modals for Reset Instructions & Quick Proctor Unlock
  const [showResetGuideModal, setShowResetGuideModal] = useState(false);
  const [showProctorQuickUnlockModal, setShowProctorQuickUnlockModal] = useState<Participant | null>(null);
  const [proctorPasswordInput, setProctorPasswordInput] = useState('');
  const [proctorPasswordError, setProctorPasswordError] = useState('');

  // Sync initialStudent if provided from parent
  useEffect(() => {
    if (initialStudent) {
      setCurrentStudent(initialStudent);
    }
  }, [initialStudent]);

  // Sesi Ujian States
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [inputToken, setInputToken] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [showSecurityBriefing, setShowSecurityBriefing] = useState(false);
  const [hasAgreedRules, setHasAgreedRules] = useState(false);
  const [activeAttempt, setActiveAttempt] = useState<TestAttempt | null>(null);

  // Anti-cheat violation & lockout state
  const [lockedViolationInfo, setLockedViolationInfo] = useState<LockedViolationInfo | null>(null);

  // Active exam navigation states
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [doubtfulAnswers, setDoubtfulAnswers] = useState<{ [qId: string]: boolean }>({});
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [showConfirmFinish, setShowConfirmFinish] = useState(false);
  const [justFinishedAttempt, setJustFinishedAttempt] = useState<TestAttempt | null>(null);

  // Student dashboard navigation and history detail review states
  const [studentActiveTab, setStudentActiveTab] = useState<'ujian_tersedia' | 'riwayat_hasil'>('ujian_tersedia');
  const [selectedHistoryAttempt, setSelectedHistoryAttempt] = useState<TestAttempt | null>(null);

  // Sync violationsCount when activeAttempt or currentStudent changes
  useEffect(() => {
    if (activeAttempt) {
      setViolationsCount(activeAttempt.violationsCount || currentStudent?.violationsCount || 0);
    }
  }, [activeAttempt?.id, activeAttempt?.violationsCount, currentStudent?.violationsCount]);

  // Keep current student state synchronized with global participants array
  useEffect(() => {
    if (currentStudent) {
      const updated = participants.find(p => p.id === currentStudent.id);
      if (updated) {
        // If the student was locked in background
        if (updated.isLocked && !lockedViolationInfo) {
          setLockedViolationInfo({
            reason: updated.lockedReason || 'Terdeteksi membuka aplikasi lain / berpindah tab saat ujian berlangsung',
            timestamp: updated.lockedAt ? new Date(updated.lockedAt).toLocaleTimeString('id-ID') : 'Baru saja',
            testName: selectedTest?.name || 'Ujian CBT Mandiri',
            questionNumber: currentQuestionIdx + 1
          });
          setActiveAttempt(null);
          setSelectedTest(null);
        }
        setCurrentStudent(updated);
      }
    }
  }, [participants]);

  // Resume active attempts on login if NOT locked
  useEffect(() => {
    if (currentStudent && !currentStudent.isLocked) {
      const existing = testAttempts.find(
        att => att.participantId === currentStudent.id && att.status === 'mengerjakan' && !att.isLocked
      );
      if (existing) {
        const test = tests.find(t => t.id === existing.testId);
        if (test) {
          setSelectedTest(test);
          setActiveAttempt(existing);
          // Calculate remaining time
          const elapsedSeconds = Math.floor((Date.now() - new Date(existing.startTime).getTime()) / 1000);
          const totalSeconds = test.durationMinutes * 60;
          setTimeLeft(Math.max(0, totalSeconds - elapsedSeconds));
        }
      }
    }
  }, [currentStudent, testAttempts, tests]);

  // Exam Countdown Timer Hook
  useEffect(() => {
    if (activeAttempt && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleFinishExam(true); // Auto-submit when timer hits 0
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [activeAttempt, timeLeft]);

  // =========================================================================
  // ANTI-CHEAT & STRICT LOCKDOWN ENGINE (WITH 3-TIME TOLERANCE)
  // Tolerates up to 3 violations before permanent lockout
  // =========================================================================
  useEffect(() => {
    if (!activeAttempt || !selectedTest) return;

    let isExpelled = false;

    const triggerExamViolation = (reason: string) => {
      if (isExpelled) return;

      const nowTime = Date.now();
      // 2000ms cooldown to debounce concurrent blur / visibility / fullscreen events into 1 violation
      if (nowTime - lastViolationTimeRef.current < 2000) {
        return;
      }
      lastViolationTimeRef.current = nowTime;

      const currentCount = violationsCount;
      const nextCount = currentCount + 1;
      setViolationsCount(nextCount);

      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      // If under threshold (1st or 2nd violation) -> show Warning Modal with remaining strikes
      if (nextCount < 3) {
        setWarningModalInfo({
          show: true,
          count: nextCount,
          maxCount: 3,
          reason,
          time: timeStr
        });

        if (onRecordViolationWarning && currentStudent) {
          onRecordViolationWarning(currentStudent.id, activeAttempt.id, nextCount);
        }
      } else {
        // 3rd Violation: Tolerance exhausted -> Permanent Lock & Expel
        isExpelled = true;

        // Exit fullscreen if active
        try {
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
        } catch (e) {}

        const violationData: LockedViolationInfo = {
          reason: `Batas toleransi 3 kali pelanggaran telah habis (${reason})`,
          timestamp: timeStr,
          testName: selectedTest.name,
          questionNumber: currentQuestionIdx + 1
        };

        setLockedViolationInfo(violationData);

        // Lock the participant in global system state
        if (currentStudent) {
          if (onLockParticipant) {
            onLockParticipant(currentStudent.id, activeAttempt.id, `Batas toleransi 3 kali pelanggaran telah habis (${reason})`);
          } else {
            onParticipantLogin(currentStudent.id, false);
          }
        }

        // Terminate active attempt on this client
        setActiveAttempt(null);
        setSelectedTest(null);
        setShowSecurityBriefing(false);
        setWarningModalInfo(null);
      }
    };

    // 1. Detect Window Blur (Focus loss = student clicked another app, Alt+Tab, opened another program)
    const handleWindowBlur = () => {
      setTimeout(() => {
        // Only trigger violation if page visibility is hidden (switched tab/app) or document lost focus without virtual input focus
        if (document.hidden) {
          triggerExamViolation('Terdeteksi membuka aplikasi lain / berpindah jendela saat ujian berlangsung');
        }
      }, 300);
    };

    // 2. Detect Page Visibility Change (Tab switched / browser minimized / split screen)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerExamViolation('Terdeteksi berpindah tab browser atau mengecilkan layar ujian');
      }
    };

    // 3. Detect Fullscreen Exit
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !isExpelled) {
        triggerExamViolation('Terdeteksi keluar dari mode Layar Penuh (Fullscreen)');
      }
    };

    // 4. Intercept forbidden keyboard shortcuts & system buttons
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block F11, F12
      if (e.key === 'F12' || e.key === 'F11') {
        e.preventDefault();
        e.stopPropagation();
        triggerExamViolation(`Terdeteksi menekan tombol fungsi terlarang (${e.key})`);
        return false;
      }

      // Block Alt combinations (Alt+Tab, Alt+F4, Alt+Left/Right)
      if (e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        triggerExamViolation('Terdeteksi menekan kombinasi tombol Alt (Peralihan Aplikasi)');
        return false;
      }

      // Block Windows / Meta / Command key
      if (e.metaKey || e.key === 'Meta' || e.key === 'OS') {
        e.preventDefault();
        e.stopPropagation();
        triggerExamViolation('Terdeteksi menekan tombol Windows / Command (Akses Aplikasi Luar)');
        return false;
      }

      // Block Ctrl key navigation & inspection shortcuts
      if (e.ctrlKey) {
        const key = e.key.toLowerCase();
        // Disallow new tab, new window, print, save, devtools, view source
        if (['t', 'n', 'w', 'h', 'j', 'u', 's', 'p'].includes(key) || (e.shiftKey && ['i', 'j', 'c'].includes(key))) {
          e.preventDefault();
          e.stopPropagation();
          triggerExamViolation(`Terdeteksi pintasan kombinasi terlarang (Ctrl+${e.shiftKey ? 'Shift+' : ''}${key.toUpperCase()})`);
          return false;
        }

        // Prevent copying text in multiple choice
        if (['c', 'v', 'x'].includes(key)) {
          const target = e.target as HTMLElement;
          if (target && target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            e.stopPropagation();
          }
        }
      }

      // Block PrintScreen / Screen Capture
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        e.stopPropagation();
        triggerExamViolation('Terdeteksi mencoba melakukan tangkapan layar (PrintScreen)');
        return false;
      }
    };

    // 5. Disable Right-Click Context Menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [activeAttempt, selectedTest, currentStudent, currentQuestionIdx, violationsCount, onLockParticipant, onParticipantLogin, onRecordViolationWarning]);

  // =========================================================================
  // LOGIN HANDLER (With Strict Lockout Guard)
  // =========================================================================
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    const found = participants.find(p => 
      (p.username || '').trim().toLowerCase() === cleanUser ||
      (p.examCardNo || '').trim().toLowerCase() === cleanUser ||
      (p.name || '').trim().toLowerCase() === cleanUser
    );
    
    const passMatches = found && (
      (found.passwordHash || '').trim() === cleanPass ||
      (found.passwordHash || '').trim().toLowerCase() === cleanPass.toLowerCase()
    );

    if (found && passMatches) {
      // 1. Guard against LOCKED participants
      if (found.isLocked) {
        setLockedStudentErrorModal(found);
        setLoginError('Akun Anda TERKUNCI karena telah mencapai batas maksimal 3 kali pelanggaran anti-curang. Silakan hubungi Proktor di menu Daftar Peserta untuk menekan tombol "Buka Kunci".');
        return;
      }

      // 2. Guard against multiple concurrent logins (allows resumption on HP/laptop)
      if (found.isLoggedIn) {
        setLockedStudentErrorModal(found);
        setLoginError('Sesi akun ini sedang aktif di perangkat lain. Jika Anda ingin melanjutkan ujian di perangkat ini, klik tombol "Lanjutkan Sesi di Perangkat Ini" di bawah.');
        return;
      }

      onParticipantLogin(found.id, true);
      setCurrentStudent(found);
      setViolationsCount(found.violationsCount || 0);
      setLoginError('');
      setLockedStudentErrorModal(null);
    } else {
      setLoginError('Username / Nomor Kartu / NIS atau kata sandi tidak cocok. Periksa kembali kartu peserta ujian Anda.');
    }
  };

  // Quick unlock by Proctor directly on the student machine
  const handleExecuteProctorQuickUnlock = (e: React.FormEvent, targetStudent?: Participant | null) => {
    e.preventDefault();
    setProctorPasswordError('');

    const studentToUnlock = targetStudent || showProctorQuickUnlockModal || lockedStudentErrorModal;
    if (!studentToUnlock) return;

    const validAdminPass = adminPassword || 'admin';
    if (proctorPasswordInput === validAdminPass) {
      if (onResetParticipantLogin) {
        onResetParticipantLogin(studentToUnlock.id, false);
      }
      setViolationsCount(0);
      setLockedViolationInfo(null);
      setLockedStudentErrorModal(null);
      setShowProctorQuickUnlockModal(null);
      setProctorPasswordInput('');
      setLoginError('');

      // Auto login student if they were on the login screen
      if (username.trim().toLowerCase() === studentToUnlock.username.toLowerCase()) {
        onParticipantLogin(studentToUnlock.id, true);
        setCurrentStudent({ ...studentToUnlock, isLocked: false, violationsCount: 0, isLoggedIn: true });
      }
    } else {
      setProctorPasswordError('Sandi Proktor salah! Masukkan sandi akun proktor server yang sah.');
    }
  };

  const handleLogout = () => {
    if (currentStudent) {
      onParticipantLogin(currentStudent.id, false);
      setCurrentStudent(null);
      setSelectedTest(null);
      setActiveAttempt(null);
      setJustFinishedAttempt(null);
      setLockedViolationInfo(null);
      setShowSecurityBriefing(false);
    }
  };

  const handleStartExamRequest = (test: Test) => {
    setSelectedTest(test);
    setInputToken('');
    setTokenError('');
    setShowSecurityBriefing(false);
    setHasAgreedRules(false);
  };

  const handleVerifyToken = () => {
    if (!selectedTest) return;
    if (inputToken.trim().toUpperCase() === selectedTest.token) {
      setTokenError('');
      setShowSecurityBriefing(true);
    } else {
      setTokenError('Token tidak cocok! Minta token rilis terbaru ke Guru Pengawas.');
    }
  };

  const handleExecuteStartExam = () => {
    if (!selectedTest || !currentStudent) return;

    // Trigger Fullscreen Mode
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch (e) {
      // fallback if browser blocks
    }

    // Start Exam Session
    let topicQuestions = questions.filter(q => q.topicId === selectedTest.topicId);
    
    // Handle Shuffle Questions
    if (selectedTest.shuffleQuestions) {
      topicQuestions = [...topicQuestions].sort(() => Math.random() - 0.5);
    }
    
    const testQuestions = topicQuestions.slice(0, selectedTest.questionCount);
    
    // Handle Shuffle Answers (Pilihan Ganda A, B, C, D, E)
    const letters = ['A', 'B', 'C', 'D', 'E'];
    const shuffledOptionsMap: { [questionId: string]: any[] } = {};

    testQuestions.forEach(q => {
      if (q.type === 'pilihan_ganda' && q.options && q.options.length > 0) {
        if (selectedTest.shuffleAnswers !== false) {
          // Acak opsi jawaban untuk setiap peserta
          const shuffled = [...q.options].sort(() => Math.random() - 0.5);
          shuffledOptionsMap[q.id] = shuffled.map((opt, idx) => ({
            displayKey: letters[idx] || opt.key,
            originalKey: opt.key,
            text: opt.text,
            image: opt.image
          }));
        } else {
          // Urutan asli tanpa acak
          shuffledOptionsMap[q.id] = q.options.map(opt => ({
            displayKey: opt.key,
            originalKey: opt.key,
            text: opt.text,
            image: opt.image
          }));
        }
      }
    });
    
    // Prepare blank answers array
    const initialAnswers: StudentAnswer[] = testQuestions.map(q => ({
      questionId: q.id,
      selectedOption: undefined,
      selectedDisplayKey: undefined,
      essayAnswer: undefined,
      isEvaluated: false
    }));

    const newAttempt: TestAttempt = {
      id: 'ATT-' + Date.now(),
      testId: selectedTest.id,
      participantId: currentStudent.id,
      startTime: new Date().toISOString(),
      answers: initialAnswers,
      status: 'mengerjakan',
      totalScore: 0,
      questionOrder: testQuestions.map(q => q.id),
      shuffledOptions: shuffledOptionsMap
    };

    onSubmitAttempt(newAttempt);
    setActiveAttempt(newAttempt);
    setTimeLeft(selectedTest.durationMinutes * 60);
    setCurrentQuestionIdx(0);
    setShowSecurityBriefing(false);
    setLockedViolationInfo(null);
  };

  const handleSelectOption = (qId: string, originalKey: string, displayKey?: string) => {
    if (activeAttempt) {
      const updatedAnswers = activeAttempt.answers.map(ans => 
        ans.questionId === qId ? { ...ans, selectedOption: originalKey, selectedDisplayKey: displayKey } : ans
      );
      const updated = { ...activeAttempt, answers: updatedAnswers };
      setActiveAttempt(updated);
      onUpdateAttemptAnswers(activeAttempt.id, updatedAnswers);
    }
  };

  const handleEssayChange = (qId: string, text: string) => {
    if (activeAttempt) {
      const updatedAnswers = activeAttempt.answers.map(ans => 
        ans.questionId === qId ? { ...ans, essayAnswer: text } : ans
      );
      const updated = { ...activeAttempt, answers: updatedAnswers };
      setActiveAttempt(updated);
      onUpdateAttemptAnswers(activeAttempt.id, updatedAnswers);
    }
  };

  const toggleDoubtful = (qId: string) => {
    setDoubtfulAnswers({
      ...doubtfulAnswers,
      [qId]: !doubtfulAnswers[qId]
    });
  };

  const handleFinishExam = (force = false) => {
    if (!activeAttempt || !selectedTest) return;

    if (!force && !showConfirmFinish) {
      setShowConfirmFinish(true);
      return;
    }

    // Exit Fullscreen
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    } catch (e) {}

    // Process Final Scoring
    let scoreTotal = 0;
    let totalPossiblePoints = 0;

    const finalAnswers = activeAttempt.answers.map(ans => {
      const originalQ = questions.find(q => q.id === ans.questionId);
      if (!originalQ) return ans;

      const qPoints = Number(originalQ.points) || 10;
      totalPossiblePoints += qPoints;

      if (originalQ.type === 'pilihan_ganda') {
        const isCorrect = 
          String(ans.selectedOption || '').trim().toUpperCase() === String(originalQ.correctAnswer || '').trim().toUpperCase();
        if (isCorrect) scoreTotal += qPoints;
        return {
          ...ans,
          isCorrect,
          scoreGiven: isCorrect ? qPoints : 0,
          isEvaluated: true
        };
      } else {
        // Essay is pending evaluation by default
        return {
          ...ans,
          isEvaluated: false,
          scoreGiven: 0
        };
      }
    });

    // Normalize score to 100 scale
    const finalScaledScore = totalPossiblePoints > 0 
      ? Math.round((scoreTotal / totalPossiblePoints) * 100) 
      : (activeAttempt.answers.length > 0 ? Math.round((scoreTotal / (activeAttempt.answers.length * 10)) * 100) : scoreTotal);

    const completedAttempt: TestAttempt = {
      ...activeAttempt,
      status: 'selesai',
      endTime: new Date().toISOString(),
      answers: finalAnswers,
      totalScore: finalScaledScore
    };

    onSubmitAttempt(completedAttempt);
    setJustFinishedAttempt(completedAttempt);
    
    // Clear exam states
    setActiveAttempt(null);
    setSelectedTest(null);
    setShowConfirmFinish(false);
  };

  // UI Format timer helper
  const formatTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // =========================================================================
  // VIEW 1: LOCKED / EXPELLED SCREEN (Siswa Terlempar dari Ujian - 3x Toleransi Habis)
  // =========================================================================
  if (lockedViolationInfo) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 font-sans relative overflow-hidden select-none">
        {/* Warning Background Glow */}
        <div className="absolute top-1/3 w-96 h-96 bg-red-600/15 rounded-full blur-3xl pointer-events-none animate-pulse"></div>

        <div className="bg-slate-900 border-2 border-red-500/60 rounded-3xl max-w-xl w-full p-8 shadow-2xl relative z-10 space-y-6 text-center animate-in zoom-in-95 duration-200">
          
          {/* Warning Icon Badge */}
          <div className="p-4 bg-red-500/10 text-red-400 rounded-2xl w-max mx-auto border border-red-500/30 shadow-inner">
            <ShieldAlert className="h-12 w-12 text-red-500 animate-bounce" />
          </div>

          <div>
            <span className="px-3.5 py-1 bg-red-500/20 text-red-400 font-bold text-xs rounded-full border border-red-500/40 uppercase tracking-wider inline-block mb-3">
              🚨 Pelanggaran Keamanan CBT &bull; Toleransi 3x Habis
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Anda Terlempar &amp; Akun Terkunci!
            </h2>
            <p className="text-xs text-red-300 font-semibold mt-2 leading-relaxed">
              Sistem anti-curang telah mencatat 3 kali pelanggaran (membuka aplikasi lain / berpindah tab / keluar layar penuh). Sesi ujian Anda dinonaktifkan demi integritas ujian.
            </p>
          </div>

          {/* Violation Details Card */}
          <div className="bg-slate-950/80 rounded-2xl border border-red-900/50 p-5 text-left space-y-3">
            <div className="flex justify-between items-center text-xs border-b border-slate-800 pb-2">
              <span className="text-slate-400 font-medium">Nama Peserta:</span>
              <span className="font-bold text-white">{currentStudent?.name || username}</span>
            </div>
            <div className="flex justify-between items-center text-xs border-b border-slate-800 pb-2">
              <span className="text-slate-400 font-medium">Sesi Ujian:</span>
              <span className="font-bold text-emerald-400">{lockedViolationInfo.testName}</span>
            </div>
            <div className="flex justify-between items-center text-xs border-b border-slate-800 pb-2">
              <span className="text-slate-400 font-medium">Total Pelanggaran:</span>
              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/40 rounded-md font-mono font-black text-[11px]">
                3 / 3 (Batas Maksimal Habis)
              </span>
            </div>
            <div className="flex justify-between items-center text-xs border-b border-slate-800 pb-2">
              <span className="text-slate-400 font-medium">Waktu Pelanggaran Terakhir:</span>
              <span className="font-mono text-amber-400 font-bold">{lockedViolationInfo.timestamp}</span>
            </div>
            <div className="text-xs space-y-1">
              <span className="text-slate-400 font-medium block">Penyebab Penguncian:</span>
              <p className="text-red-400 font-bold bg-red-950/40 p-2.5 rounded-lg border border-red-900/40 leading-relaxed">
                ⚠️ {lockedViolationInfo.reason}
              </p>
            </div>
          </div>

          {/* Solution & Next Step Instructions */}
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-300 text-xs leading-relaxed text-left space-y-2">
            <p className="font-bold flex items-center gap-1.5 text-amber-400 uppercase tracking-wide">
              <Info className="h-4 w-4 shrink-0" /> Petunjuk Pembukaan Akun (Riset):
            </p>
            <p>
              1. Lapor segera ke <strong>Proktor / Operator / Guru Pengawas</strong> di ruang ujian.
            </p>
            <p>
              2. Proktor dapat membuka kunci di server Admin via menu <strong>"Daftar Peserta &rarr; Buka Kunci"</strong>, ATAU memasukkan sandi Proktor langsung di bawah ini untuk membuka kunci seketika.
            </p>
          </div>

          {/* Quick Unlock Form by Proctor on student machine */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 text-left space-y-3">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5 text-emerald-400" /> Buka Kunci Langsung di Tempat (Oleh Proktor)
            </span>
            <form onSubmit={(e) => handleExecuteProctorQuickUnlock(e, currentStudent)} className="flex flex-col sm:flex-row gap-2">
              <input
                type="password"
                placeholder="Masukkan Sandi Admin/Proktor..."
                value={proctorPasswordInput}
                onChange={(e) => setProctorPasswordInput(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-98 shrink-0 flex items-center justify-center gap-1"
              >
                <ShieldCheck className="h-4 w-4" /> Buka Kunci Sekarang
              </button>
            </form>
            {proctorPasswordError && (
              <p className="text-[11px] text-red-400 font-medium">{proctorPasswordError}</p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowResetGuideModal(true)}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-all border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="h-4 w-4 text-emerald-400" /> Panduan Riset Server
            </button>
            <button
              onClick={() => {
                setLockedViolationInfo(null);
                setCurrentStudent(null);
              }}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
            >
              <ArrowLeft className="h-4 w-4" /> Ke Halaman Login
            </button>
          </div>
        </div>

        {/* Global Reset Guide Modal */}
        {showResetGuideModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-left animate-in zoom-in-95">
              <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <BookOpen className="h-5 w-5" />
                  <h3 className="font-black text-white text-base">Panduan Cara Riset Akun Siswa</h3>
                </div>
                <button
                  onClick={() => setShowResetGuideModal(false)}
                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                <p className="font-semibold text-white">Langkah untuk Guru / Proktor meriset akun siswa di server:</p>
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                  <p><strong className="text-emerald-400">1.</strong> Masuk ke <strong>Panel Admin/Proktor</strong> menggunakan sandi proktor.</p>
                  <p><strong className="text-emerald-400">2.</strong> Buka menu <strong>"Daftar Peserta"</strong> di sidebar kiri.</p>
                  <p><strong className="text-emerald-400">3.</strong> Klik tab filter merah <strong>"🚨 Peserta Terkunci"</strong> untuk melihat siswa yang terkena lockout.</p>
                  <p><strong className="text-emerald-400">4.</strong> Klik tombol hijau <strong>"Buka Kunci (Lanjut Ujian)"</strong>:</p>
                  <ul className="pl-4 list-disc text-slate-400 space-y-1">
                    <li>Pelanggaran akan diriset kembali menjadi <strong>0/3</strong> (diberi 3x toleransi baru).</li>
                    <li>Siswa dapat login kembali dan melanjutkan sisa waktu serta jawaban yang telah tersimpan.</li>
                  </ul>
                  <p><strong className="text-emerald-400">5.</strong> Atau klik tombol <strong>"Riset Total"</strong> jika siswa diperintahkan mengulang ujian dari nomor 1.</p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setShowResetGuideModal(false)}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Tutup Panduan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: LOGIN SCREEN
  // =========================================================================
  if (!currentStudent) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
        {/* Subtle Ambient Background Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse pointer-events-none"></div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
          <div className="inline-flex p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400 mb-4 shadow-inner">
            <GraduationCap className="h-10 w-10" />
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight">Portal Ujian Siswa</h2>
          <p className="mt-1 text-sm text-emerald-400 font-medium">Safe Exam Lockdown &bull; Toleransi 3x Anti-Curang</p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-md space-y-5">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Username Peserta</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: ahmad"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-700 rounded-xl bg-slate-950 text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Sandi Keamanan (Password)</label>
                <input
                  type="password"
                  required
                  placeholder="Sandi akun"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-700 rounded-xl bg-slate-950 text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm transition-all"
                />
              </div>

              {loginError && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex flex-col gap-2 text-xs text-red-400 font-medium leading-relaxed">
                  <div className="flex gap-2.5">
                    <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5 text-red-400" />
                    <div>
                      <span className="font-bold block text-red-300 mb-0.5">Peringatan Login:</span>
                      <span>{loginError}</span>
                    </div>
                  </div>
                  {lockedStudentErrorModal && (
                    <div className="mt-2 pt-2 border-t border-red-500/20 space-y-2">
                      {lockedStudentErrorModal.isLoggedIn && !lockedStudentErrorModal.isLocked && (
                        <button
                          type="button"
                          onClick={() => {
                            onParticipantLogin(lockedStudentErrorModal.id, true);
                            setCurrentStudent(lockedStudentErrorModal);
                            setViolationsCount(lockedStudentErrorModal.violationsCount || 0);
                            setLoginError('');
                            setLockedStudentErrorModal(null);
                          }}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                        >
                          <LogIn className="h-3.5 w-3.5" /> Lanjutkan Sesi di Perangkat Ini (HP / Laptop)
                        </button>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setShowResetGuideModal(true)}
                          className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-bold rounded-lg transition-all border border-amber-500/30 flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <BookOpen className="h-3.5 w-3.5" /> Cara Riset Akun
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowProctorQuickUnlockModal(lockedStudentErrorModal)}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Key className="h-3.5 w-3.5" /> Buka Kunci Proktor
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 cursor-pointer active:scale-98"
              >
                <LogIn className="h-4 w-4" /> Masuk Ruang Ujian
              </button>
            </form>

            <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-500 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Toleransi 3x Pelanggaran
              </span>
              {onReturnToGateway && (
                <button
                  type="button"
                  onClick={onReturnToGateway}
                  className="text-slate-400 hover:text-white underline font-semibold cursor-pointer"
                >
                  Pilih Portal Lain
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
              Perhatian: Siswa diberikan 3 kali batas toleransi jika tidak sengaja membuka aplikasi lain sebelum akun terkunci permanen.
            </p>
          </div>
        </div>

        {/* Modal: Quick Unlock on Login Screen */}
        {showProctorQuickUnlockModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-left animate-in zoom-in-95">
              <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Key className="h-5 w-5" />
                  <h3 className="font-black text-white text-base">Buka Kunci Akun Siswa di Tempat</h3>
                </div>
                <button
                  onClick={() => setShowProctorQuickUnlockModal(null)}
                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-xs text-slate-300">
                Membuka kunci untuk siswa: <strong className="text-white">{showProctorQuickUnlockModal.name}</strong> ({showProctorQuickUnlockModal.username}). Pelanggaran akan diriset ke 0/3.
              </p>

              <form onSubmit={(e) => handleExecuteProctorQuickUnlock(e, showProctorQuickUnlockModal)} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Sandi Proktor / Administrator
                  </label>
                  <input
                    type="password"
                    autoFocus
                    required
                    placeholder="Masukkan sandi proktor server..."
                    value={proctorPasswordInput}
                    onChange={(e) => setProctorPasswordInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {proctorPasswordError && (
                  <p className="text-xs text-red-400 font-medium">{proctorPasswordError}</p>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowProctorQuickUnlockModal(null)}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ShieldCheck className="h-4 w-4" /> Buka Kunci Sekarang
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Global Reset Guide Modal */}
        {showResetGuideModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-left animate-in zoom-in-95">
              <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <BookOpen className="h-5 w-5" />
                  <h3 className="font-black text-white text-base">Panduan Cara Riset Akun Siswa</h3>
                </div>
                <button
                  onClick={() => setShowResetGuideModal(false)}
                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                <p className="font-semibold text-white">Langkah untuk Guru / Proktor meriset akun siswa di server:</p>
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                  <p><strong className="text-emerald-400">1.</strong> Masuk ke <strong>Panel Admin/Proktor</strong> menggunakan sandi proktor.</p>
                  <p><strong className="text-emerald-400">2.</strong> Buka menu <strong>"Daftar Peserta"</strong> di sidebar kiri.</p>
                  <p><strong className="text-emerald-400">3.</strong> Klik tab filter merah <strong>"🚨 Peserta Terkunci"</strong> untuk melihat siswa yang terkena lockout.</p>
                  <p><strong className="text-emerald-400">4.</strong> Klik tombol hijau <strong>"Buka Kunci (Lanjut Ujian)"</strong>:</p>
                  <ul className="pl-4 list-disc text-slate-400 space-y-1">
                    <li>Pelanggaran akan diriset kembali menjadi <strong>0/3</strong> (diberi 3x toleransi baru).</li>
                    <li>Siswa dapat login kembali dan melanjutkan sisa waktu serta jawaban yang telah tersimpan.</li>
                  </ul>
                  <p><strong className="text-emerald-400">5.</strong> Atau klik tombol <strong>"Riset Total"</strong> jika siswa diperintahkan mengulang ujian dari nomor 1.</p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setShowResetGuideModal(false)}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Tutup Panduan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: JUST FINISHED ATTEMPT ACKNOWLEDGEMENT SCREEN
  // =========================================================================
  if (justFinishedAttempt) {
    const relatedTest = tests.find(t => t.id === justFinishedAttempt.testId);
    const hasEssay = questions
      .filter(q => q.topicId === relatedTest?.topicId)
      .slice(0, relatedTest?.questionCount)
      .some(q => q.type === 'essay');

    return (
      <div className="min-h-screen bg-emerald-50/50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="bg-white rounded-3xl border border-emerald-100 shadow-xl p-8 max-w-md w-full text-center space-y-6 animate-in zoom-in-95">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-full w-max mx-auto border border-emerald-100">
            <CheckCircle className="h-10 w-10 animate-bounce" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800">Ujian Berhasil Diserahkan!</h2>
            <p className="text-sm text-slate-500 mt-1">Sesi ujian Anda telah berakhir dan seluruh jawaban tersimpan aman.</p>
          </div>

          {relatedTest?.showResultImmediate ? (
            <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-2">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest block">Skor Ujian Anda</span>
              <strong className="text-5xl font-mono text-emerald-900 font-black block">{justFinishedAttempt.totalScore}</strong>
              {hasEssay && (
                <p className="text-[10px] text-emerald-700 italic font-semibold mt-2">
                  *Catatan: Skor ini belum termasuk penilaian manual soal uraian (essay).
                </p>
              )}
            </div>
          ) : (
            <div className="p-4 bg-emerald-50/30 rounded-xl text-emerald-850 text-xs leading-relaxed font-semibold border border-emerald-100/50">
              Hasil ujian disembunyikan oleh guru Anda. Nilai pengerjaan akan diumumkan setelah seluruh pemeriksaan manual selesai.
            </div>
          )}

          <button
            onClick={() => setJustFinishedAttempt(null)}
            className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-sm transition-all shadow-md cursor-pointer active:scale-98"
          >
            Kembali ke Beranda Sesi
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 4: ACTIVE TEST-TAKING ENGINE (Strict Fullscreen & Anti-Cheat Active)
  // =========================================================================
  if (activeAttempt && selectedTest) {
    let testQuestions: Question[] = [];
    if (activeAttempt.questionOrder && activeAttempt.questionOrder.length > 0) {
      testQuestions = activeAttempt.questionOrder
        .map(qId => questions.find(q => q.id === qId))
        .filter(Boolean) as Question[];
    }
    
    if (testQuestions.length === 0) {
      testQuestions = questions
        .filter(q => q.topicId === selectedTest.topicId)
        .slice(0, selectedTest.questionCount);
    }

    const activeQ = testQuestions[currentQuestionIdx];
    const currentAnswerObj = activeAttempt.answers.find(a => a.questionId === activeQ?.id);

    // Get options for active question (shuffled for this student if enabled)
    const currentOptions = activeQ?.type === 'pilihan_ganda' 
      ? (activeAttempt.shuffledOptions?.[activeQ.id] || activeQ.options?.map(o => ({
          displayKey: o.key,
          originalKey: o.key,
          text: o.text,
          image: o.image
        })) || [])
      : [];

    return (
      <div className="min-h-screen bg-slate-100 flex flex-col font-sans select-none relative">
        
        {/* Top Anti-Cheat Lockdown Security Warning Banner with Strike Tolerance */}
        <div className={`text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-xs transition-colors ${
          violationsCount === 0
            ? 'bg-slate-800 border-b border-slate-700'
            : violationsCount === 1
            ? 'bg-amber-600 border-b border-amber-700 animate-pulse'
            : 'bg-red-600 border-b border-red-700 animate-pulse'
        }`}>
          <div className="flex items-center gap-2 flex-wrap">
            <Lock className="h-4 w-4 shrink-0" />
            <span>
              {violationsCount === 0
                ? 'SAFE EXAM LOCKDOWN AKTIF: Dilarang membuka aplikasi lain / berpindah tab (Toleransi 3x).'
                : violationsCount === 1
                ? '⚠️ PERINGATAN (1/3 PELANGGARAN): Sistem mendeteksi aktivitas keluar layar. Sisa toleransi: 2x lagi!'
                : '🚨 PERINGATAN KRITIS (2/3 PELANGGARAN): 1x lagi berpindah aplikasi/tab, akun Anda akan langsung terkunci permanen!'}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`px-2.5 py-0.5 rounded text-[11px] tracking-wider uppercase font-mono font-bold ${
              violationsCount === 0 ? 'bg-slate-700 text-slate-200' : violationsCount === 1 ? 'bg-amber-800 text-amber-100' : 'bg-red-800 text-white'
            }`}>
              Toleransi: {violationsCount}/3
            </span>
          </div>
        </div>

        {/* Header Bar */}
        <header className="bg-emerald-900 text-white py-3.5 px-6 flex justify-between items-center shadow-md">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-6 w-6 text-emerald-300" />
            <div>
              <h1 className="font-bold text-sm tracking-tight sm:text-base leading-none">{selectedTest.name}</h1>
              <span className="text-[10px] text-emerald-200 mt-1 block font-medium">
                Peserta: {currentStudent.name} ({groups.find(g => g.id === currentStudent.groupId)?.name}) &bull; No: {currentStudent.examCardNo}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-emerald-950 px-4 py-2 rounded-xl border border-emerald-800">
            <Clock className="h-4 w-4 text-emerald-300 shrink-0" />
            <div className="text-right">
              <span className="text-[10px] text-emerald-400 font-bold block uppercase leading-none">Sisa Waktu</span>
              <span className={`font-mono text-base font-black ${timeLeft < 300 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>
        </header>

        {/* Main Interface Split */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 p-6">
          {/* Left panel: Question Display */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-6">
            {activeQ ? (
              <div className="space-y-6">
                {/* Question index indicator */}
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <span className="text-xs font-black text-emerald-700 uppercase tracking-wide">
                    Soal Nomor {currentQuestionIdx + 1} dari {testQuestions.length}
                  </span>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                    Bobot: {activeQ.points} Poin
                  </span>
                </div>

                {/* Attachments */}
                {activeQ.image && (
                  <div className="mb-4 rounded-xl overflow-hidden border border-slate-200 p-2 bg-slate-50 w-max max-w-full">
                    <img 
                      src={activeQ.image.startsWith('http') ? activeQ.image : 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=600'} 
                      alt="Gambar Pendukung Soal" 
                      className="max-h-56 max-w-md rounded object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                {activeQ.audio && (
                  <div className="mb-4 p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-3 max-w-md">
                    <span className="text-xs font-bold text-emerald-700">🎧 [AUDIO] Listening Section</span>
                  </div>
                )}

                {/* Question Text */}
                <p className="text-slate-800 text-base font-medium leading-relaxed">{activeQ.text}</p>

                {/* Answer Options or Essay Box */}
                {activeQ.type === 'pilihan_ganda' && currentOptions.length > 0 ? (
                  <div className="space-y-2.5">
                    {currentOptions.map((opt: any) => {
                      const isSelected = currentAnswerObj?.selectedOption === opt.originalKey;
                      return (
                        <button
                          key={opt.displayKey}
                          onClick={() => handleSelectOption(activeQ.id, opt.originalKey, opt.displayKey)}
                          className={`w-full p-4 rounded-xl border text-left text-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-sm'
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`h-7 w-7 rounded-lg font-mono font-bold text-xs flex items-center justify-center border shrink-0 ${
                              isSelected
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'bg-slate-100 border-slate-200 text-slate-600'
                            }`}>
                              {opt.displayKey}
                            </span>
                            <span className="leading-snug">{opt.text}</span>
                          </div>
                          {opt.image && (
                            <div className="mt-2 sm:mt-0 max-w-full">
                              <img 
                                src={opt.image} 
                                alt={`Lampiran Pilihan ${opt.displayKey}`} 
                                className="max-h-24 max-w-[180px] rounded-lg border border-slate-100 object-contain bg-slate-50 p-1"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
                      Jawaban Anda (Uraikan dengan jelas):
                    </label>
                    <textarea
                      rows={6}
                      placeholder="Tuliskan langkah pengerjaan atau esai jawaban Anda secara detail di sini..."
                      value={currentAnswerObj?.essayAnswer || ''}
                      onChange={(e) => handleEssayChange(activeQ.id, e.target.value)}
                      className="w-full p-4 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    ></textarea>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-500 text-sm italic">Soal tidak dapat dimuat.</p>
            )}

            {/* Previous, Ragu-ragu, Next Buttons */}
            <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  disabled={currentQuestionIdx === 0}
                  onClick={() => setCurrentQuestionIdx(prev => prev - 1)}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" /> Soal Sebelumnya
                </button>
                <button
                  onClick={() => activeQ && toggleDoubtful(activeQ.id)}
                  className={`flex-1 sm:flex-none px-4 py-2.5 border rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeQ && doubtfulAnswers[activeQ.id]
                      ? 'bg-amber-500 border-amber-500 text-white'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={activeQ ? doubtfulAnswers[activeQ.id] || false : false}
                    readOnly
                    className="hidden"
                  />
                  Ragu-ragu
                </button>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                {currentQuestionIdx < testQuestions.length - 1 ? (
                  <button
                    onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-98"
                  >
                    Soal Berikutnya <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleFinishExam()}
                    className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-98"
                  >
                    <CheckCircle className="h-4 w-4" /> Selesaikan Ujian
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right panel: Side Question Navigation Grid */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <List className="h-4 w-4 text-emerald-600" /> Navigasi Soal Ujian
              </h3>

              <div className="grid grid-cols-5 gap-2.5">
                {testQuestions.map((q, idx) => {
                  const ansObj = activeAttempt.answers.find(a => a.questionId === q.id);
                  const isAnswered = q.type === 'pilihan_ganda' 
                    ? ansObj?.selectedOption !== undefined 
                    : (ansObj?.essayAnswer && ansObj.essayAnswer.trim().length > 0);
                  const isDoubt = doubtfulAnswers[q.id];
                  const isActive = currentQuestionIdx === idx;

                  let gridColor = 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700';
                  if (isActive) {
                    gridColor = 'bg-emerald-600 text-white border-emerald-600 font-bold';
                  } else if (isDoubt) {
                    gridColor = 'bg-amber-400 text-white border-amber-400 font-bold';
                  } else if (isAnswered) {
                    gridColor = 'bg-emerald-500 text-white border-emerald-500 font-bold';
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIdx(idx)}
                      className={`h-10 rounded-xl text-xs font-bold flex items-center justify-center border transition-all cursor-pointer ${gridColor}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-[10px] text-slate-500 font-semibold">
                <div className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded bg-emerald-500 shrink-0"></span> Dijawab
                </div>
                <div className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded bg-amber-400 shrink-0"></span> Ragu-ragu
                </div>
                <div className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded bg-white border border-slate-200 shrink-0"></span> Belum
                </div>
              </div>
            </div>

            {/* Confirm Submission Dialog */}
            {showConfirmFinish && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
                <p className="text-xs font-bold text-amber-800 uppercase flex items-center gap-1 leading-none">
                  <AlertCircle className="h-4 w-4 shrink-0" /> Konfirmasi Penyerahan
                </p>
                <p className="text-xs text-amber-800 leading-relaxed font-semibold">
                  Apakah Anda yakin ingin menyelesaikan ujian sekarang? Setelah dikirim, jawaban tidak dapat diubah kembali.
                </p>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowConfirmFinish(false)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-[10px] font-bold rounded-lg border transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => handleFinishExam(true)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition-all shadow cursor-pointer"
                  >
                    Kirim Jawaban
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Warning Modal for Strike 1 and Strike 2 */}
        {warningModalInfo && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
            <div className="bg-slate-900 border-2 border-amber-500 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-left animate-in zoom-in-95">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
                  <AlertTriangle className="h-7 w-7 animate-bounce" />
                </div>
                <div>
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-black uppercase rounded-md border border-amber-500/30 font-mono">
                    Peringatan Pelanggaran #{warningModalInfo.count} dari 3
                  </span>
                  <h3 className="text-lg font-black text-white mt-0.5">Peringatan Anti-Curang!</h3>
                </div>
              </div>

              <div className="bg-amber-950/40 border border-amber-900/60 rounded-2xl p-4 space-y-2 text-xs text-amber-200 leading-relaxed">
                <p className="font-bold text-amber-300">
                  ⚠️ Aktivitas Terdeteksi: <span className="text-white">{warningModalInfo.reason}</span>
                </p>
                <p>
                  Sistem telah mencatat pelanggaran ke-<strong>{warningModalInfo.count}</strong> dari maksimal <strong>3 kali toleransi</strong>.
                </p>
                <div className="p-2 bg-slate-950 rounded-xl border border-amber-800/40 mt-2">
                  <p className="font-bold text-white text-[11px]">
                    Sisa Kesempatan: <span className="text-amber-400 font-black">{warningModalInfo.remaining} kali lagi</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Jika Anda keluar layar/berpindah aplikasi {warningModalInfo.remaining} kali lagi, akun akan otomatis terkunci dan Anda akan langsung dikeluarkan dari ujian.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  try {
                    if (!document.fullscreenElement) {
                      document.documentElement.requestFullscreen().catch(() => {});
                    }
                  } catch {}
                  setWarningModalInfo(null);
                }}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <ShieldCheck className="h-4 w-4" /> Saya Mengerti &amp; Kembali ke Layar Penuh Ujian
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 5: TOKEN ENTRY & PRE-EXAM SECURITY LOCKDOWN BRIEFING
  // =========================================================================
  if (selectedTest) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
        
        {!showSecurityBriefing ? (
          /* Step A: Token Verification */
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl space-y-6">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl w-max mx-auto border border-emerald-500/20">
              <Key className="h-8 w-8 animate-pulse" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-white">{selectedTest.name}</h2>
              <p className="text-xs text-slate-400 mt-1">Durasi Ujian: {selectedTest.durationMinutes} Menit &bull; {selectedTest.questionCount} Butir Soal</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-widest block text-left">
                  Sandi Token Keamanan
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="6 Digit Token"
                  value={inputToken}
                  onChange={(e) => setInputToken(e.target.value)}
                  className="w-full text-center px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono font-bold tracking-widest text-lg placeholder-slate-600 uppercase focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-slate-500 text-left leading-relaxed">
                  Token diberikan secara resmi oleh Guru Pengawas di ruang kelas.
                </p>
              </div>

              {tokenError && (
                <p className="text-xs text-red-400 font-medium bg-red-500/10 border border-red-500/20 rounded-lg p-2 leading-relaxed text-left">
                  {tokenError}
                </p>
              )}

              <div className="flex gap-2.5">
                <button
                  onClick={() => setSelectedTest(null)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-sm transition-all border border-slate-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleVerifyToken}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-emerald-600/20 cursor-pointer active:scale-98"
                >
                  Verifikasi Token
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Step B: Strict Lockdown Security Briefing Confirmation */
          <div className="bg-slate-900 border-2 border-emerald-500/60 rounded-3xl p-8 max-w-lg w-full shadow-2xl space-y-6 text-left animate-in zoom-in-95">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
                <ShieldAlert className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Protokol Keamanan Layar Penuh</h3>
                <p className="text-xs text-emerald-400 font-medium">Safe Exam Anti-Cheat &bull; Toleransi 3x Pelanggaran</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <p className="font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wide">
                <AlertTriangle className="h-4 w-4" /> Aturan Ketat Selama Ujian Berlangsung:
              </p>
              <ul className="space-y-2 list-disc pl-4 text-slate-300">
                <li>
                  <strong className="text-white">Layar Penuh Terkunci:</strong> Ujian wajib berjalan dalam mode layar penuh (fullscreen).
                </li>
                <li>
                  <strong className="text-white">DILARANG membuka aplikasi lain:</strong> Membuka browser lain, kalkulator, WhatsApp, catatan, atau program lain dilarang keras.
                </li>
                <li>
                  <strong className="text-white">DILARANG berpindah tab / Alt+Tab:</strong> Menekan tombol Alt+Tab, Windows Key, atau berganti tab akan memicu sensor pelanggaran.
                </li>
                <li className="text-emerald-300 font-bold bg-emerald-950/40 p-2 rounded-lg border border-emerald-800/50">
                  🛡️ SISTEM TOLERANSI 3 KALI: Jika Anda tidak sengaja keluar layar/berpindah tab, sistem akan memberikan peringatan pada pelanggaran ke-1 dan ke-2. Pada pelanggaran ke-3, akun akan otomatis terkunci dan Anda terlempar keluar.
                </li>
                <li className="text-slate-400 text-[11px]">
                  Jika akun terkunci, proktor dapat meriset akun Anda via Panel Admin atau membuka kunci langsung di layar peserta dengan sandi proktor.
                </li>
              </ul>
            </div>

            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer bg-slate-800/60 p-3 rounded-xl border border-slate-700 hover:border-emerald-500/50 transition-all">
                <input
                  type="checkbox"
                  checked={hasAgreedRules}
                  onChange={(e) => setHasAgreedRules(e.target.checked)}
                  className="mt-0.5 rounded border-slate-600 text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                />
                <span className="text-xs text-slate-300 font-semibold leading-relaxed">
                  Saya memahami aturan di atas dan bersedia menerima risiko akun terkunci jika melakukan pelanggaran melebihi batas 3 kali toleransi.
                </span>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowSecurityBriefing(false)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all border border-slate-700 cursor-pointer"
              >
                Kembali
              </button>
              <button
                disabled={!hasAgreedRules}
                onClick={handleExecuteStartExam}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-xl text-xs transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Maximize className="h-4 w-4" /> Kunci Layar &amp; Mulai Ujian
              </button>
            </div>
          </div>
        )}

      </div>
    );
  }

  // =========================================================================
  // VIEW 6: STUDENT DASHBOARD (Select Scheduled Tests & View Exam History)
  // =========================================================================
  const eligibleTests = tests.filter(t => {
    if (t.status !== 'aktif') return false;
    
    // Check if test is targeted to all classes or student's group
    const targetGroups = (t.groupIds && t.groupIds.length > 0)
      ? t.groupIds
      : (t.groupId ? (t.groupId === 'ALL' ? ['ALL'] : t.groupId.split(',')) : ['ALL']);

    if (targetGroups.includes('ALL')) return true;
    if (!currentStudent?.groupId) return true;
    return targetGroups.includes(currentStudent.groupId);
  });

  // Completed history attempts for current student
  const studentHistory = testAttempts.filter(
    att => att.participantId === currentStudent.id && att.status === 'selesai'
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Student Nav */}
      <nav className="bg-white border-b border-slate-200 py-4 px-6 flex justify-between items-center shadow-xs sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-sm sm:text-base leading-none">Dashboard Peserta</h2>
            <span className="text-[10px] text-slate-400 font-semibold block mt-1">CBT Online Mandiri</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-slate-800">{currentStudent.name}</p>
            <p className="text-[10px] text-slate-500 font-medium uppercase">
              Kelas: {groups.find(g => g.id === currentStudent.groupId)?.name || 'Umum'} &bull; No: {currentStudent.examCardNo || currentStudent.username}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-3.5 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200 transition-all cursor-pointer active:scale-95"
          >
            Keluar Sesi
          </button>
        </div>
      </nav>

      {/* Main Panel */}
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-6">
        {/* Welcome Header */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-slate-800">Selamat datang, {currentStudent.name}!</h1>
            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">
              Akun Terverifikasi
            </span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            Portal ujian CBT mandiri terproteksi. Anda dapat mengerjakan ujian terjadwal yang ditujukan untuk kelas Anda atau meninjau seluruh riwayat dan hasil nilai ujian yang telah diselesaikan.
          </p>
        </div>

        {/* Dashboard Tabs: Sesi Ujian Aktif vs Riwayat & Hasil Ujian */}
        <div className="flex gap-2 p-1.5 bg-slate-200/70 rounded-2xl border border-slate-200 w-full sm:w-max">
          <button
            onClick={() => setStudentActiveTab('ujian_tersedia')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              studentActiveTab === 'ujian_tersedia'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="h-4 w-4 text-emerald-600" />
            <span>Sesi Ujian Tersedia</span>
            <span className={`px-2 py-0.2 text-[10px] rounded-full font-extrabold ${
              studentActiveTab === 'ujian_tersedia' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-300 text-slate-700'
            }`}>
              {eligibleTests.length}
            </span>
          </button>

          <button
            onClick={() => setStudentActiveTab('riwayat_hasil')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              studentActiveTab === 'riwayat_hasil'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart className="h-4 w-4 text-emerald-600" />
            <span>Riwayat &amp; Hasil Ujian</span>
            <span className={`px-2 py-0.2 text-[10px] rounded-full font-extrabold ${
              studentActiveTab === 'riwayat_hasil' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-300 text-slate-700'
            }`}>
              {studentHistory.length}
            </span>
          </button>
        </div>

        {/* TAB 1: Sesi Ujian Tersedia */}
        {studentActiveTab === 'ujian_tersedia' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Daftar Ujian Aktif ({eligibleTests.length})
              </h3>
              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Anti-Cheat Lockdown Siap
              </span>
            </div>

            {eligibleTests.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-3xl bg-white shadow-xs flex flex-col items-center justify-center">
                <Award className="h-10 w-10 text-slate-300 mb-2 animate-pulse" />
                <p className="text-sm font-semibold text-slate-700">Tidak ada tes aktif terjadwal</p>
                <p className="text-xs text-slate-400 mt-1">Hubungi panitia/guru penguji Anda untuk membuka jadwal ujian baru.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {eligibleTests.map(test => {
                  const completedAttempt = testAttempts.find(
                    att => att.testId === test.id && att.participantId === currentStudent.id && att.status === 'selesai'
                  );
                  const isSubmitted = !!completedAttempt;
                  const isOngoing = testAttempts.some(
                    att => att.testId === test.id && att.participantId === currentStudent.id && att.status === 'mengerjakan'
                  );

                  return (
                    <div key={test.id} className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-100">
                              {test.durationMinutes} Menit &bull; {test.questionCount} Soal
                            </span>
                            {(() => {
                              const targetGroups = (test.groupIds && test.groupIds.length > 0)
                                ? test.groupIds
                                : (test.groupId ? (test.groupId === 'ALL' ? ['ALL'] : test.groupId.split(',')) : ['ALL']);
                              
                              const isAll = targetGroups.includes('ALL');
                              if (isAll) {
                                return (
                                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                                    <Users className="h-3 w-3 text-slate-500" />
                                    Semua Kelas
                                  </span>
                                );
                              }
                              
                              const names = targetGroups.map(gid => groups.find(g => g.id === gid)?.name || gid);
                              return (
                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                  <GraduationCap className="h-3 w-3 text-emerald-600" />
                                  {names.join(', ')}
                                </span>
                              );
                            })()}
                          </div>
                          {isSubmitted ? (
                            <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                              Selesai (Skor: {completedAttempt.totalScore})
                            </span>
                          ) : isOngoing ? (
                            <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200 animate-pulse shrink-0">
                              Sedang Berlangsung
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-slate-100 text-slate-600 shrink-0">
                              Siap Dikerjakan
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-slate-800 text-base leading-snug">{test.name}</h4>
                        <p className="text-[10px] text-slate-400">Batas Waktu: {test.endTime.replace('T', ' ')}</p>
                      </div>

                      <div>
                        {isSubmitted ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelectedHistoryAttempt(completedAttempt)}
                              className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                            >
                              <Eye className="h-4 w-4" /> Lihat Rincian Hasil &amp; Jawaban
                            </button>
                          </div>
                        ) : isOngoing ? (
                          <button
                            onClick={() => handleStartExamRequest(test)}
                            className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer active:scale-98 flex items-center justify-center gap-1.5"
                          >
                            <RefreshCw className="h-3.5 w-3.5" /> Lanjutkan Sesi Ujian
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStartExamRequest(test)}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer active:scale-98 flex items-center justify-center gap-1.5"
                          >
                            <Maximize className="h-3.5 w-3.5" /> Masukkan Token &amp; Mulai Ujian
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Riwayat & Hasil Ujian Siswa */}
        {studentActiveTab === 'riwayat_hasil' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Riwayat Ujian Yang Telah Selesai ({studentHistory.length})
              </h3>
              <span className="text-[10px] text-slate-500 font-semibold">
                Nilai terverifikasi otomatis &amp; manual guru
              </span>
            </div>

            {studentHistory.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-3xl bg-white shadow-xs flex flex-col items-center justify-center">
                <BarChart className="h-10 w-10 text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-700">Belum ada riwayat hasil ujian</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Anda belum menyelesaikan sesi ujian apapun. Silakan buka tab "Sesi Ujian Tersedia" untuk mulai mengerjakan ujian.
                </p>
                <button
                  onClick={() => setStudentActiveTab('ujian_tersedia')}
                  className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  Lihat Ujian Tersedia
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {studentHistory.map(att => {
                  const test = tests.find(t => t.id === att.testId);
                  const isCompetent = att.totalScore >= 75;
                  const correctCount = att.answers.filter(a => a.isCorrect).length;
                  const totalAnswered = att.answers.filter(a => a.selectedOption !== undefined || (a.essayAnswer && a.essayAnswer.trim().length > 0)).length;
                  const pendingEssay = att.answers.some(ans => {
                    const q = questions.find(qu => qu.id === ans.questionId);
                    return q?.type === 'essay' && !ans.isEvaluated;
                  });

                  const formattedDate = att.endTime 
                    ? new Date(att.endTime).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
                    : '-';

                  return (
                    <div 
                      key={att.id}
                      className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Selesai
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono font-medium">
                            Diserahkan: {formattedDate}
                          </span>
                          {pendingEssay && (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold rounded-lg">
                              Essay Menunggu Koreksi Guru
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-slate-800 text-base leading-snug">
                          {test?.name || 'Ujian CBT Mandiri'}
                        </h4>

                        <div className="flex items-center gap-4 text-xs text-slate-500 font-medium flex-wrap">
                          <span>Terjawab: <strong className="text-slate-800">{totalAnswered}</strong> / {att.answers.length} Soal</span>
                          <span>Benar (PG): <strong className="text-emerald-600">{correctCount}</strong></span>
                          <span>Status: <strong className={isCompetent ? 'text-emerald-700' : 'text-amber-600'}>{isCompetent ? 'Kompeten / Lulus' : 'Perlu Remedial'}</strong></span>
                        </div>
                      </div>

                      {/* Score Badge & Action */}
                      <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                        <div className="text-left md:text-right">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Skor Akhir</span>
                          <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-800">
                            {att.totalScore}
                            <span className="text-xs text-slate-400 font-sans font-bold"> / 100</span>
                          </span>
                        </div>

                        <button
                          onClick={() => setSelectedHistoryAttempt(att)}
                          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-98 shrink-0"
                        >
                          <Eye className="h-4 w-4" /> Rincian Jawaban
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL: DETAIL RINCIAN HASIL & JAWABAN SISWA */}
      {/* ========================================================================= */}
      {selectedHistoryAttempt && (() => {
        const test = tests.find(t => t.id === selectedHistoryAttempt.testId);
        const correctCount = selectedHistoryAttempt.answers.filter(a => a.isCorrect).length;
        const totalQs = selectedHistoryAttempt.answers.length;
        const essayCount = selectedHistoryAttempt.answers.filter(a => {
          const q = questions.find(qu => qu.id === a.questionId);
          return q?.type === 'essay';
        }).length;

        return (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
              
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50 shrink-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase rounded-lg">
                      Hasil Nilai Ujian
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      ID: {selectedHistoryAttempt.id}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-800">{test?.name || 'Hasil Ujian CBT'}</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Nama Siswa: <strong className="text-slate-700">{currentStudent.name}</strong> &bull; Selesai: {selectedHistoryAttempt.endTime ? new Date(selectedHistoryAttempt.endTime).toLocaleString('id-ID') : '-'}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedHistoryAttempt(null)}
                  className="p-2 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-xl transition-all cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Score Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-6 bg-emerald-50/40 border-b border-slate-100 shrink-0">
                <div className="bg-white p-3.5 rounded-2xl border border-emerald-100 text-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Skor Akhir</span>
                  <strong className="text-2xl font-black font-mono text-emerald-800 block mt-0.5">{selectedHistoryAttempt.totalScore}</strong>
                  <span className="text-[10px] text-slate-400 font-medium">Skala 100</span>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-emerald-100 text-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Pilihan Ganda Benar</span>
                  <strong className="text-2xl font-black text-emerald-600 block mt-0.5">{correctCount}</strong>
                  <span className="text-[10px] text-slate-400 font-medium">dari {totalQs - essayCount} PG</span>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-emerald-100 text-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Pilihan Ganda Salah</span>
                  <strong className="text-2xl font-black text-red-500 block mt-0.5">{(totalQs - essayCount) - correctCount}</strong>
                  <span className="text-[10px] text-slate-400 font-medium">Jawaban keliru</span>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-emerald-100 text-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Soal Uraian / Essay</span>
                  <strong className="text-2xl font-black text-blue-600 block mt-0.5">{essayCount}</strong>
                  <span className="text-[10px] text-slate-400 font-medium">Butir essay</span>
                </div>
              </div>

              {/* Question Review Breakdown List */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <List className="h-4 w-4 text-emerald-600" /> Rincian Pengerjaan Soal &amp; Jawaban
                </h4>

                <div className="space-y-4">
                  {selectedHistoryAttempt.answers.map((ans, idx) => {
                    const q = questions.find(qu => qu.id === ans.questionId);
                    if (!q) {
                      return (
                        <div key={ans.questionId} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500 italic">
                          Soal nomor #{idx + 1} telah diperbarui atau dihapus dari bank soal.
                        </div>
                      );
                    }

                    const isPG = q.type === 'pilihan_ganda';
                    const isAnswered = isPG ? ans.selectedOption !== undefined : (ans.essayAnswer && ans.essayAnswer.trim().length > 0);

                    return (
                      <div 
                        key={q.id}
                        className={`p-5 rounded-2xl border transition-all space-y-3 ${
                          isPG 
                            ? (ans.isCorrect ? 'bg-emerald-50/40 border-emerald-200' : 'bg-red-50/30 border-red-200')
                            : 'bg-slate-50/70 border-slate-200'
                        }`}
                      >
                        {/* Question Header */}
                        <div className="flex justify-between items-center gap-2">
                          <div className="flex items-center gap-2">
                            <span className="h-6 w-6 rounded-lg bg-slate-800 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-bold text-slate-600 uppercase">
                              {isPG ? 'Pilihan Ganda' : 'Uraian / Essay'} &bull; Bobot {q.points} Poin
                            </span>
                          </div>

                          {isPG ? (
                            ans.isCorrect ? (
                              <span className="px-2.5 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-lg flex items-center gap-1">
                                <Check className="h-3 w-3" /> Benar (+{q.points} Poin)
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-lg flex items-center gap-1">
                                <X className="h-3 w-3" /> Salah (0 Poin)
                              </span>
                            )
                          ) : (
                            ans.isEvaluated ? (
                              <span className="px-2.5 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-lg flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" /> Dinilai: {ans.scoreGiven} / {q.points} Poin
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-lg">
                                Menunggu Penilaian Guru
                              </span>
                            )
                          )}
                        </div>

                        {/* Question Text */}
                        <div className="text-sm font-medium text-slate-800 leading-relaxed">
                          {q.text}
                        </div>

                        {/* Question Image if present */}
                        {q.image && (
                          <div className="max-w-md my-2 rounded-xl overflow-hidden border border-slate-200">
                            <img src={q.image} alt={`Soal ${idx + 1}`} className="max-h-60 object-contain w-full bg-slate-100" referrerPolicy="no-referrer" />
                          </div>
                        )}

                        {/* Multiple Choice Answers Review */}
                        {isPG && q.options && (
                          <div className="space-y-2 pt-2 border-t border-slate-200/60">
                            {q.options.map((opt: any, oIdx: number) => {
                              const optKey = typeof opt === 'object' && opt !== null ? (opt.key || String.fromCharCode(65 + oIdx)) : String.fromCharCode(65 + oIdx);
                              const optText = typeof opt === 'object' && opt !== null ? (opt.text || opt.key || '') : String(opt);
                              const optImg = typeof opt === 'object' && opt !== null ? opt.image : undefined;

                              const isSelected = 
                                String(ans.selectedOption || '').trim().toUpperCase() === String(optKey).trim().toUpperCase() ||
                                String(ans.selectedOption || '').trim() === String(oIdx) ||
                                String(ans.selectedOption || '').trim().toLowerCase() === optText.trim().toLowerCase();

                              const isCorrectOpt = 
                                String(q.correctAnswer || '').trim().toUpperCase() === String(optKey).trim().toUpperCase() ||
                                String(q.correctAnswer || '').trim() === String(oIdx) ||
                                String(q.correctAnswer || '').trim().toLowerCase() === optText.trim().toLowerCase();

                              let optStyle = 'bg-white border-slate-200 text-slate-700';
                              if (isSelected && isCorrectOpt) {
                                optStyle = 'bg-emerald-100 border-emerald-400 text-emerald-900 font-bold';
                              } else if (isSelected && !isCorrectOpt) {
                                optStyle = 'bg-red-100 border-red-400 text-red-900 font-bold';
                              } else if (isCorrectOpt) {
                                optStyle = 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold';
                              }

                              return (
                                <div 
                                  key={oIdx}
                                  className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${optStyle}`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <span className="font-mono font-bold uppercase w-5 text-center shrink-0">
                                      {optKey}.
                                    </span>
                                    <span>{optText}</span>
                                  </div>

                                  {optImg && (
                                    <img src={optImg} alt="" className="max-h-16 rounded border border-slate-200 object-contain" referrerPolicy="no-referrer" />
                                  )}

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {isSelected && (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-white">
                                        Jawaban Anda
                                      </span>
                                    )}
                                    {isCorrectOpt && (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white flex items-center gap-1">
                                        <Check className="h-3 w-3" /> Kunci Jawaban
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Essay Answer Review */}
                        {!isPG && (
                          <div className="space-y-2 pt-2 border-t border-slate-200/60 text-xs">
                            <div className="p-3 bg-white rounded-xl border border-slate-200">
                              <span className="font-bold text-slate-500 uppercase block mb-1 text-[10px]">Jawaban Anda:</span>
                              <p className="text-slate-800 whitespace-pre-wrap font-medium">
                                {ans.essayAnswer || 'Anda tidak mengisi jawaban untuk butir soal ini.'}
                              </p>
                            </div>

                            {q.correctAnswer && (
                              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                                <span className="font-bold text-emerald-800 uppercase block mb-1 text-[10px]">Kriteria Kunci Jawaban (Panduan):</span>
                                <p className="text-slate-700 italic">
                                  {q.correctAnswer}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
                <button
                  onClick={() => setSelectedHistoryAttempt(null)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  Tutup Rincian
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
