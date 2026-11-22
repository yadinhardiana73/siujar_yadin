/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BarChart3, GraduationCap, ArrowDownWideNarrow, Download, Check, AlertCircle } from 'lucide-react';
import { Question, TestAttempt, Participant, Test, Group } from '../types';
import { User, Search } from 'lucide-react';

interface ReportsModuleProps {
  questions: Question[];
  testAttempts: TestAttempt[];
  participants: Participant[];
  tests: Test[];
  groups?: Group[];
  activeSubMenu: string;
}

export default function ReportsModule({
  questions,
  testAttempts,
  participants,
  tests,
  groups = [],
  activeSubMenu
}: ReportsModuleProps) {
  const [selectedTestFilter, setSelectedTestFilter] = useState('ALL');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('ALL');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  // 1. Analisis Butir Soal Calculation
  const itemAnalysis = questions.map(q => {
    // Filter attempts for this question
    const attemptsWithQ = testAttempts.filter(att => 
      att.answers.some(ans => ans.questionId === q.id)
    );

    let correctCount = 0;
    let totalScoreAwarded = 0;
    let evaluatedCount = 0;

    attemptsWithQ.forEach(att => {
      const ans = att.answers.find(a => a.questionId === q.id);
      if (ans) {
        if (q.type === 'pilihan_ganda') {
          if (ans.isCorrect) correctCount++;
          evaluatedCount++;
        } else {
          // Essay
          if (ans.isEvaluated) {
            totalScoreAwarded += (ans.scoreGiven ?? 0);
            evaluatedCount++;
          }
        }
      }
    });

    const totalAttempts = attemptsWithQ.length;
    let successRate = 0;

    if (totalAttempts > 0) {
      if (q.type === 'pilihan_ganda') {
        successRate = evaluatedCount > 0 ? Math.round((correctCount / evaluatedCount) * 100) : 0;
      } else {
        // Essay success rate is average score percentage of max score
        const maxPossiblePoints = totalAttempts * q.points;
        successRate = maxPossiblePoints > 0 ? Math.round((totalScoreAwarded / maxPossiblePoints) * 100) : 0;
      }
    }

    // Determine difficulty class
    let difficultyClass = 'Sedang';
    let difficultyColor = 'text-amber-600 bg-amber-50 border-amber-100';
    if (successRate > 75) {
      difficultyClass = 'Mudah';
      difficultyColor = 'text-emerald-600 bg-emerald-50 border-emerald-100';
    } else if (successRate < 35) {
      difficultyClass = 'Sukar';
      difficultyColor = 'text-red-600 bg-red-50 border-red-100';
    }

    return {
      ...q,
      totalAttempts,
      correctCount,
      successRate,
      difficultyClass,
      difficultyColor
    };
  });

  // Filter attempts based on test, group, and student search with flexible matching
  const activeReportTestObj = tests.find(t => t.id === selectedTestFilter || t.name === selectedTestFilter);
  const activeReportGroupObj = groups.find(g => g.id === selectedGroupFilter || g.name === selectedGroupFilter);

  const filteredAttempts = testAttempts.filter(att => {
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

    if (selectedTestFilter !== 'ALL') {
      const selTestId = activeReportTestObj?.id || selectedTestFilter;
      const selTestName = activeReportTestObj?.name?.toLowerCase().trim() || '';

      const isMatchTest = 
        att.testId === selTestId ||
        att.testId === selectedTestFilter ||
        (att.testId && selTestName && att.testId.toLowerCase().trim() === selTestName) ||
        exam?.id === selTestId ||
        exam?.id === selectedTestFilter ||
        (exam?.name && selTestName && exam.name.toLowerCase().trim() === selTestName);

      if (!isMatchTest) return false;
    }

    if (selectedGroupFilter !== 'ALL') {
      const selGroupId = activeReportGroupObj?.id || selectedGroupFilter;
      const selGroupName = activeReportGroupObj?.name?.toLowerCase().trim() || '';
      const selGroupShort = selGroupName.replace(/kelas\s*/i, '').trim();

      const stGroupId = student?.groupId?.toLowerCase().trim() || '';
      const stGroupShort = stGroupId.replace(/kelas\s*/i, '').trim();
      const grpName = studentGroup?.name?.toLowerCase().trim() || '';
      const grpShort = grpName.replace(/kelas\s*/i, '').trim();
      const grpId = studentGroup?.id || '';

      const isMatchGroup = 
        student?.groupId === selGroupId ||
        student?.groupId === selectedGroupFilter ||
        grpId === selGroupId ||
        grpId === selectedGroupFilter ||
        (selGroupName && stGroupId === selGroupName) ||
        (selGroupShort && stGroupShort === selGroupShort) ||
        (selGroupName && grpName === selGroupName) ||
        (selGroupShort && grpShort === selGroupShort);

      if (!isMatchGroup) return false;
    }

    if (studentSearchQuery.trim()) {
      const q = studentSearchQuery.toLowerCase().trim();
      const matchName = student?.name?.toLowerCase().includes(q);
      const matchUser = student?.username?.toLowerCase().includes(q);
      const matchCard = student?.examCardNo?.toLowerCase().includes(q);
      const matchGroup = studentGroup?.name?.toLowerCase().includes(q) || student?.groupId?.toLowerCase().includes(q);
      if (!matchName && !matchUser && !matchCard && !matchGroup) return false;
    }

    return true;
  });

  // Stats calculation
  const totalCompleted = filteredAttempts.length;
  const averageScore = totalCompleted > 0
    ? Math.round(filteredAttempts.reduce((sum, att) => sum + att.totalScore, 0) / totalCompleted)
    : 0;
  const highestScore = totalCompleted > 0
    ? Math.max(...filteredAttempts.map(att => att.totalScore))
    : 0;
  const lowestScore = totalCompleted > 0
    ? Math.min(...filteredAttempts.map(att => att.totalScore))
    : 0;

  // Grade distributions (e.g. 90-100, 75-89, 60-74, <60)
  const distA = filteredAttempts.filter(a => a.totalScore >= 90).length;
  const distB = filteredAttempts.filter(a => a.totalScore >= 75 && a.totalScore < 90).length;
  const distC = filteredAttempts.filter(a => a.totalScore >= 60 && a.totalScore < 75).length;
  const distD = filteredAttempts.filter(a => a.totalScore < 60).length;

  const exportToCSV = () => {
    // Generate a downloadable CSV string
    const headers = 'NIS / Username,Nama Lengkap Siswa,Kelas / Rombel,Nama Ujian,Waktu Mulai,Waktu Selesai,Skor Akhir,Kategori\n';
    const rows = filteredAttempts.map(att => {
      const student = participants.find(p => p.id === att.participantId);
      const studentName = student?.name || 'Siswa Terhapus';
      const username = student?.username || '-';
      const groupName = groups.find(g => g.id === student?.groupId)?.name || student?.groupId || '-';
      const testName = tests.find(t => t.id === att.testId)?.name || 'Tes Terhapus';
      const gradeCategory = att.totalScore >= 75 ? 'Kompeten' : att.totalScore >= 60 ? 'Cukup' : 'Perlu Bimbingan';
      
      return `"${username}","${studentName}","${groupName}","${testName}","${att.startTime}","${att.endTime || '-'}","${att.totalScore}","${gradeCategory}"`;
    }).join('\n');

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(headers + rows);
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `rekap_hasil_ujian_${selectedTestFilter}_${selectedGroupFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  switch (activeSubMenu) {
    case 'analisis_butir_soal':
      return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2 mb-2">
            <GraduationCap className="h-5 w-5 text-indigo-600" />
            Analisis Butir Soal (Item Analysis)
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Analisis statistik otomatis untuk mengukur tingkat kesulitan masing-masing soal berdasarkan persentase jawaban benar dari seluruh peserta.
          </p>

          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-sm text-left text-slate-500">
              <thead className="bg-slate-50 text-xs text-slate-700 uppercase font-semibold">
                <tr>
                  <th className="px-6 py-3">ID Soal</th>
                  <th className="px-6 py-3">Teks Pertanyaan</th>
                  <th className="px-6 py-3">Tipe</th>
                  <th className="px-6 py-3">Frekuensi Diuji</th>
                  <th className="px-6 py-3">Tingkat Benar (%)</th>
                  <th className="px-6 py-3 text-right">Klasifikasi Kesulitan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {itemAnalysis.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-indigo-600">{item.id}</td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800 truncate max-w-sm" title={item.text}>
                        {item.text}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] uppercase font-bold text-slate-500">
                        {item.type === 'pilihan_ganda' ? 'Pilgan' : 'Essay'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-medium text-slate-700">{item.totalAttempts} kali</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-indigo-600 h-full rounded-full" 
                            style={{ width: `${item.successRate}%` }}
                          ></div>
                        </div>
                        <span className="font-bold text-xs text-slate-700">{item.successRate}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${item.difficultyColor}`}>
                        {item.difficultyClass}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

    case 'rekap_hasil_tes':
      return (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  Rekap &amp; Statistik Hasil Tes
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Perbandingan hasil nilai rata-rata, sebaran kelulusan, dan daftar nilai lengkap tiap peserta ujian.
                </p>
              </div>

              <button
                onClick={exportToCSV}
                disabled={totalCompleted === 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer self-start lg:self-center shrink-0"
              >
                <Download className="h-4 w-4" /> Unduh Rekap Nilai (Excel / CSV)
              </button>
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/70">
              {/* Search by Student Name */}
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari Nama Siswa / NIS..."
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                />
              </div>

              {/* Filter Test */}
              <div className="flex items-center gap-1.5">
                <select
                  value={selectedTestFilter}
                  onChange={(e) => setSelectedTestFilter(e.target.value)}
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
                <select
                  value={selectedGroupFilter}
                  onChange={(e) => setSelectedGroupFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="ALL">Semua Kelas / Rombel</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {totalCompleted === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                <AlertCircle className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-600">Belum ada riwayat hasil pengerjaan siswa</p>
                <p className="text-xs text-slate-400 mt-1">Coba sesuaikan filter atau pencarian Anda.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 4 Cards Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Peserta Selesai</span>
                    <strong className="text-2xl text-slate-800 font-black block mt-1">{totalCompleted} Siswa</strong>
                  </div>
                  <div className="p-4 bg-indigo-50 border border-indigo-200/80 rounded-2xl">
                    <span className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider block">Nilai Rata-rata</span>
                    <strong className="text-2xl text-indigo-900 font-black block mt-1">{averageScore}</strong>
                  </div>
                  <div className="p-4 bg-emerald-50 border border-emerald-200/80 rounded-2xl">
                    <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">Skor Tertinggi</span>
                    <strong className="text-2xl text-emerald-900 font-black block mt-1">{highestScore}</strong>
                  </div>
                  <div className="p-4 bg-red-50 border border-red-200/80 rounded-2xl">
                    <span className="text-[10px] text-red-700 font-bold uppercase tracking-wider block">Skor Terendah</span>
                    <strong className="text-2xl text-red-900 font-black block mt-1">{lowestScore}</strong>
                  </div>
                </div>

                {/* Grade Distribution Bar */}
                <div className="p-5 border border-slate-200/80 rounded-2xl bg-slate-50/50">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Grafik Sebaran Klasifikasi Nilai</h3>
                  <div className="space-y-3.5">
                    {/* Dist A */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-600">Sangat Baik (Skor 90 - 100)</span>
                        <span className="text-slate-800 font-bold">{distA} Siswa ({totalCompleted > 0 ? Math.round((distA / totalCompleted) * 100) : 0}%)</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${(distA / totalCompleted) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Dist B */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-600">Baik / Kompeten (Skor 75 - 89)</span>
                        <span className="text-slate-800 font-bold">{distB} Siswa ({totalCompleted > 0 ? Math.round((distB / totalCompleted) * 100) : 0}%)</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${(distB / totalCompleted) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Dist C */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-600">Cukup (Skor 60 - 74)</span>
                        <span className="text-slate-800 font-bold">{distC} Siswa ({totalCompleted > 0 ? Math.round((distC / totalCompleted) * 100) : 0}%)</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${(distC / totalCompleted) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Dist D */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-600">Perlu Bimbingan (Skor &lt; 60)</span>
                        <span className="text-slate-800 font-bold">{distD} Siswa ({totalCompleted > 0 ? Math.round((distD / totalCompleted) * 100) : 0}%)</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-red-500 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${(distD / totalCompleted) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed Student Results Table in Rekap */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <User className="h-4 w-4 text-emerald-600" />
                      Daftar Lengkap Nilai Siswa
                    </h3>
                    <span className="text-xs text-slate-400 font-medium">{filteredAttempts.length} data</span>
                  </div>

                  <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                    <table className="w-full text-sm text-left text-slate-500">
                      <thead className="bg-slate-50 text-[11px] text-slate-700 uppercase font-bold tracking-wider">
                        <tr>
                          <th className="px-5 py-3.5">Nama Siswa</th>
                          <th className="px-5 py-3.5">Kelas / Rombel</th>
                          <th className="px-5 py-3.5">Ujian / Tes</th>
                          <th className="px-5 py-3.5">Waktu Selesai</th>
                          <th className="px-5 py-3.5 text-center">Skor Akhir</th>
                          <th className="px-5 py-3.5">Predikat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredAttempts.map(att => {
                          const student = participants.find(p => p.id === att.participantId);
                          const studentGroup = groups.find(g => g.id === student?.groupId);
                          const exam = tests.find(t => t.id === att.testId);
                          const initial = student?.name ? student.name.charAt(0).toUpperCase() : '?';

                          return (
                            <tr key={att.id} className="hover:bg-slate-50/50">
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-2.5">
                                  <div className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0">
                                    {initial}
                                  </div>
                                  <div>
                                    <span className="font-bold text-slate-900 block text-xs">{student?.name || 'Siswa Terhapus'}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">NIS: {student?.username || '-'}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3.5">
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                  <GraduationCap className="h-3 w-3 text-emerald-600" />
                                  {studentGroup ? studentGroup.name : (student?.groupId || '-')}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-xs font-medium text-slate-700">
                                {exam?.name || 'Tes Terhapus'}
                              </td>
                              <td className="px-5 py-3.5 text-xs font-mono text-slate-500">
                                {att.endTime ? att.endTime.replace('T', ' ').substring(0, 16) : '-'}
                              </td>
                              <td className="px-5 py-3.5 text-center">
                                <span className={`inline-block px-2.5 py-0.5 text-xs font-black rounded-lg border ${
                                  att.totalScore >= 75
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : att.totalScore >= 60
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'bg-red-50 text-red-800 border-red-200'
                                }`}>
                                  {att.totalScore}
                                </span>
                              </td>
                              <td className="px-5 py-3.5">
                                <span className={`text-[11px] font-bold ${
                                  att.totalScore >= 75 ? 'text-emerald-700' : att.totalScore >= 60 ? 'text-amber-700' : 'text-red-600'
                                }`}>
                                  {att.totalScore >= 75 ? '🟢 Kompeten' : att.totalScore >= 60 ? '🟡 Cukup' : '🔴 Perlu Bimbingan'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      );

    default:
      return null;
  }
}
