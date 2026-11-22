/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { FolderOpen, FileText, Image, Music, Trash2, Upload, Search, CheckCircle } from 'lucide-react';
import { FileManagerFile } from '../types';

interface FileManagerProps {
  files: FileManagerFile[];
  onAddFile: (file: FileManagerFile) => void;
  onDeleteFile: (id: string) => void;
  selectMode?: boolean;
  onSelect?: (url: string) => void;
}

export default function FileManagerComponent({
  files,
  onAddFile,
  onDeleteFile,
  selectMode = false,
  onSelect
}: FileManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredFiles = files.filter(f =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (nativeFile: File) => {
    const sizeInMB = (nativeFile.size / (1024 * 1024)).toFixed(2);
    const sizeStr = parseFloat(sizeInMB) < 0.1 
      ? `${(nativeFile.size / 1024).toFixed(0)} KB` 
      : `${sizeInMB} MB`;

    let fileType: 'image' | 'audio' | 'document' = 'document';
    let url = '#';

    if (nativeFile.type.startsWith('image/')) {
      fileType = 'image';
      url = URL.createObjectURL(nativeFile);
    } else if (nativeFile.type.startsWith('audio/')) {
      fileType = 'audio';
    }

    const newFile: FileManagerFile = {
      id: 'FILE-' + Date.now(),
      name: nativeFile.name,
      size: sizeStr,
      type: fileType,
      url: url,
      uploadDate: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    onAddFile(newFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="h-6 w-6 text-emerald-500" />;
      case 'audio':
        return <Music className="h-6 w-6 text-amber-500" />;
      default:
        return <FileText className="h-6 w-6 text-indigo-500" />;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-indigo-600" />
            File Manager
          </h2>
          <p className="text-sm text-slate-500">
            Unggah dan kelola file pendukung soal seperti gambar, audio pendengaran (listening), atau dokumen cetak.
          </p>
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Cari file..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-64 pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        </div>
      </div>

      {/* Drag & Drop Area */}
      <div
        id="file-drop-area"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          dragActive 
            ? 'border-indigo-500 bg-indigo-50/50' 
            : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInput}
          className="hidden"
          accept="image/*,audio/*,.pdf,.doc,.docx"
        />
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="p-3 bg-indigo-50 rounded-full text-indigo-600">
            <Upload className="h-6 w-6" />
          </div>
          <div>
            <p className="font-medium text-slate-700">Tarik dan lepas file di sini, atau klik untuk memilih</p>
            <p className="text-xs text-slate-400 mt-1">Mendukung Gambar (PNG, JPG), Audio (MP3), atau Dokumen (PDF, Word)</p>
          </div>
        </div>
      </div>

      {/* Files List */}
      <div className="mt-8">
        <h3 className="text-sm font-medium text-slate-700 mb-4">Daftar File ({filteredFiles.length})</h3>
        {filteredFiles.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-100 rounded-xl bg-slate-25">
            <FolderOpen className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Belum ada file pendukung yang cocok atau diunggah.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredFiles.map((file) => (
              <div 
                key={file.id} 
                id={`file-card-${file.id}`}
                className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 hover:bg-white hover:shadow-md hover:border-indigo-100 transition-all flex flex-col justify-between"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-white rounded-lg border border-slate-100">
                    {getFileIcon(file.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-slate-800 truncate" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{file.size} &bull; {file.uploadDate}</p>
                  </div>
                </div>

                {file.type === 'image' && file.url && file.url !== '#' && (
                  <div className="mt-3 rounded-lg overflow-hidden border border-slate-100 bg-white h-24 flex items-center justify-center">
                    <img 
                      src={file.url} 
                      alt={file.name} 
                      className="max-h-full max-w-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                  {selectMode ? (
                    <button
                      onClick={() => onSelect && onSelect(file.type === 'image' ? file.url : file.name)}
                      className="px-3 py-1 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-600 text-xs font-semibold rounded-lg transition-all flex items-center gap-1"
                    >
                      <CheckCircle className="h-3 w-3" /> Pilih File
                    </button>
                  ) : (
                    <span className="text-xs font-mono text-slate-400 select-all">
                      {file.type === 'image' ? '[GAMBAR]' : '[AUDIO]'}: {file.name}
                    </span>
                  )}

                  <button
                    onClick={() => onDeleteFile(file.id)}
                    className="p-1.5 hover:bg-red-50 hover:text-red-600 text-slate-400 rounded-lg transition-all"
                    title="Hapus File"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
