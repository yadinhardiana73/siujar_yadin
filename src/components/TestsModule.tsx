/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Calendar, 
  Clipboard, 
  CheckSquare, 
  BarChart, 
  Key, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  Eye, 
  RefreshCw, 
  CheckCircle, 
  Clock, 
  Shuffle, 
  Edit2, 
  AlertCircle, 
  AlertTriangle, 
  X, 
  CheckCircle2,
  SlidersHorizontal,
  HelpCircle,
  Sparkles,
  RotateCcw,
  ShieldAlert
} from 'lucide-react';
import { Topic, Test, TestAttempt, Participant, Question, Group } from '../types';
import { GraduationCap, Users, User, Search, Filter } from 'lucide-react';

interface TestsModuleProps {
  topics: Topic[];
  tests: Test[];
  testAttempts: TestAttempt[];
  participants: Participant[];
  questions: Question[];
  groups?: Group[];
  onAddTest: (t: Omit<Test, 'id'>) => void;
  onUpdateTest?: (id: string, updated: Partial<Test>) => void;
  onDeleteTest: (id: string) => void;
  onUpdateTestStatus: (id: string, status: 'aktif' | 'nonaktif') => void;
  onEvaluateEssay: (attemptId: string, questionId: string, score: number) => void;
  onDeleteAttempt: (id: string) => void;
  currentToken: string;
  onGenerateToken: (tok: string) => void;
  activeSubMenu: string;
}

