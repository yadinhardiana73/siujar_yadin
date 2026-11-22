/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Database, FileUp, FileDown, Download, Check, AlertTriangle, RefreshCw } from 'lucide-react';
import { Question, CBTAppState } from '../types';

interface ToolsModuleProps {
  questions: Question[];
  fullState: CBTAppState;
  onRestoreState: (state: CBTAppState) => void;
  onBulkImportQuestions: (qs: Question[]) => void;
  activeSubMenu: string;
}

export default function ToolsModule({
  questions,
  fullState,
  onRestoreState,
  onBulkImportQuestions,
  activeSubMenu
}: ToolsModuleProps) {
  const [jsonText, setJsonText] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [backupSuccess, setBackupSuccess] = useState(false);

  const handleBackup = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullState, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "cbt_system_full_backup.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      
      setBackupSuccess(true);
      setTimeout(() => setBackupSuccess(false), 3000);
    } catch {
      alert("Gagal melakukan backup.");
    }
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.topics && parsed.questions && parsed.participants) {
            onRestoreState(parsed);
            setImportStatus('success');
            setTimeout(() => setImportStatus('idle'), 3000);
          } else {
            setImportStatus('error');
          }
        } catch {
          setImportStatus('error');
        }
      };
    }
  };

  const handleExportQuestionsOnly = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(questions, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "bank_soal_export.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch {
      alert("Gagal mengexport bank soal.");
    }
  };

  const handleImportQuestionsOnly = () => {
    if (!jsonText.trim()) return;
    try {
      const parsed = JSON.parse(jsonText);
      if (Array.isArray(parsed)) {
        onBulkImportQuestions(parsed as Question[]);
        setImportStatus('success');
        setJsonText('');
        setTimeout(() => setImportStatus('idle'), 3000);
      } else {
        setImportStatus('error');
      }
    } catch {
      setImportStatus('error');
    }
  };

  const handlePrefillQuestionsJSON = () => {
    const sample = [
      {
        id: "Q-SAMPLE-" + Date.now(),
        topicId: "T03",
        text: "Apa nama mata uang resmi negara Jepang?",
        type: "pilihan_ganda",
        options: [
          { key: "A", text: "Yuan" },
          { key: "B", text: "Yen" },
          { key: "C", text: "Won" },
          { key: "D", text: "Ringgit" },
          { key: "E", text: "Dollar" }
        ],
        correctAnswer: "B",
        points: 20
      }
    ];
    setJsonText(JSON.stringify(sample, null, 2));
  };

  switch (activeSubMenu) {
    case 'backup_data':
      return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2 mb-2">
            <Database className="h-5 w-5 text-indigo-600" />
            Backup & Restore Data Sistem
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Amankan seluruh konfigurasi CBT Anda termasuk bank soal, database siswa, daftar grup, dan rekap nilai dalam format JSON tunggal.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-slate-150 rounded-xl p-6 bg-slate-50 space-y-4">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <FileDown className="h-4.5 w-4.5 text-indigo-600" />
                Amankan Cadangan Baru (Backup)
              </h3>
              <p className="text-xs text-slate-600">
                Mengekspor seluruh database offline ke komputer Anda. File ini dapat di-import kembali sewaktu-waktu jika perangkat Anda berpindah atau tereset.
              </p>
              
              {backupSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                  <Check className="h-4 w-4" /> Berhasil mendownload file cadangan!
                </div>
              )}

              <button
                onClick={handleBackup}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg flex items-center gap-2 transition-all shadow-sm"
              >
                <Download className="h-4 w-4" /> Download Cadangan Sistem (.json)
              </button>
            </div>

            <div className="border border-slate-150 rounded-xl p-6 bg-slate-50 space-y-4">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <FileUp className="h-4.5 w-4.5 text-amber-600" />
                Pulihkan dari Cadangan (Restore)
              </h3>
              <p className="text-xs text-slate-600">
                Pilih file cadangan JSON yang sebelumnya pernah didownload untuk memulihkan seluruh keadaan sistem secara instan.
              </p>

              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreBackup}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
              </div>

              {importStatus === 'success' && (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                  <Check className="h-4 w-4" /> Database berhasil dipulihkan secara penuh!
                </div>
              )}
              {importStatus === 'error' && (
                <div className="p-3 bg-red-50 text-red-800 rounded-lg text-xs font-semibold">
                  Gagal memulihkan database. Format berkas tidak kompatibel atau rusak.
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="text-xs text-amber-800 space-y-1">
              <p className="font-bold uppercase">Peringatan Penting Pemulihan (Restore):</p>
              <p>Proses pemulihan akan **MENULIS ULANG** seluruh data yang ada saat ini secara permanen. Pastikan Anda telah mengunduh backup yang sekarang sebelum melakukan restore.</p>
            </div>
          </div>
        </div>
      );

    case 'export_import_soal':
      return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <Database className="h-5 w-5 text-indigo-600" />
                Export Import Soal
              </h2>
              <p className="text-sm text-slate-500">
                Pertukaran data bank soal antar server secara cepat dengan menyalin struktur objek JSON.
              </p>
            </div>
            <button
              onClick={handlePrefillQuestionsJSON}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition-all"
            >
              Masukkan Contoh Format
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-slate-150 rounded-xl p-5 space-y-4">
              <h3 className="font-bold text-sm text-slate-800">Export Bank Soal ({questions.length} Soal)</h3>
              <p className="text-xs text-slate-600">
                Mengunduh file berekstensi JSON yang hanya memuat seluruh soal ujian yang tersimpan pada sistem saat ini.
              </p>
              <button
                onClick={handleExportQuestionsOnly}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-all shadow-sm"
              >
                <Download className="h-4 w-4" /> Download Berkas Bank Soal
              </button>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-sm text-slate-800">Import Bank Soal</h3>
              <p className="text-xs text-slate-600">
                Tempel kode JSON array soal untuk disisipkan langsung ke bank soal sistem.
              </p>
              <textarea
                rows={6}
                placeholder='Masukkan JSON Array Soal...'
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                className="w-full p-3 font-mono text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
              ></textarea>

              {importStatus === 'success' && (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                  <Check className="h-4 w-4" /> Berhasil memasukkan soal baru!
                </div>
              )}
              {importStatus === 'error' && (
                <div className="p-3 bg-red-50 text-red-800 rounded-lg text-xs font-semibold">
                  Gagal import. Pastikan penulisan format JSON array Anda valid.
                </div>
              )}

              <button
                onClick={handleImportQuestionsOnly}
                disabled={!jsonText.trim()}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-55 text-white text-xs font-semibold rounded-lg transition-all shadow-sm"
              >
                Impor Data Soal
              </button>
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
}
