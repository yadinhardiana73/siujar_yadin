/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  FolderLock, BookOpen, Users, ClipboardCheck, BarChart3, Wrench, 
  Menu, X, Laptop, LogOut, Award, CheckCircle, HelpCircle, UserCheck, ShieldAlert,
  Settings
} from 'lucide-react';
import { CBTAppState, Topic, Question, Group, Participant, Test, TestAttempt, FileManagerFile, Teacher, AdminConfig } from '../types';

import FileManagerComponent from './FileManagerComponent';
import ParticipantsModule from './ParticipantsModule';
import QuestionsModule from './QuestionsModule';
import TestsModule from './TestsModule';
import ReportsModule from './ReportsModule';
import ToolsModule from './ToolsModule';
import TeachersModule from './TeachersModule';
import AdminProfileModule from './AdminProfileModule';

interface AdminPortalProps {
  appState: CBTAppState;
  onUpdateState: (state: CBTAppState, changedSlice?: Partial<CBTAppState>, options?: any) => void;
  onLogoutAdmin: () => void;
  activeMenu: string;
  activeSubMenu: string;
  onChangeMenu: (menu: string, submenu: string) => void;
  userRole?: 'admin' | 'guru';
  cloudSyncError?: string | null;
  onRetryCloudSync?: () => void;
}

