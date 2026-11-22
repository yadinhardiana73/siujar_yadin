/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ShieldCheck, Key, User, Building, Check, AlertTriangle, Eye, EyeOff, 
  RotateCcw, Lock, Info, Save
} from 'lucide-react';
import { AdminConfig } from '../types';

interface AdminProfileModuleProps {
  adminConfig?: AdminConfig;
  onUpdateAdminConfig: (newConfig: AdminConfig) => void;
}

export default function AdminProfileModule({
  adminConfig = {
    username: 'admin',
    passwordHash: 'admin',
    name: 'Proktor / Operator Utama',
    schoolName: 'SMA / SMK Negeri Mandiri'
  },
  onUpdateAdminConfig
}: AdminProfileModuleProps) {
  // Form values
  const [username, setUsername] = useState(adminConfig.username || 'admin');
  const [name, setName] = useState(adminConfig.name || 'Proktor / Operator Utama');
  const [schoolName, setSchoolName] = useState(adminConfig.schoolName || 'SMA / SMK Negeri Mandiri');
  
  // Password change values
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Password visibility toggles
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Status alerts
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Handle General Profile Update
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!username.trim()) {
      setErrorMsg('Username Proktor tidak boleh kosong.');
      return;
    }

    const updatedConfig: AdminConfig = {
      ...adminConfig,
      username: username.trim(),
      name: name.trim() || 'Proktor / Operator Utama',
      schoolName: schoolName.trim() || 'SMA / SMK Negeri Mandiri'
    };

    onUpdateAdminConfig(updatedConfig);
    setSuccessMsg('Informasi profil dan lembaga berhasil diperbarui.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Handle Password Change
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Check current password
    if (currentPasswordInput !== adminConfig.passwordHash) {
      setErrorMsg('Sandi proktor lama yang Anda masukkan tidak sesuai!');
      return;
    }

    if (!newPassword || newPassword.length < 4) {
      setErrorMsg('Sandi baru minimal harus terdiri dari 4 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Konfirmasi sandi baru tidak sama dengan sandi baru.');
      return;
    }

    const updatedConfig: AdminConfig = {
      ...adminConfig,
      passwordHash: newPassword
    };

    onUpdateAdminConfig(updatedConfig);
    setCurrentPasswordInput('');
    setNewPassword('');
    setConfirmPassword('');
    setSuccessMsg('Password Proktor / Admin berhasil diubah dan tersinkronisasi ke Cloud! Anda sekarang dapat login menggunakan sandi baru ini dari HP, tablet, maupun laptop lain.');
    setTimeout(() => setSuccessMsg(''), 6000);
  };

  // Reset to default
  const handleResetToDefault = () => {
    if (window.confirm('Apakah Anda yakin ingin mereset kredensial Proktor ke pengaturan awal (Username: admin, Password: admin)?')) {
      const defaultConfig: AdminConfig = {
        username: 'admin',
        passwordHash: 'admin',
        name: 'Proktor / Operator Utama',
        schoolName: schoolName || 'SMA / SMK Negeri Mandiri'
      };
      onUpdateAdminConfig(defaultConfig);
      setUsername('admin');
      setName('Proktor / Operator Utama');
      setCurrentPasswordInput('');
      setNewPassword('');
      setConfirmPassword('');
      setErrorMsg('');
      setSuccessMsg('Kredensial proktor berhasil direset kembali ke akun bawaan (admin/admin).');
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-emerald-950 rounded-2xl p-6 text-white border border-emerald-900/80 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-md text-[10px] font-bold uppercase tracking-wider">
              Keamanan Akun
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-1 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
            Pengaturan Akun &amp; Password Proktor
          </h1>
          <p className="text-emerald-200/80 text-xs mt-1 font-medium max-w-xl leading-relaxed">
            Anda dapat mengubah username, sandi keamanan Proktor/Admin, serta nama sekolah yang ditampilkan pada kartu peserta dan laporan ujian.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetToDefault}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold border border-slate-700 transition-all flex items-center gap-2 cursor-pointer shadow-xs shrink-0"
        >
          <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
          <span>Reset ke Default (admin/admin)</span>
        </button>
      </div>

      {/* Notification banners */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-800 font-semibold flex items-center gap-2.5 shadow-xs animate-in fade-in">
          <Check className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs text-red-800 font-semibold flex items-center gap-2.5 shadow-xs animate-in fade-in">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Grid: 2 Columns (Ubah Sandi & Profil Proktor) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        
        {/* FORM 1: GANTI PASSWORD PROKTOR */}
        <div className="bg-white rounded-2xl border border-emerald-100 shadow-xs p-6 space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <Key className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-sm text-slate-800">Ubah Sandi (Password) Proktor</h2>
                <p className="text-[11px] text-slate-500">Perbarui sandi akses administrator CBT</p>
              </div>
            </div>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-mono font-bold">
              Kredensial Aktif
            </span>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            
            {/* Input Sandi Lama */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Sandi Saat Ini (Lama)</span>
                <span className="text-[10px] text-slate-400 font-normal">Wajib verifikasi</span>
              </label>
              <div className="relative">
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  required
                  placeholder="Masukkan sandi lama..."
                  value={currentPasswordInput}
                  onChange={(e) => setCurrentPasswordInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showCurrentPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Input Sandi Baru */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">
                Sandi Baru
              </label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  placeholder="Masukkan sandi baru (min. 4 karakter)..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Input Konfirmasi Sandi Baru */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">
                Ulangi Sandi Baru
              </label>
              <div className="relative">
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  required
                  placeholder="Ketik ulang sandi baru..."
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showConfirmPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Lock className="h-4 w-4" /> Simpan Sandi Baru
            </button>
          </form>

          <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-150 text-[11px] text-emerald-800 flex items-start gap-2">
            <Info className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <p>
              Sandi proktor tersinkronisasi otomatis dengan database Cloud Firebase. Anda dapat login dari HP, tablet, maupun perangkat lain dengan sandi yang sama.
            </p>
          </div>
        </div>

        {/* FORM 2: IDENTITAS PROKTOR & LEMBAGA */}
        <div className="bg-white rounded-2xl border border-emerald-100 shadow-xs p-6 space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-800">Identitas Proktor &amp; Sekolah</h2>
              <p className="text-[11px] text-slate-500">Username login dan kop institusi ujian</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            
            {/* Input Username Admin */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Username Login Proktor</span>
                <span className="text-[10px] text-emerald-600 font-bold font-mono">Digunakan saat login</span>
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Contoh: admin"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden transition-all font-mono"
              />
            </div>

            {/* Input Nama Lengkap Proktor */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">
                Nama Lengkap Proktor / Operator
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Budi Santoso, S.Kom"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden transition-all"
              />
            </div>

            {/* Input Nama Lembaga / Sekolah */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Building className="h-3.5 w-3.5 text-slate-400" />
                <span>Nama Sekolah / Lembaga Penyelenggara</span>
              </label>
              <input
                type="text"
                required
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="Contoh: SMA Negeri 1 Mandiri"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Save className="h-4 w-4 text-emerald-400" /> Simpan Profil &amp; Nama Sekolah
            </button>
          </form>

          {/* Quick Summary Card */}
          <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs space-y-1.5">
            <p className="font-bold text-emerald-900">Ringkasan Akun Saat Ini:</p>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
              <div>
                <span className="text-slate-400 block">Username:</span>
                <span className="font-bold text-slate-800 font-mono">{adminConfig.username || 'admin'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Status Akun:</span>
                <span className="font-bold text-emerald-700">Administrator Utama</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block">Nama Sekolah:</span>
                <span className="font-bold text-slate-800">{adminConfig.schoolName || 'SMA / SMK Negeri Mandiri'}</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