export default function TestsModule({
  topics,
  tests,
  testAttempts,
  participants,
  questions,
  groups = [],
  onAddTest,
  onUpdateTest,
  onDeleteTest,
  onUpdateTestStatus,
  onEvaluateEssay,
  onDeleteAttempt,
  currentToken,
  onGenerateToken,
  activeSubMenu
}: TestsModuleProps) {
  // Add Test states
  const [testName, setTestName] = useState('');
  const [testTopic, setTestTopic] = useState(topics[0]?.id || '');
  const [testGroups, setTestGroups] = useState<string[]>(['ALL']); // Kolom centang target kelas ('ALL' atau array ID kelas)
  const [testDuration, setTestDuration] = useState(60);
  const [testQCount, setTestQCount] = useState(5);
  const [testStart, setTestStart] = useState('2026-07-01T08:00');
  const [testEnd, setTestEnd] = useState('2026-07-31T17:00');
  const [showImmediate, setShowImmediate] = useState(true);
  const [shuffleAnswers, setShuffleAnswers] = useState(true); // Kolom Acak Jawaban Pilihan Ganda
  const [shuffleQuestions, setShuffleQuestions] = useState(true); // Kolom Acak Urutan Soal

  // Edit Test Modal state
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [editName, setEditName] = useState('');
  const [editTopic, setEditTopic] = useState('');
  const [editGroups, setEditGroups] = useState<string[]>(['ALL']); // Kolom centang target kelas edit
  const [editDuration, setEditDuration] = useState(60);
  const [editQCount, setEditQCount] = useState(5);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editShowImmediate, setEditShowImmediate] = useState(true);
  const [editShuffleAnswers, setEditShuffleAnswers] = useState(true);
  const [editShuffleQuestions, setEditShuffleQuestions] = useState(true);

  // Review & Essay Grading Modal for Hasil Tes
  const [selectedAttemptForReview, setSelectedAttemptForReview] = useState<TestAttempt | null>(null);

  // Helper toggle target kelas via kolom centang
  const toggleTestGroup = (groupId: string) => {
    if (groupId === 'ALL') {
      setTestGroups(['ALL']);
      return;
    }

    setTestGroups(prev => {
      let current = prev.filter(id => id !== 'ALL');
      if (current.includes(groupId)) {
        current = current.filter(id => id !== groupId);
      } else {
        current = [...current, groupId];
      }

      if (current.length === 0) {
        return ['ALL'];
      }
      if (groups.length > 0 && current.length === groups.length) {
        return ['ALL'];
      }
      return current;
    });
  };

  const toggleEditGroup = (groupId: string) => {
    if (groupId === 'ALL') {
      setEditGroups(['ALL']);
      return;
    }

    setEditGroups(prev => {
      let current = prev.filter(id => id !== 'ALL');
      if (current.includes(groupId)) {
        current = current.filter(id => id !== groupId);
      } else {
        current = [...current, groupId];
      }

      if (current.length === 0) {
        return ['ALL'];
      }
      if (groups.length > 0 && current.length === groups.length) {
        return ['ALL'];
      }
      return current;
    });
  };

  // Hasil Tes filter & search states
  const [hasilSearchStudent, setHasilSearchStudent] = useState('');
  const [hasilFilterTest, setHasilFilterTest] = useState('ALL');
  const [hasilFilterGroup, setHasilFilterGroup] = useState('ALL');

  // Delete Test Modal state
  const [deleteTestModal, setDeleteTestModal] = useState<Test | null>(null);

  // Evaluation state
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [evalScores, setEvalScores] = useState<{ [qId: string]: number }>({});

  // Toast Notification state
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(prev => prev?.text === text ? null : prev);
    }, 4000);
  };

  const handleCreateTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testName.trim()) {
      showToast('Nama Acara Ujian / Tes tidak boleh kosong.', 'error');
      return;
    }
    
    const isAll = testGroups.includes('ALL') || testGroups.length === 0 || (groups.length > 0 && testGroups.length === groups.length);
    const finalGroupIds = isAll ? ['ALL'] : testGroups;
    const finalGroupId = isAll ? 'ALL' : (testGroups.length === 1 ? testGroups[0] : testGroups.join(','));

    onAddTest({
      name: testName.trim(),
      topicId: testTopic || topics[0]?.id || 'T01',
      groupId: finalGroupId,
      groupIds: finalGroupIds,
      durationMinutes: Number(testDuration) || 60,
      startTime: testStart,
      endTime: testEnd,
      questionCount: Number(testQCount) || 5,
      token: currentToken,
      status: 'aktif',
      showResultImmediate: showImmediate,
      shuffleAnswers: shuffleAnswers,
      shuffleQuestions: shuffleQuestions
    });

    const targetGroupLabel = isAll
      ? 'Semua Kelas' 
      : testGroups.map(gid => groups.find(g => g.id === gid)?.name || gid).join(', ');

    showToast(`Ujian "${testName.trim()}" (Target: ${targetGroupLabel}) berhasil dijadwalkan.`, 'success');

    setTestName('');
    setTestGroups(['ALL']);
    setTestDuration(60);
    setTestQCount(5);
    setShuffleAnswers(true);
    setShuffleQuestions(true);
  };

  const handleOpenEditModal = (t: Test) => {
    setEditingTest(t);
    setEditName(t.name);
    setEditTopic(t.topicId);
    
    const initialGroups = (t.groupIds && t.groupIds.length > 0)
      ? t.groupIds
      : (t.groupId ? (t.groupId === 'ALL' ? ['ALL'] : t.groupId.split(',')) : ['ALL']);
    setEditGroups(initialGroups);

    setEditDuration(t.durationMinutes);
    setEditQCount(t.questionCount);
    setEditStart(t.startTime.substring(0, 16));
    setEditEnd(t.endTime.substring(0, 16));
    setEditShowImmediate(t.showResultImmediate);
    setEditShuffleAnswers(t.shuffleAnswers !== false);
    setEditShuffleQuestions(t.shuffleQuestions !== false);
  };

  const handleSaveEditTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTest) return;
    if (!editName.trim()) {
      showToast('Nama Acara Ujian tidak boleh kosong.', 'error');
      return;
    }

    const isAll = editGroups.includes('ALL') || editGroups.length === 0 || (groups.length > 0 && editGroups.length === groups.length);
    const finalGroupIds = isAll ? ['ALL'] : editGroups;
    const finalGroupId = isAll ? 'ALL' : (editGroups.length === 1 ? editGroups[0] : editGroups.join(','));

    if (onUpdateTest) {
      onUpdateTest(editingTest.id, {
        name: editName.trim(),
        topicId: editTopic,
        groupId: finalGroupId,
        groupIds: finalGroupIds,
        durationMinutes: Number(editDuration) || 60,
        questionCount: Number(editQCount) || 5,
        startTime: editStart,
        endTime: editEnd,
        showResultImmediate: editShowImmediate,
        shuffleAnswers: editShuffleAnswers,
        shuffleQuestions: editShuffleQuestions
      });
    }

    showToast(`Pengaturan ujian "${editName.trim()}" berhasil diperbarui.`, 'success');
    setEditingTest(null);
  };

  const handleConfirmDeleteTest = () => {
    if (!deleteTestModal) return;
    const testToDelete = deleteTestModal;
    onDeleteTest(testToDelete.id);
    showToast(`Sesi ujian "${testToDelete.name}" berhasil dihapus.`, 'success');
    setDeleteTestModal(null);
  };

  const generateNewToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    onGenerateToken(result);
    showToast(`Token keamanan diperbarui menjadi "${result}".`, 'info');
  };

  // Render SubMenus
  const renderContent = () => {
    switch (activeSubMenu) {
      case 'tambah_tes':
        return (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                    <Plus className="h-5 w-5" />
                  </div>
                  Jadwalkan Sesi Ujian / Tes Baru
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Atur materi topik, waktu pelaksanaan, token akses, serta opsi pengacakan butir soal & pilihan jawaban.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateTest} className="space-y-6 max-w-4xl">
              {/* Basic Details */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Nama Acara Ujian / Tes <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Penilaian Akhir Semester (PAS) - Matematika Wajib"
                    value={testName}
                    onChange={(e) => setTestName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Materi Topik <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={testTopic}
                    onChange={(e) => setTestTopic(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    {topics.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                    ))}
                  </select>
                </div>

                {/* PILIH KELAS YG DITESKAN PAKAI KOLOM CENTANG */}
                <div className="space-y-2.5 bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200/90">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/70">
                    <div>
                      <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <GraduationCap className="h-4 w-4 text-emerald-600" />
                        Target Kelas yang Diteskan (Kolom Centang) <span className="text-red-500">*</span>
                      </label>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Centang satu atau beberapa kelas yang wajib mengikuti ujian ini.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setTestGroups(['ALL'])}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer border ${
                          testGroups.includes('ALL') || (groups.length > 0 && testGroups.length === groups.length)
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        Pilih Semua Kelas
                      </button>
                      <button
                        type="button"
                        onClick={() => setTestGroups([])}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
                      >
                        Hapus Centang
                      </button>
                    </div>
                  </div>

                  {/* Option: Master Semua Kelas Checkbox */}
                  <label className={`p-3.5 rounded-xl border transition-all flex items-center gap-3 cursor-pointer select-none ${
                    testGroups.includes('ALL') || (groups.length > 0 && testGroups.length === groups.length)
                      ? 'bg-emerald-100/60 border-emerald-400 text-emerald-950 ring-1 ring-emerald-400/40 shadow-2xs font-semibold'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}>
                    <input
                      type="checkbox"
                      checked={testGroups.includes('ALL') || (groups.length > 0 && testGroups.length === groups.length)}
                      onChange={() => toggleTestGroup('ALL')}
                      className="h-4 w-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer shrink-0"
                    />
                    <div className="flex-1 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-emerald-700 shrink-0" />
                        <span className="text-xs font-bold text-slate-900">
                          Semua Kelas (Terbuka untuk Seluruh Peserta Ujian)
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                        {participants.length} Total Siswa
                      </span>
                    </div>
                  </label>

                  {/* Grid of Class Checkboxes */}
                  {groups.length === 0 ? (
                    <div className="text-center py-5 text-xs text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                      Belum ada data rombel/kelas. Tambahkan kelas di menu Data Peserta &gt; Rombel / Kelas.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mt-1">
                        Atau Pilih Kelas Spesifik:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {groups.map(g => {
                          const isSelected = testGroups.includes('ALL') || testGroups.includes(g.id);
                          const studentCount = participants.filter(p => p.groupId === g.id).length;

                          return (
                            <label
                              key={g.id}
                              className={`p-3 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer select-none ${
                                isSelected
                                  ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-400/30 text-emerald-950 shadow-2xs'
                                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 text-slate-700'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleTestGroup(g.id)}
                                className="mt-0.5 h-4 w-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-xs font-bold text-slate-800 truncate block">
                                    {g.name}
                                  </span>
                                  <span className="text-[9px] font-bold text-slate-600 px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200/80 shrink-0">
                                    {studentCount} siswa
                                  </span>
                                </div>
                                {g.description && (
                                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                    {g.description}
                                  </p>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Summary of checked classes */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                    <span className="text-slate-500 font-medium">Status Target:</span>
                    <span className="font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-lg border border-emerald-200/60">
                      {testGroups.includes('ALL') || testGroups.length === groups.length || testGroups.length === 0
                        ? '🌟 Semua Kelas Ditargetkan'
                        : `✓ ${testGroups.length} Kelas Dipilih: ${testGroups.map(id => groups.find(g => g.id === id)?.name || id).join(', ')}`}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Durasi (Menit) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="300"
                      required
                      value={testDuration}
                      onChange={(e) => setTestDuration(Number(e.target.value))}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Jumlah Soal <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      required
                      value={testQCount}
                      onChange={(e) => setTestQCount(Number(e.target.value))}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                    <p className="text-[11px] text-slate-400">
                      Jumlah soal ditampilkan.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Token Akses
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        disabled
                        value={currentToken}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-100 font-mono font-black text-emerald-800 tracking-widest text-center"
                      />
                      <button
                        type="button"
                        onClick={generateNewToken}
                        className="px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Waktu Mulai Akses</label>
                    <input
                      type="datetime-local"
                      required
                      value={testStart}
                      onChange={(e) => setTestStart(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white font-medium focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Waktu Batas Akhir Akses</label>
                    <input
                      type="datetime-local"
                      required
                      value={testEnd}
                      onChange={(e) => setTestEnd(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white font-medium focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Advanced Test Options Section (Jawaban diacak, Acak Soal, Rilis Nilai) */}
              <div className="border border-emerald-100 bg-emerald-50/30 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-emerald-900 border-b border-emerald-100 pb-3">
                  <SlidersHorizontal className="h-4 w-4 text-emerald-700" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">Pengaturan Pengacakan & Hasil Ujian</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Kolom Jawaban Di Acak */}
                  <label className={`p-4 rounded-xl border transition-all flex items-start gap-3 cursor-pointer select-none ${
                    shuffleAnswers 
                      ? 'bg-emerald-50 border-emerald-300 shadow-xs' 
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}>
                    <input
                      type="checkbox"
                      checked={shuffleAnswers}
                      onChange={(e) => setShuffleAnswers(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer shrink-0"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Shuffle className="h-3.5 w-3.5 text-emerald-700" />
                        <span className="text-xs font-bold text-slate-800">
                          Acak Pilihan Jawaban (Jawaban Diacak)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Urutan opsi pilihan (A, B, C, D, E) pada setiap butir soal akan diacak untuk setiap siswa, sehingga siswa bersebelahan memiliki susunan pilihan berbeda.
                      </p>
                    </div>
                  </label>

                  {/* Kolom Acak Urutan Soal */}
                  <label className={`p-4 rounded-xl border transition-all flex items-start gap-3 cursor-pointer select-none ${
                    shuffleQuestions 
                      ? 'bg-emerald-50 border-emerald-300 shadow-xs' 
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}>
                    <input
                      type="checkbox"
                      checked={shuffleQuestions}
                      onChange={(e) => setShuffleQuestions(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer shrink-0"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Shuffle className="h-3.5 w-3.5 text-indigo-700" />
                        <span className="text-xs font-bold text-slate-800">
                          Acak Urutan Soal
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Urutan nomor soal (1, 2, 3...) akan diacak otomatis untuk setiap peserta ujian.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Kolom Rilis Hasil Instan */}
                <label className={`p-4 rounded-xl border transition-all flex items-start gap-3 cursor-pointer select-none ${
                  showImmediate 
                    ? 'bg-emerald-50 border-emerald-300 shadow-xs' 
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}>
                  <input
                    type="checkbox"
                    checked={showImmediate}
                    onChange={(e) => setShowImmediate(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer shrink-0"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5 text-emerald-700" />
                      <span className="text-xs font-bold text-slate-800">
                        Rilis Hasil Instan (Tampilkan Nilai ke Siswa)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Siswa dapat langsung melihat skor/nilai akhir mereka pada layar setelah menekan tombol selesaikan ujian.
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-sm rounded-xl flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  <Calendar className="h-4 w-4" /> Jadwalkan & Rilis Sesi Tes
                </button>
              </div>
            </form>
          </div>
        );

      case 'daftar_tes':
        return (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                    <Clipboard className="h-5 w-5" />
                  </div>
                  Jadwal & Sesi Tes Berjalan
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Kelola sesi ujian, ubah status aktif/nonaktif, konfigurasi acak jawaban/soal, atau perbarui batas waktu.
                </p>
              </div>

              <span className="text-xs font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80 w-max">
                Total Sesi: <strong className="text-emerald-700">{tests.length}</strong>
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="w-full text-sm text-left text-slate-500">
                <thead className="bg-slate-50 text-[11px] text-slate-700 uppercase font-bold tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Nama Tes</th>
                    <th className="px-5 py-3.5">Target Kelas</th>
                    <th className="px-5 py-3.5">Materi Topik</th>
                    <th className="px-5 py-3.5">Durasi & Waktu</th>
                    <th className="px-5 py-3.5">Soal & Token</th>
                    <th className="px-5 py-3.5">Pengacakan & Opsi</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                        <p className="text-sm font-semibold text-slate-600">Belum ada jadwal sesi ujian</p>
                        <p className="text-xs text-slate-400 mt-0.5">Buka menu "Tambah Tes" untuk menjadwalkan ujian baru.</p>
                      </td>
                    </tr>
                  ) : (
                    tests.map(t => {
                      const topName = topics.find(tp => tp.id === t.topicId)?.name || 'Topik Terhapus';
                      const targetGroups = (t.groupIds && t.groupIds.length > 0)
                        ? t.groupIds
                        : (t.groupId ? (t.groupId === 'ALL' ? ['ALL'] : t.groupId.split(',')) : ['ALL']);
                      const isAllGroups = targetGroups.includes('ALL');
                      const isShuffleAnswers = t.shuffleAnswers !== false;
                      const isShuffleQuestions = t.shuffleQuestions !== false;

                      return (
                        <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-4">
                            <span className="font-bold text-slate-800 block text-sm">{t.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {t.id}</span>
                          </td>
                          <td className="px-5 py-4">
                            {isAllGroups ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                                <Users className="h-3.5 w-3.5 text-slate-500" />
                                Semua Kelas
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-1 max-w-[220px]">
                                {targetGroups.map(gid => {
                                  const grp = groups.find(g => g.id === gid);
                                  return (
                                    <span key={gid} className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                      <GraduationCap className="h-3 w-3 text-emerald-600" />
                                      {grp ? grp.name : gid}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 inline-block">
                              {topName}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-xs">
                            <p className="font-bold text-slate-700">{t.durationMinutes} Menit</p>
                            <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                              {t.endTime.replace('T', ' ')}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="text-xs space-y-1">
                              <p className="font-semibold text-slate-700">{t.questionCount} Soal</p>
                              <span className="font-bold text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                                {t.token}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                                isShuffleAnswers 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                  : 'bg-slate-50 text-slate-500 border-slate-200'
                              }`} title={isShuffleAnswers ? 'Pilihan A, B, C, D, E diacak per siswa' : 'Pilihan urut standar'}>
                                <Shuffle className="h-2.5 w-2.5" />
                                {isShuffleAnswers ? 'Jawaban Diacak' : 'Jawaban Tetap'}
                              </span>

                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                                isShuffleQuestions 
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                                  : 'bg-slate-50 text-slate-500 border-slate-200'
                              }`} title={isShuffleQuestions ? 'Nomor soal diacak' : 'Soal urut'}>
                                <Shuffle className="h-2.5 w-2.5" />
                                {isShuffleQuestions ? 'Soal Diacak' : 'Soal Tetap'}
                              </span>

                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                                t.showResultImmediate 
                                  ? 'bg-sky-50 text-sky-700 border-sky-200' 
                                  : 'bg-slate-50 text-slate-500 border-slate-200'
                              }`}>
                                <Eye className="h-2.5 w-2.5" />
                                {t.showResultImmediate ? 'Nilai Instan' : 'Nilai Ditutup'}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <button
                              onClick={() => {
                                const nextStatus = t.status === 'aktif' ? 'nonaktif' : 'aktif';
                                onUpdateTestStatus(t.id, nextStatus);
                                showToast(`Status sesi "${t.name}" diubah menjadi ${nextStatus.toUpperCase()}.`, 'info');
                              }}
                              className={`px-3 py-1 text-xs font-bold rounded-full border transition-all cursor-pointer ${
                                t.status === 'aktif'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {t.status === 'aktif' ? '● Aktif' : '○ Nonaktif'}
                            </button>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenEditModal(t)}
                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all cursor-pointer"
                                title="Edit Pengaturan Tes"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setDeleteTestModal(t)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                                title="Hapus Sesi Tes"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'evaluasi_tes': {
        // Filters attempts that have essay questions that need evaluation
        const pendingEvaluation = testAttempts.filter(att => 
          att.answers.some(ans => {
            const q = questions.find(qu => qu.id === ans.questionId);
            return q?.type === 'essay' && !ans.isEvaluated;
          })
        );

        return (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2.5 mb-2">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                <CheckSquare className="h-5 w-5" />
              </div>
              Evaluasi Jawaban Uraian / Essay ({pendingEvaluation.length})
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Soal uraian membutuhkan koreksi guru secara manual. Anda dapat mencocokkan jawaban siswa dengan panduan kunci jawaban dan memberi nilai.
            </p>

            {pendingEvaluation.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">Semua Essay Selesai Dievaluasi</p>
                <p className="text-xs text-slate-400 mt-1">Tidak ada jawaban uraian siswa yang menggantung atau belum dinilai.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* List panel */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/60 space-y-3 h-max">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Daftar Koreksi Menggantung</h3>
                  {pendingEvaluation.map(att => {
                    const pName = participants.find(p => p.id === att.participantId)?.name || 'Siswa Terhapus';
                    const tName = tests.find(t => t.id === att.testId)?.name || 'Tes Terhapus';
                    return (
                      <button
                        key={att.id}
                        onClick={() => setSelectedAttemptId(att.id)}
                        className={`w-full p-3 rounded-xl border text-left transition-all flex flex-col cursor-pointer ${
                          selectedAttemptId === att.id
                            ? 'bg-white border-emerald-500 shadow-sm ring-1 ring-emerald-500'
                            : 'bg-white hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        <strong className="text-sm text-slate-800 font-bold">{pName}</strong>
                        <span className="text-xs text-slate-500 truncate mt-0.5">{tName}</span>
                        <span className="text-[10px] mt-2 text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-full w-max border border-emerald-100">
                          Menunggu Penilaian
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Evaluation Panel */}
                <div className="md:col-span-2">
                  {selectedAttemptId ? (() => {
                    const attempt = testAttempts.find(a => a.id === selectedAttemptId);
                    if (!attempt) return null;
                    const student = participants.find(p => p.id === attempt.participantId);
                    const test = tests.find(t => t.id === attempt.testId);

                    // Filter answers needing scoring
                    const essayAnswers = attempt.answers.filter(ans => {
                      const q = questions.find(qu => qu.id === ans.questionId);
                      return q?.type === 'essay' && !ans.isEvaluated;
                    });

                    return (
                      <div className="border border-slate-200 rounded-2xl p-6 bg-white space-y-6">
                        <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                          <div>
                            <h3 className="font-bold text-base text-slate-800">{student?.name}</h3>
                            <p className="text-xs text-slate-500">{test?.name}</p>
                          </div>
                          <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg font-bold font-mono">
                            NO SESI: {attempt.id}
                          </span>
                        </div>

                        {essayAnswers.map(ans => {
                          const question = questions.find(q => q.id === ans.questionId);
                          if (!question) return null;

                          return (
                            <div key={ans.questionId} className="space-y-4">
                              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <p className="text-xs font-bold text-emerald-700 uppercase mb-1">Pertanyaan Essay (Maks {question.points} Poin)</p>
                                <p className="text-sm text-slate-800 font-medium">{question.text}</p>
                              </div>

                              <div className="border border-emerald-100 bg-emerald-50/30 p-4 rounded-xl">
                                <p className="text-xs font-bold text-emerald-800 uppercase mb-1">Jawaban Siswa</p>
                                <p className="text-sm text-slate-800 whitespace-pre-wrap font-medium">{ans.essayAnswer || 'Siswa tidak menjawab.'}</p>
                              </div>

                              <div className="border border-slate-200 bg-slate-50/70 p-4 rounded-xl">
                                <p className="text-xs font-bold text-slate-600 uppercase mb-1">Kriteria Jawaban Benar (Panduan Guru)</p>
                                <p className="text-sm text-slate-700 italic">{question.correctAnswer}</p>
                              </div>

                              <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 w-max">
                                <span className="text-xs font-bold text-slate-600">Berikan Nilai (0 - {question.points}):</span>
                                <input
                                  type="number"
                                  min="0"
                                  max={question.points}
                                  placeholder="Poin"
                                  value={evalScores[ans.questionId] ?? ''}
                                  onChange={(e) => setEvalScores({
                                    ...evalScores,
                                    [ans.questionId]: Math.min(question.points, Math.max(0, Number(e.target.value)))
                                  })}
                                  className="w-16 px-2.5 py-1.5 border border-slate-200 rounded-lg text-center bg-white font-bold text-sm focus:ring-2 focus:ring-emerald-500"
                                />
                                <button
                                  onClick={() => {
                                    const points = evalScores[ans.questionId] ?? 0;
                                    onEvaluateEssay(attempt.id, ans.questionId, points);
                                    showToast(`Skor essay berhasil disimpan (${points} poin).`, 'success');
                                    // Clear score state for next
                                    const updatedScores = { ...evalScores };
                                    delete updatedScores[ans.questionId];
                                    setEvalScores(updatedScores);
                                    setSelectedAttemptId(null);
                                  }}
                                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                                >
                                  <CheckCircle className="h-3.5 w-3.5" /> Berikan Skor
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })() : (
                    <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl bg-slate-50 flex flex-col items-center justify-center">
                      <Eye className="h-10 w-10 text-slate-300 mb-2 animate-bounce" />
                      <p className="text-sm font-bold text-slate-700">Pilih Siswa di Samping</p>
                      <p className="text-xs text-slate-400 mt-0.5">Untuk memulai evaluasi dan koreksi penilaian manual.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'hasil_tes': {
        // Find group and test objects for filters
        const activeFilterTestObj = tests.find(t => t.id === hasilFilterTest || t.name === hasilFilterTest);
        const activeFilterGroupObj = groups.find(g => g.id === hasilFilterGroup || g.name === hasilFilterGroup);

        // Filter test attempts based on search, test filter, and class filter with robust multi-format matching
        const filteredAttempts = testAttempts.filter(att => {
          // 1. Match student by id, username, examCardNo, or name
          const student = participants.find(p => 
            p.id === att.participantId ||
            p.username?.toLowerCase() === att.participantId?.toLowerCase() ||
            p.examCardNo === att.participantId ||
            p.name?.toLowerCase() === att.participantId?.toLowerCase()
          );

          // 2. Match student group by id, name, or clean name
          const studentGroup = groups.find(g => 
            g.id === student?.groupId ||
            g.name?.toLowerCase().trim() === student?.groupId?.toLowerCase().trim() ||
            g.name?.toLowerCase().replace(/kelas\s*/i, '').trim() === student?.groupId?.toLowerCase().replace(/kelas\s*/i, '').trim()
          );

          // 3. Match exam by id or name
          const exam = tests.find(t => 
            t.id === att.testId || 
            t.name?.toLowerCase().trim() === att.testId?.toLowerCase().trim()
          );

          // Test filter
          if (hasilFilterTest !== 'ALL') {
            const selTestId = activeFilterTestObj?.id || hasilFilterTest;
            const selTestName = activeFilterTestObj?.name?.toLowerCase().trim() || '';

            const isMatchTest = 
              att.testId === selTestId ||
              att.testId === hasilFilterTest ||
              (att.testId && selTestName && att.testId.toLowerCase().trim() === selTestName) ||
              exam?.id === selTestId ||
              exam?.id === hasilFilterTest ||
              (exam?.name && selTestName && exam.name.toLowerCase().trim() === selTestName);

            if (!isMatchTest) return false;
          }

          // Group / Class filter
          if (hasilFilterGroup !== 'ALL') {
            const selGroupId = activeFilterGroupObj?.id || hasilFilterGroup;
            const selGroupName = activeFilterGroupObj?.name?.toLowerCase().trim() || '';
            const selGroupShort = selGroupName.replace(/kelas\s*/i, '').trim();

            const stGroupId = student?.groupId?.toLowerCase().trim() || '';
            const stGroupShort = stGroupId.replace(/kelas\s*/i, '').trim();
            const grpName = studentGroup?.name?.toLowerCase().trim() || '';
            const grpShort = grpName.replace(/kelas\s*/i, '').trim();
            const grpId = studentGroup?.id || '';

            const isMatchGroup = 
              student?.groupId === selGroupId ||
              student?.groupId === hasilFilterGroup ||
              grpId === selGroupId ||
              grpId === hasilFilterGroup ||
              (selGroupName && stGroupId === selGroupName) ||
              (selGroupShort && stGroupShort === selGroupShort) ||
              (selGroupName && grpName === selGroupName) ||
              (selGroupShort && grpShort === selGroupShort);

            if (!isMatchGroup) return false;
          }

          // Search student name / username / examCardNo / group / attemptId
          if (hasilSearchStudent.trim()) {
            const query = hasilSearchStudent.toLowerCase().trim();
            const matchName = student?.name?.toLowerCase().includes(query);
            const matchUser = student?.username?.toLowerCase().includes(query);
            const matchCard = student?.examCardNo?.toLowerCase().includes(query);
            const matchGroupName = studentGroup?.name?.toLowerCase().includes(query) || student?.groupId?.toLowerCase().includes(query);
            const matchAttId = att.id.toLowerCase().includes(query) || att.participantId.toLowerCase().includes(query);
            if (!matchName && !matchUser && !matchCard && !matchGroupName && !matchAttId) return false;
          }

          return true;
        });

        const hasActiveFilters = hasilFilterTest !== 'ALL' || hasilFilterGroup !== 'ALL' || hasilSearchStudent.trim() !== '';

        const resetAllFilters = () => {
          setHasilFilterTest('ALL');
          setHasilFilterGroup('ALL');
          setHasilSearchStudent('');
        };

        return (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                    <BarChart className="h-5 w-5" />
                  </div>
                  Hasil &amp; Riwayat Ujian Siswa
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Daftar nilai akhir lengkap berdasarkan nama peserta, kelas, dan status kelulusan/koreksi.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {hasActiveFilters && (
                  <button
                    onClick={resetAllFilters}
                    className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset Filter</span>
                  </button>
                )}
                <span className="text-xs font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80">
                  Ditampilkan: <strong className="text-emerald-700">{filteredAttempts.length}</strong> dari {testAttempts.length} data
                </span>
              </div>
            </div>

            {/* Filter and Search Bar for Hasil Tes */}
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/70">
                {/* Search by Student Name / NIS */}
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari Nama Siswa / NIS / No. Kartu..."
                    value={hasilSearchStudent}
                    onChange={(e) => setHasilSearchStudent(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                  />
                  {hasilSearchStudent && (
                    <button
                      onClick={() => setHasilSearchStudent('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Test */}
                <div className="flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-1" />
                  <select
                    value={hasilFilterTest}
                    onChange={(e) => setHasilFilterTest(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    <option value="ALL">Semua Sesi Ujian</option>
                    {tests.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                {/* Filter Group / Class */}
                <div className="flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-1" />
                  <select
                    value={hasilFilterGroup}
                    onChange={(e) => setHasilFilterGroup(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    <option value="ALL">Semua Kelas / Rombel</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Active Filter Badges */}
              {hasActiveFilters && (
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Filter Aktif:</span>
                  {hasilFilterTest !== 'ALL' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg font-medium text-[11px]">
                      Ujian: <strong>{activeFilterTestObj?.name || hasilFilterTest}</strong>
                      <button onClick={() => setHasilFilterTest('ALL')} className="hover:text-emerald-950 cursor-pointer">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {hasilFilterGroup !== 'ALL' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg font-medium text-[11px]">
                      Kelas: <strong>{activeFilterGroupObj?.name || hasilFilterGroup}</strong>
                      <button onClick={() => setHasilFilterGroup('ALL')} className="hover:text-emerald-950 cursor-pointer">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {hasilSearchStudent.trim() !== '' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg font-medium text-[11px]">
                      Cari: <strong>"{hasilSearchStudent}"</strong>
                      <button onClick={() => setHasilSearchStudent('')} className="hover:text-emerald-950 cursor-pointer">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="w-full text-sm text-left text-slate-500">
                <thead className="bg-slate-50 text-[11px] text-slate-700 uppercase font-bold tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Nama Lengkap Siswa</th>
                    <th className="px-5 py-3.5">Kelas / Rombel</th>
                    <th className="px-5 py-3.5">Ujian / Tes</th>
                    <th className="px-5 py-3.5">Waktu Pengerjaan</th>
                    <th className="px-5 py-3.5">Skor Akhir (Nilai)</th>
                    <th className="px-5 py-3.5">Status / Koreksi</th>
                    <th className="px-5 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAttempts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                        <p className="text-sm font-semibold text-slate-600">Tidak ada riwayat hasil ujian yang cocok</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                          {testAttempts.length > 0
                            ? `Ditemukan total ${testAttempts.length} data riwayat ujian di sistem, namun tersaring oleh pilihan filter di atas.`
                            : 'Belum ada siswa yang menyelesaikan sesi ujian.'}
                        </p>
                        {testAttempts.length > 0 && hasActiveFilters && (
                          <button
                            onClick={resetAllFilters}
                            className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>Tampilkan Semua {testAttempts.length} Hasil Ujian</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredAttempts.map(att => {
                      const student = participants.find(p => 
                        p.id === att.participantId ||
                        p.username?.toLowerCase() === att.participantId?.toLowerCase() ||
                        p.examCardNo === att.participantId ||
                        p.name?.toLowerCase() === att.participantId?.toLowerCase()
                      );
                      const studentGroup = groups.find(g => 
                        g.id === student?.groupId ||
                        g.name?.toLowerCase().trim() === student?.groupId?.toLowerCase().trim() ||
                        g.name?.toLowerCase().replace(/kelas\s*/i, '').trim() === student?.groupId?.toLowerCase().replace(/kelas\s*/i, '').trim()
                      );
                      const exam = tests.find(t => 
                        t.id === att.testId || 
                        t.name?.toLowerCase().trim() === att.testId?.toLowerCase().trim()
                      );
                      const isPendingEssay = att.answers.some(ans => {
                        const q = questions.find(qu => qu.id === ans.questionId);
                        return q?.type === 'essay' && !ans.isEvaluated;
                      });

                      const isOngoing = att.status === 'mengerjakan';
                      const isLocked = att.isLocked;

                      const initialLetter = student?.name ? student.name.charAt(0).toUpperCase() : '?';

                      return (
                        <tr key={att.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-xs shrink-0 border border-emerald-200 shadow-2xs">
                                {initialLetter}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 text-sm leading-tight">
                                  {student?.name || att.participantId || 'Siswa Terdaftar'}
                                </p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                                    NIS/User: {student?.username || att.participantId || '-'}
                                  </span>
                                  {student?.examCardNo && (
                                    <span className="text-[10px] text-emerald-700 font-mono bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                      {student.examCardNo}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                              <GraduationCap className="h-3.5 w-3.5 text-emerald-600" />
                              {studentGroup ? studentGroup.name : (student?.groupId || '-')}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-800 text-xs">{exam?.name || att.testId || 'Tes CBT'}</p>
                            <span className="text-[10px] text-slate-400 font-mono">ID Tes: {att.testId}</span>
                          </td>
                          <td className="px-5 py-4 text-xs font-mono">
                            <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                              <Clock className="h-3.5 w-3.5 text-slate-400" /> 
                              {att.startTime ? att.startTime.replace('T', ' ').substring(0, 16) : '-'}
                            </div>
                            {att.endTime && (
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                Selesai: {att.endTime.replace('T', ' ').substring(11, 16)}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {isOngoing ? (
                              <div className="space-y-1">
                                <span className="inline-block px-3 py-1 text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 rounded-xl animate-pulse">
                                  Sedang Mengerjakan
                                </span>
                                <span className="block text-[10px] text-slate-400 font-mono">
                                  {att.answers.filter(a => a.selectedOption !== undefined || a.essayAnswer).length} dari {att.answers.length} butir diisi
                                </span>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <span className={`inline-block px-3 py-1 text-sm font-black rounded-xl border ${
                                  att.totalScore >= 75
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : att.totalScore >= 60
                                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                                    : 'bg-red-50 text-red-800 border-red-300'
                                }`}>
                                  {att.totalScore} / 100
                                </span>
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                  {att.totalScore >= 75 ? '🟢 Kompeten' : att.totalScore >= 60 ? '🟡 Cukup' : '🔴 Perlu Bimbingan'}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {isLocked ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-red-50 text-red-800 border border-red-200">
                                <ShieldAlert className="h-3 w-3 text-red-600" /> Terkunci Anti-Curang
                              </span>
                            ) : isOngoing ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                <Clock className="h-3 w-3 text-amber-600" /> Sesi Berlangsung
                              </span>
                            ) : isPendingEssay ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                <AlertTriangle className="h-3 w-3 text-amber-600" /> Menunggu Koreksi Essay
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <CheckCircle className="h-3 w-3 text-emerald-600" /> Selesai Dinilai
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedAttemptForReview(att)}
                                className="px-2.5 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                                title="Lihat Rincian Jawaban Siswa & Penilaian Essay"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>Rincian</span>
                              </button>
                              <button
                                onClick={() => {
                                  onDeleteAttempt(att.id);
                                  showToast(`Riwayat pengerjaan siswa "${student?.name || 'Siswa'}" berhasil dihapus.`, 'info');
                                }}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                                title="Hapus / Ulangi Sesi Peserta Ini"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      case 'token':
        return (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center max-w-2xl mx-auto">
            <div className="p-4 bg-emerald-50 rounded-2xl w-max mx-auto text-emerald-600 mb-4 border border-emerald-100">
              <Key className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Token Keamanan Sesi Ujian</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Token adalah sandi keamanan 6 digit yang wajib dimasukkan oleh siswa sebelum memulai tes. Token didistribusikan langsung oleh guru pengawas ruang.
            </p>

            <div className="my-8 py-6 px-8 bg-slate-50 border border-slate-200 rounded-2xl w-max mx-auto">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Token Aktif Saat Ini</span>
              <span className="text-5xl font-mono font-black text-emerald-700 tracking-widest select-all">{currentToken}</span>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={generateNewToken}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <RefreshCw className="h-4 w-4" /> Regenerasi Token Baru
              </button>
            </div>

            <div className="mt-8 border-t border-slate-100 pt-6 text-left space-y-2">
              <p className="text-xs font-bold text-slate-700 uppercase">Mengapa Token Diperlukan?</p>
              <ul className="text-xs text-slate-500 space-y-1.5 list-disc pl-4">
                <li>Mencegah siswa memulai ujian di luar jam atau ruang pengawasan resmi.</li>
                <li>Satu token berlaku untuk semua tes aktif, namun dapat dirubah sewaktu-waktu secara mendadak.</li>
                <li>Idealnya diganti setiap 15 menit oleh pengawas ruang demi menjaga integritas ujian.</li>
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Render Edit Test Modal
  const renderEditTestModal = () => {
    if (!editingTest) return null;

    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-150">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                <Edit2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-800">Edit Pengaturan Sesi Ujian</h3>
                <p className="text-xs text-slate-500">Perbarui informasi, jadwal, dan opsi pengacakan ujian.</p>
              </div>
            </div>
            <button
              onClick={() => setEditingTest(null)}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSaveEditTest} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Nama Acara Ujian / Tes</label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Materi Topik</label>
              <select
                value={editTopic}
                onChange={(e) => setEditTopic(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                {topics.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                ))}
              </select>
            </div>

            {/* Target Kelas Edit via Kolom Centang */}
            <div className="space-y-2.5 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/90">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/70">
                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4 text-emerald-600" />
                    Target Kelas yang Diteskan (Kolom Centang) <span className="text-red-500">*</span>
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Centang kelas yang diizinkan mengakses ujian ini.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditGroups(['ALL'])}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer border ${
                      editGroups.includes('ALL') || (groups.length > 0 && editGroups.length === groups.length)
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Pilih Semua Kelas
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditGroups([])}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-all cursor-pointer"
                  >
                    Hapus Centang
                  </button>
                </div>
              </div>

              {/* Master Semua Kelas Checkbox */}
              <label className={`p-3 rounded-xl border transition-all flex items-center gap-3 cursor-pointer select-none ${
                editGroups.includes('ALL') || (groups.length > 0 && editGroups.length === groups.length)
                  ? 'bg-emerald-100/60 border-emerald-400 text-emerald-950 ring-1 ring-emerald-400/40 shadow-2xs font-semibold'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}>
                <input
                  type="checkbox"
                  checked={editGroups.includes('ALL') || (groups.length > 0 && editGroups.length === groups.length)}
                  onChange={() => toggleEditGroup('ALL')}
                  className="h-4 w-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer shrink-0"
                />
                <div className="flex-1 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-emerald-700 shrink-0" />
                    <span className="text-xs font-bold text-slate-900">
                      Semua Kelas (Terbuka untuk Seluruh Peserta Ujian)
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                    {participants.length} Siswa
                  </span>
                </div>
              </label>

              {/* Grid of Class Checkboxes */}
              {groups.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {groups.map(g => {
                    const isSelected = editGroups.includes('ALL') || editGroups.includes(g.id);
                    const studentCount = participants.filter(p => p.groupId === g.id).length;

                    return (
                      <label
                        key={g.id}
                        className={`p-2.5 rounded-xl border transition-all flex items-start gap-2 cursor-pointer select-none ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-400/30 text-emerald-950 shadow-2xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleEditGroup(g.id)}
                          className="mt-0.5 h-4 w-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-slate-800 truncate block">
                              {g.name}
                            </span>
                            <span className="text-[9px] font-bold text-slate-600 px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200/80 shrink-0">
                              {studentCount}
                            </span>
                          </div>
                          {g.description && (
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">
                              {g.description}
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Status Pilihan */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                <span className="text-slate-500 font-medium">Status Target:</span>
                <span className="font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-lg border border-emerald-200/60">
                  {editGroups.includes('ALL') || editGroups.length === groups.length || editGroups.length === 0
                    ? '🌟 Semua Kelas Ditargetkan'
                    : `✓ ${editGroups.length} Kelas Dipilih: ${editGroups.map(id => groups.find(g => g.id === id)?.name || id).join(', ')}`}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Durasi (Menit)</label>
                <input
                  type="number"
                  min="5"
                  max="300"
                  required
                  value={editDuration}
                  onChange={(e) => setEditDuration(Number(e.target.value))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Jumlah Soal</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={editQCount}
                  onChange={(e) => setEditQCount(Number(e.target.value))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Token Akses</label>
                <input
                  type="text"
                  disabled
                  value={editingTest.token}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-100 font-mono font-bold text-slate-600 text-center"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Waktu Mulai</label>
                <input
                  type="datetime-local"
                  required
                  value={editStart}
                  onChange={(e) => setEditStart(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Batas Akhir</label>
                <input
                  type="datetime-local"
                  required
                  value={editEnd}
                  onChange={(e) => setEditEnd(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white font-medium"
                />
              </div>
            </div>

            {/* Edit Randomized Answers & Questions settings */}
            <div className="border border-emerald-100 bg-emerald-50/30 rounded-xl p-4 space-y-3">
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider block">
                Opsi Pengacakan & Hasil
              </span>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editShuffleAnswers}
                  onChange={(e) => setEditShuffleAnswers(e.target.checked)}
                  className="h-4 w-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-800 select-none">
                  Acak Pilihan Jawaban (A, B, C, D, E diacak untuk setiap siswa)
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editShuffleQuestions}
                  onChange={(e) => setEditShuffleQuestions(e.target.checked)}
                  className="h-4 w-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-800 select-none">
                  Acak Urutan Nomor Soal
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editShowImmediate}
                  onChange={(e) => setEditShowImmediate(e.target.checked)}
                  className="h-4 w-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-800 select-none">
                  Rilis Hasil Instan (Tampilkan nilai ke siswa segera setelah selesai)
                </span>
              </label>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditingTest(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all cursor-pointer"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Render Delete Test Confirmation Modal
  const renderDeleteTestModal = () => {
    if (!deleteTestModal) return null;

    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
          <div className="p-6 text-center border-b border-slate-100">
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
              <Trash2 className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">
              Hapus Sesi Ujian
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Apakah Anda yakin ingin menghapus sesi ujian ini secara permanen?
            </p>
          </div>

          <div className="p-6 space-y-3">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-semibold">Nama Ujian:</span>
                <span className="font-bold text-slate-800 text-sm">{deleteTestModal.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Topik:</span>
                <span className="font-semibold text-slate-700">
                  {topics.find(t => t.id === deleteTestModal.topicId)?.name || '-'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Token:</span>
                <span className="font-mono font-bold text-emerald-800">{deleteTestModal.token}</span>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 font-medium">
              Semua riwayat pengerjaan siswa yang terhubung dengan sesi tes ini juga akan dihapus.
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setDeleteTestModal(null)}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-all cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirmDeleteTest}
              className="px-5 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              <span>Ya, Hapus Sesi Ujian</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render Attempt Review & Essay Grading Modal
  const renderAttemptReviewModal = () => {
    if (!selectedAttemptForReview) return null;

    const student = participants.find(p => p.id === selectedAttemptForReview.participantId);
    const test = tests.find(t => t.id === selectedAttemptForReview.testId);
    const correctCount = selectedAttemptForReview.answers.filter(a => a.isCorrect).length;
    const totalCount = selectedAttemptForReview.answers.length;

    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
          {/* Modal Header */}
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start shrink-0">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase rounded-lg">
                  Rincian Jawaban Siswa
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  ID Attempt: {selectedAttemptForReview.id}
                </span>
              </div>
              <h3 className="text-lg font-black text-slate-800">{test?.name || 'Sesi Ujian'}</h3>
              <p className="text-xs text-slate-500 font-medium">
                Nama Siswa: <strong className="text-slate-800">{student?.name || 'Siswa'}</strong> ({student?.username || '-'}) &bull; Waktu: {selectedAttemptForReview.endTime ? selectedAttemptForReview.endTime.replace('T', ' ').substring(0, 16) : '-'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSelectedAttemptForReview(null)}
              className="p-2 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-xl transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick Score Metrics */}
          <div className="grid grid-cols-3 gap-3 p-4 bg-emerald-50/40 border-b border-slate-100 shrink-0">
            <div className="bg-white p-3 rounded-2xl border border-emerald-100 text-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Skor Akhir</span>
              <strong className="text-2xl font-black font-mono text-emerald-800 block">{selectedAttemptForReview.totalScore} / 100</strong>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-emerald-100 text-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">PG Benar</span>
              <strong className="text-2xl font-black font-mono text-emerald-600 block">{correctCount}</strong>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-emerald-100 text-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Butir Soal</span>
              <strong className="text-2xl font-black font-mono text-slate-700 block">{totalCount}</strong>
            </div>
          </div>

          {/* Questions & Answers List */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            {selectedAttemptForReview.answers.map((ans, idx) => {
              const q = questions.find(qu => qu.id === ans.questionId);
              if (!q) {
                return (
                  <div key={ans.questionId} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500 italic">
                    Soal #{idx + 1} tidak ditemukan di bank soal.
                  </div>
                );
              }

              const isPG = q.type === 'pilihan_ganda';

              return (
                <div 
                  key={q.id}
                  className={`p-5 rounded-2xl border transition-all space-y-3 ${
                    isPG 
                      ? (ans.isCorrect ? 'bg-emerald-50/30 border-emerald-200' : 'bg-red-50/20 border-red-200')
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span className="h-6 w-6 rounded-lg bg-slate-800 text-white font-bold text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-600 uppercase">
                        {isPG ? 'Pilihan Ganda' : 'Uraian / Essay'} &bull; Bobot {q.points} Poin
                      </span>
                    </div>

                    {isPG ? (
                      ans.isCorrect ? (
                        <span className="px-2.5 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-lg flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> Benar (+{q.points} Poin)
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-lg flex items-center gap-1">
                          <X className="h-3 w-3" /> Salah (0 Poin)
                        </span>
                      )
                    ) : (
                      ans.isEvaluated ? (
                        <span className="px-2.5 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-lg">
                          Dinilai: {ans.scoreGiven} / {q.points} Poin
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-lg">
                          Menunggu Penilaian Guru
                        </span>
                      )
                    )}
                  </div>

                  <p className="text-sm font-medium text-slate-800 leading-relaxed">{q.text}</p>

                  {q.image && (
                    <div className="max-w-md my-2 rounded-xl overflow-hidden border border-slate-200">
                      <img src={q.image} alt={`Soal ${idx + 1}`} className="max-h-60 object-contain w-full bg-slate-100" referrerPolicy="no-referrer" />
                    </div>
                  )}

                  {isPG && q.options && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-200/60 text-xs">
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

                        let optBg = 'bg-white border-slate-200 text-slate-700';
                        if (isSelected && isCorrectOpt) {
                          optBg = 'bg-emerald-100 border-emerald-400 text-emerald-900 font-bold';
                        } else if (isSelected && !isCorrectOpt) {
                          optBg = 'bg-red-100 border-red-400 text-red-900 font-bold';
                        } else if (isCorrectOpt) {
                          optBg = 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold';
                        }

                        return (
                          <div key={oIdx} className={`p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${optBg}`}>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold uppercase shrink-0">{optKey}.</span>
                              <span>{optText}</span>
                            </div>
                            {optImg && (
                              <img src={optImg} alt="" className="max-h-16 rounded border border-slate-200 object-contain" referrerPolicy="no-referrer" />
                            )}
                            <div className="flex items-center gap-1 shrink-0 text-[10px] font-bold">
                              {isSelected && <span className="bg-slate-800 text-white px-2 py-0.5 rounded">Jawaban Siswa</span>}
                              {isCorrectOpt && <span className="bg-emerald-600 text-white px-2 py-0.5 rounded">Kunci</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {!isPG && (
                    <div className="space-y-2 pt-2 border-t border-slate-200/60 text-xs">
                      <div className="p-3 bg-white rounded-xl border border-slate-200">
                        <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">Jawaban Siswa:</span>
                        <p className="text-slate-800 whitespace-pre-wrap font-medium">{ans.essayAnswer || 'Tidak diisi.'}</p>
                      </div>

                      {q.correctAnswer && (
                        <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                          <span className="font-bold text-emerald-800 uppercase text-[10px] block mb-1">Kriteria Kunci / Pembahasan Guru:</span>
                          <p className="text-slate-700 italic">{q.correctAnswer}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-2 p-3 bg-blue-50/60 rounded-xl border border-blue-200">
                        <span className="font-bold text-blue-900">Beri Nilai Guru (Max {q.points}):</span>
                        <input
                          type="number"
                          min={0}
                          max={q.points}
                          defaultValue={ans.scoreGiven !== undefined ? ans.scoreGiven : 0}
                          id={`essay_score_${ans.questionId}`}
                          className="w-20 px-2 py-1 bg-white border border-blue-300 rounded-lg text-xs font-bold text-center"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const valEl = document.getElementById(`essay_score_${ans.questionId}`) as HTMLInputElement;
                            const scoreNum = Number(valEl?.value || 0);
                            onEvaluateEssay(selectedAttemptForReview.id, ans.questionId, scoreNum);
                            showToast(`Nilai essay soal #${idx + 1} berhasil disimpan.`, 'success');
                          }}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all cursor-pointer"
                        >
                          Simpan Nilai
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
            <button
              type="button"
              onClick={() => setSelectedAttemptForReview(null)}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Tutup Rincian
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render Toast Notification
  const renderToastNotification = () => {
    if (!toastMessage) return null;

    return (
      <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-200">
        <div className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 max-w-sm ${
          toastMessage.type === 'error'
            ? 'bg-red-900 text-white border-red-800'
            : toastMessage.type === 'info'
            ? 'bg-slate-900 text-white border-slate-800'
            : 'bg-emerald-900 text-white border-emerald-800'
        }`}>
          {toastMessage.type === 'error' ? (
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
          ) : toastMessage.type === 'info' ? (
            <AlertCircle className="h-5 w-5 text-emerald-400 shrink-0" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          )}
          <span className="text-xs font-semibold leading-snug">{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-white/20 rounded-lg transition-all text-white/70 hover:text-white cursor-pointer ml-auto"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {renderContent()}
      {renderEditTestModal()}
      {renderDeleteTestModal()}
      {renderAttemptReviewModal()}
      {renderToastNotification()}
    </>
  );
}
