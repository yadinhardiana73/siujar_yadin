/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Users, UserPlus, Key, Trash2, Edit2, Save, X, Search, Check } from 'lucide-react';
import { Teacher } from '../types';

interface TeachersModuleProps {
  teachers: Teacher[];
  onAddTeacher: (t: Omit<Teacher, 'id'>) => void;
  onUpdateTeacher: (id: string, updated: Partial<Teacher>) => void;
  onDeleteTeacher: (id: string) => void;
}

export default function TeachersModule({
  teachers,
  onAddTeacher,
  onUpdateTeacher,
  onDeleteTeacher
}: TeachersModuleProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form state
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [formError, setFormError] = useState('');

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newName.trim() || !newUsername.trim() || !newPassword.trim()) {
      setFormError('Semua kolom wajib diisi!');
      return;
    }

    // Check if username is already taken
    const exists = teachers.some(t => t.username.toLowerCase() === newUsername.trim().toLowerCase());
    if (exists) {
      setFormError('Username guru sudah digunakan oleh akun lain.');
      return;
    }

    onAddTeacher({
      name: newName.trim(),
      username: newUsername.trim(),
      passwordHash: newPassword
    });

    // Reset form
    setNewName('');
    setNewUsername('');
    setNewPassword('');
  };

  const handleStartEdit = (teacher: Teacher) => {
    setEditingId(teacher.id);
    setEditName(teacher.name);
    setEditUsername(teacher.username);
    setEditPassword(teacher.passwordHash);
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim() || !editUsername.trim() || !editPassword.trim()) {
      alert('Semua kolom wajib diisi!');
      return;
    }

    // Check if username is taken by other teacher
    const exists = teachers.some(t => t.id !== id && t.username.toLowerCase() === editUsername.trim().toLowerCase());
    if (exists) {
      alert('Username guru sudah digunakan oleh akun lain.');
      return;
    }

    onUpdateTeacher(id, {
      name: editName.trim(),
      username: editUsername.trim(),
      passwordHash: editPassword
    });

    setEditingId(null);
  };

  const handleDelete = (id: string, name: string) => {
    if (teachers.length <= 1) {
      alert('Minimal harus ada 1 akun guru aktif di sistem.');
      return;
    }
    if (confirm(`Apakah Anda yakin ingin menghapus akun guru "${name}"?`)) {
      onDeleteTeacher(id);
    }
  };

  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-indigo-600" />
          Pengaturan Akun Guru (Pendidik)
        </h2>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          Tambahkan atau edit akun Guru pendidik yang dapat masuk ke Sistem CBT ini untuk mengelola data modul (topik, bank soal, kriteria essay, dan file asset).
        </p>

        {/* Form Tambah Guru */}
        <form onSubmit={handleAdd} className="bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5 border-b border-slate-200 pb-2">
            <UserPlus className="h-4 w-4 text-indigo-600" /> Tambah Akun Guru Baru
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Nama Lengkap Guru</label>
              <input
                type="text"
                placeholder="Contoh: Dra. Sri Wahyuni"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Username Login</label>
              <input
                type="text"
                placeholder="username_guru"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Sandi (Password)</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Sandi"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  required
                />
              </div>
            </div>
          </div>

          {formError && (
            <p className="text-xs font-semibold text-red-600">{formError}</p>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg transition-all flex items-center gap-2 cursor-pointer h-10"
            >
              <UserPlus className="h-4 w-4" /> Tambah Guru
            </button>
          </div>
        </form>

        {/* Tabel Daftar Guru */}
        <div className="mt-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h3 className="text-sm font-semibold text-slate-700">Daftar Guru Terdaftar ({filteredTeachers.length})</h3>
            <div className="relative">
              <input
                type="text"
                placeholder="Cari guru..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-60"
              />
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full border-collapse text-left text-sm text-slate-500">
              <thead className="bg-slate-50 text-xs text-slate-700 uppercase font-semibold">
                <tr>
                  <th className="px-6 py-3">Nama Lengkap Guru</th>
                  <th className="px-6 py-3 w-48">Username</th>
                  <th className="px-6 py-3 w-48">Sandi</th>
                  <th className="px-6 py-3 w-28 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTeachers.map(t => {
                  const isEditing = editingId === t.id;
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-3 py-1 border border-indigo-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                          />
                        ) : (
                          <span>{t.name}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editUsername}
                            onChange={(e) => setEditUsername(e.target.value)}
                            className="w-full px-3 py-1 border border-indigo-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        ) : (
                          <span>{t.username}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            className="w-full px-3 py-1 border border-indigo-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                          />
                        ) : (
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-indigo-700 font-semibold">{t.passwordHash}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleSaveEdit(t.id)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer"
                                title="Simpan"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg transition-all cursor-pointer"
                                title="Batal"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleStartEdit(t)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"
                                title="Edit Akun Guru"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(t.id, t.name)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                title="Hapus Akun Guru"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredTeachers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-slate-400 font-medium">
                      Tidak ada akun guru yang ditemukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
