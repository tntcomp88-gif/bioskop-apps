import React, { useState } from 'react';
import { Shield, User, Lock, Mail, Phone, Sparkles, AlertCircle } from 'lucide-react';
import { generateJWT } from '../data';
import { User as UserType, AppBranding } from '../types';

import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface LoginScreenProps {
  onLoginSuccess: (token: string, user: UserType) => void;
  branding: AppBranding;
}

export default function LoginScreen({ onLoginSuccess, branding }: LoginScreenProps) {
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [isForgotPassword, setIsForgotPassword] = useState<boolean>(false);

  // Form State
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');

  // Status State
  const [error, setError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isAdminMode) {
      if (email === 'admin' && password === 'admin') {
        const adminUser: UserType = {
          id: 'admin-id',
          name: 'Administrator Cinema',
          email: 'admin@cineticket.com',
          role: 'admin',
          balance: 999999999,
          phone: '081234567890',
        };
        const token = generateJWT(adminUser);
        onLoginSuccess(token, adminUser);
      } else {
        setError('Kredensial Admin Salah (Gunakan admin / admin)');
      }
    } else {
      // Buyer Login Simulation
      if (!email || !password) {
        setError('Silakan masukan email dan password.');
        return;
      }

      try {
        const emailLower = email.toLowerCase();
        const userRef = doc(db, 'users', emailLower);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const uData = userSnap.data();
          const correctPassword = uData.password || 'budi123';
          
          if (password !== correctPassword) {
            setError('Sandi / Password yang Anda masukkan salah.');
            return;
          }

          const loggedInBuyer: UserType = {
            id: uData.id,
            name: uData.name,
            email: uData.email,
            role: uData.role,
            balance: uData.balance,
            phone: uData.phone || '',
          };

          const token = generateJWT(loggedInBuyer);
          onLoginSuccess(token, loggedInBuyer);
        } else if (emailLower === 'budi@gmail.com') {
          // Automatic online seeding fallback for Budi account
          const defaultBudi: UserType & { password?: string } = {
            id: 'buyer-1',
            name: 'Budi Santoso',
            email: 'budi@gmail.com',
            role: 'buyer',
            balance: 150000,
            phone: '081122334455',
            password: 'budi123'
          };
          await setDoc(userRef, defaultBudi);

          if (password !== 'budi123') {
            setError('Sandi / Password yang Anda masukkan salah.');
            return;
          }

          const token = generateJWT(defaultBudi);
          onLoginSuccess(token, defaultBudi);
        } else {
          setError('Pengguna tidak ditemukan. Silakan registrasi terlebih dahulu.');
        }
      } catch (err) {
        console.error("Online check failed, checking offline localStorage:", err);
        // Offline / fallback storage checking
        const savedUsersRaw = localStorage.getItem('cinema_registered_users');
        const registeredUsers: UserType[] = savedUsersRaw ? JSON.parse(savedUsersRaw) : [];
        const defaultBuyers: UserType[] = [
          { id: 'buyer-1', name: 'Budi Santoso', email: 'budi@gmail.com', role: 'buyer', balance: 150000, phone: '081122334455' },
        ];
        const allBuyers = [...defaultBuyers, ...registeredUsers];
        const match = allBuyers.find(u => u.email.toLowerCase() === email.toLowerCase());

        if (match) {
          const savedPasswordsRaw = localStorage.getItem('cinema_user_passwords');
          const passwords = savedPasswordsRaw ? JSON.parse(savedPasswordsRaw) : {};
          const correctPassword = passwords[email.toLowerCase()] || 'budi123';
          
          if (password !== correctPassword) {
            setError('Sandi / Password yang Anda masukkan salah.');
            return;
          }

          const token = generateJWT(match);
          onLoginSuccess(token, match);
        } else {
          setError('Pengguna tidak ditemukan atau offline check gagal.');
        }
      }
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!name || !email || !password || !phone) {
      setError('Semua kolom registrasi wajib diisi.');
      return;
    }

    try {
      const emailLower = email.toLowerCase();
      const userRef = doc(db, 'users', emailLower);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists() || emailLower === 'budi@gmail.com') {
        setError('Email ini sudah terdaftar.');
        return;
      }

      const newBuyer: UserType & { password?: string } = {
        id: `buyer-${Date.now()}`,
        name,
        email: emailLower,
        role: 'buyer',
        balance: 100000, // Initial balance
        phone,
        password: password
      };

      await setDoc(userRef, newBuyer);

      // Save to local storage for offline tolerance
      const savedUsersRaw = localStorage.getItem('cinema_registered_users');
      const registeredUsers: UserType[] = savedUsersRaw ? JSON.parse(savedUsersRaw) : [];
      registeredUsers.push({
        id: newBuyer.id,
        name: newBuyer.name,
        email: newBuyer.email,
        role: newBuyer.role,
        balance: newBuyer.balance,
        phone: newBuyer.phone,
      });
      localStorage.setItem('cinema_registered_users', JSON.stringify(registeredUsers));

      const savedPasswordsRaw = localStorage.getItem('cinema_user_passwords');
      const passwords = savedPasswordsRaw ? JSON.parse(savedPasswordsRaw) : {};
      passwords[emailLower] = password;
      localStorage.setItem('cinema_user_passwords', JSON.stringify(passwords));

      setSuccessMsg('Registrasi berhasil! Silakan login.');
      setIsRegistering(false);
      setEmail(newBuyer.email);
      setPassword('');
    } catch (err) {
      setError('Gagal registrasi online: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!email || !phone || !password) {
      setError('Silakan lengkapi seluruh kolom.');
      return;
    }

    try {
      const emailLower = email.toLowerCase();
      const userRef = doc(db, 'users', emailLower);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        setError('Akun dengan alamat email tersebut tidak ditemukan.');
        return;
      }

      const uData = userSnap.data();
      const storedPhoneClean = (uData.phone || '').replace(/[^0-9]/g, '') || '';
      const enteredPhoneClean = phone.replace(/[^0-9]/g, '');

      if (storedPhoneClean !== enteredPhoneClean) {
        setError('Verifikasi Keamanan Gagal! Nomor telepon konfirmasi tidak cocok.');
        return;
      }

      if (password.length < 6) {
        setError('Sandi baru Anda harus terdiri dari minimal 6 karakter.');
        return;
      }

      // Update password field
      const updatedUser = {
        ...uData,
        password: password
      };
      await setDoc(userRef, updatedUser);

      // Local storage sync as well
      const savedPasswordsRaw = localStorage.getItem('cinema_user_passwords');
      const passwordsKey = savedPasswordsRaw ? JSON.parse(savedPasswordsRaw) : {};
      passwordsKey[emailLower] = password;
      localStorage.setItem('cinema_user_passwords', JSON.stringify(passwordsKey));

      setSuccessMsg('Sandi berhasil diperbarui! Silakan masukkan sandi baru Anda untuk masuk.');
      setIsForgotPassword(false);
      setPassword('');
    } catch (err) {
      setError('Gagal memperbarui sandi secara online: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const autoFillBuyer = () => {
    setIsAdminMode(false);
    setIsRegistering(false);
    setIsForgotPassword(false);
    setEmail('budi@gmail.com');
    setPassword('budi123');
    setError('');
  };

  const autoFillAdmin = () => {
    setIsAdminMode(true);
    setIsRegistering(false);
    setIsForgotPassword(false);
    setEmail('admin');
    setPassword('admin');
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4 font-sans relative overflow-hidden">
      
      {/* Absolute Admin Logo/Button Top Right Corner as requested */}
      <div className="absolute top-6 right-6 z-20">
        <button
          type="button"
          onClick={() => {
            setIsAdminMode(!isAdminMode);
            setIsRegistering(false);
            setError('');
            setEmail('');
            setPassword('');
          }}
          className={`flex items-center gap-2 px-4 py-2 border rounded-full transition-all text-xs font-display font-medium tracking-wide ${
            isAdminMode 
              ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/10' 
              : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
          }`}
          title="Switch to Admin Portal"
        >
          <Shield className={`w-4 h-4 ${isAdminMode ? 'animate-pulse' : ''}`} />
          {isAdminMode ? 'Portal Admin Aktif' : 'Masuk sebagai Admin'}
        </button>
      </div>

      {/* Decorative ambient elements */}
      <div className="absolute -top-[10%] -left-[10%] w-[35%] h-[40%] rounded-full bg-blue-50 blur-3xl opacity-60 pointer-events-none" />
      <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[50%] rounded-full bg-amber-50 blur-3xl opacity-40 pointer-events-none" />

      {/* Main card box */}
      <div id="login-container-card" className="w-full max-w-md bg-white border border-slate-100 rounded-2xl p-8 sm:p-10 shadow-sm relative z-10 transition-all duration-300">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-sm font-bold text-white">
              {branding.appLogoChar}
            </div>
            <span className="font-display font-black text-xl tracking-tight text-slate-800">
              {branding.appName}
            </span>
            <span className="ml-2 px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] text-slate-400 font-mono tracking-tighter">JWT_AUTH_ACTIVE</span>
          </div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-slate-800">
            {isForgotPassword
              ? 'Atur Ulang Kata Sandi' 
              : isRegistering 
                ? 'Buat Akun Baru' 
                : isAdminMode 
                  ? 'Portal Administrator' 
                  : 'Selamat Datang Kembali'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isForgotPassword 
              ? 'Verifikasi no. telepon terdaftar Anda untuk mengatur ulang sandi'
              : isRegistering 
                ? 'Daftar sekarang untuk memesan tiket bioskop secara instan' 
                : isAdminMode 
                  ? 'Kelola jadwal, denah bioskop, film, & unduh laporan' 
                  : 'Solusi praktis nonton film favorit Anda di PWA Bioskop'}
          </p>
        </div>

        {/* Dynamic Alerts */}
        {error && (
          <div className="mb-6 p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-start gap-2 border border-red-100 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-3 bg-teal-50 text-teal-700 text-xs rounded-xl flex items-start gap-2 border border-teal-100 animate-fade-in">
            <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-teal-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* LOGIN, REGISTER, AND FORGOT PASSWORD FORMS */}
        {isForgotPassword ? (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">
                Alamat Email Terdaftar
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  placeholder="Contoh: budi@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:border-blue-900 focus:bg-white rounded-xl py-3 pl-11 pr-4 text-sm outline-none transition-all placeholder:text-slate-400"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">
                Nomor Telepon Konfirmasi
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 text-slate-400">
                  <Phone className="w-4 h-4" />
                </span>
                <input
                  type="tel"
                  placeholder="Contoh: 081122334455"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:border-blue-900 focus:bg-white rounded-xl py-3 pl-11 pr-4 text-sm outline-none transition-all placeholder:text-slate-400"
                  required
                />
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                * Demi perlindungan data, verifikasi no. telepon wajib dicocokkan dengan profil akun.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">
                Kata Sandi Baru
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  placeholder="Masukkan sandi baru minimal 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:border-blue-900 focus:bg-white rounded-xl py-3 pl-11 pr-4 text-sm outline-none transition-all placeholder:text-slate-400"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-display font-semibold shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer mt-6"
            >
              Simpan & Perbarui Sandi
            </button>

            <div className="text-center mt-6">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setError('');
                }}
                className="text-xs text-blue-900 font-semibold hover:underline cursor-pointer text-center"
              >
                Kembali ke Form Login
              </button>
            </div>
          </form>
        ) : !isRegistering ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">
                {isAdminMode ? 'Username Admin' : 'Alamat Email'}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 text-slate-400">
                  {isAdminMode ? <Shield className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                </span>
                <input
                  type={isAdminMode ? 'text' : 'email'}
                  placeholder={isAdminMode ? 'Misal: admin' : 'Contoh: budi@gmail.com'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:border-blue-900 focus:bg-white rounded-xl py-3 pl-11 pr-4 text-sm outline-none transition-all placeholder:text-slate-400"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Kata Sandi
                </label>
                {!isAdminMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setError('');
                      setSuccessMsg('');
                    }}
                    className="text-[11px] font-bold text-blue-900 hover:underline cursor-pointer"
                  >
                    Lupa Sandi?
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  placeholder={isAdminMode ? 'Misal: admin' : 'Masukkan password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:border-blue-900 focus:bg-white rounded-xl py-3 pl-11 pr-4 text-sm outline-none transition-all placeholder:text-slate-400"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-sm font-display font-semibold shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer mt-6"
            >
              Ubah Masuk
              <span>{isAdminMode ? 'Akses Admin' : 'Masuk Aplikasi'}</span>
            </button>

            {/* Simulated Toggle */}
            {!isAdminMode && (
              <div className="text-center mt-6">
                <p className="text-xs text-slate-400">
                  Belum punya akun?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegistering(true);
                      setError('');
                    }}
                    className="text-blue-900 font-semibold hover:underline cursor-pointer"
                  >
                    Daftar Sekarang
                  </button>
                </p>
              </div>
            )}
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">
                Nama Lengkap
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 text-slate-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Budi Santoso"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:border-blue-900 focus:bg-white rounded-xl py-3 pl-11 pr-4 text-sm outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">
                Email Pembeli
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  placeholder="budi@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:border-blue-900 focus:bg-white rounded-xl py-3 pl-11 pr-4 text-sm outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">
                Nomor Telepon
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 text-slate-400">
                  <Phone className="w-4 h-4" />
                </span>
                <input
                  type="tel"
                  placeholder="081122334455"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:border-blue-900 focus:bg-white rounded-xl py-3 pl-11 pr-4 text-sm outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">
                Password Akun
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  placeholder="Buat sandi minimal 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:border-blue-900 focus:bg-white rounded-xl py-3 pl-11 pr-4 text-sm outline-none transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-display font-semibold shadow-md transition-all active:scale-[0.98] cursor-pointer mt-6"
            >
              Mendaftar Akun Pembeli
            </button>

            <div className="text-center mt-6">
              <p className="text-xs text-slate-400">
                Sudah punya akun?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(false);
                    setError('');
                  }}
                  className="text-blue-900 font-semibold hover:underline cursor-pointer"
                >
                  Masuk Kembali
                </button>
              </p>
            </div>
          </form>
        )}

        {/* Demo Fast Sandbox Toggles (Required because of No Mock Data / Ease of Preview) */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-2">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 text-center">
            Pintasan Demo Instan (Dev-Tools)
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={autoFillBuyer}
              className="px-3 py-2 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-blue-900 rounded-lg text-left transition-all"
            >
              🔑 <span className="font-semibold text-[11px]">Budi (Pembeli)</span>
              <p className="text-[9px] text-slate-400 select-all font-mono">budi@gmail.com</p>
            </button>
            <button
              onClick={autoFillAdmin}
              className="px-3 py-2 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 text-amber-700 rounded-lg text-left transition-all"
            >
              ⚡ <span className="font-semibold text-[11px]">Admin Tiket</span>
              <p className="text-[9px] text-slate-400 font-mono">admin / admin</p>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