export default function AdminPortal({
  appState,
  onUpdateState,
  onLogoutAdmin,
  activeMenu,
  activeSubMenu,
  onChangeMenu,
  userRole = 'admin',
  cloudSyncError,
  onRetryCloudSync
}: AdminPortalProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  const { topics, questions, groups, participants, tests, testAttempts, files, currentToken, teachers = [], adminConfig } = appState;

  // Global updater helpers
  const saveState = (newState: Partial<CBTAppState>, options?: any) => {
    onUpdateState({
      ...appState,
      ...newState
    }, newState, options);
  };

  // State mutation action for Admin / Proctor Config
  const updateAdminConfig = (newConfig: AdminConfig) => {
    saveState({ adminConfig: newConfig });
  };

  // State mutation actions for Teacher Accounts
  const addTeacher = (t: Omit<Teacher, 'id'>) => {
    const newT = { ...t, id: 'TCH-' + Date.now() };
    saveState({ teachers: [...teachers, newT] });
  };

  const updateTeacher = (id: string, updated: Partial<Teacher>) => {
    saveState({
      teachers: teachers.map(t => t.id === id ? { ...t, ...updated } : t)
    });
  };

  const deleteTeacher = (id: string) => {
    saveState({ teachers: teachers.filter(t => t.id !== id) });
  };

  // State mutation actions
  const addGroup = (g: Omit<Group, 'id'>) => {
    const newG = { ...g, id: 'G-' + Date.now() };
    saveState({ groups: [...groups, newG] });
  };
  const addGroupsBulk = (newGs: Omit<Group, 'id'>[]) => {
    const formatted = newGs.map((g, i) => ({ ...g, id: 'G-BULK-' + Date.now() + '-' + i }));
    saveState({ groups: [...groups, ...formatted] });
  };
  const deleteGroup = (id: string) => {
    saveState({
      groups: groups.filter(g => g.id !== id),
      participants: participants.map(p => p.groupId === id ? { ...p, groupId: '' } : p)
    });
  };
  const updateGroup = (id: string, updatedGroup: Partial<Group>) => {
    saveState({
      groups: groups.map(g => g.id === id ? { ...g, ...updatedGroup } : g)
    });
  };
  const deleteGroupsBulk = (ids: string[]) => {
    saveState({
      groups: groups.filter(g => !ids.includes(g.id)),
      participants: participants.map(p => ids.includes(p.groupId) ? { ...p, groupId: '' } : p)
    });
  };

  const addParticipant = (p: Omit<Participant, 'id'>) => {
    const newP = { ...p, id: 'P-' + Date.now() };
    saveState({ participants: [...participants, newP] });
  };
  const updateParticipant = (id: string, updated: Partial<Participant>) => {
    saveState({
      participants: participants.map(p => p.id === id ? { ...p, ...updated } : p)
    });
  };
  const deleteParticipant = (id: string) => {
    saveState({ 
      participants: participants.filter(p => p.id !== id),
      testAttempts: testAttempts.filter(a => a.participantId !== id)
    }, { allowParticipantDeletion: true });
  };
  const deleteParticipantsBulk = (ids: string[]) => {
    saveState({ 
      participants: participants.filter(p => !ids.includes(p.id)),
      testAttempts: testAttempts.filter(a => !ids.includes(a.participantId))
    }, { allowParticipantDeletion: true });
  };
  const resetParticipantLogin = (id: string, resetAttempt?: boolean) => {
    saveState({
      participants: participants.map(p => 
        p.id === id 
          ? { ...p, isLoggedIn: false, isLocked: false, lockedReason: undefined, lockedAt: undefined, violationsCount: 0 } 
          : p
      ),
      testAttempts: resetAttempt 
        ? testAttempts.filter(a => a.participantId !== id)
        : testAttempts.map(a => 
            a.participantId === id 
              ? { ...a, isLocked: false, lockReason: undefined, lockedAt: undefined, violationsCount: 0 } 
              : a
          )
    });
  };

  const resetParticipantsBulk = (ids: string[], resetAttempt?: boolean) => {
    saveState({
      participants: participants.map(p => 
        ids.includes(p.id) 
          ? { ...p, isLoggedIn: false, isLocked: false, lockedReason: undefined, lockedAt: undefined, violationsCount: 0 } 
          : p
      ),
      testAttempts: resetAttempt
        ? testAttempts.filter(a => !ids.includes(a.participantId))
        : testAttempts.map(a => 
            ids.includes(a.participantId)
              ? { ...a, isLocked: false, lockReason: undefined, lockedAt: undefined, violationsCount: 0 }
              : a
          )
    });
  };

  const resetAllLockedParticipants = (resetAttempt?: boolean) => {
    const lockedIds = participants.filter(p => p.isLocked).map(p => p.id);
    if (lockedIds.length > 0) {
      resetParticipantsBulk(lockedIds, resetAttempt);
    }
  };
  const bulkImportParticipants = (newPs: Omit<Participant, 'id'>[]) => {
    const imported = newPs.map((p, i) => ({ ...p, id: 'P-IMPORT-' + Date.now() + '-' + i }));
    saveState({ participants: [...participants, ...imported] });
  };

  const addTopic = (t: Omit<Topic, 'id'>) => {
    const newT = { ...t, id: 'T-' + Date.now() };
    saveState({ topics: [...topics, newT] });
  };
  const deleteTopic = (id: string) => {
    saveState({ topics: topics.filter(t => t.id !== id) });
  };

  const addQuestion = (q: Omit<Question, 'id'>) => {
    const newQ = { ...q, id: 'Q-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7) };
    saveState({ questions: [...questions, newQ] });
  };
  const bulkAddQuestions = (newQs: Omit<Question, 'id'>[]) => {
    const timestamp = Date.now();
    const imported: Question[] = newQs.map((q, idx) => ({
      ...q,
      id: 'Q-' + timestamp + '-' + (idx + 1) + '-' + Math.random().toString(36).substring(2, 7)
    }));
    saveState({ questions: [...questions, ...imported] });
  };
  const updateQuestion = (id: string, updated: Partial<Question>) => {
    saveState({
      questions: questions.map(q => q.id === id ? { ...q, ...updated } : q)
    });
  };
  const deleteQuestion = (id: string) => {
    saveState({ questions: questions.filter(q => q.id !== id) }, { allowQuestionDeletion: true });
  };
  const bulkImportQuestions = (qs: Question[]) => {
    saveState({ questions: [...questions, ...qs] });
  };

  const addTest = (t: Omit<Test, 'id'>) => {
    const newT = { ...t, id: 'T-' + Date.now() };
    saveState({ tests: [...tests, newT] });
  };
  const updateTest = (id: string, updated: Partial<Test>) => {
    saveState({
      tests: tests.map(t => t.id === id ? { ...t, ...updated } : t)
    });
  };
  const deleteTest = (id: string) => {
    saveState({ 
      tests: tests.filter(t => t.id !== id),
      testAttempts: testAttempts.filter(a => a.testId !== id)
    });
  };
  const updateTestStatus = (id: string, status: 'aktif' | 'nonaktif') => {
    saveState({
      tests: tests.map(t => t.id === id ? { ...t, status } : t)
    });
  };

  const evaluateEssay = (attemptId: string, questionId: string, score: number) => {
    const attempts = testAttempts.map(att => {
      if (att.id === attemptId) {
        const answers = att.answers.map(ans => {
          if (ans.questionId === questionId) {
            return {
              ...ans,
              isEvaluated: true,
              scoreGiven: score,
              isCorrect: score > 0
            };
          }
          return ans;
        });

        // Recalculate attempt score
        const pointsTotal = answers.reduce((sum, a) => sum + (a.scoreGiven ?? 0), 0);
        // Normalize out of 100 based on total possible question weights
        const relTest = tests.find(t => t.id === att.testId);
        const testQs = questions.filter(q => q.topicId === relTest?.topicId).slice(0, relTest?.questionCount);
        const totalMax = testQs.reduce((sum, q) => sum + q.points, 0);
        const scaledScore = totalMax > 0 ? Math.round((pointsTotal / totalMax) * 100) : 0;

        return {
          ...att,
          answers,
          totalScore: scaledScore
        };
      }
      return att;
    });
    saveState({ testAttempts: attempts });
  };

  const deleteAttempt = (id: string) => {
    saveState({ testAttempts: testAttempts.filter(att => att.id !== id) });
  };

  const addFile = (file: FileManagerFile) => {
    saveState({ files: [...files, file] });
  };
  const deleteFile = (id: string) => {
    saveState({ files: files.filter(f => f.id !== id) });
  };

  const setTokenValue = (tok: string) => {
    saveState({ currentToken: tok });
  };

  const restoreState = (full: CBTAppState) => {
    onUpdateState(full);
  };

  // Render Homepage Overview Stats when no active module is selected
  const renderDashboardOverview = () => {
    if (userRole === 'guru') {
      const pgCount = questions.filter(q => q.type === 'pilihan_ganda').length;
      const essayCount = questions.filter(q => q.type === 'essay').length;

      return (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-emerald-900 via-teal-950 to-emerald-950 rounded-2xl p-6 text-white border border-emerald-950 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="px-2.5 py-0.5 bg-emerald-400/20 text-emerald-300 rounded-md text-[10px] font-bold uppercase tracking-wider mb-2 inline-block">
                Portal Guru / Pendidik
              </span>
              <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-emerald-300" />
                Manajemen Data Modul &amp; Bank Soal
              </h1>
              <p className="text-emerald-200 text-xs mt-1 font-medium max-w-xl">
                Akses khusus guru untuk menyusun topik mata pelajaran, butir soal pilihan ganda &amp; esai, import berkas naskah soal Word/Excel, serta galeri media.
              </p>
            </div>
            <button
              onClick={() => onChangeMenu('data_modul', 'soal')}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <BookOpen className="h-4 w-4" /> Tulis Soal Baru
            </button>
          </div>

          {/* Dynamic Metric Grid for Guru */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div 
              onClick={() => onChangeMenu('data_modul', 'topik')}
              className="bg-white border border-emerald-100 rounded-2xl p-5 shadow-xs flex items-center gap-4 cursor-pointer hover:border-emerald-300 transition-all"
            >
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Topik Modul</span>
                <strong className="text-xl text-slate-800 font-black block mt-0.5">{topics.length} Topik</strong>
              </div>
            </div>

            <div 
              onClick={() => onChangeMenu('data_modul', 'daftar_soal')}
              className="bg-white border border-emerald-100 rounded-2xl p-5 shadow-xs flex items-center gap-4 cursor-pointer hover:border-emerald-300 transition-all"
            >
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Bank Soal Total</span>
                <strong className="text-xl text-slate-800 font-black block mt-0.5">{questions.length} Butir</strong>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Pilihan Ganda / Esai</span>
                <strong className="text-lg text-slate-800 font-bold block mt-0.5">{pgCount} PG &bull; {essayCount} Esai</strong>
              </div>
            </div>

            <div 
              onClick={() => onChangeMenu('data_modul', 'file_manager')}
              className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex items-center gap-4 cursor-pointer hover:border-emerald-300 transition-all"
            >
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <FolderLock className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Berkas Media Gambar</span>
                <strong className="text-xl text-slate-800 font-black block mt-0.5">{files.length} File</strong>
              </div>
            </div>
          </div>

          {/* Quick Launcher for Data Modul */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div 
              onClick={() => onChangeMenu('data_modul', 'topik')}
              className="bg-white p-5 rounded-2xl border border-emerald-100/80 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer space-y-2 group"
            >
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl w-max group-hover:scale-105 transition-transform">
                <BookOpen className="h-5 w-5" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">1. Kelola Topik / Mata Pelajaran</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Buat modul mata pelajaran dan tentukan kelompok kelas sasaran untuk ujian.
              </p>
            </div>

            <div 
              onClick={() => onChangeMenu('data_modul', 'soal')}
              className="bg-white p-5 rounded-2xl border border-emerald-100/80 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer space-y-2 group"
            >
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl w-max group-hover:scale-105 transition-transform">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">2. Tulis &amp; Edit Butir Soal</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Input soal pilihan ganda (A-E) atau esai dengan teks kaya, gambar, dan pembobotan poin.
              </p>
            </div>

            <div 
              onClick={() => onChangeMenu('data_modul', 'import_soal_word')}
              className="bg-white p-5 rounded-2xl border border-emerald-100/80 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer space-y-2 group"
            >
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl w-max group-hover:scale-105 transition-transform">
                <FolderLock className="h-5 w-5" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">3. Import Soal Word &amp; Excel</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Unggah banyak soal sekaligus dari naskah dokumen Word atau spreadsheet Excel.
              </p>
            </div>
          </div>
        </div>
      );
    }

    const liveLogins = participants.filter(p => p.isLoggedIn).length;
    const lockedCount = participants.filter(p => p.isLocked).length;
    const pendingScoring = testAttempts.filter(att => 
      att.answers.some(ans => {
        const q = questions.find(qu => qu.id === ans.questionId);
        return q?.type === 'essay' && !ans.isEvaluated;
      })
    ).length;

    return (
      <div className="space-y-6">
        <div className="bg-emerald-900 rounded-2xl p-6 text-white border border-emerald-950 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <FolderLock className="h-6 w-6 text-emerald-300" />
              Sistem CBT Administrator &amp; Proktor
            </h1>
            <p className="text-emerald-200 text-xs mt-1 font-semibold">
              Gunakan menu navigasi panel samping untuk mengelola materi, data peserta, token rilis, evaluasi, dan laporan analitik.
            </p>
          </div>
          <div className="flex gap-2">
            <span className="px-3.5 py-1.5 bg-emerald-950 text-emerald-300 font-mono font-bold rounded-lg border border-emerald-800 text-xs select-all">
              TOKEN AKTIF: {currentToken}
            </span>
          </div>
        </div>

        {/* Dynamic Metric Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white border border-emerald-100 rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Bank Soal</span>
              <strong className="text-xl text-slate-800 font-bold block mt-0.5">{questions.length} Soal</strong>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Siswa</span>
              <strong className="text-xl text-slate-800 font-bold block mt-0.5">{participants.length} Siswa</strong>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Sesi Online</span>
              <strong className="text-xl text-slate-800 font-bold block mt-0.5">{liveLogins} Aktif</strong>
            </div>
          </div>

          {/* Anti-Cheat Locked Students Card */}
          <div 
            onClick={() => onChangeMenu('data_peserta', 'reset_login')}
            className={`border rounded-xl p-5 shadow-sm flex items-center gap-4 cursor-pointer transition-all ${
              lockedCount > 0 
                ? 'bg-red-50/80 border-red-200 hover:bg-red-100' 
                : 'bg-white border-slate-100 hover:bg-slate-50'
            }`}
          >
            <div className={`p-3 rounded-xl ${lockedCount > 0 ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Terkunci (Anti-Curang)</span>
              <strong className={`text-xl font-black block mt-0.5 ${lockedCount > 0 ? 'text-red-700 animate-pulse' : 'text-slate-800'}`}>
                {lockedCount} Siswa
              </strong>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Koreksi Essay</span>
              <strong className="text-xl text-slate-800 font-bold block mt-0.5">{pendingScoring} Tertunda</strong>
            </div>
          </div>
        </div>

        {/* Quick Launcher Shortcuts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-emerald-100 rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-sm text-emerald-800 uppercase tracking-wider border-b border-emerald-50 pb-3 mb-4">Akses Cepat Data Modul</h3>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => onChangeMenu('data_modul', 'topik')}
                className="p-3 bg-emerald-50/30 hover:bg-emerald-50 hover:text-emerald-700 transition-all text-xs font-semibold rounded-xl text-left border border-emerald-100 text-slate-600"
              >
                &bull; Tambah Topik Baru
              </button>
              <button 
                onClick={() => onChangeMenu('data_modul', 'soal')}
                className="p-3 bg-emerald-50/30 hover:bg-emerald-50 hover:text-emerald-700 transition-all text-xs font-semibold rounded-xl text-left border border-emerald-100 text-slate-600"
              >
                &bull; Tulis Soal Baru
              </button>
              <button 
                onClick={() => onChangeMenu('data_modul', 'import_soal_word')}
                className="p-3 bg-emerald-50/30 hover:bg-emerald-50 hover:text-emerald-700 transition-all text-xs font-semibold rounded-xl text-left border border-emerald-100 text-slate-600"
              >
                &bull; Import Teks Word
              </button>
              <button 
                onClick={() => onChangeMenu('data_modul', 'file_manager')}
                className="p-3 bg-emerald-50/30 hover:bg-emerald-50 hover:text-emerald-700 transition-all text-xs font-semibold rounded-xl text-left border border-emerald-100 text-slate-600"
              >
                &bull; Unggah Gambar/Audio
              </button>
            </div>
          </div>

          <div className="bg-white border border-emerald-100 rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-sm text-emerald-800 uppercase tracking-wider border-b border-emerald-50 pb-3 mb-4">Langkah Pelaksanaan Ujian</h3>
            <div className="space-y-3.5">
              <div className="flex gap-3 items-start">
                <span className="h-5 w-5 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</span>
                <div>
                  <p className="font-semibold text-xs text-emerald-800">Cetak Kartu Ujian Peserta</p>
                  <p className="text-[10px] text-slate-500">Cetak di tab Data Peserta dan berikan username sandi ke siswa.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="h-5 w-5 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</span>
                <div>
                  <p className="font-semibold text-xs text-emerald-800">Buat &amp; Rilis Jadwal Tes Baru</p>
                  <p className="text-[10px] text-slate-500">Buat sesi tes aktif di tab Data Tes untuk topik pilihan Anda.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="h-5 w-5 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">3</span>
                <div>
                  <p className="font-semibold text-xs text-emerald-800">Publikasikan Token Akses</p>
                  <p className="text-[10px] text-slate-500">Siswa wajib memasukkan token sebelum mulai mengisi jawaban ujian.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-emerald-50/50 flex font-sans">
      {/* SIDEBAR NAVIGATION PANEL */}
      <aside className={`bg-emerald-950 text-emerald-100 w-64 flex flex-col justify-between shrink-0 transition-all duration-200 border-r border-emerald-900 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } fixed lg:relative z-20 h-full`}>
        <div className="overflow-y-auto flex-1">
          {/* Sidebar Brand header */}
          <div className="px-6 py-5 border-b border-emerald-900/60 flex justify-between items-center bg-emerald-900/30">
            <div className="flex items-center gap-2">
              <Laptop className="h-5 w-5 text-emerald-400" />
              <span className="font-black text-sm text-white tracking-wider uppercase">CBT MANDIRI</span>
            </div>
            <button className="lg:hidden text-emerald-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-4 space-y-6">
            {/* GROUP 1: Data Modul */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-emerald-400/60 uppercase tracking-widest block px-2.5 mb-1 flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-emerald-400" /> Data Modul
              </span>
              {[
                { label: 'Topik', sub: 'topik' },
                { label: 'Soal', sub: 'soal' },
                { label: 'Import Soal Word', sub: 'import_soal_word' },
                { label: 'Import Soal Spreadsheet', sub: 'import_soal_spreadsheet' },
                { label: 'Daftar Soal', sub: 'daftar_soal' },
                { label: 'File Manager', sub: 'file_manager' }
              ].map(item => (
                <button
                  key={item.sub}
                  onClick={() => onChangeMenu('data_modul', item.sub)}
                  className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                    activeSubMenu === item.sub 
                      ? 'bg-emerald-600 text-white font-bold' 
                      : 'hover:bg-emerald-900 text-emerald-200 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {userRole !== 'guru' && (
              <>
                {/* GROUP 2: Data Peserta */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-emerald-400/60 uppercase tracking-widest block px-2.5 mb-1 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-emerald-400" /> Data Peserta
                  </span>
                  {[
                    { label: 'Daftar Group', sub: 'daftar_group' },
                    { label: 'Daftar Peserta', sub: 'daftar_peserta' },
                    { label: 'Import Data Peserta', sub: 'import_data_peserta' },
                    { label: 'Cetak Kartu', sub: 'cetak_kartu' },
                    { label: 'Reset Login', sub: 'reset_login' }
                  ].map(item => (
                    <button
                      key={item.sub}
                      onClick={() => onChangeMenu('data_peserta', item.sub)}
                      className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                        activeSubMenu === item.sub 
                          ? 'bg-emerald-600 text-white font-bold' 
                          : 'hover:bg-emerald-900 text-emerald-200 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* GROUP 3: Data Tes */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-emerald-400/60 uppercase tracking-widest block px-2.5 mb-1 flex items-center gap-1.5">
                    <ClipboardCheck className="h-3.5 w-3.5 text-emerald-400" /> Data Tes
                  </span>
                  {[
                    { label: 'Tambah Tes', sub: 'tambah_tes' },
                    { label: 'Daftar Tes', sub: 'daftar_tes' },
                    { label: 'Evaluasi Tes', sub: 'evaluasi_tes' },
                    { label: 'Hasil tes', sub: 'hasil_tes' },
                    { label: 'Token', sub: 'token' }
                  ].map(item => (
                    <button
                      key={item.sub}
                      onClick={() => onChangeMenu('data_tes', item.sub)}
                      className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                        activeSubMenu === item.sub 
                          ? 'bg-emerald-600 text-white font-bold' 
                          : 'hover:bg-emerald-900 text-emerald-200 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* GROUP 4: Laporan */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-emerald-400/60 uppercase tracking-widest block px-2.5 mb-1 flex items-center gap-1.5">
                    <BarChart3 className="h-3.5 w-3.5 text-emerald-400" /> Laporan
                  </span>
                  {[
                    { label: 'Analisis Butir Soal', sub: 'analisis_butir_soal' },
                    { label: 'Rekap Hasil Tes', sub: 'rekap_hasil_tes' }
                  ].map(item => (
                    <button
                      key={item.sub}
                      onClick={() => onChangeMenu('laporan', item.sub)}
                      className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                        activeSubMenu === item.sub 
                          ? 'bg-emerald-600 text-white font-bold' 
                          : 'hover:bg-emerald-900 text-emerald-200 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* GROUP 5: Tool */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-emerald-400/60 uppercase tracking-widest block px-2.5 mb-1 flex items-center gap-1.5">
                    <Wrench className="h-3.5 w-3.5 text-emerald-400" /> Tool
                  </span>
                  {[
                    { label: 'Backup Data', sub: 'backup_data' },
                    { label: 'Export Import Soal', sub: 'export_import_soal' }
                  ].map(item => (
                    <button
                      key={item.sub}
                      onClick={() => onChangeMenu('tool', item.sub)}
                      className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                        activeSubMenu === item.sub 
                          ? 'bg-emerald-600 text-white font-bold' 
                          : 'hover:bg-emerald-900 text-emerald-200 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* GROUP 6: Pengaturan */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-emerald-400/60 uppercase tracking-widest block px-2.5 mb-1 flex items-center gap-1.5">
                    <Settings className="h-3.5 w-3.5 text-emerald-400" /> Pengaturan
                  </span>
                  {[
                    { label: 'Akun Proktor & Sandi', sub: 'pengaturan_proktor' },
                    { label: 'Pengaturan Guru', sub: 'pengaturan_guru' }
                  ].map(item => (
                    <button
                      key={item.sub}
                      onClick={() => onChangeMenu('pengaturan', item.sub)}
                      className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                        activeSubMenu === item.sub 
                          ? 'bg-emerald-600 text-white font-bold' 
                          : 'hover:bg-emerald-900 text-emerald-200 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sidebar Footer Logout */}
        <div className="p-4 border-t border-emerald-900/60 bg-emerald-950/50">
          <button
            onClick={onLogoutAdmin}
            className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-red-950/50 hover:text-red-300 text-emerald-300/70 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4" /> {userRole === 'guru' ? 'Keluar Sesi Guru' : 'Keluar Sesi Admin'}
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER WORKSPACE */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top Navbar */}
        <header className="bg-white border-b border-emerald-100 py-4 px-6 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-slate-600 hover:text-emerald-600" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu className="h-5 w-5" />
            </button>
            <button 
              onClick={() => onChangeMenu('overview', '')}
              className="text-sm font-bold text-slate-800 hover:text-emerald-600 flex items-center gap-1.5 transition-all"
            >
              {userRole === 'guru' ? 'CBT Dashboard Guru' : 'CBT Dashboard Admin'} &bull; <span className="text-xs font-semibold text-slate-400">Home</span>
            </button>
          </div>
          <div className="flex items-center gap-3">
            {userRole === 'admin' && (
              <button
                onClick={() => onChangeMenu('pengaturan', 'pengaturan_proktor')}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Settings className="h-3.5 w-3.5 text-emerald-600" />
                <span>Akun Proktor: <span className="text-emerald-700 font-mono">{adminConfig?.username || 'admin'}</span></span>
              </button>
            )}
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-lg text-[10px] uppercase border border-emerald-100 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span> Server Aktif
            </span>
          </div>
        </header>

        {/* Dynamic Panel Content area */}
        <main className="p-6 flex-1 bg-emerald-50/40">
          {cloudSyncError && (
            <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs text-red-800 shadow-xs">
              <div className="flex items-center gap-2 font-semibold">
                <ShieldAlert className="h-4 w-4 text-red-600 shrink-0" />
                <span>{cloudSyncError}</span>
              </div>
              {onRetryCloudSync && (
                <button
                  type="button"
                  onClick={onRetryCloudSync}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all cursor-pointer shrink-0"
                >
                  Coba Sinkron Ulang
                </button>
              )}
            </div>
          )}
          {activeMenu === 'overview' && renderDashboardOverview()}

          {activeMenu === 'data_modul' && (
            <>
              {activeSubMenu === 'file_manager' && (
                <FileManagerComponent 
                  files={files} 
                  onAddFile={addFile} 
                  onDeleteFile={deleteFile} 
                />
              )}
              {activeSubMenu !== 'file_manager' && (
                <QuestionsModule 
                  topics={topics}
                  questions={questions}
                  files={files}
                  onAddTopic={addTopic}
                  onDeleteTopic={deleteTopic}
                  onAddQuestion={addQuestion}
                  onUpdateQuestion={updateQuestion}
                  onBulkAddQuestions={bulkAddQuestions}
                  onDeleteQuestion={deleteQuestion}
                  activeSubMenu={activeSubMenu}
                />
              )}
            </>
          )}

          {activeMenu === 'data_peserta' && (
            <ParticipantsModule 
              groups={groups}
              participants={participants}
              onAddGroup={addGroup}
              onDeleteGroup={deleteGroup}
              onUpdateGroup={updateGroup}
              onDeleteGroupsBulk={deleteGroupsBulk}
              onAddGroupsBulk={addGroupsBulk}
              onAddParticipant={addParticipant}
              onUpdateParticipant={updateParticipant}
              onDeleteParticipant={deleteParticipant}
              onDeleteParticipantsBulk={deleteParticipantsBulk}
              onResetParticipantLogin={resetParticipantLogin}
              onResetParticipantsBulk={resetParticipantsBulk}
              onResetAllLockedParticipants={resetAllLockedParticipants}
              onBulkImportParticipants={bulkImportParticipants}
              activeSubMenu={activeSubMenu}
              onChangeMenu={onChangeMenu}
            />
          )}

          {activeMenu === 'data_tes' && (
            <TestsModule 
              topics={topics}
              tests={tests}
              testAttempts={testAttempts}
              participants={participants}
              questions={questions}
              groups={groups}
              onAddTest={addTest}
              onUpdateTest={updateTest}
              onDeleteTest={deleteTest}
              onUpdateTestStatus={updateTestStatus}
              onEvaluateEssay={evaluateEssay}
              onDeleteAttempt={deleteAttempt}
              currentToken={currentToken}
              onGenerateToken={setTokenValue}
              activeSubMenu={activeSubMenu}
            />
          )}

          {activeMenu === 'laporan' && (
            <ReportsModule 
              questions={questions}
              testAttempts={testAttempts}
              participants={participants}
              tests={tests}
              groups={groups}
              activeSubMenu={activeSubMenu}
            />
          )}

          {activeMenu === 'tool' && (
            <ToolsModule 
              questions={questions}
              fullState={appState}
              onRestoreState={restoreState}
              onBulkImportQuestions={bulkImportQuestions}
              activeSubMenu={activeSubMenu}
            />
          )}

          {activeMenu === 'pengaturan' && (
            <>
              {(activeSubMenu === 'pengaturan_proktor' || activeSubMenu === '') && (
                <AdminProfileModule
                  adminConfig={adminConfig}
                  onUpdateAdminConfig={updateAdminConfig}
                />
              )}
              {activeSubMenu === 'pengaturan_guru' && (
                <TeachersModule
                  teachers={teachers}
                  onAddTeacher={addTeacher}
                  onUpdateTeacher={updateTeacher}
                  onDeleteTeacher={deleteTeacher}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
