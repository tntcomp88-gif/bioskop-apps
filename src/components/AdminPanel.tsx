import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  User as UserIcon, Film, Calendar, Grid, Download, Plus, Trash2, 
  MapPin, Check, AlertCircle, Edit2, LogOut, Shield, ChevronRight, FileSpreadsheet, Sliders, Ticket, Coins,
  TrendingUp, TrendingDown, Users, FileText, RotateCcw
} from 'lucide-react';
import { Movie, Cinema, Schedule, Booking, User, AppBranding, Voucher } from '../types';
import { INITIAL_BOOKINGS } from '../data';

interface AdminPanelProps {
  currentUser: User;
  onLogout: () => void;
  movies: Movie[];
  setMovies: React.Dispatch<React.SetStateAction<Movie[]>>;
  cinemas: Cinema[];
  setCinemas: React.Dispatch<React.SetStateAction<Cinema[]>>;
  schedules: Schedule[];
  setSchedules: React.Dispatch<React.SetStateAction<Schedule[]>>;
  bookings: Booking[];
  vouchers: Voucher[];
  setVouchers: React.Dispatch<React.SetStateAction<Voucher[]>>;
  branding: AppBranding;
  setBranding: React.Dispatch<React.SetStateAction<AppBranding>>;
  onClearDatabase: () => Promise<void>;
  onSeedDatabase: () => Promise<void>;
}

export default function AdminPanel({
  currentUser,
  onLogout,
  movies,
  setMovies,
  cinemas,
  setCinemas,
  schedules,
  setSchedules,
  bookings,
  vouchers,
  setVouchers,
  branding,
  setBranding,
  onClearDatabase,
  onSeedDatabase
}: AdminPanelProps) {
  
  const [activeTab, setActiveTab ] = useState<'profile' | 'cinemas' | 'movies' | 'schedules' | 'reports' | 'financial' | 'vouchers' | 'app-settings' | 'coretax'>('cinemas');
  const [reportSubTab, setReportSubTab] = useState<'financial' | 'seats'>('financial');

  // Custom Billing States (Tax, Royalty, Operasional percentages)
  const [taxRate, setTaxRate] = useState<number>(() => {
    const saved = localStorage.getItem('cinema_billing_tax');
    return saved ? parseFloat(saved) : 10;
  });
  const [royaltyRate, setRoyaltyRate] = useState<number>(() => {
    const saved = localStorage.getItem('cinema_billing_royalty');
    return saved ? parseFloat(saved) : 50;
  });
  const [opexRate, setOpexRate] = useState<number>(() => {
    const saved = localStorage.getItem('cinema_billing_opex');
    return saved ? parseFloat(saved) : 20;
  });

  // Daily Financial Report target date (defaults to the demo's simulation date)
  const [selectedDailyReportDate, setSelectedDailyReportDate] = useState<string>('2026-05-26');
  
  // Selected detail panel for deposits or floating wallet
  const [selectedFinancialDetail, setSelectedFinancialDetail] = useState<'none' | 'deposits' | 'floating_wallet'>('none');
  
  // Success/Error Feedback State
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Profile data
  const [adminName, setAdminName] = useState<string>(currentUser.name);
  const [adminPhone, setAdminPhone] = useState<string>(currentUser.phone || '081234567890');
  const [adminEmail, setAdminEmail] = useState<string>(currentUser.email);

  // Cinema Editor State
  const [selectedCinemaId, setSelectedCinemaId] = useState<string>(cinemas[0]?.id || '');
  const [editCinemaName, setEditCinemaName] = useState<string>('');
  const [editCinemaRows, setEditCinemaRows] = useState<number>(8);
  const [editCinemaCols, setEditCinemaCols] = useState<number>(10);
  const [editAisleAfterCol, setEditAisleAfterCol] = useState<number>(0);
  const [editAisleAfterCol2, setEditAisleAfterCol2] = useState<number>(0);
  const [editAisleWidth, setEditAisleWidth] = useState<number>(1);
  const [brushMode, setBrushMode] = useState<'block' | 'remove'>('block');

  // Add New Cinema State
  const [newCinemaName, setNewCinemaName] = useState<string>('');
  const [newCinemaRows, setNewCinemaRows] = useState<number>(8);
  const [newCinemaCols, setNewCinemaCols] = useState<number>(10);

  // Add Movie Form State
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDirector, setNewDirector] = useState<string>('');
  const [newGenre, setNewGenre] = useState<string>('');
  const [newSynopsis, setNewSynopsis] = useState<string>('');
  const [newPoster, setNewPoster] = useState<string>('');
  const [newDiscountPercent, setNewDiscountPercent] = useState<number>(0);
  const [newIsB1G1, setNewIsB1G1] = useState<boolean>(false);

  // Add Schedule Form State
  const [schedMovieId, setSchedMovieId] = useState<string>('');
  const [schedCinemaId, setSchedCinemaId] = useState<string>('');
  const [schedTime, setSchedTime] = useState<string>('');
  const [schedPrice, setSchedPrice] = useState<number>(50000);

  // Voucher Management local state
  const [voucherAmount, setVoucherAmount] = useState<number>(50000);
  const [customVoucherAmount, setCustomVoucherAmount] = useState<string>('');
  const [voucherQuantity, setVoucherQuantity] = useState<number>(5);
  const [voucherFilter, setVoucherFilter] = useState<'all' | 'active' | 'redeemed'>('all');
  const [newVoucherType, setNewVoucherType] = useState<'topup' | 'discount'>('topup');
  const [newVoucherDiscountPercent, setNewVoucherDiscountPercent] = useState<number>(0);
  const [newVoucherTargetMovieId, setNewVoucherTargetMovieId] = useState<string>('');
  const [voucherSearch, setVoucherSearch] = useState<string>('');
  const [copiedCodeCode, setCopiedCodeCode] = useState<string | null>(null);
  const [printModalVouchers, setPrintModalVouchers] = useState<Voucher[] | null>(null);

  // CoreTax DJP System Simulator States
  const [coreTaxStatus, setCoreTaxStatus] = useState<'DRAFT' | 'API_TRANSMITTING' | 'SUBMITTED' | 'BILLING_PAYMENT' | 'PAID' | 'REPORTED'>(() => {
    const saved = localStorage.getItem('cinema_coretax_status');
    return (saved as any) || 'DRAFT';
  });
  const [coreTaxBillingCode, setCoreTaxBillingCode] = useState<string>(() => {
    return localStorage.getItem('cinema_coretax_billing_code') || '';
  });
  const [coreTaxNtpn, setCoreTaxNtpn] = useState<string>(() => {
    return localStorage.getItem('cinema_coretax_ntpn') || '';
  });
  const [coreTaxBpeHash, setCoreTaxBpeHash] = useState<string>(() => {
    return localStorage.getItem('cinema_coretax_bpe_hash') || '';
  });
  const [apiLogs, setApiLogs] = useState<string[]>([]);
  const [isApiLoading, setIsApiLoading] = useState<boolean>(false);
  const [coreTaxHistory, setCoreTaxHistory] = useState<{
    id: string;
    masaPajak: string;
    omzet: number;
    nominalPajak: number;
    billingCode: string;
    ntpn: string;
    bpeHash: string;
    timestamp: string;
  }[]>(() => {
    const saved = localStorage.getItem('cinema_coretax_history');
    return saved ? JSON.parse(saved) : [
      {
        id: "TAX-2026-04",
        masaPajak: "Masa Pajak April 2026",
        omzet: 24700000,
        nominalPajak: 2470000,
        billingCode: "820260429712345",
        ntpn: "B09C8765A231F459",
        bpeHash: "4f70fa0192eab890cdef6543b12399ff",
        timestamp: "2026-05-02T04:15:30.000Z"
      }
    ];
  });

  // Feedback timed dismisser
  const triggerFeedback = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Synchronize selectedCinemaId when cinemas list changes
  useEffect(() => {
    if (cinemas.length > 0) {
      const exists = cinemas.some(c => c.id === selectedCinemaId);
      if (!exists || !selectedCinemaId) {
        setSelectedCinemaId(cinemas[0].id);
      }
    } else {
      setSelectedCinemaId('');
      setEditCinemaName('');
    }
  }, [cinemas, selectedCinemaId]);

  // Cinema Editor Loader
  useEffect(() => {
    const currentCinema = cinemas.find(c => c.id === selectedCinemaId);
    if (currentCinema) {
      setEditCinemaName(currentCinema.name);
      setEditCinemaRows(currentCinema.rows);
      setEditCinemaCols(currentCinema.cols);
      setEditAisleAfterCol(currentCinema.aisleAfterCol || 0);
      setEditAisleAfterCol2(currentCinema.aisleAfterCol2 || 0);
      setEditAisleWidth(currentCinema.aisleWidth || 1);
    }
  }, [selectedCinemaId, cinemas]);

  // Set default additions selectors
  useEffect(() => {
    if (movies.length > 0 && !schedMovieId) setSchedMovieId(movies[0].id);
    if (cinemas.length > 0 && !schedCinemaId) setSchedCinemaId(cinemas[0].id);
  }, [movies, cinemas]);

  // 1. Save Admin Profile
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedUser = {
      ...currentUser,
      name: adminName,
      phone: adminPhone,
      email: adminEmail
    };
    localStorage.setItem('cinema_current_user', JSON.stringify(updatedUser));
    triggerFeedback('success', 'Profil admin berhasil diperbarui!');
  };

  // 2. Cinema Edit Save & Forbidden Seat Toggle
  const handleUpdateCinemaSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCinemaName.trim()) {
      triggerFeedback('error', 'Nama cinema tidak boleh kosong!');
      return;
    }

    setCinemas(prev => prev.map(c => {
      if (c.id === selectedCinemaId) {
        return {
          ...c,
          name: editCinemaName,
          rows: Number(editCinemaRows),
          cols: Number(editCinemaCols),
          aisleAfterCol: editAisleAfterCol > 0 ? Number(editAisleAfterCol) : undefined,
          aisleAfterCol2: editAisleAfterCol2 > 0 ? Number(editAisleAfterCol2) : undefined,
          aisleWidth: Number(editAisleWidth)
        };
      }
      return c;
    }));
    triggerFeedback('success', 'Pengaturan Cinema dan Dimensi berhasil disimpan!');
  };

  const handleCreateCinema = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCinemaName.trim()) {
      triggerFeedback('error', 'Nama cinema tidak boleh kosong!');
      return;
    }
    const newId = `cinema-${Date.now()}`;
    const newCinema: Cinema = {
      id: newId,
      name: newCinemaName.trim(),
      rows: Number(newCinemaRows),
      cols: Number(newCinemaCols),
      forbiddenSeats: [],
      removedSeats: [],
      aisleAfterCol: 0,
      aisleWidth: 1,
    };
    setCinemas(prev => [...prev, newCinema]);
    setSelectedCinemaId(newId);
    setNewCinemaName('');
    triggerFeedback('success', `Berhasil menambahkan Cinema Studio baru "${newCinema.name}"!`);
  };

  const handleDeleteCinema = (cinemaId: string) => {
    const cinemaOb = cinemas.find(c => c.id === cinemaId);
    if (!cinemaOb) return;
    const verified = confirm(`Apakah Anda yakin ingin menghapus "${cinemaOb.name}"? Tanyangan/jadwal film yang terhubung dengan studio ini mungkin akan ikut tidak valid.`);
    if (verified) {
      const remaining = cinemas.filter(c => c.id !== cinemaId);
      setCinemas(remaining);
      if (remaining.length > 0) {
        setSelectedCinemaId(remaining[0].id);
      } else {
        setSelectedCinemaId('');
      }
      triggerFeedback('success', `Berhasil menghapus studio "${cinemaOb.name}".`);
    }
  };

  const handleToggleSeatForbidden = (rowLetter: string, colNum: number) => {
    const seatId = `${rowLetter}-${colNum}`;
    setCinemas(prev => prev.map(c => {
      if (c.id === selectedCinemaId) {
        if (brushMode === 'block') {
          const isAlreadyBlocked = c.forbiddenSeats.includes(seatId);
          const updatedForbidden = isAlreadyBlocked
            ? c.forbiddenSeats.filter(s => s !== seatId)
            : [...c.forbiddenSeats, seatId];
          const updatedRemoved = (c.removedSeats || []).filter(s => s !== seatId);
          return {
            ...c,
            forbiddenSeats: updatedForbidden,
            removedSeats: updatedRemoved
          };
        } else {
          const isAlreadyRemoved = (c.removedSeats || []).includes(seatId);
          const updatedRemoved = isAlreadyRemoved
            ? (c.removedSeats || []).filter(s => s !== seatId)
            : [...(c.removedSeats || []), seatId];
          const updatedForbidden = c.forbiddenSeats.filter(s => s !== seatId);
          return {
            ...c,
            forbiddenSeats: updatedForbidden,
            removedSeats: updatedRemoved
          };
        }
      }
      return c;
    }));
  };

  // 3. Movie Management
  const handleAddMovie = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDirector || !newGenre || !newSynopsis) {
      triggerFeedback('error', 'Semua kolom detail film wajib diisi!');
      return;
    }

    // Default placeholder if none set
    const fallbackPoster = newPoster.trim() || `https://picsum.photos/seed/${encodeURIComponent(newTitle)}/300/400`;

    const newMovie: Movie = {
      id: `movie-${Date.now()}`,
      title: newTitle,
      director: newDirector,
      genre: newGenre,
      synopsis: newSynopsis,
      posterUrl: fallbackPoster,
      discountPercent: newDiscountPercent || 0,
      isB1G1: newIsB1G1
    };

    setMovies(prev => [...prev, newMovie]);
    triggerFeedback('success', `Film "${newTitle}" berhasil ditambahkan ke katalog bioskop bersama promo diskon ${newDiscountPercent}% & status B1G1!`);
    
    // Clear forms
    setNewTitle('');
    setNewDirector('');
    setNewGenre('');
    setNewSynopsis('');
    setNewPoster('');
    setNewDiscountPercent(0);
    setNewIsB1G1(false);
  };

  const handleDeleteMovie = (id: string) => {
    const isScheduled = schedules.some(s => s.movieId === id);
    if (isScheduled) {
      triggerFeedback('error', 'Film gagal dihapus karena sudah memiliki jadwal tayang aktif. Hapus jadwal tayangnya terlebih dahulu.');
      return;
    }
    const movieToDelete = movies.find(m => m.id === id);
    setMovies(prev => prev.filter(m => m.id !== id));
    triggerFeedback('success', `Film "${movieToDelete?.title}" berhasil dihapus.`);
  };

  // 4. Schedule Management
  const handleAddSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedMovieId || !schedCinemaId || !schedTime) {
      triggerFeedback('error', 'Silakan pilih film, cinema, dan tanggal tanyangan!');
      return;
    }

    const linkedMovie = movies.find(m => m.id === schedMovieId);
    const linkedCinema = cinemas.find(c => c.id === schedCinemaId);

    if (!linkedMovie || !linkedCinema) {
      triggerFeedback('error', 'Film atau Cinema tidak valid!');
      return;
    }

    const newSchedule: Schedule = {
      id: `sched-${Date.now()}`,
      movieId: schedMovieId,
      cinemaId: schedCinemaId,
      cinemaName: linkedCinema.name,
      showtime: schedTime,
      price: Number(schedPrice)
    };

    setSchedules(prev => [...prev, newSchedule]);
    triggerFeedback('success', `Jadwal baru berhasil ditambahkan untuk film "${linkedMovie.title}"!`);
  };

  const handleDeleteSchedule = (id: string) => {
    const hasBookings = bookings.some(b => b.scheduleId === id);
    if (hasBookings) {
      triggerFeedback('error', 'Jadwal tidak dapat dihapus karena sudah ada kursi yang dipesan pembeli!');
      return;
    }
    setSchedules(prev => prev.filter(s => s.id !== id));
    triggerFeedback('success', 'Jadwal berhasil dihapus.');
  };

  // Voucher Topup Logic Generators
  const handleGenerateVouchers = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = customVoucherAmount ? Number(customVoucherAmount) : voucherAmount;
    
    if (newVoucherType === 'topup' && (isNaN(finalAmount) || finalAmount <= 0)) {
      triggerFeedback('error', 'Silakan masukkan nominal voucher top-up yang valid (di atas Rp 0)!');
      return;
    }
    if (voucherQuantity < 1 || voucherQuantity > 100) {
      triggerFeedback('error', 'Jumlah voucher sekali cetak antara 1 s.d. 100 lembar!');
      return;
    }

    const generated: Voucher[] = [];
    const timestampStr = new Date().toISOString();
    
    // Generate secure randomized code
    const randSequence = () => {
      // Avoid confusing characters: O, 0, I, 1
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let res = '';
      for (let i = 0; i < 4; i++) {
        res += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return res;
    };

    for (let q = 0; q < voucherQuantity; q++) {
      const code = newVoucherType === 'topup'
        ? `TOPUP-${randSequence()}-${randSequence()}`
        : `DISKON-${randSequence()}-${randSequence()}`;
      generated.push({
        id: `vch-${Date.now()}-${q}-${Math.floor(Math.random() * 1000)}`,
        code,
        amount: newVoucherType === 'topup' ? finalAmount : (newVoucherDiscountPercent === 0 ? finalAmount : 0),
        isRedeemed: false,
        createdAt: timestampStr,
        type: newVoucherType,
        discountPercent: newVoucherType === 'discount' && newVoucherDiscountPercent > 0 ? newVoucherDiscountPercent : undefined,
        targetMovieId: newVoucherType === 'discount' && newVoucherTargetMovieId ? newVoucherTargetMovieId : undefined
      });
    }

    setVouchers(prev => [...generated, ...prev]);
    triggerFeedback('success', `Berhasil membuat ${voucherQuantity} voucher baru berjenis ${newVoucherType === 'topup' ? 'Top-up Kupon' : 'Kupon Sesi Diskon'}!`);
    setCustomVoucherAmount('');
  };

  const handleDeleteVoucher = (id: string) => {
    const vch = vouchers.find(v => v.id === id);
    if (vch && vch.isRedeemed) {
      triggerFeedback('error', 'Voucher yang sudah diredeem/dipakai oleh user tidak bisa dihapus guna menjaga riwayat audit keuangan!');
      return;
    }
    setVouchers(prev => prev.filter(v => v.id !== id));
    triggerFeedback('success', 'Voucher berhasil dibatalkan/dihapus.');
  };

  const handleCopyVoucherCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeCode(code);
    setTimeout(() => setCopiedCodeCode(null), 2000);
  };

  // Helper date calculators
  const getRowLetters = (rowsCount: number) => {
    const letters = [];
    for (let i = 0; i < rowsCount; i++) {
      letters.push(String.fromCharCode(65 + i)); // 65 is 'A'
    }
    return letters;
  };

  // 5. DATA DOWNLOADING ACCORDING TO SCREENING DATE BEING AT LEAST H-1
  // Today's simulated local time base is 2026-05-26
  const SIMULATED_TODAY = new Date('2026-05-26T00:00:00');

  const checkScheduleHMinus1 = (showtimeStr: string): { status: boolean; daysRemaining: number } => {
    const showtimeDate = new Date(showtimeStr);
    
    // Day difference logic
    // Set both to 00:00:00 for strict daily calculation
    const d1 = new Date(SIMULATED_TODAY.getFullYear(), SIMULATED_TODAY.getMonth(), SIMULATED_TODAY.getDate());
    const d2 = new Date(showtimeDate.getFullYear(), showtimeDate.getMonth(), showtimeDate.getDate());
    
    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // H-1 means the screening is tomorrow or later (diffDays >= 1)
    // If screening is today (diffDays = 0) or yesterday (diffDays < 0), then downloading is locked.
    return {
      status: diffDays >= 1,
      daysRemaining: diffDays
    };
  };

  // Standard Popup Print Window to Export Beautiful Corporate PDF
  const printHTML = (title: string, contentHTML: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      triggerFeedback('error', 'Gagal membuka jendela cetak. Pastikan pop-up dibolehkan di browser Anda.');
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #fff; color: #1e293b; padding: 40px; }
            h1, h2, h3 { font-family: 'Helvetica Neue', Arial, sans-serif; margin-bottom: 5px; }
            .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
            .title { font-size: 20px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: -0.5px; }
            .meta-info { font-size: 11px; color: #475569; line-height: 1.6; margin-top: 8px; }
            .logo { text-align: right; }
            .logo-text { font-size: 20px; font-weight: 900; color: #ea580c; letter-spacing: -0.5px; }
            .logo-sub { font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
            .card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
            .card-title { font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
            .card-val { font-size: 18px; font-weight: 800; color: #0f172a; }
            .card-desc { font-size: 10px; color: #64748b; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
            th { background-color: #f8fafc; text-transform: uppercase; font-size: 9px; font-weight: 800; color: #475569; padding: 10px 12px; border-bottom: 2px solid #e2e8f0; text-align: left; }
            td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
            .text-right { text-align: right; }
            .font-mono { font-family: monospace; font-size: 10px; }
            .footer { margin-top: 60px; text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
            @media print {
              body { padding: 10px; }
              @page { size: auto; margin: 15mm; }
            }
          </style>
        </head>
        <body>
          ${contentHTML}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 800);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const downloadReportCsv = (schedule: Schedule) => {
    const check = checkScheduleHMinus1(schedule.showtime);
    if (!check.status) {
      triggerFeedback('error', 'Unduhan laporan gagal! Hanya jadwal berstatus minimal H-1 dari tanggal tayang yang dapat diunduh.');
      return;
    }

    const linkedMovie = movies.find(m => m.id === schedule.movieId);
    const scheduleBookings = bookings.filter(b => b.scheduleId === schedule.id);

    if (scheduleBookings.length === 0) {
      triggerFeedback('error', 'Laporan diunduh kosong karena tidak ada pembeli yang memesan kursi untuk jadwal ini.');
      return;
    }

    // Compose CSV Content
    let csvRows = [];
    csvRows.push(['LAPORAN RESERVASI KURSI BIOSKOP']);
    csvRows.push([`Nama Cinema`, schedule.cinemaName]);
    csvRows.push([`Film`, linkedMovie?.title || 'Unknown Film']);
    csvRows.push([`Jadwal Tayang`, schedule.showtime.replace('T', ' ')]);
    csvRows.push([`Harga Tiket`, `Rp ${schedule.price.toLocaleString('id-ID')}`]);
    csvRows.push([`Tanggal Unduh`, SIMULATED_TODAY.toISOString().split('T')[0]]);
    csvRows.push([]); // blank spacing
    csvRows.push(['ID Pemesanan', 'Nama Pembeli', 'Kursi Dipesan', 'Jumlah Kursi', 'Total Bayar', 'Waktu Transaksi']);

    scheduleBookings.forEach(b => {
      csvRows.push([
        b.id,
        b.userName,
        b.seats.join('; '),
        b.seats.length,
        b.pricePaid,
        b.bookingDate.replace('T', ' ')
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' 
      + csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodedUri);
    downloadAnchor.setAttribute('download', `Laporan_Kursi_Bioskop_${schedule.id}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);

    triggerFeedback('success', `Laporan pemesanan kursi untuk "${linkedMovie?.title}" berhasil diunduh sebagai file .CSV!`);
  };

  const downloadReportExcel = (schedule: Schedule) => {
    const check = checkScheduleHMinus1(schedule.showtime);
    if (!check.status) {
      triggerFeedback('error', 'Unduhan laporan gagal! Hanya jadwal berstatus minimal H-1 dari tanggal tayang yang dapat diunduh.');
      return;
    }

    const linkedMovie = movies.find(m => m.id === schedule.movieId);
    const scheduleBookings = bookings.filter(b => b.scheduleId === schedule.id);

    if (scheduleBookings.length === 0) {
      triggerFeedback('error', 'Laporan diunduh kosong karena tidak ada pembeli yang memesan kursi untuk jadwal ini.');
      return;
    }

    const rows = [
      ['LAPORAN RESERVASI KURSI BIOSKOP'],
      ['Nama Cinema', schedule.cinemaName],
      ['Film', linkedMovie?.title || 'Unknown Film'],
      ['Jadwal Tayang', schedule.showtime.replace('T', ' ')],
      ['Harga Tiket', `Rp ${schedule.price.toLocaleString('id-ID')}`],
      ['Tanggal Unduh', SIMULATED_TODAY.toISOString().split('T')[0]],
      [],
      ['ID Pemesanan', 'Nama Pembeli', 'Kursi Dipesan', 'Jumlah Kursi', 'Total Bayar', 'Waktu Transaksi']
    ];

    scheduleBookings.forEach(b => {
      rows.push([
        b.id,
        b.userName,
        b.seats.join(', '),
        String(b.seats.length),
        `Rp ${b.pricePaid.toLocaleString('id-ID')}`,
        b.bookingDate.replace('T', ' ')
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reservasi Kursi");
    XLSX.writeFile(wb, `Laporan_Kursi_Bioskop_${schedule.id}.xlsx`);
    
    triggerFeedback('success', `Laporan pemesanan kursi berhasil diunduh sebagai file .XLSX!`);
  };

  const downloadReportPdf = (schedule: Schedule) => {
    const check = checkScheduleHMinus1(schedule.showtime);
    if (!check.status) {
      triggerFeedback('error', 'Cetak laporan gagal! Hanya jadwal berstatus minimal H-1 dari tanggal tayang yang dapat diunduh.');
      return;
    }

    const linkedMovie = movies.find(m => m.id === schedule.movieId);
    const scheduleBookings = bookings.filter(b => b.scheduleId === schedule.id);

    if (scheduleBookings.length === 0) {
      triggerFeedback('error', 'Laporan kosong karena tidak ada pembeli yang memesan kursi untuk jadwal ini.');
      return;
    }

    const contentHTML = `
      <div class="header">
        <div>
          <div class="title">LAPORAN RESERVASI KURSI BIOSKOP</div>
          <div class="meta-info">
            <strong>Jadwal ID:</strong> ${schedule.id}<br/>
            <strong>Cinema:</strong> ${schedule.cinemaName}<br/>
            <strong>Film:</strong> ${linkedMovie?.title || 'Unknown Film'}<br/>
            <strong>Waktu Tayang:</strong> ${schedule.showtime.replace('T', ' ')} WIB
          </div>
        </div>
        <div class="logo">
          <div class="logo-text">${branding.appName || 'Cinemas'}</div>
          <div class="logo-sub">Sistem Manajerial Bioskop</div>
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <div class="card-title">Harga Tiket</div>
          <div class="card-val">Rp ${schedule.price.toLocaleString('id-ID')}</div>
          <div class="card-desc">Tarif per bangku</div>
        </div>
        <div class="card">
          <div class="card-title">Jumlah Reservasi</div>
          <div class="card-val">${scheduleBookings.length} Transaksi</div>
          <div class="card-desc">Pemesanan tercatat</div>
        </div>
        <div class="card">
          <div class="card-title">Total Kursi Terisi</div>
          <div class="card-val">${scheduleBookings.reduce((sum, b) => sum + b.seats.length, 0)} Kursi</div>
          <div class="card-desc">Dari kapasitas total studio</div>
        </div>
      </div>

      <h3 style="margin-top: 30px; font-size: 13px; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Daftar Detail Pemesanan Kursi</h3>
      <table>
        <thead>
          <tr>
            <th>No</th>
            <th>ID Pemesanan</th>
            <th>Nama Pembeli</th>
            <th>Kursi</th>
            <th class="text-right">Kuantitas</th>
            <th class="text-right">Total Bayar</th>
            <th>Waktu Transaksi</th>
          </tr>
        </thead>
        <tbody>
          ${scheduleBookings.map((b, i) => `
            <tr>
              <td>${i + 1}</td>
              <td class="font-mono">${b.id}</td>
              <td><strong>${b.userName}</strong></td>
              <td class="font-mono">${b.seats.join(', ')}</td>
              <td class="text-right">${b.seats.length}</td>
              <td class="text-right font-mono">Rp ${b.pricePaid.toLocaleString('id-ID')}</td>
              <td>${b.bookingDate.replace('T', ' ')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        Laporan dicetak otomatis oleh ${branding.appName || 'Bioskop ERP'} pada ${new Date().toLocaleString('id-ID')} WIB
      </div>
    `;

    printHTML(`Laporan_Reservasi_Kursi_${schedule.id}`, contentHTML);
  };

  const selectedCinemaObj = cinemas.find(c => c.id === selectedCinemaId);

  // Filter Vouchers
  const filteredVouchers = vouchers.filter(vch => {
    const matchesSearch = vch.code.toLowerCase().includes(voucherSearch.toLowerCase());
    if (voucherFilter === 'active') {
      return matchesSearch && !vch.isRedeemed;
    }
    if (voucherFilter === 'redeemed') {
      return matchesSearch && vch.isRedeemed;
    }
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-16">
      
      {/* Top Admin Header Navbar */}
      <header className="bg-white border-b border-slate-150 text-slate-800 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-sm font-bold text-white shrink-0">
              {branding.appLogoChar}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-semibold text-[9px] tracking-wider uppercase text-blue-600">ADMINISTRATOR CORNER</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-sm animate-pulse" />
              </div>
              <h1 className="font-display font-bold text-base tracking-tight text-slate-800">
                {branding.appName} <span className="text-blue-600">Dashboard</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden md:block text-slate-400 text-xs font-medium">
              Administrator: <span className="bg-slate-100 px-2.5 py-1 text-slate-600 border border-slate-200 rounded-md font-mono text-[10px] font-bold">{currentUser.email}</span>
            </span>
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3.5 py-2 cursor-pointer bg-slate-100 hover:bg-slate-200 hover:text-red-600 transition-all text-xs font-semibold rounded-lg text-slate-600 border border-slate-200"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Admin Sidebar Navigation */}
          <nav className="lg:col-span-3 bg-white border border-slate-150 rounded-2xl p-4 space-y-1.5 shadow-sm">
            <div className="pb-3 border-b border-slate-100 mb-4 px-2">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Kategori Manajemen</p>
            </div>
            
            <button
              onClick={() => setActiveTab('cinemas')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-display text-sm font-medium ${
                activeTab === 'cinemas' 
                  ? 'bg-blue-900 border-l-4 border-amber-500 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Grid className="w-4 h-4 shrink-0" />
                <span>Denah & Nama Cinema</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 opacity-40" />
            </button>

            <button
              onClick={() => setActiveTab('movies')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-display text-sm font-medium ${
                activeTab === 'movies' 
                  ? 'bg-blue-900 border-l-4 border-amber-500 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Film className="w-4 h-4 shrink-0" />
                <span>Kelola Film</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 opacity-40" />
            </button>

            <button
              onClick={() => setActiveTab('schedules')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-display text-sm font-medium ${
                activeTab === 'schedules' 
                  ? 'bg-blue-900 border-l-4 border-amber-500 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 shrink-0" />
                <span>Kelola Jadwal</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 opacity-40" />
            </button>

             <button
              onClick={() => setActiveTab('reports')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-display text-sm font-medium ${
                activeTab === 'reports' 
                  ? 'bg-blue-900 border-l-4 border-amber-500 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Download className="w-4 h-4 shrink-0" />
                <span>Unduh Laporan (H-1)</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 opacity-40" />
            </button>

            <button
              onClick={() => setActiveTab('financial')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-display text-sm font-medium ${
                activeTab === 'financial' 
                  ? 'bg-blue-900 border-l-4 border-amber-500 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Coins className="w-4 h-4 shrink-0 text-emerald-550" />
                <span className="font-bold">Laporan Keuangan</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 opacity-40" />
            </button>

            <button
              onClick={() => setActiveTab('coretax')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-display text-sm font-medium ${
                activeTab === 'coretax' 
                  ? 'bg-blue-900 border-l-4 border-amber-500 text-white shadow-sm font-bold' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 shrink-0 text-red-500 animate-pulse" />
                <span className="font-bold">Simulasi CoreTax DJP</span>
              </span>
              <span className="bg-red-100 text-[8px] text-red-700 font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider scale-95">DJP API</span>
            </button>

            <button
              onClick={() => setActiveTab('vouchers')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-display text-sm font-medium ${
                activeTab === 'vouchers' 
                  ? 'bg-blue-900 border-l-4 border-amber-500 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Ticket className="w-4 h-4 shrink-0 text-amber-550" />
                <span className="font-bold">Kelola Voucher Top-up</span>
              </span>
              <span className="flex items-center gap-1.5">
                {vouchers.filter(v => !v.isRedeemed).length > 0 && (
                  <span className="bg-amber-450 text-[9px] text-slate-900 font-extrabold px-1.5 py-0.5 rounded-full">
                    {vouchers.filter(v => !v.isRedeemed).length}
                  </span>
                )}
                <ChevronRight className="w-3.5 h-3.5 opacity-40" />
              </span>
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-display text-sm font-medium ${
                activeTab === 'profile' 
                  ? 'bg-blue-900 border-l-4 border-amber-500 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <UserIcon className="w-4 h-4 shrink-0" />
                <span>Kelola Data Pribadi</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 opacity-40" />
            </button>

            <button
              onClick={() => setActiveTab('app-settings')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-display text-sm font-medium ${
                activeTab === 'app-settings' 
                  ? 'bg-blue-900 border-l-4 border-amber-500 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Sliders className="w-4 h-4 shrink-0" />
                <span>Pengaturan Aplikasi (Logo & Nama)</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 opacity-40" />
            </button>

          </nav>

          {/* Action Content Box */}
          <main className="lg:col-span-9 bg-white border border-slate-150 rounded-2xl p-6 sm:p-8 min-h-[550px] shadow-sm relative">

            {/* Timed Notification Feedback */}
            {feedback && (
              <div className={`mb-6 p-4 rounded-xl flex items-start gap-2.5 text-xs animate-fade-in border ${
                feedback.type === 'success' 
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                  : 'bg-red-50 border-red-100 text-red-800'
              }`}>
                {feedback.type === 'success' ? <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />}
                <span>{feedback.msg}</span>
              </div>
            )}

            {/* TAB CONTENT: DENAH BIOSKOP & CINEMAS DESIGNER */}
            {activeTab === 'cinemas' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="font-display text-xl font-bold tracking-tight text-slate-800">
                    Pengaturan Denah Lokasi Tempat Duduk & Nama Cinema
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Silakan pilih Cinema Room yang akan dimodifikasi, ubah nama, edit dimensi baris x kolom, dan klik kursi pada diagram grid di bawah untuk melarang / memblokir kursi dari penjualan (e.g. kursi rusak atau direservasi khusus).
                  </p>
                </div>

                {cinemas.length === 0 ? (
                  <div className="border border-dashed border-slate-350 rounded-2xl p-8 text-center bg-slate-50/50 space-y-4">
                    <Grid className="w-10 h-10 text-slate-300 mx-auto" />
                    <div>
                      <h3 className="font-display font-semibold text-sm text-slate-800">Cinema Studio Belum Tersedia</h3>
                      <p className="text-xs text-slate-450 mt-1 max-w-sm mx-auto">
                        Database studio cinema saat ini kosong karena database dikosongkan. Silakan muat contoh data awal bawaan sistem secara instan, atau buat studio baru untuk memulai.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await onSeedDatabase();
                            triggerFeedback('success', 'Berhasil memuat contoh data default!');
                          } catch (err) {
                            triggerFeedback('error', 'Gagal memuat contoh data: ' + String(err));
                          }
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-205 text-xs font-semibold px-4 py-2.5 rounded-lg cursor-pointer transition-all flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                        <span>Muat Contoh Data Default</span>
                      </button>
                    </div>

                    <div className="border-t border-slate-200/60 pt-6 mt-4">
                      <h4 className="font-display font-semibold text-xs text-slate-700 uppercase tracking-wider mb-3">Buat Studio Baru Manual</h4>
                      <form onSubmit={handleCreateCinema} className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto items-end">
                        <div className="text-left">
                          <label className="block text-[9px] font-bold text-slate-450 uppercase mb-1">Nama Studio</label>
                          <input
                            required
                            type="text"
                            value={newCinemaName}
                            onChange={(e) => setNewCinemaName(e.target.value)}
                            placeholder="E.g., Studio 1 Executive"
                            className="w-full bg-white border border-slate-200 py-2 px-2.5 text-xs rounded-lg outline-none focus:border-blue-900 font-sans"
                          />
                        </div>
                        <div className="text-left">
                          <label className="block text-[9px] font-bold text-slate-450 uppercase mb-1">Dimensi (Baris x Kolom)</label>
                          <div className="grid grid-cols-2 gap-1.5">
                            <input
                              required
                              type="number"
                              min={4}
                              max={12}
                              value={newCinemaRows}
                              onChange={(e) => setNewCinemaRows(Number(e.target.value))}
                              placeholder="Baris"
                              className="w-full bg-white border border-slate-200 py-2.5 px-1.5 text-center text-xs rounded-lg outline-none focus:border-blue-900 font-sans"
                            />
                            <input
                              required
                              type="number"
                              min={4}
                              max={16}
                              value={newCinemaCols}
                              onChange={(e) => setNewCinemaCols(Number(e.target.value))}
                              placeholder="Kolom"
                              className="w-full bg-white border border-slate-200 py-2.5 px-1.5 text-center text-xs rounded-lg outline-none focus:border-blue-900 font-sans"
                            />
                          </div>
                        </div>
                        <button
                          type="submit"
                          className="w-full py-2.5 bg-blue-900 hover:bg-blue-950 text-white rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Buat Studio</span>
                        </button>
                      </form>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Collapsible New Cinema Creator */}
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                      <details className="group">
                        <summary className="list-none flex items-center justify-between cursor-pointer font-display font-semibold text-xs text-slate-700 hover:text-slate-900 select-none">
                          <span className="flex items-center gap-1.5 focus:outline-none col-span-12">
                            <Plus className="w-4 h-4 text-blue-600 group-open:rotate-45 transition-transform" />
                            <span>BUAT STUDIO / CINEMA BARU</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal group-open:hidden">Klik untuk membuat studio baru +</span>
                          <span className="text-[10px] text-slate-400 font-normal hidden group-open:inline">Tutup formulir -</span>
                        </summary>
                        
                        <form onSubmit={handleCreateCinema} className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-4 pt-4 border-t border-slate-100 items-end">
                          <div className="md:col-span-4">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nama Studio Baru</label>
                            <input
                              required
                              type="text"
                              value={newCinemaName}
                              onChange={(e) => setNewCinemaName(e.target.value)}
                              placeholder="E.g., Studio 3 Ultra XD"
                              className="w-full bg-white border border-slate-205 py-2.5 px-3 text-xs rounded-lg outline-none focus:border-blue-900 font-sans"
                            />
                          </div>
                          <div className="md:col-span-3">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Jumlah Baris (4 - 12)</label>
                            <input
                              required
                              type="number"
                              min={4}
                              max={12}
                              value={newCinemaRows}
                              onChange={(e) => setNewCinemaRows(Number(e.target.value))}
                              className="w-full bg-white border border-slate-205 py-2.5 px-3 text-xs rounded-lg outline-none focus:border-blue-900 font-sans"
                            />
                          </div>
                          <div className="md:col-span-3">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Jumlah Kolom (4 - 16)</label>
                            <input
                              required
                              type="number"
                              min={4}
                              max={16}
                              value={newCinemaCols}
                              onChange={(e) => setNewCinemaCols(Number(e.target.value))}
                              className="w-full bg-white border border-slate-205 py-2.5 px-3 text-xs rounded-lg outline-none focus:border-blue-900 font-sans"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <button
                              type="submit"
                              className="w-full py-2.5 bg-blue-900 hover:bg-blue-950 text-white rounded-lg text-xs font-bold cursor-pointer active:scale-[0.98] transition-all flex items-center justify-center gap-1 shadow"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Tambah Studio</span>
                            </button>
                          </div>
                        </form>
                      </details>
                    </div>

                     {/* Selection & Name Input form */}
                <form onSubmit={handleUpdateCinemaSettings} className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Pilih Cinema Studio</label>
                      <select
                        value={selectedCinemaId}
                        onChange={(e) => setSelectedCinemaId(e.target.value)}
                        className="w-full bg-white border border-slate-200 py-2.5 px-3 text-xs rounded-lg outline-none focus:border-blue-900"
                      >
                        {cinemas.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Ubah Nama Cinema</label>
                      <input
                        type="text"
                        value={editCinemaName}
                        onChange={(e) => setEditCinemaName(e.target.value)}
                        className="w-full bg-white border border-slate-200 py-2.5 px-3 text-xs rounded-lg outline-none focus:border-blue-900 font-sans"
                        placeholder="Nama cinema"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Jumlah Baris (A-Z)</label>
                      <input
                        type="number"
                        min={4}
                        max={12}
                        value={editCinemaRows}
                        onChange={(e) => setEditCinemaRows(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 py-2.5 px-3 text-xs rounded-lg outline-none focus:border-blue-900 font-sans"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Kolom Ke Samping</label>
                      <input
                        type="number"
                        min={4}
                        max={16}
                        value={editCinemaCols}
                        onChange={(e) => setEditCinemaCols(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 py-2.5 px-3 text-xs rounded-lg outline-none focus:border-blue-900 font-sans"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-x-4 gap-y-3 pt-3 border-t border-slate-200/60 items-end">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                        <span>🚧 Sekat Jalan 1</span>
                        <span className="text-[9px] text-slate-400 font-normal lowercase">(0 = Tidak)</span>
                      </label>
                      <select
                        value={editAisleAfterCol}
                        onChange={(e) => setEditAisleAfterCol(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 py-2.5 px-2 text-xs rounded-lg outline-none focus:border-blue-900"
                      >
                        <option value={0}>Tidak Ada</option>
                        {Array.from({ length: editCinemaCols - 1 }).map((_, i) => (
                          <option key={i} value={i + 1}>Sel. Kolom {i + 1}</option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                        <span>🚧 Sekat Jalan 2</span>
                        <span className="text-[9px] text-slate-400 font-normal lowercase">(0 = Tidak)</span>
                      </label>
                      <select
                        value={editAisleAfterCol2}
                        onChange={(e) => setEditAisleAfterCol2(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 py-2.5 px-2 text-xs rounded-lg outline-none focus:border-blue-900"
                      >
                        <option value={0}>Tidak Ada</option>
                        {Array.from({ length: editCinemaCols - 1 }).map((_, i) => (
                          <option key={i} value={i + 1}>Sel. Kolom {i + 1}</option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        📏 Lebar Jalan
                      </label>
                      <select
                        value={editAisleWidth}
                        onChange={(e) => setEditAisleWidth(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 py-2.5 px-2 text-xs rounded-lg outline-none focus:border-blue-900"
                      >
                        <option value={1}>1 Kolom</option>
                        <option value={2}>2 Kolom</option>
                      </select>
                    </div>

                    <div className="md:col-span-3">
                      <button
                        type="submit"
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Check className="w-4 h-4" />
                        <span>Simpan Aturan</span>
                      </button>
                    </div>

                    <div className="md:col-span-3">
                      <button
                        type="button"
                        onClick={() => handleDeleteCinema(selectedCinemaId)}
                        disabled={!selectedCinemaId}
                        className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-650 border border-red-150 rounded-lg text-xs font-bold cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 disabled:opacity-40"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Hapus Studio</span>
                      </button>
                    </div>
                  </div>
                </form>

                {/* SEATING INTERACTIVE DESIGNER */}
                {selectedCinemaObj && (
                  <div className="border border-slate-100 rounded-xl p-6 bg-slate-50/50">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 gap-4 pb-4 border-b border-slate-100">
                      <div className="space-y-1">
                        <span className="text-[11px] font-display font-medium text-amber-650 bg-amber-50 px-2.5 py-1 border border-amber-100 rounded-full">
                          MODATOR DIAGRAM DESIGNER ({selectedCinemaObj.name})
                        </span>
                        <p className="text-[11px] text-slate-450 leading-relaxed max-w-md">
                          Atur tata letak baris kursi asimetris (tidak harus rata/full) dan kelola kursi rusak menggunakan kuas di kanan.
                        </p>
                      </div>

                      {/* Interactive Tool Switcher */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex bg-slate-200/60 p-1 rounded-lg border border-slate-200 text-[10px]">
                          <button
                            type="button"
                            onClick={() => setBrushMode('block')}
                            className={`px-2.5 py-1.5 rounded font-bold transition-all cursor-pointer ${
                              brushMode === 'block'
                                ? 'bg-white text-rose-700 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            🚫 Blokir / Rusak
                          </button>
                          <button
                            type="button"
                            onClick={() => setBrushMode('remove')}
                            className={`px-2.5 py-1.5 rounded font-bold transition-all cursor-pointer ${
                              brushMode === 'remove'
                                ? 'bg-white text-slate-705 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            🗑️ Hilangkan Kursi
                          </button>
                        </div>
                        
                        {/* Legend labels */}
                        <div className="flex items-center gap-3 text-[9px] text-slate-500 font-medium">
                          <div className="flex items-center gap-1">
                            <span className="w-3.5 h-3.5 bg-white border border-slate-200 rounded inline-block" />
                            <span>Tersedia</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-3.5 h-3.5 bg-red-500 border border-red-650 rounded inline-block" />
                            <span>Rusak</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-3.5 h-3.5 bg-slate-150-dot border border-dashed border-slate-300 rounded inline-block text-center text-[7px] leading-3 text-slate-400 bg-slate-50">·</span>
                            <span>Kosong</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Stage screen projection */}
                    <div className="w-2/3 mx-auto bg-slate-300 text-[10px] text-slate-600 font-display font-semibold tracking-widest text-center py-2 rounded-b-xl border-t border-slate-400 mb-10 shadow-sm uppercase">
                      LAYAR BIOSKOP / SCREEN PROJECTION
                    </div>

                    {/* Interactive Grid Seating Layout */}
                    <div className="w-full overflow-x-auto pb-4 no-scrollbar">
                      <div className="min-w-[400px] flex flex-col gap-2.5 justify-center items-center">
                        {getRowLetters(selectedCinemaObj.rows).map((rowLetter) => (
                          <div key={rowLetter} className="flex gap-2 items-center">
                            {/* Row label */}
                            <span className="w-5 text-center font-display font-bold text-xs text-slate-400 mr-2">{rowLetter}</span>
                                            {Array.from({ length: selectedCinemaObj.cols }).map((_, colIndex) => {
                               const colNum = colIndex + 1;
                               const seatId = `${rowLetter}-${colNum}`;
                               const isForbidden = selectedCinemaObj.forbiddenSeats.includes(seatId);
                               const isRemoved = (selectedCinemaObj.removedSeats || []).includes(seatId);

                               return (
                                 <React.Fragment key={seatId}>
                                   {((selectedCinemaObj.aisleAfterCol && colIndex === selectedCinemaObj.aisleAfterCol) || 
                                     (selectedCinemaObj.aisleAfterCol2 && colIndex === selectedCinemaObj.aisleAfterCol2)) && (
                                     <div 
                                       className={`h-8 select-none pointer-events-none shrink-0 ${
                                         selectedCinemaObj.aisleWidth === 2 ? 'w-14' : 'w-7'
                                       }`}
                                     />
                                   )}
                                   <button
                                     type="button"
                                     onClick={() => handleToggleSeatForbidden(rowLetter, colNum)}
                                     className={`w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-semibold transition-all cursor-pointer ${
                                       isRemoved
                                         ? 'bg-slate-50 text-slate-300 border border-dashed border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                                         : isForbidden 
                                           ? 'bg-red-500 text-white border border-red-650 hover:bg-red-600 shadow-sm' 
                                           : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-600 hover:text-blue-900 shadow-tiny'
                                     }`}
                                     title={`${rowLetter}-${colNum}: ${isRemoved ? 'Kosong' : isForbidden ? 'Diblokir' : 'Tersedia'}`}
                                   >
                                     {isRemoved ? '·' : colNum}
                                   </button>
                                 </React.Fragment>
                               );
                             })}
                            
                            {/* Row label trailing */}
                            <span className="w-5 text-center font-display font-bold text-xs text-slate-400 ml-2">{rowLetter}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-blue-50 text-blue-900 text-[11px] rounded-lg border border-blue-105 flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 shrink-0 text-blue-600" />
                      <div>
                        <strong>Info Real-time Denah:</strong> Total kursi terkonfigurasi di {selectedCinemaObj.name} adalah {selectedCinemaObj.rows * selectedCinemaObj.cols} unit. Dikurangi {selectedCinemaObj.forbiddenSeats.length} kursi rusak/diblokir. Tersedia <strong>{selectedCinemaObj.rows * selectedCinemaObj.cols - selectedCinemaObj.forbiddenSeats.length}</strong> kursi untuk penjualan tiket.
                      </div>
                    </div>

                  </div>
                )}
              </>
            )}
          </div>
        )}

            {/* TAB CONTENT: MANAGE MOVIES */}
            {activeTab === 'movies' && (
              <div className="space-y-8 animate-fade-in">
                <div>
                  <h2 className="font-display text-xl font-bold tracking-tight text-slate-800">
                    Manajemen Katalog Film Bioskop
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Tambah film baru lengkap dengan poster/foto film, sutradara, genre, dan sinopsisnya.
                  </p>
                </div>

                {/* Add Movie Form */}
                <form onSubmit={handleAddMovie} className="bg-slate-50 border border-slate-100 rounded-xl p-5 space-y-4">
                  <span className="text-[11px] font-display font-bold text-blue-900 uppercase tracking-widest block bg-blue-50 px-2.5 py-1.5 rounded-md w-max">
                    Tambah Film Baru
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-4">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Poster URL (Opsional)</label>
                      <input
                        type="url"
                        value={newPoster}
                        onChange={(e) => setNewPoster(e.target.value)}
                        className="w-full bg-white border border-slate-200 py-2.5 px-3 text-xs rounded-lg outline-none focus:border-blue-900"
                        placeholder="Contoh: https://images.com/g.png"
                      />
                      <p className="text-[9px] text-slate-400 mt-1">
                        Biarkan kosong untuk melahirkan poster otomatis berbasis Picsum AI!
                      </p>
                    </div>

                    <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Judul Film</label>
                        <input
                          type="text"
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          className="w-full bg-white border border-slate-200 py-2.5 px-3 text-xs rounded-lg outline-none focus:border-blue-900"
                          placeholder="Misal: Si Pitung Menembus Badai"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Genre</label>
                        <input
                          type="text"
                          value={newGenre}
                          onChange={(e) => setNewGenre(e.target.value)}
                          className="w-full bg-white border border-slate-200 py-2.5 px-3 text-xs rounded-lg outline-none focus:border-blue-900"
                          placeholder="Aksi / Drama / Horor"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Sutradara/Director</label>
                      <input
                        type="text"
                        value={newDirector}
                        onChange={(e) => setNewDirector(e.target.value)}
                        className="w-full bg-white border border-slate-200 py-2.5 px-3 text-xs rounded-lg outline-none focus:border-blue-900"
                        placeholder="Nama Sutradara"
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-amber-600 uppercase mb-1 flex items-center gap-1">
                        <span>🏷 Promo Diskon</span>
                        <span className="text-[9px] text-slate-400 font-normal">%</span>
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={90}
                        value={newDiscountPercent || ''}
                        onChange={(e) => setNewDiscountPercent(e.target.value ? Math.min(90, Math.max(0, Number(e.target.value))) : 0)}
                        className="w-full bg-white border border-slate-200 py-2.5 px-3 text-xs rounded-lg font-bold font-mono outline-none focus:border-blue-900"
                        placeholder="0 (Tanpa Promo)"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-emerald-600 uppercase mb-1 flex items-center gap-1">
                        <span>🎟 Promo B1G1</span>
                      </label>
                      <select
                        value={newIsB1G1 ? 'true' : 'false'}
                        onChange={(e) => setNewIsB1G1(e.target.value === 'true')}
                        className="w-full bg-white border border-slate-200 py-2.5 px-2 text-xs rounded-lg font-bold outline-none focus:border-blue-900"
                      >
                        <option value="false">Nonaktif</option>
                        <option value="true">Aktif (B1G1)</option>
                      </select>
                    </div>

                    <div className="md:col-span-5">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Sinopsis Ringkas</label>
                      <textarea
                        value={newSynopsis}
                        onChange={(e) => setNewSynopsis(e.target.value)}
                        className="w-full h-11 bg-white border border-slate-200 py-1.5 px-3 text-xs rounded-lg outline-none focus:border-blue-900"
                        placeholder="Masukan ringkasan jalan cerita film secara menarik..."
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold cursor-pointer active:scale-[0.98] transition-all ml-auto.0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Daftarkan Film</span>
                  </button>
                </form>

                {/* Film Listings */}
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">Daftar Film Aktif ({movies.length})</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {movies.map(m => (
                      <div key={m.id} className="p-4 border border-slate-150 rounded-xl flex gap-4 hover:border-slate-300 transition-all">
                        <img
                          src={m.posterUrl}
                          alt={m.title}
                          className="w-16 h-22 object-cover rounded bg-slate-100 flex-shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-grow min-w-0">
                          <div className="flex flex-wrap gap-1.5 items-center mb-1.5">
                            <span className="text-[9px] bg-blue-50 text-blue-900 font-bold px-2 py-0.5 rounded-full inline-block">
                              {m.genre}
                            </span>
                            {m.discountPercent ? (
                              <span className="text-[9px] bg-amber-500 text-white font-bold px-1.5 py-0.5 rounded-full inline-block animate-pulse">
                                PROMO -{m.discountPercent}% OFF
                              </span>
                            ) : null}
                            {m.isB1G1 ? (
                              <span className="text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded-full inline-block">
                                BUY 1 GET 1
                              </span>
                            ) : null}
                          </div>
                          <h4 className="font-display font-semibold text-xs text-slate-800 truncate" title={m.title}>{m.title}</h4>
                          <p className="text-[10px] text-slate-500 font-medium mt-0.5">Sutradara: {m.director}</p>
                          <p className="text-[10px] text-slate-400 line-clamp-2 mt-1">{m.synopsis}</p>
                          
                          {/* Live Movie Promo Controller */}
                          <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[9.5px] font-bold text-amber-600 uppercase tracking-wide">Set Promo Diskon:</span>
                              <div className="relative w-20">
                                <input
                                  type="number"
                                  min={0}
                                  max={90}
                                  placeholder="0"
                                  value={m.discountPercent || ''}
                                  onChange={(e) => {
                                    const val = e.target.value ? Math.min(90, Math.max(0, Number(e.target.value))) : 0;
                                    setMovies(prev => prev.map(movie => movie.id === m.id ? { ...movie, discountPercent: val } : movie));
                                    triggerFeedback('success', `Berhasil mengubah promo diskon film "${m.title}" menjadi ${val}%!`);
                                  }}
                                  className="w-full bg-slate-50 border border-slate-200 py-0.5 px-1.5 pr-5 text-center font-mono font-bold text-[10px] rounded-md outline-none focus:border-blue-900 focus:bg-white transition-all"
                                />
                                <span className="absolute right-1 top-0.5 font-bold text-slate-400 font-mono text-[9px]">%</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[9.5px] font-bold text-emerald-600 uppercase tracking-wide">Promo Buy 1 Get 1 (B1G1):</span>
                              <select
                                value={m.isB1G1 ? 'true' : 'false'}
                                onChange={(e) => {
                                  const val = e.target.value === 'true';
                                  setMovies(prev => prev.map(movie => movie.id === m.id ? { ...movie, isB1G1: val } : movie));
                                  triggerFeedback('success', `Berhasil mengubah status B1G1 film "${m.title}" menjadi ${val ? 'Aktif' : 'Nonaktif'}!`);
                                }}
                                className="bg-slate-50 border border-slate-200 py-0.5 px-1.5 text-center font-bold text-[10px] rounded-md outline-none focus:border-blue-900 focus:bg-white transition-all text-slate-700"
                              >
                                <option value="false">Nonaktif</option>
                                <option value="true">Aktif</option>
                              </select>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteMovie(m.id)}
                          className="p-1 px-1.5 bg-red-50 text-red-500 border border-red-100 hover:bg-red-500 hover:text-white rounded-lg transition-all self-start flex-shrink-0 cursor-pointer"
                          title="Hapus Film"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* TAB CONTENT: MANAGE SCHEDULES */}
            {activeTab === 'schedules' && (
              <div className="space-y-8 animate-fade-in">
                <div>
                  <h2 className="font-display text-xl font-bold tracking-tight text-slate-800">
                    Pembuatan & Manajemen Jadwal Bioskop
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Atur jadwal pemutaran film di cinema tertentu, atur jam dan tanggal main, serta harga tiket masuk.
                  </p>
                </div>

                {/* Add Schedule Form */}
                <form onSubmit={handleAddSchedule} className="bg-slate-50 border border-slate-100 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                  <div className="sm:col-span-12 pb-1 border-b border-slate-100 mb-1">
                    <span className="text-[11px] font-display font-bold text-blue-900 uppercase tracking-widest block bg-blue-50 px-2.5 py-1.5 rounded-md w-max">
                      Rilis Jadwal Baru
                    </span>
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Pilih Film</label>
                    <select
                      value={schedMovieId}
                      onChange={(e) => setSchedMovieId(e.target.value)}
                      className="w-full bg-white border border-slate-200 py-2.5 px-3 text-xs rounded-lg outline-none focus:border-blue-900"
                    >
                      {movies.map(m => (
                        <option key={m.id} value={m.id}>{m.title}</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Pilih Cinema Studio</label>
                    <select
                      value={schedCinemaId}
                      onChange={(e) => setSchedCinemaId(e.target.value)}
                      className="w-full bg-white border border-slate-200 py-2.5 px-3 text-xs rounded-lg outline-none focus:border-blue-900"
                    >
                      {cinemas.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Waktu & Tanggal Ambil</label>
                    <input
                      type="datetime-local"
                      value={schedTime}
                      onChange={(e) => setSchedTime(e.target.value)}
                      className="w-full bg-white border border-slate-200 py-2.5 px-3 text-xs rounded-lg outline-none focus:border-blue-900 font-sans"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Harga Tiket (Rp)</label>
                    <input
                      type="number"
                      min={10000}
                      step={5000}
                      value={schedPrice}
                      onChange={(e) => setSchedPrice(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 py-2.5 px-3 text-xs rounded-lg outline-none focus:border-blue-900 font-sans"
                      required
                    />
                  </div>

                  <div className="sm:col-span-12 flex justify-end pt-2">
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold cursor-pointer active:scale-[0.98] transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Publikasikan Jadwal</span>
                    </button>
                  </div>
                </form>

                {/* Schedules Table Grid */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase">Jadwal Aktif Terpublikasi ({schedules.length})</h3>
                  <div className="border border-slate-150 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs bg-white border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-150 font-display font-semibold text-slate-500 uppercase tracking-wider text-[9px] text-slate-400">
                          <th className="py-3 px-4">Film</th>
                          <th className="py-3 px-4">Cinema</th>
                          <th className="py-3 px-4">Tanggal & Jam</th>
                          <th className="py-3 px-4 text-right">Harga</th>
                          <th className="py-3 px-4 text-center">Tindakan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {schedules.map(s => {
                          const linkedMovie = movies.find(m => m.id === s.movieId);
                          return (
                            <tr key={s.id} className="hover:bg-slate-50/50">
                              <td className="py-3 px-4">
                                <span className="font-semibold text-slate-800">{linkedMovie?.title || 'Unknown Film'}</span>
                              </td>
                              <td className="py-3 px-4 text-slate-600">{s.cinemaName}</td>
                              <td className="py-3 px-4 text-slate-500 font-sans">
                                {s.showtime.replace('T', ' ')}
                              </td>
                              <td className="py-3 px-4 text-right text-amber-600 font-semibold font-mono">
                                Rp {s.price.toLocaleString('id-ID')}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <button
                                  onClick={() => handleDeleteSchedule(s.id)}
                                  className="p-1 px-2 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded transition-all cursor-pointer"
                                  title="Batalkan Jadwal"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
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

            {/* TAB CONTENT: REPORT DOWNLOADS WITH EXCLUSIVE H-1 */}
            {activeTab === 'reports' && (
              <div className="space-y-6 animate-fade-in text-slate-800">
                <div>
                  <h2 className="font-display text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-blue-900" />
                    <span>Unduh Data Pemesan Kursi Bioskop (H-1)</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Aturan Bisnis: Data prapemesanan kursi hanya dapat diunduh selama pemutaran film masih dalam status <strong>H-1 (minimal satu hari sebelum jam & tanggal tayang)</strong> dibandingkan waktu hari ini. Jadwal penayangan yang akan tayang hari ini (H-0) atau yang telah lampau akan dikunci demi validitas integrasi tiket masuk.
                  </p>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3 text-xs text-amber-800">
                  <FileSpreadsheet className="w-5 h-5 shrink-0 text-amber-500" />
                  <div>
                    <strong>Petunjuk Laporan:</strong> Format file yang diunduh adalah berkas data tabular `.CSV` yang kompatibel dengan Microsoft Excel, Google Sheets, atau modul backend pengolahan data admin.
                  </div>
                </div>

                {/* Schedules Reports Grid */}
                <div className="border border-slate-150 rounded-xl overflow-hidden mt-6">
                  <table className="w-full text-left text-xs bg-white border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 font-display font-semibold text-slate-500 uppercase tracking-wider text-[9px] text-slate-400">
                        <th className="py-3.5 px-4">Film</th>
                        <th className="py-3.5 px-4">Cinema</th>
                        <th className="py-3.5 px-4">Tanggal Tayang</th>
                        <th className="py-3.5 px-4 text-center">Status Unduh</th>
                        <th className="py-3.5 px-4 text-right">Aksi Ekspor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {schedules.map(s => {
                        const linkedMovie = movies.find(m => m.id === s.movieId);
                        const { status: canDownload, daysRemaining } = checkScheduleHMinus1(s.showtime);
                        const scheduleBookingsCount = bookings.filter(b => b.scheduleId === s.id).length;

                        return (
                          <tr key={s.id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-4">
                              <span className="font-semibold text-slate-800 block">{linkedMovie?.title || 'Unknown Film'}</span>
                              <span className="text-[10px] text-slate-400 font-mono">ID: {s.id}</span>
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              <span>{s.cinemaName}</span>
                            </td>
                            <td className="py-3 px-4 text-slate-500 font-sans">
                              {s.showtime.replace('T', ' ')}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {canDownload ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-teal-50 border border-teal-100 text-teal-700 text-[10px] rounded-full font-bold">
                                  H-{daysRemaining} (Tersedia)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border border-red-100 text-red-700 text-[10px] rounded-full font-bold">
                                  Terkunci (H-0 / Lampau)
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex flex-wrap items-center justify-end gap-1.55">
                                <button
                                  onClick={() => downloadReportCsv(s)}
                                  disabled={!canDownload}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-black rounded-lg border transition-all ${
                                    canDownload
                                      ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 cursor-pointer'
                                      : 'bg-slate-50 text-slate-350 cursor-not-allowed border-slate-250'
                                  }`}
                                  title={canDownload ? 'Ekspor .CSV' : 'Terkunci'}
                                >
                                  <FileText className="w-3 h-3 text-blue-600" />
                                  <span>CSV</span>
                                </button>
                                <button
                                  onClick={() => downloadReportExcel(s)}
                                  disabled={!canDownload}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-black rounded-lg border transition-all ${
                                    canDownload
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 cursor-pointer'
                                      : 'bg-slate-50 text-slate-350 cursor-not-allowed border-slate-250'
                                  }`}
                                  title={canDownload ? 'Ekspor .XLSX' : 'Terkunci'}
                                >
                                  <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                                  <span>Excel</span>
                                </button>
                                <button
                                  onClick={() => downloadReportPdf(s)}
                                  disabled={!canDownload}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-black rounded-lg border transition-all ${
                                    canDownload
                                      ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 cursor-pointer'
                                      : 'bg-slate-50 text-slate-350 cursor-not-allowed border-slate-250'
                                  }`}
                                  title={canDownload ? 'Cetak PDF' : 'Terkunci'}
                                >
                                  <Download className="w-3 h-3 text-red-600" />
                                  <span>PDF</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT: NEW DEDICATED FINANCIAL REPORTS PANEL */}
            {activeTab === 'financial' && (() => {
              // Convert default users & registers to synchronized array for accurate audits
              const getLiveUsers = (): User[] => {
                const defaults: User[] = [
                  { id: 'buyer-1', name: 'Budi Santoso', email: 'budi@gmail.com', role: 'buyer', balance: 150000, phone: '081122334455' }
                ];
                
                const savedRaw = localStorage.getItem('cinema_registered_users');
                const registered: User[] = savedRaw ? JSON.parse(savedRaw) : [];
                
                const all = [...defaults];
                registered.forEach(r => {
                  if (!all.some(u => u.id === r.id || u.email === r.email)) {
                    all.push(r);
                  }
                });

                const currentRaw = localStorage.getItem('cinema_current_user');
                if (currentRaw) {
                  const curr: User = JSON.parse(currentRaw);
                  const idx = all.findIndex(u => u.id === curr.id);
                  if (idx !== -1) {
                    all[idx] = curr;
                  }
                }
                
                return all;
              };

              const liveUsers = getLiveUsers();

              // Total ticket revenue from bookings
              const totalRevenueTickets = bookings.reduce((sum, b) => sum + b.pricePaid, 0);
              const totalUserBalances = liveUsers.reduce((sum, u) => sum + u.balance, 0);

              // Promo starting credit benchmark: Budi (0) = 0. Registrants default = 100k
              const promoBaseline = 0 + (liveUsers.filter(u => u.id !== 'buyer-1').length * 100000);

              // Physical Cash Voucher collections
              const totalVoucherRedeemedValue = vouchers.filter(v => v.isRedeemed).reduce((sum, v) => sum + v.amount, 0);

              // Simulated manual increases calculation
              const totalSimulatedDeposits = Math.max(0, (totalRevenueTickets + totalUserBalances) - promoBaseline - totalVoucherRedeemedValue);

              // Overall collected cash deposits
              const totalCashInflow = totalVoucherRedeemedValue + totalSimulatedDeposits;

              // Dynamic Calculations based on settings
              const calculatedTaxFee = totalRevenueTickets * (taxRate / 100);
              const calculatedRoyaltyFee = totalRevenueTickets * (royaltyRate / 100);
              const calculatedOpexFee = totalRevenueTickets * (opexRate / 100);

              // Profit margins
              const grossProfit = totalRevenueTickets - calculatedRoyaltyFee;
              const netProfit = totalRevenueTickets - calculatedTaxFee - calculatedRoyaltyFee - calculatedOpexFee;

              const totalMovieDiscounts = bookings.reduce((sum, b) => sum + (b.movieDiscountAmount || 0), 0);
              const totalB1G1Discounts = bookings.reduce((sum, b) => sum + (b.b1g1DiscountAmount || 0), 0);
              const totalVoucherDiscounts = bookings.reduce((sum, b) => sum + (b.voucherDiscountAmount || 0), 0);
              const totalInitialGrossRevenue = totalRevenueTickets + totalMovieDiscounts + totalB1G1Discounts + totalVoucherDiscounts;

              // Daily Financial Exporters (CSV, Excel, PDF)
              const handleDownloadDailyFinancialCsv = (targetDate: string) => {
                const dayBookings = bookings.filter(b => b.bookingDate.startsWith(targetDate));
                if (dayBookings.length === 0) {
                  triggerFeedback('error', `Tidak ada data transaksi penayangan untuk tanggal ${targetDate}`);
                  return;
                }

                const dayRevenue = dayBookings.reduce((sum, b) => sum + b.pricePaid, 0);
                const dayTax = dayRevenue * (taxRate / 100);
                const dayRoyalty = dayRevenue * (royaltyRate / 100);
                const dayOpex = dayRevenue * (opexRate / 100);
                const dayNetOfTaxRoyaltyOpex = dayRevenue - dayTax - dayRoyalty - dayOpex;

                let csvRows = [];
                csvRows.push(['LAPORAN KEUANGAN BIOSKOP HARIAN']);
                csvRows.push(['Tanggal Laporan', targetDate]);
                csvRows.push(['Waktu Ekspor', new Date().toLocaleString('id-ID')]);
                csvRows.push([]);
                csvRows.push(['PARAMETER PERSENTASE BIAYA']);
                csvRows.push(['Pajak PPN (%)', `${taxRate}%`]);
                csvRows.push(['Bagi Hasil Royalti (%)', `${royaltyRate}%`]);
                csvRows.push(['Biaya Operasional (%)', `${opexRate}%`]);
                csvRows.push([]);
                csvRows.push(['REKAPITULASI KEUANGAN HARIAN']);
                csvRows.push(['Total Tiket Terjual', dayBookings.length]);
                csvRows.push(['Total Omzet Tiket Kotor', `Rp ${dayRevenue.toLocaleString('id-ID')}`]);
                csvRows.push(['Estimasi Potongan Pajak', `Rp ${dayTax.toLocaleString('id-ID')}`]);
                csvRows.push(['Estimasi Potongan Royalti', `Rp ${dayRoyalty.toLocaleString('id-ID')}`]);
                csvRows.push(['Estimasi Potongan Operasional', `Rp ${dayOpex.toLocaleString('id-ID')}`]);
                csvRows.push(['Laba Bersih Akhir Harian', `Rp ${dayNetOfTaxRoyaltyOpex.toLocaleString('id-ID')}`]);
                csvRows.push([]);
                csvRows.push(['DAFTAR RECURRING RESERVASI TIKET']);
                csvRows.push(['ID Pemesanan', 'Waktu Transaksi', 'Judul Film', 'Cinema', 'Nama Pembeli', 'Kursi Dipesan', 'Harga Kotor Awal (Gross)', 'Potongan Diskon Film', 'Potongan B1G1 Gratis', 'Kode Voucher Checkout', 'Potongan Voucher Checkout', 'Harga Bersih Terbayar (Net Paid)', 'Pajak Hari ini', 'Royalti Hari ini', 'Operasional Hari ini', 'Laba Bersih']);

                dayBookings.forEach(b => {
                  const itemTax = b.pricePaid * (taxRate / 100);
                  const itemRoyalty = b.pricePaid * (royaltyRate / 100);
                  const itemOpex = b.pricePaid * (opexRate / 100);
                  const itemNet = b.pricePaid - itemTax - itemRoyalty - itemOpex;

                  const movieDiscount = b.movieDiscountAmount || 0;
                  const b1g1Discount = b.b1g1DiscountAmount || 0;
                  const voucherDiscount = b.voucherDiscountAmount || 0;
                  const originalCost = b.pricePaid + movieDiscount + b1g1Discount + voucherDiscount;
                  const voucherCode = b.voucherCodeUsed || '-';

                  csvRows.push([
                    b.id,
                    b.bookingDate.replace('T', ' '),
                    b.movieTitle,
                    b.cinemaName,
                    b.userName,
                    b.seats.join('; '),
                    originalCost,
                    movieDiscount,
                    b1g1Discount,
                    voucherCode,
                    voucherDiscount,
                    b.pricePaid,
                    itemTax,
                    itemRoyalty,
                    itemOpex,
                    itemNet
                  ]);
                });

                const csvContent = csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const blobUrl = URL.createObjectURL(blob);
                const downloadAnchor = document.createElement('a');
                downloadAnchor.setAttribute('href', blobUrl);
                downloadAnchor.setAttribute('download', `Laporan_Keuangan_Harian_${targetDate}.csv`);
                document.body.appendChild(downloadAnchor);
                downloadAnchor.click();
                document.body.removeChild(downloadAnchor);
                URL.revokeObjectURL(blobUrl);

                triggerFeedback('success', `Sukses mengunduh laporan keuangan harian ${targetDate} (.CSV)`);
              };

              const handleDownloadDailyFinancialExcel = (targetDate: string) => {
                const dayBookings = bookings.filter(b => b.bookingDate.startsWith(targetDate));
                if (dayBookings.length === 0) {
                  triggerFeedback('error', `Tidak ada data transaksi penayangan untuk tanggal ${targetDate}`);
                  return;
                }

                const dayRevenue = dayBookings.reduce((sum, b) => sum + b.pricePaid, 0);
                const dayTax = dayRevenue * (taxRate / 100);
                const dayRoyalty = dayRevenue * (royaltyRate / 100);
                const dayOpex = dayRevenue * (opexRate / 100);
                const dayNet = dayRevenue - dayTax - dayRoyalty - dayOpex;

                const rows = [
                  ['LAPORAN KEUANGAN BIOSKOP HARIAN'],
                  ['Tanggal Laporan', targetDate],
                  ['Waktu Ekspor', new Date().toLocaleString('id-ID')],
                  [],
                  ['PARAMETER PERSENTASE BIAYA'],
                  ['Pajak PPN (%)', `${taxRate}%`],
                  ['Bagi Hasil Royalti (%)', `${royaltyRate}%`],
                  ['Biaya Operasional (%)', `${opexRate}%`],
                  [],
                  ['REKAPITULASI KEUANGAN HARIAN'],
                  ['Total Tiket Terjual', dayBookings.length],
                  ['Total Omzet Tiket Kotor', `Rp ${dayRevenue.toLocaleString('id-ID')}`],
                  ['Estimasi Potongan Pajak', `Rp ${dayTax.toLocaleString('id-ID')}`],
                  ['Estimasi Potongan Royalti', `Rp ${dayRoyalty.toLocaleString('id-ID')}`],
                  ['Estimasi Potongan Operasional', `Rp ${dayOpex.toLocaleString('id-ID')}`],
                  ['Laba Bersih Akhir Harian', `Rp ${dayNet.toLocaleString('id-ID')}`],
                  [],
                  ['DAFTAR RECURRING RESERVASI TIKET'],
                  ['ID Pemesanan', 'Waktu Transaksi', 'Judul Film', 'Cinema', 'Nama Pembeli', 'Kursi Dipesan', 'Harga Kotor Awal (Gross)', 'Potongan Diskon Film', 'Potongan B1G1 Gratis', 'Kode Voucher Checkout', 'Potongan Voucher Checkout', 'Harga Bersih Terbayar (Net Paid)', 'Pajak Hari ini', 'Royalti Hari ini', 'Operasional Hari ini', 'Laba Bersih']
                ];

                dayBookings.forEach(b => {
                  const itemTax = b.pricePaid * (taxRate / 100);
                  const itemRoyalty = b.pricePaid * (royaltyRate / 100);
                  const itemOpex = b.pricePaid * (opexRate / 100);
                  const itemNet = b.pricePaid - itemTax - itemRoyalty - itemOpex;

                  const movieDiscount = b.movieDiscountAmount || 0;
                  const b1g1Discount = b.b1g1DiscountAmount || 0;
                  const voucherDiscount = b.voucherDiscountAmount || 0;
                  const originalCost = b.pricePaid + movieDiscount + b1g1Discount + voucherDiscount;
                  const voucherCode = b.voucherCodeUsed || '-';

                  rows.push([
                    b.id,
                    b.bookingDate.replace('T', ' '),
                    b.movieTitle,
                    b.cinemaName,
                    b.userName,
                    b.seats.join(', '),
                    `Rp ${originalCost.toLocaleString('id-ID')}`,
                    `Rp ${movieDiscount.toLocaleString('id-ID')}`,
                    `Rp ${b1g1Discount.toLocaleString('id-ID')}`,
                    voucherCode,
                    `Rp ${voucherDiscount.toLocaleString('id-ID')}`,
                    `Rp ${b.pricePaid.toLocaleString('id-ID')}`,
                    `Rp ${itemTax.toLocaleString('id-ID')}`,
                    `Rp ${itemRoyalty.toLocaleString('id-ID')}`,
                    `Rp ${itemOpex.toLocaleString('id-ID')}`,
                    `Rp ${itemNet.toLocaleString('id-ID')}`
                  ]);
                });

                const ws = XLSX.utils.aoa_to_sheet(rows);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Keuangan Harian");
                XLSX.writeFile(wb, `Laporan_Keuangan_Harian_${targetDate}.xlsx`);

                triggerFeedback('success', `Sukses mengunduh laporan keuangan harian ${targetDate} (.XLSX)`);
              };

              const handleDownloadDailyFinancialPdf = (targetDate: string) => {
                const dayBookings = bookings.filter(b => b.bookingDate.startsWith(targetDate));
                if (dayBookings.length === 0) {
                  triggerFeedback('error', `Tidak ada data transaksi penayangan untuk tanggal ${targetDate}`);
                  return;
                }

                const dayRevenue = dayBookings.reduce((sum, b) => sum + b.pricePaid, 0);
                const dayTax = dayRevenue * (taxRate / 100);
                const dayRoyalty = dayRevenue * (royaltyRate / 100);
                const dayOpex = dayRevenue * (opexRate / 100);
                const dayNet = dayRevenue - dayTax - dayRoyalty - dayOpex;

                const contentHTML = `
                  <div class="header">
                    <div>
                      <div class="title">LAPORAN KEUANGAN BIOSKOP HARIAN</div>
                      <div class="meta-info">
                        <strong>Tanggal Laporan:</strong> ${targetDate}<br/>
                        <strong>Waktu Ekspor:</strong> ${new Date().toLocaleString('id-ID')}<br/>
                        <strong>Pajak PPN:</strong> ${taxRate}% | <strong>Royalti:</strong> ${royaltyRate}% | <strong>Operasional:</strong> ${opexRate}%
                      </div>
                    </div>
                    <div class="logo">
                      <div class="logo-text">${branding.appName || 'Cinemas'}</div>
                      <div class="logo-sub">Divisi Eksekutif Keuangan</div>
                    </div>
                  </div>

                  <div class="grid">
                    <div class="card">
                      <div class="card-title">Kotor (Omzet Tiket)</div>
                      <div class="card-val" style="color: #2563eb;">Rp ${dayRevenue.toLocaleString('id-ID')}</div>
                      <div class="card-desc">Total ${dayBookings.length} tiket terjual</div>
                    </div>
                    <div class="card">
                      <div class="card-title">Potongan Kewajiban (Pajak + Royalti + Opex)</div>
                      <div class="card-val" style="color: #dc2626;">Rp ${(dayTax + dayRoyalty + dayOpex).toLocaleString('id-ID')}</div>
                      <div class="card-desc">Pajak: Rp ${dayTax.toLocaleString('id-ID')} | Royalti: Rp ${dayRoyalty.toLocaleString('id-ID')} | Opex: Rp ${dayOpex.toLocaleString('id-ID')}</div>
                    </div>
                    <div class="card">
                      <div class="card-title">Laba Bersih Akhir (Net Profit)</div>
                      <div style="color: ${dayNet >= 0 ? '#16a34a' : '#dc2626'};" class="card-val">Rp ${dayNet.toLocaleString('id-ID')}</div>
                      <div class="card-desc">Estimasi laba bersih harian</div>
                    </div>
                  </div>

                   <h3 style="margin-top:30px; border-bottom:1px solid #e2e8f0; padding-bottom:8px; font-size:13px; color:#1e293b;">Daftar Detail Transaksi Reservasi & Potongan Promo</h3>
                   <table>
                     <thead>
                       <tr>
                         <th>ID Pemesanan</th>
                         <th>Waktu</th>
                         <th>Film & Cinema</th>
                         <th>Nama Pembeli</th>
                         <th class="text-right">Harga Kotor</th>
                         <th class="text-right">Diskon Film</th>
                         <th class="text-right">B1G1 Gratis</th>
                         <th class="text-right">Voucher</th>
                         <th class="text-right" style="background-color:#f1f5f9;">Terbayar Bersih</th>
                         <th class="text-right">Pajak (${taxRate}%)</th>
                         <th class="text-right">Royalti (${royaltyRate}%)</th>
                         <th class="text-right">Bersih (Net)</th>
                       </tr>
                     </thead>
                     <tbody>
                       ${dayBookings.map(b => {
                         const itemTax = b.pricePaid * (taxRate / 100);
                         const itemRoyalty = b.pricePaid * (royaltyRate / 100);
                         const itemOpex = b.pricePaid * (opexRate / 100);
                         const itemNet = b.pricePaid - itemTax - itemRoyalty - itemOpex;

                         const movieDiscount = b.movieDiscountAmount || 0;
                         const b1g1Discount = b.b1g1DiscountAmount || 0;
                         const voucherDiscount = b.voucherDiscountAmount || 0;
                         const originalCost = b.pricePaid + movieDiscount + b1g1Discount + voucherDiscount;
                         const voucherCodeLabel = b.voucherCodeUsed ? `<span style="font-size:8px;color:#4f46e5;display:block;">[Code: ${b.voucherCodeUsed}]</span>` : '';

                         return `
                           <tr>
                             <td class="font-mono" style="font-size:10px;">${b.id}</td>
                             <td style="font-size:10px;">${b.bookingDate.split('T')[1]?.substring(0, 5) || b.bookingDate}</td>
                             <td>
                               <strong style="font-size:11px;">${b.movieTitle}</strong>
                               <div style="font-size:9px; color:#64748b;">${b.cinemaName} (Kursi: ${b.seats.join(', ')})</div>
                             </td>
                             <td style="font-size:11.5px;">${b.userName}</td>
                             <td class="text-right font-mono" style="color:#64748b;">Rp ${originalCost.toLocaleString('id-ID')}</td>
                             <td class="text-right font-mono" style="color:#dc2626;">-Rp ${movieDiscount.toLocaleString('id-ID')}</td>
                             <td class="text-right font-mono" style="color:#16a34a;">-Rp ${b1g1Discount.toLocaleString('id-ID')}</td>
                             <td class="text-right font-mono" style="color:#4f46e5;">
                               -Rp ${voucherDiscount.toLocaleString('id-ID')}
                               ${voucherCodeLabel}
                             </td>
                             <td class="text-right font-mono font-bold" style="background-color:#f8fafc; color:#0f172a;">Rp ${b.pricePaid.toLocaleString('id-ID')}</td>
                             <td class="text-right font-mono" style="color:#b91c1c;">Rp ${itemTax.toLocaleString('id-ID')}</td>
                             <td class="text-right font-mono" style="color:#b91c1c;">Rp ${itemRoyalty.toLocaleString('id-ID')}</td>
                             <td class="text-right font-mono" style="color:#15803d; font-weight: bold;">Rp ${itemNet.toLocaleString('id-ID')}</td>
                           </tr>
                         `;
                       }).join('')}
                     </tbody>
                   </table>

                  <div class="footer">
                    Laporan dicetak otomatis oleh ${branding.appName || 'Bioskop ERP'} pada ${new Date().toLocaleString('id-ID')} WIB
                  </div>
                `;

                printHTML(`Laporan_Keuangan_Harian_${targetDate}`, contentHTML);
              };

              // Consolidated Ledger Exporters (CSV, Excel, PDF)
              const handleDownloadConsolidatedCsv = () => {
                if (bookings.length === 0) {
                  triggerFeedback('error', 'Laporan kosong karena belum ada transaksi tiket sama sekali.');
                  return;
                }

                let csvRows = [];
                csvRows.push(['LAPORAN LABA RUGI KOMPREHENSIF KONSOLIDASI']);
                csvRows.push(['Waktu Ekspor', new Date().toLocaleString('id-ID')]);
                csvRows.push(['Parameter Pajak (%)', `${taxRate}%`]);
                csvRows.push(['Parameter Royalti (%)', `${royaltyRate}%`]);
                csvRows.push(['Parameter Operasional (%)', `${opexRate}%`]);
                csvRows.push([]);
                csvRows.push(['AKUMULASI POS LAPORAN LABA RUGI']);
                csvRows.push(['Total Nilai Penjualan Kotor (Face Value Tiket)', totalInitialGrossRevenue]);
                csvRows.push(['Total Potongan Diskon Film', totalMovieDiscounts]);
                csvRows.push(['Total Potongan Voucher Checkout', totalVoucherDiscounts]);
                csvRows.push(['Total Potongan Subsidi B1G1', totalB1G1Discounts]);
                csvRows.push(['Total Hasil Penjualan Bersih Realisasi (Paid)', totalRevenueTickets]);
                csvRows.push(['Total Potongan PPN', calculatedTaxFee]);
                csvRows.push(['Total Royalti Distributor', calculatedRoyaltyFee]);
                csvRows.push(['Total Operasional Staf/Studio', calculatedOpexFee]);
                csvRows.push(['Total Laba Bersih Konsolidasi', netProfit]);
                csvRows.push([]);
                csvRows.push(['KONTRIBUSI PENDAPATAN PER JUDUL FILM']);
                csvRows.push(['ID Film', 'Judul Film', 'Kategori', 'Tiket Terjual', 'Omzet Penjualan (Kotor)', 'Laba Bersih']);

                movies.forEach(m => {
                  const movieBookings = bookings.filter(b => b.movieTitle.toLowerCase().includes(m.title.toLowerCase()));
                  const totalMovieRevenue = movieBookings.reduce((sum, b) => sum + b.pricePaid, 0);
                  const totalMovieTickets = movieBookings.reduce((sum, b) => sum + b.seats.length, 0);
                  const movieRoyalty = totalMovieRevenue * (royaltyRate / 100);
                  const movieTax = totalMovieRevenue * (taxRate / 100);
                  const movieOpex = totalMovieRevenue * (opexRate / 100);
                  const movieNetProfit = totalMovieRevenue - movieRoyalty - movieTax - movieOpex;

                  csvRows.push([
                    m.id,
                    m.title,
                    m.genre || 'Film',
                    totalMovieTickets,
                    totalMovieRevenue,
                    movieNetProfit
                  ]);
                });

                const csvContent = 'data:text/csv;charset=utf-8,' 
                  + csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
                
                const encodedUri = encodeURI(csvContent);
                const downloadAnchor = document.createElement('a');
                downloadAnchor.setAttribute('href', encodedUri);
                downloadAnchor.setAttribute('download', 'Laporan_Laba_Rugi_Konsolidasi.csv');
                document.body.appendChild(downloadAnchor);
                downloadAnchor.click();
                document.body.removeChild(downloadAnchor);

                triggerFeedback('success', 'Sukses mengunduh laporan laba rugi konsolidasi (.CSV)');
              };

              const handleDownloadConsolidatedExcel = () => {
                if (bookings.length === 0) {
                  triggerFeedback('error', 'Laporan kosong karena belum ada transaksi tiket sama sekali.');
                  return;
                }

                const rows = [
                  ['LAPORAN LABA RUGI KOMPREHENSIF KONSOLIDASI'],
                  ['Waktu Ekspor', new Date().toLocaleString('id-ID')],
                  ['Parameter Pajak (%)', `${taxRate}%`],
                  ['Parameter Royalti (%)', `${royaltyRate}%`],
                  ['Parameter Operasional (%)', `${opexRate}%`],
                  [],
                  ['AKUMULASI POS LAPORAN LABA RUGI'],
                  ['Total Nilai Penjualan Kotor (Face Value Tiket)', `Rp ${totalInitialGrossRevenue.toLocaleString('id-ID')}`],
                  ['Total Potongan Diskon Film', `Rp ${totalMovieDiscounts.toLocaleString('id-ID')}`],
                  ['Total Potongan Voucher Checkout', `Rp ${totalVoucherDiscounts.toLocaleString('id-ID')}`],
                  ['Total Potongan Subsidi B1G1', `Rp ${totalB1G1Discounts.toLocaleString('id-ID')}`],
                  ['Total Hasil Penjualan Bersih Realisasi (Paid)', `Rp ${totalRevenueTickets.toLocaleString('id-ID')}`],
                  ['Total Potongan PPN', `Rp ${calculatedTaxFee.toLocaleString('id-ID')}`],
                  ['Total Royalti Distributor', `Rp ${calculatedRoyaltyFee.toLocaleString('id-ID')}`],
                  ['Total Operasional Staf/Studio', `Rp ${calculatedOpexFee.toLocaleString('id-ID')}`],
                  ['Total Laba Bersih Konsolidasi', `Rp ${netProfit.toLocaleString('id-ID')}`],
                  [],
                  ['KONTRIBUSI PENDAPATAN PER JUDUL FILM'],
                  ['ID Film', 'Judul Film', 'Tiket Terjual', 'Omzet Penjualan (Kotor)', 'Laba Bersih']
                ];

                movies.forEach(m => {
                  const movieBookings = bookings.filter(b => b.movieTitle.toLowerCase().includes(m.title.toLowerCase()));
                  const totalMovieRevenue = movieBookings.reduce((sum, b) => sum + b.pricePaid, 0);
                  const totalMovieTickets = movieBookings.reduce((sum, b) => sum + b.seats.length, 0);
                  const movieRoyalty = totalMovieRevenue * (royaltyRate / 100);
                  const movieTax = totalMovieRevenue * (taxRate / 100);
                  const movieOpex = totalMovieRevenue * (opexRate / 100);
                  const movieNetProfit = totalMovieRevenue - movieRoyalty - movieTax - movieOpex;

                  rows.push([
                    m.id,
                    m.title,
                    String(totalMovieTickets),
                    `Rp ${totalMovieRevenue.toLocaleString('id-ID')}`,
                    `Rp ${movieNetProfit.toLocaleString('id-ID')}`
                  ]);
                });

                const ws = XLSX.utils.aoa_to_sheet(rows);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Laba Rugi Konsolidasi");
                XLSX.writeFile(wb, 'Laporan_Laba_Rugi_Konsolidasi.xlsx');

                triggerFeedback('success', 'Sukses mengunduh laporan laba rugi konsolidasi (.XLSX)');
              };

              const handleDownloadConsolidatedPdf = () => {
                if (bookings.length === 0) {
                  triggerFeedback('error', 'Laporan kosong karena belum ada transaksi tiket sama sekali.');
                  return;
                }

                const contentHTML = `
                  <div class="header">
                    <div>
                      <div class="title">LAPORAN LABA RUGI KOMPREHENSIF KONSOLIDASI</div>
                      <div class="meta-info">
                        <strong>Sifat Berkas:</strong> Rahasia Perusahaan (Internal Only)<br/>
                        <strong>Waktu Ekspor:</strong> ${new Date().toLocaleString('id-ID')}<br/>
                        <strong>Skema Tarif Pajak:</strong> ${taxRate}% | <strong>Royalti Konten:</strong> ${royaltyRate}% | <strong>Opex Logistik:</strong> ${opexRate}%
                      </div>
                    </div>
                    <div class="logo">
                      <div class="logo-text">${branding.appName || 'Cinemas'}</div>
                      <div class="logo-sub">Direktorat Keuangan Perusahaan</div>
                    </div>
                  </div>

                  <div class="grid">
                    <div class="card">
                      <div class="card-title">Maksima Nilai Kotor (Face Value)</div>
                      <div class="card-val" style="color: #64748b;">Rp ${totalInitialGrossRevenue.toLocaleString('id-ID')}</div>
                      <div class="card-desc">Total diskon film, voucher & B1G1 diberikan: Rp ${(totalMovieDiscounts + totalVoucherDiscounts + totalB1G1Discounts).toLocaleString('id-ID')}</div>
                    </div>
                    <div class="card">
                      <div class="card-title">Omzet Realisasi Bersih Terbayar</div>
                      <div class="card-val" style="color: #2563eb;">Rp ${totalRevenueTickets.toLocaleString('id-ID')}</div>
                      <div class="card-desc">Total penonton terekam ${bookings.length} orang</div>
                    </div>
                    <div class="card">
                      <div class="card-title font-bold">Laba Rugi Neto Konsolidasi</div>
                      <div style="color: ${netProfit >= 0 ? '#16a34a' : '#dc2626'};" class="card-val">Rp ${netProfit.toLocaleString('id-ID')}</div>
                      <div class="card-desc">Kotor realisasi dikurangi pajak, royalti & opex</div>
                    </div>
                  </div>

                  <h3 style="margin-top:30px; border-bottom:1px solid #e2e8f0; padding-bottom:8px; font-size:13px; color:#1e293b;">Rincian Beban, Diskon & Alokasi Pengurangan Ledger</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Akun Ledger Pos Pengeluaran / Potongan</th>
                        <th class="text-right">Skema Kontrak / Jenis Promo</th>
                        <th class="text-right">Total Debit (IDR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Subsidi Diskon Film Umum</strong></td>
                        <td class="text-right">Potongan Harga Tiket Terpilih</td>
                        <td class="text-right font-mono" style="color: #ea5800;">-Rp ${totalMovieDiscounts.toLocaleString('id-ID')}</td>
                      </tr>
                      <tr>
                        <td><strong>Potongan Penjualan Kupon Voucher</strong></td>
                        <td class="text-right">Klaim Kode Promo (Checkout)</td>
                        <td class="text-right font-mono" style="color: #4f46e5;">-Rp ${totalVoucherDiscounts.toLocaleString('id-ID')}</td>
                      </tr>
                      <tr>
                        <td><strong>Subsidi Program Beli 1 Gratis 1 (B1G1)</strong></td>
                        <td class="text-right">Promosi Khusus Tiket Gratis</td>
                        <td class="text-right font-mono" style="color: #10b981;">-Rp ${totalB1G1Discounts.toLocaleString('id-ID')}</td>
                      </tr>
                      <tr style="background-color: #f8fafc; font-weight: bold;">
                        <td>Total Potongan Promosi Penjualan</td>
                        <td class="text-right">Dipotong dari Nilai Face Value</td>
                        <td class="text-right font-mono" style="color: #dc2626;">-Rp ${(totalMovieDiscounts + totalVoucherDiscounts + totalB1G1Discounts).toLocaleString('id-ID')}</td>
                      </tr>
                      <tr>
                        <td><strong>Beban Pajak Daerah PB1 / Penjualan Tiket (PPN)</strong></td>
                        <td class="text-right">${taxRate}% (dari Omzet Realisasi)</td>
                        <td class="text-right font-mono" style="color: #b91c1c;">-Rp ${calculatedTaxFee.toLocaleString('id-ID')}</td>
                      </tr>
                      <tr>
                        <td><strong>Beban Hubungan Penyalur Film (Distributor Royalty)</strong></td>
                        <td class="text-right">${royaltyRate}% (kontrak tayang)</td>
                        <td class="text-right font-mono" style="color: #b91c1c;">-Rp ${calculatedRoyaltyFee.toLocaleString('id-ID')}</td>
                      </tr>
                      <tr>
                        <td><strong>Beban Operasional & Perawatan Studio (Logistics & Opex)</strong></td>
                        <td class="text-right">${opexRate}% (listrik, karyawan, audio)</td>
                        <td class="text-right font-mono" style="color: #b91c1c;">-Rp ${calculatedOpexFee.toLocaleString('id-ID')}</td>
                      </tr>
                      <tr style="background-color: #f1f5f9; font-weight: bold;">
                        <td>Total Beban Pengurangan Operasional & Pajak</td>
                        <td class="text-right">Apropriasi Berkelanjutan</td>
                        <td class="text-right font-mono" style="color: #b91c1c;">-Rp ${(calculatedTaxFee + calculatedRoyaltyFee + calculatedOpexFee).toLocaleString('id-ID')}</td>
                      </tr>
                    </tbody>
                  </table>

                  <br/>
                  <h3 style="margin-top:30px; border-bottom:1px solid #e2e8f0; padding-bottom:8px; font-size:13px; color:#1e293b;">Kontribusi Pendapatan & Performa per Judul Film</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>ID Film</th>
                        <th>Judul Film / Kreatif</th>
                        <th class="text-right">Tiket Terjual</th>
                        <th class="text-right">Metode Pajak PB1</th>
                        <th class="text-right font-mono">Total Omzet Kotor (Credit)</th>
                        <th class="text-right font-mono">Laba Bersih Neto (IDR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${movies.map(m => {
                        const movieBookings = bookings.filter(b => b.movieTitle.toLowerCase().includes(m.title.toLowerCase()));
                        const totalMovieRevenue = movieBookings.reduce((sum, b) => sum + b.pricePaid, 0);
                        const totalMovieTickets = movieBookings.reduce((sum, b) => sum + b.seats.length, 0);
                        const movieRoyalty = totalMovieRevenue * (royaltyRate / 100);
                        const movieTax = totalMovieRevenue * (taxRate / 100);
                        const movieOpex = totalMovieRevenue * (opexRate / 100);
                        const movieNetProfit = totalMovieRevenue - movieRoyalty - movieTax - movieOpex;
                        return `
                          <tr>
                            <td class="font-mono">${m.id}</td>
                            <td><strong>${m.title}</strong></td>
                            <td class="text-right">${totalMovieTickets} Kursi</td>
                            <td class="text-right">${taxRate}% (Rp ${movieTax.toLocaleString('id-ID')})</td>
                            <td class="text-right font-mono">Rp ${totalMovieRevenue.toLocaleString('id-ID')}</td>
                            <td class="text-right font-mono" style="color: ${movieNetProfit >= 0 ? '#15803d' : '#b91c1c'}; font-weight: bold;">Rp ${movieNetProfit.toLocaleString('id-ID')}</td>
                          </tr>
                        `;
                      }).join('')}
                    </tbody>
                  </table>

                  <div class="footer">
                    Laporan dicetak otomatis oleh ${branding.appName || 'Bioskop ERP'} pada ${new Date().toLocaleString('id-ID')} WIB
                  </div>
                `;

                printHTML('Laporan_Laba_Rugi_Konsolidasi', contentHTML);
              };

              return (
                <div className="space-y-6 animate-fade-in text-slate-800">
                  {/* Title Panel */}
                  <div className="border-b border-slate-200 pb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h2 className="font-display text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                        <Coins className="w-5 h-5 text-emerald-600" />
                        <span>Manajemen Keuangan & Perpajakan Bioskop</span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Atur parameter tagihan, estimasi laba kotor, royalti distributor, utilitas operasional, dan unduh rekapitulasi data keuangan per hari.
                      </p>
                    </div>
                  </div>

                  {/* SETTINGS CARD FOR CUSTOM BILLING PARAMETERS */}
                  <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-slate-700 font-display font-medium">
                      <Sliders className="w-4 h-4 text-emerald-500" />
                      <h3 className="font-display font-bold text-xs uppercase tracking-wider">
                        Konfigurasi Persentase Tagihan & Biaya Operasional
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* PAJAK */}
                      <div className="space-y-1.5 bg-white p-3.5 rounded-xl border border-slate-150 shadow-sm">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                          Pajak PPN / PB1 (%)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={taxRate}
                            onChange={(e) => {
                              const v = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                              setTaxRate(v);
                              localStorage.setItem('cinema_billing_tax', String(v));
                            }}
                            className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg p-2 pr-8 outline-none"
                          />
                          <span className="absolute right-3 top-2 text-xs font-mono font-bold text-slate-400">%</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block leading-tight">
                          Pajak pembangunan / penjualan tiket daerah.
                        </span>
                      </div>

                      {/* ROYALTI */}
                      <div className="space-y-1.5 bg-white p-3.5 rounded-xl border border-slate-150 shadow-sm">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                          Bagi Hasil Royalti Film (%)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={royaltyRate}
                            onChange={(e) => {
                              const v = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                              setRoyaltyRate(v);
                              localStorage.setItem('cinema_billing_royalty', String(v));
                            }}
                            className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg p-2 pr-8 outline-none"
                          />
                          <span className="absolute right-3 top-2 text-xs font-mono font-bold text-slate-400">%</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block leading-tight">
                          Pembagian royalti bruto per tiket untuk distributor film.
                        </span>
                      </div>

                      {/* OPERASIONAL */}
                      <div className="space-y-1.5 bg-white p-3.5 rounded-xl border border-slate-150 shadow-sm">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                          Beban Operasional Bioskop (%)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={opexRate}
                            onChange={(e) => {
                              const v = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                              setOpexRate(v);
                              localStorage.setItem('cinema_billing_opex', String(v));
                            }}
                            className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg p-2 pr-8 outline-none"
                          />
                          <span className="absolute right-3 top-2 text-xs font-mono font-bold text-slate-400">%</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block leading-tight">
                          Logistik loket, utilitas listrik AC, studio, dan gaji kru.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* DAILY CSV DOWNLOAD PANEL */}
                  <div className="bg-white border-2 border-emerald-500/10 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h3 className="font-display font-black text-sm text-slate-800 flex items-center gap-1.5 uppercase">
                          <Download className="w-4 h-4 text-emerald-600" />
                          <span>Unduh Rekap Keuangan Per Hari</span>
                        </h3>
                        <p className="text-[11px] text-slate-400 font-medium leading-normal">
                          Pilih tanggal tertentu untuk mengekspor seluruh transaksi penjualan film lengkap dengan beban pajak, royalti, dan opex harian.
                        </p>
                      </div>

                      {/* Date selection & Action download */}
                      <div className="flex items-end gap-2.5 flex-wrap">
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Pilih Tanggal:</span>
                          <input
                            type="date"
                            value={selectedDailyReportDate}
                            onChange={(e) => setSelectedDailyReportDate(e.target.value)}
                            className="bg-slate-150 border border-slate-200 font-mono font-bold text-xs p-2 rounded-lg text-slate-700 outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleDownloadDailyFinancialCsv(selectedDailyReportDate)}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold px-3.5 py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm hover:shadow"
                            title="Unduh Berkas CSV harian"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Export CSV</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadDailyFinancialExcel(selectedDailyReportDate)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold px-3.5 py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm hover:shadow"
                            title="Unduh Berkas Excel XLSX harian"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            <span>Export Excel</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadDailyFinancialPdf(selectedDailyReportDate)}
                            className="bg-red-650 hover:bg-red-750 text-white text-xs font-extrabold px-3.5 py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm hover:shadow"
                            title="Format PDF & Cetak harian"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>PDF / Print</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Bookings summary on this date */}
                    {(() => {
                      const dayBookings = bookings.filter(b => b.bookingDate.startsWith(selectedDailyReportDate));
                      const dayRevenue = dayBookings.reduce((sum, b) => sum + b.pricePaid, 0);
                      const dayTax = dayRevenue * (taxRate / 100);
                      const dayRoyalty = dayRevenue * (royaltyRate / 100);
                      const dayOpex = dayRevenue * (opexRate / 100);
                      const dayNet = dayRevenue - dayTax - dayRoyalty - dayOpex;

                      return (
                        <div className="border border-slate-150 rounded-xl p-3 bg-slate-50/50 flex flex-wrap gap-4 justify-between items-center text-xs">
                          <div>
                            <span className="text-slate-400">Total Transaksi ({selectedDailyReportDate}): </span>
                            <strong className="text-slate-800 font-mono">{dayBookings.length} tiket</strong>
                          </div>
                          <div>
                            <span className="text-slate-400">Omzet Kotor: </span>
                            <strong className="text-slate-800">Rp {dayRevenue.toLocaleString('id-ID')}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400">Pajak ({taxRate}%): </span>
                            <strong className="text-red-500">Rp {dayTax.toLocaleString('id-ID')}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400">Royalti ({royaltyRate}%): </span>
                            <strong className="text-red-500 font-medium">Rp {dayRoyalty.toLocaleString('id-ID')}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400">Laba Bersih Harian: </span>
                            <strong className={`font-black ${dayNet >= 0 ? 'text-teal-700' : 'text-red-500'}`}>
                              Rp {dayNet.toLocaleString('id-ID')}
                            </strong>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Bento Grid Financial Rings (Dynamic recalculations) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* 1. TOTAL CASH INFLOW (REKAP DEPOSIT) */}
                    <button
                      type="button"
                      onClick={() => setSelectedFinancialDetail(selectedFinancialDetail === 'deposits' ? 'none' : 'deposits')}
                      className={`text-left bg-gradient-to-br from-blue-900 to-indigo-950 p-5 rounded-2xl text-white shadow-md relative overflow-hidden flex flex-col justify-between h-40 cursor-pointer hover:ring-4 hover:ring-blue-400/35 transition-all outline-none ${selectedFinancialDetail === 'deposits' ? 'ring-4 ring-amber-500' : ''}`}
                    >
                      <div className="absolute right-3 top-3 opacity-15">
                        <Coins className="w-24 h-24 text-amber-500" />
                      </div>
                      <div className="space-y-1 block z-10">
                        <span className="text-[10px] uppercase font-bold text-blue-200 block tracking-wider flex items-center gap-1">
                          <span>Total Kas Masuk (Deposits)</span>
                          <span className="bg-amber-500/30 text-amber-300 font-mono text-[8px] uppercase tracking-normal px-1 py-0.2 rounded font-black">Klik Detail</span>
                        </span>
                        <span className="text-2xl font-black font-display text-amber-400 block tracking-tight">
                          Rp {totalCashInflow.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="text-[10px] text-blue-150 leading-relaxed z-10 font-sans">
                        Aliran dana masuk via klaim voucher kasir <strong>(Rp {totalVoucherRedeemedValue.toLocaleString('id-ID')})</strong> plus top-up saldo mandiri. <span className="underline decoration-dotted text-amber-300">Klik untuk melihat rincian sumber dana</span>
                      </div>
                    </button>

                    {/* 2. REALIZED TICKETS REVENUE */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm relative overflow-hidden flex flex-col justify-between h-40">
                      <div className="absolute right-3 top-3 opacity-10">
                        <Ticket className="w-24 h-24 text-teal-600" />
                      </div>
                      <div className="space-y-1 block z-10">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Pendapatan Riil Tiket</span>
                        <span className="text-2xl font-black font-display text-teal-600 block tracking-tight">
                          Rp {totalRevenueTickets.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 leading-relaxed z-10 font-sans">
                        Dana yang sudah terkonversi menjadi omzet penjualan tiket dari total {bookings.length} kali penayangan dipesan oleh penonton.
                      </div>
                    </div>

                    {/* 3. COOP WALLET LIABILITIES */}
                    <button
                      type="button"
                      onClick={() => setSelectedFinancialDetail(selectedFinancialDetail === 'floating_wallet' ? 'none' : 'floating_wallet')}
                      className={`text-left bg-white p-5 rounded-2xl border border-slate-150 shadow-sm relative overflow-hidden flex flex-col justify-between h-40 cursor-pointer hover:ring-4 hover:ring-indigo-550/10 transition-all outline-none ${selectedFinancialDetail === 'floating_wallet' ? 'ring-4 ring-amber-500 border-amber-500' : ''}`}
                    >
                      <div className="absolute right-3 top-3 opacity-15">
                        <UserIcon className="w-24 h-24 text-amber-600" />
                      </div>
                      <div className="space-y-1 block z-10">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider flex items-center gap-1">
                          <span>Kewajiban Dompet (Mengambang)</span>
                          <span className="bg-amber-100 text-amber-700 font-mono text-[8px] uppercase tracking-normal px-1 py-0.2 rounded font-black">Klik Detail</span>
                        </span>
                        <span className="text-2xl font-black font-display text-amber-600 block tracking-tight">
                          Rp {totalUserBalances.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 leading-relaxed z-10 font-sans">
                        Saldo aktif mengambang (liabilitas) di dompet pelanggan {liveUsers.length} akun terdaftar. <span className="underline decoration-dotted text-amber-600">Klik untuk melihat siapa yang menyimpan saldo</span>
                      </div>
                    </button>
                  </div>

                  {/* INTERACTIVE DETAILED DRILLDOWN PANELS */}
                  {selectedFinancialDetail !== 'none' && (
                    <div className="bg-white border-2 border-amber-500/20 rounded-2xl p-5 shadow-sm animate-fade-in space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-xl ${selectedFinancialDetail === 'deposits' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                            {selectedFinancialDetail === 'deposits' ? <Coins className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
                          </div>
                          <div>
                            <h3 className="font-display font-black text-sm text-slate-800 uppercase tracking-wide">
                              {selectedFinancialDetail === 'deposits' 
                                ? 'Rincian Arus Kas & Riwayat Deposit Masuk' 
                                : 'Rincian Saldo Aktif Dompet Pelanggan (Kewajiban / Liabilitas)'}
                            </h3>
                            <p className="text-[11px] text-slate-400 font-medium">
                              {selectedFinancialDetail === 'deposits'
                                ? 'Menganalisis semua dana tunai masuk yang disetor ke kasir/sistem via klaim token voucher topup atau kredit bawaan.'
                                : 'Mendeteksi sisa dana mengendap milik masing-masing akun terdaftar yang belum terpakai beli tiket.'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedFinancialDetail('none')}
                          className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
                        >
                          Tutup Detail ×
                        </button>
                      </div>

                      {selectedFinancialDetail === 'deposits' ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs text-slate-600 border-collapse">
                            <thead>
                              <tr className="border-b border-slate-150 text-[10px] uppercase font-bold text-slate-400 bg-slate-50">
                                <th className="p-3 w-10">No</th>
                                <th className="p-3">Tanggal & Waktu</th>
                                <th className="p-3">Pelanggan / Penerima</th>
                                <th className="p-3">Nominal Masuk</th>
                                <th className="p-3">Rincian / Sandi Token</th>
                                <th className="p-3 text-right">Metode Penerimaan</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-sans">
                              {/* Row 1: Budi Santoso's Initial Promo Balance */}
                              <tr className="hover:bg-slate-50/50">
                                <td className="p-3 font-mono text-[10px] text-slate-400">1</td>
                                <td className="p-3 font-mono text-slate-500">2026-05-25 08:00 WIB</td>
                                <td className="p-3">
                                  <div className="font-bold text-slate-700">Budi Santoso</div>
                                  <div className="text-[10px] text-slate-400">budi@gmail.com</div>
                                </td>
                                <td className="p-3 font-mono font-bold text-slate-800">Rp 150.000</td>
                                <td className="p-3 text-slate-400 italic">Saldo awal registrasi pengguna</td>
                                <td className="p-3 text-right">
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-slate-100 text-slate-500 border border-slate-200">
                                    Sistem Default
                                  </span>
                                </td>
                              </tr>

                              {/* Rows for other users' default / dynamic register balance bonus */}
                              {(() => {
                                let rowIdx = 2;
                                const voucherRedeemed = vouchers.filter(v => v.isRedeemed);
                                const registeredUsersList = liveUsers.filter(u => u.id !== 'buyer-1');
                                
                                return (
                                  <>
                                    {registeredUsersList.map((usr) => {
                                      const currentNumber = rowIdx++;
                                      return (
                                        <tr key={usr.id} className="hover:bg-slate-50/50">
                                          <td className="p-3 font-mono text-[10px] text-slate-400">{currentNumber}</td>
                                          <td className="p-3 font-mono text-slate-500">Waktu Registrasi Akun</td>
                                          <td className="p-3">
                                            <div className="font-bold text-slate-700">{usr.name}</div>
                                            <div className="text-[10px] text-slate-400">{usr.email}</div>
                                          </td>
                                          <td className="p-3 font-mono font-bold text-slate-800">Rp 100.000</td>
                                          <td className="p-3 text-slate-400 italic">Bonus pendaftaran pelanggan baru</td>
                                          <td className="p-3 text-right">
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-50 text-emerald-600 border border-emerald-200">
                                              Bonus Registrasi
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}

                                    {/* Rows for redeemed vouchers */}
                                    {voucherRedeemed.map((v) => {
                                      const currentNumber = rowIdx++;
                                      const displayDate = v.redeemedAt 
                                        ? new Date(v.redeemedAt).toLocaleString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) 
                                        : 'Terklaim';
                                      return (
                                        <tr key={v.id} className="hover:bg-slate-50/50">
                                          <td className="p-3 font-mono text-[10px] text-slate-400">{currentNumber}</td>
                                          <td className="p-3 font-mono text-slate-500">{displayDate}</td>
                                          <td className="p-3">
                                            <div className="font-bold text-slate-700">{v.redeemedBy || 'Pelanggan'}</div>
                                            <div className="text-[10px] text-slate-400">Verifikasi klaim mandiri</div>
                                          </td>
                                          <td className="p-3 font-mono font-bold text-teal-650">Rp {v.amount.toLocaleString('id-ID')}</td>
                                          <td className="p-3">
                                            <span className="font-mono font-bold bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-indigo-650 select-all">
                                              {v.code}
                                            </span>
                                          </td>
                                          <td className="p-3 text-right">
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-blue-50 text-blue-600 border border-blue-200">
                                              Klaim Voucher Fisik
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}

                                    {/* Reconciliation Adjustment Row if there is manual adjustments */}
                                    {(() => {
                                      const calculatedSum = 150000 + (registeredUsersList.length * 100000) + voucherRedeemed.reduce((sum, v) => sum + v.amount, 0);
                                      const diff = totalCashInflow - calculatedSum;
                                      if (diff > 0) {
                                        return (
                                          <tr className="hover:bg-slate-50/50 bg-amber-50/30">
                                            <td className="p-3 font-mono text-[10px] text-slate-400">{rowIdx++}</td>
                                            <td className="p-3 font-mono text-slate-500">Penyesuaian Manual</td>
                                            <td className="p-3 font-bold text-slate-700">Ledger Penyelaras</td>
                                            <td className="p-3 font-mono font-bold text-amber-700">Rp {diff.toLocaleString('id-ID')}</td>
                                            <td className="p-3 text-slate-450 italic">Top-up dompet digital / mandiri</td>
                                            <td className="p-3 text-right">
                                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-50 text-amber-600 border border-amber-200">
                                                Penyeimbang Sistem
                                              </span>
                                            </td>
                                          </tr>
                                        );
                                      }
                                      return null;
                                    })()}
                                  </>
                                );
                              })()}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs text-slate-600 border-collapse">
                            <thead>
                              <tr className="border-b border-slate-150 text-[10px] uppercase font-bold text-slate-400 bg-slate-50">
                                <th className="p-3 w-10">No</th>
                                <th className="p-3">Nama Pelanggan</th>
                                <th className="p-3">Alamat Email</th>
                                <th className="p-3">No. Telepon</th>
                                <th className="p-3">Grup Peran</th>
                                <th className="p-3 text-right">Saldo Mengambang Saat Ini</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-sans animate-fade-in">
                              {liveUsers.map((usr, index) => {
                                const isBudi = usr.id === 'buyer-1';
                                return (
                                  <tr key={usr.id} className={`hover:bg-slate-50/50 ${isBudi ? 'bg-amber-500/10' : ''}`}>
                                    <td className="p-3 font-mono text-[10px] text-slate-400">{index + 1}</td>
                                    <td className="p-3">
                                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                        <span>{usr.name}</span>
                                        {isBudi && (
                                          <span className="px-1.5 py-0.5 text-[8px] bg-amber-600 text-white rounded font-bold uppercase tracking-wider">
                                            Demo Akun Inti
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="p-3 font-mono text-[11px] text-slate-500">{usr.email}</td>
                                    <td className="p-3 font-mono text-[11px] text-slate-500">{usr.phone || '-'}</td>
                                    <td className="p-3">
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                                        Pembeli / Buyer
                                      </span>
                                    </td>
                                    <td className="p-3 text-right font-mono font-black text-slate-800">
                                      Rp {usr.balance.toLocaleString('id-ID')}
                                    </td>
                                  </tr>
                                );
                              })}
                              <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                                <td className="p-3 text-right text-slate-500 font-display font-bold uppercase text-[10px]" colSpan={5}>
                                  Total Kewajiban Dompet (Liabilitas Jangka Pendek):
                                </td>
                                <td className="p-3 text-right font-mono font-black text-amber-600 text-sm">
                                  Rp {totalUserBalances.toLocaleString('id-ID')}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* DETAILED DOUBLE-ENTRY CORPORATE STATEMENT & MOVIE METRICS GRID */}
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    
                    {/* CORPORATE LEDGER INCOME STATEMENT */}
                    <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm lg:col-span-3 space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <h3 className="font-display font-black text-xs sm:text-sm text-slate-800 uppercase tracking-wide">
                          Laporan Laba Rugi Komprehensif
                        </h3>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={handleDownloadConsolidatedCsv}
                            className="bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-extrabold text-[10px] px-2 py-1 rounded flex items-center gap-1 transition-all cursor-pointer"
                            title="Ekspor CSV Laba Rugi Konsolidasi"
                          >
                            <FileText className="w-3 h-3 text-blue-600" />
                            <span>CSV</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleDownloadConsolidatedExcel}
                            className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-extrabold text-[10px] px-2 py-1 rounded flex items-center gap-1 transition-all cursor-pointer"
                            title="Ekspor Excel Laba Rugi Konsolidasi"
                          >
                            <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                            <span>Excel</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleDownloadConsolidatedPdf}
                            className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-extrabold text-[10px] px-2 py-1 rounded flex items-center gap-1 transition-all cursor-pointer"
                            title="Cetak & Unduh PDF Laba Rugi Konsolidasi"
                          >
                            <Download className="w-3 h-3 text-red-650" />
                            <span>PDF / Print</span>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3.5 text-xs text-slate-700 font-sans leading-relaxed">
                        {/* Revenue section */}
                        <div className="flex justify-between font-bold text-slate-800 border-b border-slate-100 pb-1.5">
                          <span>PENDAPATAN UTAMA OPERASIONAL</span>
                          <span>KREDIT (IDR)</span>
                        </div>
                        <div className="flex justify-between pl-3 text-slate-500">
                          <span>Nilai Penjualan Kotor (Face Value Tiket)</span>
                          <span className="font-mono font-medium">+Rp {totalInitialGrossRevenue.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between pl-5 text-red-500">
                          <span>↳ Potongan Diskon Film</span>
                          <span className="font-mono">-Rp {totalMovieDiscounts.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between pl-5 text-indigo-500">
                          <span>↳ Potongan Voucher Checkout</span>
                          <span className="font-mono">-Rp {totalVoucherDiscounts.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between pl-5 text-emerald-600">
                          <span>↳ Subsidi Beli 1 Gratis 1 (B1G1)</span>
                          <span className="font-mono">-Rp {totalB1G1Discounts.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between pl-3 bg-slate-50 py-1.5 px-2 rounded-lg font-bold text-slate-800 border border-slate-150">
                          <span>Hasil Penjualan Bersih Realisasi (Paid)</span>
                          <span className="font-mono text-teal-650">+Rp {totalRevenueTickets.toLocaleString('id-ID')}</span>
                        </div>

                        {/* HPP & BIAYA COGS SECTION */}
                        <div className="flex justify-between font-bold text-slate-800 border-b border-slate-100 pt-2 pb-1.5">
                          <span>HARGA POKOK PENJUALAN & BEBAN ROYALTI ({royaltyRate}%)</span>
                          <span>DEBIT (IDR)</span>
                        </div>
                        <div className="flex justify-between pl-3 text-red-650">
                          <span>Royalti & Bagi Hasil Film kepada Distributor ({royaltyRate}%)</span>
                          <span className="font-mono font-semibold">-Rp {calculatedRoyaltyFee.toLocaleString('id-ID')}</span>
                        </div>

                        {/* GROSS MARGIN */}
                        <div className="flex justify-between font-bold text-slate-850 bg-slate-50 p-2.5 rounded-xl border border-slate-150 my-2 shadow-inner">
                          <span className="uppercase text-[11px] font-black">Laba Kotor (Gross Profit)</span>
                          <span className="font-mono text-slate-900 font-black">Rp {grossProfit.toLocaleString('id-ID')}</span>
                        </div>

                        {/* BEBAN POTONGAN UTAMA */}
                        <div className="flex justify-between font-bold text-slate-850 border-b border-slate-100 pt-2 pb-1.5">
                          <span>BEBAN PERPAJAKAN & UTILITAS ({taxRate}% & {opexRate}%)</span>
                          <span>DEBIT (IDR)</span>
                        </div>
                        <div className="flex justify-between pl-3 text-red-650">
                          <span>Beban Pajak Penjualan Tiket PPN / PB1 ({taxRate}%)</span>
                          <span className="font-mono font-semibold">-Rp {calculatedTaxFee.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between pl-3 text-red-650">
                          <span>Beban Operasional & Gaji Staf Bioskop ({opexRate}%)</span>
                          <span className="font-mono font-semibold">-Rp {calculatedOpexFee.toLocaleString('id-ID')}</span>
                        </div>

                        {/* TOTAL POTONGAN */}
                        <div className="flex justify-between pl-3 font-semibold pb-1.5 border-b border-dashed border-slate-200 text-slate-600">
                          <span>Total Potongan Perpajakan & Operasional</span>
                          <span className="font-mono text-red-650">Rp ({(calculatedTaxFee + calculatedOpexFee).toLocaleString('id-ID')})</span>
                        </div>

                        {/* FINAL NET PROFIT */}
                        <div className={`p-4 rounded-xl flex items-center justify-between border ${
                          netProfit >= 0 
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                            : 'bg-red-50 border-red-100 text-red-800'
                        }`}>
                          <div>
                            <span className="text-[10px] uppercase font-bold tracking-wider block opacity-70">
                              LABA BERSIH AKHIR (NET PROFIT)
                            </span>
                            <span className={`text-xl font-black font-display block mt-0.5 ${
                              netProfit >= 0 ? 'text-teal-700' : 'text-red-700'
                            }`}>
                              Rp {netProfit.toLocaleString('id-ID')}
                            </span>
                          </div>
                          <div className="flex flex-col items-end">
                            {netProfit >= 0 ? (
                              <div className="flex items-center gap-1.5 px-3 py-1 bg-teal-500 text-white text-[10px] font-black rounded-full shadow-sm uppercase tracking-wider">
                                <TrendingUp className="w-3.5 h-3.5" />
                                <span>SURPLUS UNTUNG</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500 text-white text-[10px] font-black rounded-full shadow-sm uppercase tracking-wider">
                                <TrendingDown className="w-3.5 h-3.5" />
                                <span>DEFISIT RUGI</span>
                              </div>
                            )}
                            <span className="text-[9px] text-slate-400 mt-1.5 font-sans font-medium block">Sistem Otomasi Laba Rugi</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SALES BREAKDOWN PER MOVIE (LABA RUGI MOVIE) */}
                    <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm lg:col-span-2 space-y-4 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-display font-black text-sm text-slate-800 uppercase tracking-wide">Performa per Judul Film</h3>
                          <p className="text-[10px] text-slate-400 mt-0.5 font-medium leading-normal">
                            Analisis kontribusi penjualan loket tiket bioskop secara dinamis:
                          </p>
                        </div>

                        <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
                          {movies.map(m => {
                            const movieBookings = bookings.filter(b => b.movieTitle.toLowerCase().includes(m.title.toLowerCase()));
                            const totalMovieRevenue = movieBookings.reduce((sum, b) => sum + b.pricePaid, 0);
                            const totalMovieTickets = movieBookings.reduce((sum, b) => sum + b.seats.length, 0);
                            
                            const movieRoyalty = totalMovieRevenue * (royaltyRate / 100);
                            const movieTax = totalMovieRevenue * (taxRate / 100);
                            const movieOpex = totalMovieRevenue * (opexRate / 100);
                            const movieNetProfit = totalMovieRevenue - movieRoyalty - movieTax - movieOpex;

                            const maxSales = Math.max(...movies.map(mv => bookings.filter(b => b.movieTitle.toLowerCase().includes(mv.title.toLowerCase())).reduce((sum, b) => sum + b.pricePaid, 0)), 1);
                            const progressPct = Math.min(100, Math.round((totalMovieRevenue / maxSales) * 100));

                            return (
                              <div key={m.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                                <div className="flex justify-between items-center gap-2">
                                  <span className="font-display font-bold text-xs text-slate-800 truncate" title={m.title}>
                                    {m.title}
                                  </span>
                                  <span className="font-mono text-[10px] text-teal-600 font-bold shrink-0">
                                    Rp {totalMovieRevenue.toLocaleString('id-ID')}
                                  </span>
                                </div>

                                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                                    style={{ width: `${progressPct}%` }}
                                  />
                                </div>

                                <div className="grid grid-cols-2 text-[9px] text-slate-500">
                                  <span>{totalMovieTickets} kursi</span>
                                  <span className={`text-right font-bold font-mono ${movieNetProfit >= 0 ? 'text-teal-700' : 'text-red-500'}`}>
                                    Net: Rp {movieNetProfit.toLocaleString('id-ID')}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-400 bg-slate-50 p-2.5 border border-dashed border-slate-200 rounded-xl text-center leading-relaxed font-sans mt-2">
                        Pembagian persentase beban diakumulasikan secara real-time berdasarkan setingan admin di atas.
                      </div>
                    </div>

                  </div>

                  {/* COMPLIANCE WALLET ACCOUNTS LEDGER */}
                  <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm space-y-4">
                    <div>
                      <h3 className="font-display font-black text-sm text-slate-800 uppercase tracking-wide">
                        Audit Sistem Rekening & Kepatuhan Likuiditas Pelanggan
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed font-medium">
                        Menampilkan seluruh dana tersisa pembeli aktif untuk memastikan cadangan saldo likuid bioskop (kliring uang mengalir) aman dari risiko gagal tunai.
                      </p>
                    </div>

                    <div className="border border-slate-150 rounded-xl overflow-x-auto max-h-[250px] overflow-y-auto">
                      <table className="w-full text-left text-xs bg-white border-collapse min-w-[500px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-150 font-display font-semibold text-slate-500 uppercase tracking-wider text-[9px] text-slate-400">
                            <th className="py-3 px-4">Nama Pelanggan</th>
                            <th className="py-3 px-4">Email Terdaftar</th>
                            <th className="py-3 px-4">No. Telepon / HP</th>
                            <th className="py-3 px-4 text-right">Saldo Dompet</th>
                            <th className="py-3 px-4 text-center">Status Keuangan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {liveUsers.map(u => (
                            <tr key={u.id} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-4 font-semibold text-slate-800 flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 font-black text-[9px] flex items-center justify-center uppercase border border-slate-200 shadow-sm">
                                  {u.name.charAt(0)}
                                </div>
                                <span>{u.name}</span>
                              </td>
                              <td className="py-2.5 px-4 text-slate-500 font-mono text-[10.5px]">{u.email}</td>
                              <td className="py-2.5 px-4 text-slate-400 font-mono text-[10.5px]">{u.phone || '-'}</td>
                              <td className="py-2.5 px-4 text-right font-bold text-blue-900 font-mono">
                                Rp {u.balance.toLocaleString('id-ID')}
                              </td>
                              <td className="py-2.5 px-4 text-center">
                                {u.balance >= 100000 ? (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-bold rounded-md border border-emerald-100 uppercase tracking-wider">
                                    Likuid / Sehat
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 text-amber-700 text-[9px] font-bold rounded-md border border-amber-100 uppercase tracking-wider">
                                    Sinyal Isi Ulang
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              );
            })()}

            {/* TAB CONTENT: KELOLA VOUCHER TOP-UP */}
            {activeTab === 'vouchers' && (
              <div className="space-y-6 animate-fade-in text-slate-800">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="font-display text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                      <Ticket className="w-5 h-5 text-amber-500" />
                      <span>Sistem Manajemen Kode Voucher Top-up</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Cetak & jual kode kupon top-up fisik. Pengguna dapat me-redeem kode untuk langsung menambah saldo dompet mereka secara instan.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const unredeemed = vouchers.filter(v => !v.isRedeemed);
                      if (unredeemed.length === 0) {
                        triggerFeedback('error', 'Tidak ada voucher aktif/belum terpakai untuk dicetak!');
                        return;
                      }
                      setPrintModalVouchers(unredeemed);
                    }}
                    className="shrink-0 inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-amber-400 animate-bounce" />
                    <span>Format Cetak Semua Voucher Terbuka ({vouchers.filter(v => !v.isRedeemed).length})</span>
                  </button>
                </div>

                {/* STATS OVERVIEW */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-4 border border-blue-100 rounded-2xl flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-900 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm">
                      #{vouchers.length}
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Total Voucher Terbuat</span>
                      <span className="font-display font-black text-slate-800 text-base">
                        {vouchers.length} Lembar
                      </span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 p-4 border border-amber-100 rounded-2xl flex items-center gap-4">
                    <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-slate-900 font-bold text-lg shadow-sm">
                      ✔
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Aktif (Tersedia Dijual)</span>
                      <span className="font-display font-black text-slate-800 text-base">
                        {vouchers.filter(v => !v.isRedeemed).length} Lembar ({' '}
                        <span className="text-emerald-700 text-xs">
                          Rp {vouchers.filter(v => !v.isRedeemed).reduce((sum, v) => sum + v.amount, 0).toLocaleString('id-ID')}
                        </span>{' '}
                        )
                      </span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4 border border-emerald-100 rounded-2xl flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm">
                      <Coins className="w-5 h-5 text-amber-300" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Sudah Ditukarkan</span>
                      <span className="font-display font-black text-slate-800 text-base">
                        {vouchers.filter(v => v.isRedeemed).length} Lembar ({' '}
                        <span className="text-emerald-700 text-xs text-bold">
                          Rp {vouchers.filter(v => v.isRedeemed).reduce((sum, v) => sum + v.amount, 0).toLocaleString('id-ID')}
                        </span>{' '}
                        )
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* GENERATOR COLUMN */}
                  <form onSubmit={handleGenerateVouchers} className="lg:col-span-5 bg-white border border-slate-150 rounded-2xl p-5 space-y-4 shadow-tiny">
                    <div className="border-b border-slate-100 pb-3 mb-1">
                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest block">VOUCHER FACTORY</span>
                      <h3 className="font-display font-extrabold text-sm text-slate-800 mt-0.5">Buat Voucher Kasir Massal</h3>
                    </div>

                    {/* Voucher Type selection */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Tipe Voucher / Kupon
                      </label>
                      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                        <button
                          type="button"
                          onClick={() => setNewVoucherType('topup')}
                          className={`flex-1 py-1 px-2.5 rounded-lg font-bold text-center transition-all cursor-pointer ${
                            newVoucherType === 'topup'
                              ? 'bg-white shadow-sm text-blue-900'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Top-up Dompet
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewVoucherType('discount')}
                          className={`flex-1 py-1 px-2.5 rounded-lg font-bold text-center transition-all cursor-pointer ${
                            newVoucherType === 'discount'
                              ? 'bg-white shadow-sm text-blue-900'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Kupon Diskon Checkout
                        </button>
                      </div>
                    </div>

                    {/* Presets Amount */}
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        {newVoucherType === 'topup' ? 'Pilih Denominasi Saldo (Nominal)' : 'Pilih Potongan Diskon Khas (Rp, jika persen = 0)'}
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[10000, 25000, 50000, 100000, 150000, 250000].map(amountPreset => (
                          <button
                            key={amountPreset}
                            type="button"
                            onClick={() => {
                              setVoucherAmount(amountPreset);
                              setCustomVoucherAmount('');
                            }}
                            className={`py-2 px-1 text-center text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                              voucherAmount === amountPreset && !customVoucherAmount
                                ? 'bg-blue-900 text-white border-blue-950 shadow-sm'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                          >
                            Rp {amountPreset.toLocaleString('id-ID').replace(',00', '')}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Input */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        {newVoucherType === 'topup' ? 'Atau Masukkan Nominal Kustom (Rp)' : 'Atau Potongan Diskon Nominal (Rp, jika persen = 0)'}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">Rp</span>
                        <input
                          type="number"
                          placeholder="Contoh: 75000"
                          value={customVoucherAmount}
                          onChange={(e) => setCustomVoucherAmount(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 py-2.5 pl-10 pr-4 text-xs font-bold rounded-xl outline-none focus:bg-white focus:border-blue-900 transition-all font-mono"
                        />
                      </div>
                      <p className="text-[9px] text-slate-400 mt-1">
                        {newVoucherType === 'topup' 
                          ? 'Saran: kustomisasi jika ada promo nominal ganjil.'
                          : 'Jika Anda mengisi persentase diskon (%) di bawah, nominal Rp ini diabaikan.'
                        }
                      </p>
                    </div>

                    {/* Discount-specific Form configs */}
                    {newVoucherType === 'discount' && (
                      <div className="p-3 bg-amber-500/10 border border-amber-200/50 rounded-xl space-y-3">
                        <div>
                          <label className="block text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-1.5">
                            Persentase Diskon (%) (Opsional)
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            placeholder="Contoh: 15 (Ketik 0 jika ingin diskon kupon nominal Rp di atas)"
                            value={newVoucherDiscountPercent || ''}
                            onChange={(e) => setNewVoucherDiscountPercent(Number(e.target.value))}
                            className="w-full bg-white border border-slate-200 py-2 px-3 text-xs font-bold rounded-lg outline-none focus:border-blue-900 font-mono text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-1.5">
                            Batasi Hanya Berlaku Untuk Film Tertentu (Opsional)
                          </label>
                          <select
                            value={newVoucherTargetMovieId}
                            onChange={(e) => setNewVoucherTargetMovieId(e.target.value)}
                            className="w-full bg-white border border-slate-200 py-2 px-3 text-xs rounded-lg outline-none focus:border-blue-900 text-slate-800 font-medium"
                          >
                            <option value="">Berlaku untuk Semua Judul Film</option>
                            {movies.map(m => (
                              <option key={m.id} value={m.id}>{m.title}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Batch Quantity */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Jumlah Voucher yang Dibuat Sekaligus: {voucherQuantity} Lembar
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={30}
                        step={1}
                        value={voucherQuantity}
                        onChange={(e) => setVoucherQuantity(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-900"
                      />
                      <div className="flex justify-between text-[9px] font-bold text-slate-400 px-1 mt-1">
                        <span>1 Lembar</span>
                        <span>15 Lembar</span>
                        <span>30 Lembar</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 py-3 px-4 font-display font-bold text-xs rounded-xl shadow-sm transition-all hover:shadow cursor-pointer"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>⚡ BUAT SEKARANG & MASUKKAN DATABASE</span>
                    </button>
                  </form>

                  {/* VOUCHERS LIST TABLE */}
                  <div className="lg:col-span-7 bg-white border border-slate-150 rounded-2xl p-5 space-y-4 shadow-tiny">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">DATABASE DOKUMEN</span>
                        <h3 className="font-display font-extrabold text-sm text-slate-800 mt-0.5">Daftar Kode Token Kasir</h3>
                      </div>

                      {/* Filters */}
                      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 text-[9px]">
                        <button
                          type="button"
                          onClick={() => setVoucherFilter('all')}
                          className={`px-3 py-1.5 font-bold rounded-lg transition-all cursor-pointer ${
                            voucherFilter === 'all' ? 'bg-white text-slate-800 shadow-tiny' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Semua
                        </button>
                        <button
                          type="button"
                          onClick={() => setVoucherFilter('active')}
                          className={`px-3 py-1.5 font-bold rounded-lg transition-all cursor-pointer ${
                            voucherFilter === 'active' ? 'bg-white text-teal-705 shadow-tiny' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Aktif
                        </button>
                        <button
                          type="button"
                          onClick={() => setVoucherFilter('redeemed')}
                          className={`px-3 py-1.5 font-bold rounded-lg transition-all cursor-pointer ${
                            voucherFilter === 'redeemed' ? 'bg-white text-rose-705 shadow-tiny' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Terpakai
                        </button>
                      </div>
                    </div>

                    {/* Search Field */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Cari kode kupon / token voucher..."
                        value={voucherSearch}
                        onChange={(e) => setVoucherSearch(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-150 focus:bg-white focus:border-blue-900 outline-none text-xs leading-none py-2.5 pl-3 pr-8 rounded-lg font-mono placeholder:text-slate-400"
                      />
                      {voucherSearch && (
                        <button
                          type="button"
                          onClick={() => setVoucherSearch('')}
                          className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 text-xs font-bold font-mono"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {filteredVouchers.length === 0 ? (
                      <div className="border border-dashed border-slate-200 rounded-xl py-12 px-4 text-center">
                        <Ticket className="w-10 h-10 text-slate-350 mx-auto opacity-40 mb-2" />
                        <h4 className="font-display font-medium text-xs text-slate-500">Tidak ada voucher terdeteksi</h4>
                        <p className="text-[10px] text-slate-450 mt-1 max-w-xs mx-auto">
                          Gunakan panel sebelah kiri untuk membuat sekumpulan kode voucher topup baru untuk dicetak.
                        </p>
                      </div>
                    ) : (
                      <div className="max-h-[350px] overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-100 bg-slate-50/20">
                        {filteredVouchers.map(v => {
                          const isCopied = copiedCodeCode === v.code;
                          return (
                            <div key={v.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-black text-xs text-slate-705 tracking-wider bg-white border border-slate-200 px-2 py-0.5 rounded shadow-tiny select-all">
                                    {v.code}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyVoucherCode(v.code)}
                                    className={`p-1.5 rounded-md hover:bg-slate-200/50 text-[10px] transition-all font-bold ${
                                      isCopied ? 'text-teal-655 bg-teal-50' : 'text-slate-400 hover:text-slate-700'
                                    }`}
                                    title="Copy Code"
                                  >
                                    {isCopied ? '✓ Tersalin!' : '📋 Salin'}
                                  </button>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                                  <span>Dibuat: {new Date(v.createdAt).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                  <span>•</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                    v.type === 'discount' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {v.type === 'discount' ? 'DISCOUNT PROMO' : 'TOP-UP SALDO'}
                                  </span>
                                  <span>•</span>
                                  <span className="font-bold text-slate-700">
                                    {v.type === 'discount' 
                                      ? (v.discountPercent ? `Diskon ${v.discountPercent}%` : `Potongan Rp ${v.amount.toLocaleString('id-ID')}`)
                                      : `Dana Rp ${v.amount.toLocaleString('id-ID')}`
                                    }
                                  </span>
                                  {v.targetMovieId && (
                                    <>
                                      <span>•</span>
                                      <span className="text-pink-600 font-semibold" title="Batas film">
                                        Film: {movies.find(m => m.id === v.targetMovieId)?.title || 'Khusus'}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                {v.isRedeemed ? (
                                  <div className="text-right">
                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100 inline-block">
                                      Terpakai / Claimed
                                    </span>
                                    <span className="block text-[8px] text-slate-400 mt-0.5 font-semibold">
                                      Oleh: {v.redeemedBy || 'User'}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="text-right flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setPrintModalVouchers([v])}
                                      className="bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-1 text-[10px] font-bold rounded-md text-slate-700 cursor-pointer"
                                    >
                                      🖨️ Cetak
                                    </button>
                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100 inline-block">
                                      Aktif
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteVoucher(v.id)}
                                      className="p-1 text-slate-350 hover:text-red-650 hover:bg-red-50 rounded transition-all cursor-pointer"
                                      title="Batalkan Voucher"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* VISUAL EXPLANATION */}
                <div className="bg-slate-100/50 border border-slate-200/60 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed text-slate-550 max-w-3xl">
                  <Sliders className="w-5 h-5 text-blue-900 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-display font-semibold text-slate-800">Petunjuk Distribusi & Kasir</span>
                    <p className="mt-1">
                      Anda bisa mencetak voucher ini di atas kertas biasa, memotongnya menjadi selebaran mini, lalu menjualnya sebagai kupon fisik di konter bioskop. Ketika pembeli membeli voucher fisik, minta mereka membuka opsi <strong>"Redeem Voucher"</strong> pada submenu Dompet di beranda mereka untuk memasukkan kode token di atas guna mengubah saldonya secara mandiri.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: EDIT PROFILE */}
            {activeTab === 'profile' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="font-display text-xl font-bold tracking-tight text-slate-800">
                    Kelola Data Pribadi Administrator
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Perbarui nama lengkap, email, nomor ponsel admin untuk melengkapi profile cetak tiket.
                  </p>
                </div>

                <form onSubmit={handleSaveProfile} className="max-w-xl space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nama Administrator</label>
                    <input
                      type="text"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-900 py-3 px-4 text-xs rounded-xl outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Alamat Email Kontak</label>
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-900 py-3 px-4 text-xs rounded-xl outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nomor Ponsel Aktif</label>
                    <input
                      type="tel"
                      value={adminPhone}
                      onChange={(e) => setAdminPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-900 py-3 px-4 text-xs rounded-xl outline-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-6 py-3 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-semibold cursor-pointer active:scale-[0.98] transition-all ml-auto.0"
                  >
                    <Check className="w-4 h-4" />
                    <span>Perbarui Informasi</span>
                  </button>
                </form>
              </div>
            )}

            {/* TAB CONTENT: EDIT APP SETTINGS BRANDING */}
            {activeTab === 'app-settings' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="font-display text-xl font-bold tracking-tight text-slate-800">
                    Pengaturan Konfigurasi Nama dan Logo Aplikasi
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Sesuaikan identitas digital bioskop Anda. Perubahan di sini akan langsung merubah logo utama dan nama aplikasi baik di Layar Login, Dashboard Admin, maupun Dashboard Pembeli tiket secara global & real-time.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                  
                  {/* Branding update form */}
                  <div className="md:col-span-6 bg-slate-50 border border-slate-100 rounded-xl p-5 space-y-4">
                    <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-500">Edit Identitas</h3>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nama Aplikasi Bioskop</label>
                        <input
                          type="text"
                          value={branding.appName}
                          onChange={(e) => setBranding(prev => ({ ...prev, appName: e.target.value }))}
                          placeholder="E.g. CineTicket atau BioskopKu"
                          className="w-full bg-white border border-slate-200 focus:border-blue-900 py-2.5 px-3.5 text-xs rounded-lg outline-none font-sans"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center justify-between">
                          <span>Karakter Logo / Simbol Emoji</span>
                          <span className="text-[9.5px] font-normal text-slate-400 font-mono">(Length: 1-2 char)</span>
                        </label>
                        <input
                          type="text"
                          maxLength={3}
                          value={branding.appLogoChar}
                          onChange={(e) => setBranding(prev => ({ ...prev, appLogoChar: e.target.value }))}
                          placeholder="E.g. C atau 🎬 atau 🍿"
                          className="w-full bg-white border border-slate-200 focus:border-blue-900 py-2.5 px-3.5 text-xs rounded-lg outline-none font-sans"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                          Saldo Awal Registrasi Akun Baru (Rp)
                        </label>
                        <input
                          type="number"
                          value={branding.defaultBuyerBalance !== undefined ? branding.defaultBuyerBalance : 100000}
                          onChange={(e) => setBranding(prev => ({ ...prev, defaultBuyerBalance: Number(e.target.value) }))}
                          placeholder="Nominal default, e.g. 100000"
                          className="w-full bg-white border border-slate-200 focus:border-blue-900 py-2.5 px-3.5 text-xs font-bold rounded-lg outline-none font-mono"
                        />
                        <p className="text-[9px] text-slate-400 mt-1">
                          Nominal saldo cuma-cuma yang langsung diberikan ketika pembeli mendaftarkan akun baru.
                        </p>
                      </div>
                    </div>

                    <div className="pt-2">
                       <button
                        type="button"
                        onClick={() => triggerFeedback('success', 'Konfigurasi aplikasi berhasil disimpan di cloud database secara global!')}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Check className="w-4 h-4" />
                        <span>Simpan Konfigurasi Aplikasi</span>
                      </button>
                    </div>
                  </div>

                  {/* Real-time preview */}
                  <div className="md:col-span-6 border border-slate-150 rounded-xl p-5 space-y-5">
                    <h3 className="font-display font-medium text-[11px] uppercase tracking-wider text-slate-500">Pratinjau Visual secara Real-time (Live Previews)</h3>
                    
                    <div className="space-y-4">
                      {/* Sub-preview 1: Login Header */}
                      <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 flex flex-col items-center">
                        <span className="text-[10px] font-mono text-slate-400 uppercase mb-2">Login Header Preview</span>
                        <div className="inline-flex items-center justify-center gap-2 border border-slate-200/40 px-4 py-2 rounded-lg bg-white">
                          <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center text-xs font-bold text-white">
                            {branding.appLogoChar || '🎬'}
                          </div>
                          <span className="font-display font-black text-sm tracking-tight text-slate-800">
                            {branding.appName || 'CineTicket'}
                          </span>
                        </div>
                      </div>

                      {/* Sub-preview 2: Navbar */}
                      <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                        <span className="text-[10px] block font-mono text-slate-400 uppercase mb-2 text-center">Buyer Navbar Preview</span>
                        <div className="bg-white border border-slate-150 rounded-lg py-2 px-3 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-[10px] font-bold text-white">
                              {branding.appLogoChar || '🎬'}
                            </div>
                            <span className="font-display font-bold text-xs text-slate-800">
                              {branding.appName || 'CineTicket'}
                            </span>
                          </div>
                          <span className="text-[9px] bg-slate-100 border px-1.5 py-0.5 rounded text-slate-400 font-mono">Tiket Saya</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-450 text-slate-500 leading-normal pl-1.5 border-l-2 border-slate-205">
                      💡 Perubahan identitas ini langsung dipasang di header serta navbar di seluruh sesi pembeli & admin lainnya, menjaga integrasi sistem (White Label).
                    </div>
                  </div>

                </div>

                {/* MASTER CLOUD DATA MANAGEMENT CENTER (ZONA BAHAYA) */}
                <div id="danger-zone-db" className="border border-red-200 bg-red-50/20 rounded-2xl p-6 mt-8 space-y-4">
                  <div className="flex items-start gap-3">
                    <Trash2 className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-display font-semibold text-sm text-slate-800">
                        Pusat Kendali & Reset Database Cloud (Zona Bahaya)
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Gunakan tombol di bawah ini untuk mengosongkan seluruh database bioskop secara cloud terintegrasi (Firebase Firestore). Tindakan ini bersifat permanen dan akan menghapus semua film, teater, jadwal penayangan, riwayat transaksi pemesanan tiket, daftar voucher, serta akun pembeli terdaftar secara instan.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      id="btn-clear-db"
                      type="button"
                      onClick={async () => {
                        const verified = confirm("PERINGATAN KRITIKAL! Apakah Anda yakin ingin MENGOSONGKAN SELURUH DATABASE bioskop (termasuk katalog film)? Semua data di Firestore akan dibersihkan secara total.");
                        if (verified) {
                          try {
                            await onClearDatabase();
                            triggerFeedback('success', 'Database berhasil dikosongkan secara total! Semua data Firestore telah dibersihkan.');
                          } catch (err) {
                            triggerFeedback('error', 'Gagal membersihkan database: ' + String(err));
                          }
                        }
                      }}
                      className="bg-red-600 hover:bg-red-750 text-white font-display font-medium px-5 py-3 text-xs rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>KOSONGKAN SEMUA DATABASE (BLANKO)</span>
                    </button>

                    <button
                      id="btn-seed-db"
                      type="button"
                      onClick={async () => {
                        const verified = confirm("Apakah Anda yakin ingin mengatur ulang database ke status sampel awal (Seed Data Default)? Semua transaksi aktif saat ini akan dibersihkan.");
                        if (verified) {
                          try {
                            await onSeedDatabase();
                            triggerFeedback('success', 'Database berhasil di-reset ke sampel data default bawaan sistem!');
                          } catch (err) {
                            triggerFeedback('error', 'Gagal memuat sampel data: ' + String(err));
                          }
                        }
                      }}
                      className="bg-white border border-slate-205 hover:bg-slate-50 text-slate-700 font-display font-medium px-5 py-3 text-xs rounded-xl transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-4 h-4 text-slate-500" />
                      <span>RESET DATABASE KE DEFAULT (LOAD SAMPLES)</span>
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* TAB CONTENT: CORETAX DJP COMPLIANCE PLATFORM SIMULATOR */}
            {activeTab === 'coretax' && (() => {
              // Derived values for the current CoreTax filling month
              const coreTaxGrossRevenue = bookings.reduce((sum, b) => sum + (b.pricePaid || 0), 0);
              const coreTaxAmountDue = Math.round(coreTaxGrossRevenue * (taxRate / 100));

              // Simulating the API Transmission
              const triggerCoreTaxApiTransmission = () => {
                setIsApiLoading(true);
                setCoreTaxStatus('API_TRANSMITTING');
                setApiLogs([]);
                
                const logs = [
                  "🔄 [1/8] DJP INTEGRATION: Melakukan handshake kriptografi SSL dengan gateway...",
                  "🔑 [2/8] Authorizing via client credentials... DJP-BEARER-JWT divalidasi.",
                  "📝 [3/8] Menyiapkan payload XML/JSON PPN Masa Pajak Mei 2026...",
                  "🔍 [4/8] DJP API: Validasi NPWP '01.234.567.8-012.000' (Status Wajib Pajak: AKTIF - Patuh).",
                  "📊 [5/8] DJP API: Rekonsiliasi akuntansi (Omzet Gross: Rp " + coreTaxGrossRevenue.toLocaleString('id-ID') + ", PPN Terutang (" + taxRate + "%): Rp " + coreTaxAmountDue.toLocaleString('id-ID') + ").",
                  "💾 [6/8] DJP API: Menyimpan e-Faktur Pajak Masa Mei 2026 di Sistem Cloud DJP pusat...",
                  "🎫 [7/8] DJP API: Mengonfirmasi kesesuaian SPT Masa & menerbitkan Kode e-Billing...",
                  "🚀 [8/8] DJP API: Sinkronisasi tuntas! HTTP 201 Created. Kode billing siap dibayar."
                ];

                let currentLogIndex = 0;
                const interval = setInterval(() => {
                  if (currentLogIndex < logs.length) {
                    setApiLogs(prev => [...prev, logs[currentLogIndex]]);
                    currentLogIndex++;
                  } else {
                    clearInterval(interval);
                    setIsApiLoading(false);
                    const generatedBilling = Math.floor(100000000000000 + Math.random() * 900000000000000).toString();
                    setCoreTaxBillingCode(generatedBilling);
                    localStorage.setItem('cinema_coretax_billing_code', generatedBilling);
                    setCoreTaxStatus('BILLING_PAYMENT');
                    localStorage.setItem('cinema_coretax_status', 'BILLING_PAYMENT');
                    triggerFeedback('success', "API DJP berhasil terhubung! Kode Billing berhasil diterbitkan oleh CoreTax.");
                  }
                }, 750);
              };

              // Simulating the Bank Persepsi Payment
              const processCoreTaxPayment = () => {
                setIsApiLoading(true);
                setTimeout(() => {
                  const generatedNtpn = "NTPN-" + Math.random().toString(36).substring(2, 10).toUpperCase() + Math.floor(1000 + Math.random() * 9000);
                  setCoreTaxNtpn(generatedNtpn);
                  localStorage.setItem('cinema_coretax_ntpn', generatedNtpn);
                  setCoreTaxStatus('PAID');
                  localStorage.setItem('cinema_coretax_status', 'PAID');
                  setIsApiLoading(false);
                  triggerFeedback('success', "Pajak PPN senilai Rp " + coreTaxAmountDue.toLocaleString('id-ID') + " berhasil dilunasi ke Kas Negara!");
                }, 1200);
              };

              // Simulating final reporting step
              const finaliseCoreTaxReporting = () => {
                setIsApiLoading(true);
                setTimeout(() => {
                  const hash = "BPE-" + Math.random().toString(36).substring(2, 12).toUpperCase() + "-" + Date.now().toString().slice(-4);
                  setCoreTaxBpeHash(hash);
                  localStorage.setItem('cinema_coretax_bpe_hash', hash);
                  setCoreTaxStatus('REPORTED');
                  localStorage.setItem('cinema_coretax_status', 'REPORTED');
                  
                  // Add to history
                  const newReportLog = {
                    id: "TAX-2026-05",
                    masaPajak: "Masa Pajak Mei 2026",
                    omzet: coreTaxGrossRevenue,
                    nominalPajak: coreTaxAmountDue,
                    billingCode: coreTaxBillingCode,
                    ntpn: coreTaxNtpn,
                    bpeHash: hash,
                    timestamp: new Date().toISOString()
                  };
                  const updatedHistory = [newReportLog, ...coreTaxHistory];
                  setCoreTaxHistory(updatedHistory);
                  localStorage.setItem('cinema_coretax_history', JSON.stringify(updatedHistory));
                  
                  setIsApiLoading(false);
                  triggerFeedback('success', "Kepatuhan Pajak Bulanan Sukses! Bukti Penerimaan Elektronik (BPE) resmi telah diterbitkan.");
                }, 1250);
              };

              // Safe reset for demonstration
              const resetCoreTaxDemo = () => {
                setCoreTaxStatus('DRAFT');
                setCoreTaxBillingCode('');
                setCoreTaxNtpn('');
                setCoreTaxBpeHash('');
                setApiLogs([]);
                localStorage.setItem('cinema_coretax_status', 'DRAFT');
                localStorage.removeItem('cinema_coretax_billing_code');
                localStorage.removeItem('cinema_coretax_ntpn');
                localStorage.removeItem('cinema_coretax_bpe_hash');
                triggerFeedback('success', "Simulator CoreTax berhasil di-reset untuk pengujian ulang!");
              };

              return (
                <div className="space-y-6 animate-fade-in text-slate-800">
                  {/* Government Style Header */}
                  <div className="bg-gradient-to-r from-blue-900 to-slate-800 rounded-2xl p-5 md:p-6 text-white border border-blue-950 relative overflow-hidden shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="absolute right-0 top-0 opacity-10 text-9xl transform translate-x-12 translate-y-8 select-none pointer-events-none">印</div>
                    <div className="space-y-1.5 max-w-xl">
                      <div className="flex items-center gap-2">
                        <span className="bg-amber-400 text-slate-900 text-[9px] font-extrabold px-2 py-0.5 rounded tracking-wider uppercase font-mono">DJP CoreTax System</span>
                        <span className="text-slate-300 font-mono text-[10px]">• Portal Kepatuhan Pajak Mandiri</span>
                      </div>
                      <h2 className="font-display text-xl font-bold tracking-tight text-white">
                        Pusat Integrasi & Pelaporan Pajak CoreTax DJP
                      </h2>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">
                        Sistem simulasi kepatuhan pajak bioskop dengan menyajikan visualisasi e-Faktur terintegrasi API DJP (Direktorat Jenderal Pajak). Hitung, terbitkan kode e-Billing negara, bayar via bank persepsi, dan dapatkan Bukti Penerimaan Elektronik (BPE).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={resetCoreTaxDemo}
                      className="px-3.5 py-1.5 self-start md:self-center bg-white/10 hover:bg-white/20 active:scale-[0.97] transition-all rounded-lg text-white font-mono text-[11px] font-bold border border-white/25 cursor-pointer flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Ulangi Alur Simulasi</span>
                    </button>
                  </div>

                  {/* STEPPER PROGRESS */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                    <div className={`p-2.5 rounded-lg border transition-all ${coreTaxStatus === 'DRAFT' ? 'bg-white border-blue-500 shadow-tiny text-blue-900 font-bold' : 'bg-transparent border-transparent text-slate-400'}`}>
                      <span className="block text-[10px] font-bold font-mono uppercase tracking-wider mb-0.5">Langkah 1</span>
                      <span className="text-xs font-bold font-display block font-sans">Rekonsiliasi & Hitung</span>
                    </div>
                    <div className={`p-2.5 rounded-lg border transition-all ${coreTaxStatus === 'API_TRANSMITTING' || coreTaxStatus === 'SUBMITTED' ? 'bg-white border-blue-500 shadow-tiny text-blue-900 font-bold' : 'bg-transparent border-transparent text-slate-400'} ${coreTaxStatus !== 'DRAFT' && coreTaxStatus !== 'API_TRANSMITTING' ? 'text-emerald-600 font-semibold' : ''}`}>
                      <span className="block text-[10px] font-bold font-mono uppercase tracking-wider mb-0.5">Langkah 2</span>
                      <span className="text-xs font-bold font-display block font-sans">{coreTaxStatus !== 'DRAFT' && coreTaxStatus !== 'API_TRANSMITTING' ? '✓ API Terkirim' : 'Kirim REST API'}</span>
                    </div>
                    <div className={`p-2.5 rounded-lg border transition-all ${coreTaxStatus === 'BILLING_PAYMENT' ? 'bg-white border-blue-500 shadow-tiny text-blue-900 font-bold' : 'bg-transparent border-transparent text-slate-400'} ${coreTaxStatus === 'PAID' || coreTaxStatus === 'REPORTED' ? 'text-emerald-600 font-bold' : ''}`}>
                      <span className="block text-[10px] font-bold font-mono uppercase tracking-wider mb-0.5">Langkah 3</span>
                      <span className="text-xs font-bold font-display block font-sans">Pembayaran Billing</span>
                    </div>
                    <div className={`p-2.5 rounded-lg border transition-all ${coreTaxStatus === 'REPORTED' ? 'bg-white border-blue-500 shadow-tiny text-blue-900 font-bold' : 'bg-transparent border-transparent text-slate-400'}`}>
                      <span className="block text-[10px] font-bold font-mono uppercase tracking-wider mb-0.5">Langkah 4</span>
                      <span className="text-xs font-bold font-display block font-sans">Selesai & Bukti BPE</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* LEFT PANEL: ACTIVE PROCESS */}
                    <div className="lg:col-span-7 space-y-6">
                      
                      {/* STEP 1: CALCULATE DRAFT TAX */}
                      {coreTaxStatus === 'DRAFT' && (
                        <div className="bg-white border border-slate-150 rounded-xl p-5 space-y-4 shadow-tiny">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 bg-blue-900 text-white rounded-full flex items-center justify-center text-[11px] font-mono font-bold">1</span>
                            <h3 className="font-display font-bold text-sm text-slate-800">Hitung Nilai Pajak Terutang (Masa Pajak Berjalan)</h3>
                          </div>
                          
                          <p className="text-xs text-slate-500 leading-normal font-sans">
                            Berdasarkan realisasi seluruh penjualan tiket film bioskop yang terdaftar di sistem database saat ini, berikut adalah rincian omzet bruto serta beban PPN Daerah ({taxRate}%) yang terutang dan harus dilaporkan kepada Direktorat Jenderal Pajak:
                          </p>

                          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500">Masa Pajak Terdaftar</span>
                              <span className="font-bold font-mono">Mei 2026</span>
                            </div>
                            <div className="border-t border-slate-200/60 my-2"></div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500">Jumlah Transaksi Beli Tiket</span>
                              <span className="font-bold font-mono">{bookings.length} Transaksi</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500">Total Omzet Bruto (Gross)</span>
                              <span className="font-bold font-mono text-slate-900">Rp {coreTaxGrossRevenue.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="border-t border-slate-200/60 my-2"></div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-blue-900 font-bold">Pajak Negara PB1 / PPN Terutang ({taxRate}%)</span>
                              <span className="font-mono font-extrabold text-red-600 text-sm">Rp {coreTaxAmountDue.toLocaleString('id-ID')}</span>
                            </div>
                          </div>

                          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-start gap-2.5">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div className="text-[10.5px] text-amber-800 leading-relaxed font-sans">
                              <strong>Instruksi Alur API:</strong> Untuk mendaftarkan pelaporan pajak ini ke server DJP pusat secara digital, Anda harus mentransfer payload data berformat JSON ke endpoint CoreTax DJP API. Silakan tekan tombol kirim di bawah untuk melakukan simulasi integrasi API asinkronus secara digital.
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={coreTaxGrossRevenue === 0}
                            onClick={triggerCoreTaxApiTransmission}
                            style={{ cursor: coreTaxGrossRevenue === 0 ? 'not-allowed' : 'pointer' }}
                            className={`w-full py-3 ${coreTaxGrossRevenue === 0 ? 'bg-slate-350' : 'bg-blue-650 hover:bg-blue-700 active:scale-[0.99]'} text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm text-center font-display font-sans`}
                          >
                            <FileText className="w-4 h-4 text-amber-400" />
                            <span>KIRIM DATA SPT MASA VIA DJP REST API</span>
                          </button>
                          
                          {coreTaxGrossRevenue === 0 && (
                            <p className="text-[10px] text-red-500 text-center font-semibold font-sans">
                              ⚠️ Tidak ada transaksi tiket masuk untuk dihitung nilai pajaknya! Harap beli tiket via Dashboard Pembeli terlebih dahulu.
                            </p>
                          )}
                        </div>
                      )}

                      {/* STEP 2: API TRANSMITTING LOGGER */}
                      {coreTaxStatus === 'API_TRANSMITTING' && (
                        <div className="bg-white border border-slate-150 rounded-xl p-5 space-y-4 shadow-tiny">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 bg-blue-900 text-white rounded-full flex items-center justify-center text-[11px] font-mono font-bold">2</span>
                            <h3 className="font-display font-bold text-sm text-slate-800">Mentransfer Data SPT Pajak (Aktivitas Real-time API)</h3>
                          </div>

                          <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                            <div className="w-4 h-4 border-2 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs text-blue-900 font-mono font-semibold">Menghubungi endpoint https://api.pajak.go.id/v1/spt/mei-2026 ...</span>
                          </div>

                          <div className="bg-slate-900 text-slate-200 font-mono text-[10.5px] p-4 rounded-xl space-y-2 h-48 overflow-y-auto border border-slate-800 shadow-inner">
                            {apiLogs.map((log, index) => (
                              <div key={index} className="animate-fade-in text-emerald-400 font-mono">
                                {log}
                              </div>
                            ))}
                            <span className="block w-2 h-4 bg-emerald-400 animate-pulse inline-block"></span>
                          </div>
                          
                          <p className="text-[10px] text-slate-400 italic text-center text-xs font-sans">
                            Menguji ketahanan model, integrasi webhook, keamanan enkripsi payload, dan skema respons.
                          </p>
                        </div>
                      )}

                      {/* STEP 3: BILLING PAYMENT STATUS */}
                      {coreTaxStatus === 'BILLING_PAYMENT' && (
                        <div className="bg-white border border-slate-150 rounded-xl p-5 space-y-4 shadow-tiny">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 bg-blue-900 text-white rounded-full flex items-center justify-center text-[11px] font-mono font-bold">3</span>
                            <h3 className="font-display font-bold text-sm text-slate-800">Surat Setoran Elektronik (SSE) & Tagihan Pajak Negara</h3>
                          </div>

                          <p className="text-xs text-slate-500 leading-normal font-sans">
                            Data e-Faktur/SPT telah masuk dan terdaftar di log coretax DJP. Silakan lakukan pembayaran tagihan pajak negara senilai nominal di bawah ke rekening Kas Negara menggunakan Kode e-Billing resmi:
                          </p>

                          {/* BILLING SLIP */}
                          <div className="border border-amber-300 bg-amber-50/40 rounded-xl p-4 space-y-3 relative overflow-hidden">
                            <div className="absolute right-2 top-2 text-3xl opacity-20 filter grayscale text-amber-700">🧾</div>
                            <span className="text-[9px] bg-amber-400 text-slate-900 font-extrabold px-1.5 py-0.5 rounded tracking-wider uppercase font-mono">ID KODE BILLING NEGARA</span>
                            
                            <div className="my-1.5">
                              <span className="block text-[10px] text-slate-500 uppercase">KODE BILLING</span>
                              <span className="text-2xl font-mono font-bold tracking-widest text-slate-900">{coreTaxBillingCode}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-xs font-sans">
                              <div>
                                <span className="block text-[10px] text-slate-500 uppercase font-bold">Wajib Pajak (Cinema)</span>
                                <span className="font-semibold">{branding.appName} Global</span>
                              </div>
                              <div>
                                <span className="block text-[10px] text-slate-500 uppercase font-bold text-slate-400">NPWP</span>
                                <span className="font-mono font-semibold">01.234.567.8-012.000</span>
                              </div>
                              <div>
                                <span className="block text-[10px] text-slate-500 uppercase font-bold text-slate-400">Masa Pajak / MAP</span>
                                <span className="font-semibold">Mei 2026 / 411124 (PPN)</span>
                              </div>
                              <div>
                                <span className="block text-[10px] text-slate-500 uppercase font-bold text-slate-400">Jumlah yang Harus Dibayar</span>
                                <span className="font-mono font-bold text-red-600">Rp {coreTaxAmountDue.toLocaleString('id-ID')}</span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-slate-50 border p-3 rounded-lg text-xs space-y-1 text-slate-600 font-sans">
                            <strong>Alur Penyetoran Negara:</strong>
                            <p className="text-[11px] leading-relaxed">
                              Pembayaran ini menggunakan integrasi multipihak MPN G3 (Modul Penerimaan Negara Generasi 3) secara elektronik. Ketika tombol bayar diklik, sistem akan mengirimkan instruksi debet langsung ke Bank Persepsi BUMN untuk melunasi tagihan pajak kasir bioskop.
                            </p>
                          </div>

                          {isApiLoading ? (
                            <div className="w-full py-3 bg-slate-150 border rounded-xl font-bold font-display text-xs text-slate-500 flex items-center justify-center gap-2 font-sans">
                              <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
                              <span>Memproses Debet Saldo ke Kas Negara...</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={processCoreTaxPayment}
                              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm text-center font-display font-sans cursor-pointer"
                            >
                              <Coins className="w-4 h-4 text-emerald-250 animate-pulse" />
                              <span>BAYAR PAJAK VIA BANK PERSEPSI NEGARA (SIMULASI DEBET)</span>
                            </button>
                          )}
                        </div>
                      )}

                      {/* STEP 4: STATE TAX PAID - FINALISE SUBMISSION */}
                      {coreTaxStatus === 'PAID' && (
                        <div className="bg-white border border-slate-150 rounded-xl p-5 space-y-4 shadow-tiny">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 bg-blue-900 text-white rounded-full flex items-center justify-center text-[11px] font-mono font-bold">4</span>
                            <h3 className="font-display font-bold text-sm text-slate-800">Pelunasan Pajak Berhasil (State Receipt Verified)</h3>
                          </div>

                          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 font-sans">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold shrink-0 text-sm">✓</div>
                            <div>
                              <p className="text-xs font-bold text-emerald-800 font-sans">Bukti Penerimaan Negara (BPN) Berhasil Divalidasi</p>
                              <p className="text-[11px] text-slate-500 font-sans">Nomor Transaksi Penerimaan Negara (NTPN) diterbitkan secara instan oleh kementerian keuangan.</p>
                            </div>
                          </div>

                          <div className="bg-slate-50 border rounded-xl p-4 text-xs font-mono space-y-2">
                            <div className="flex justify-between">
                              <span className="text-slate-500 text-[10px] font-mono">NOMOR SAKTI NTPN:</span>
                              <span className="font-bold text-slate-800 tracking-wider font-mono">{coreTaxNtpn}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500 text-[10px] font-mono">TANGGAL SETOR:</span>
                              <span className="font-mono text-slate-800">{new Date().toLocaleDateString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500 text-[10px] font-mono">NOMINAL DISALURKAN:</span>
                              <span className="font-bold text-emerald-650 font-mono">Rp {coreTaxAmountDue.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500 text-[10px] font-mono">TUJUAN RECEIPT:</span>
                              <span className="font-mono">KAS NEGARA INDONESIA (DJP-MEI-2026)</span>
                            </div>
                          </div>

                          <p className="text-xs leading-relaxed text-slate-500 font-sans">
                            Pajak bioskop Anda PPN / PB1 sebesar <strong>Rp {coreTaxAmountDue.toLocaleString('id-ID')}</strong> telah divalidasi lunas secara legal dari kas internal Anda. Langkah terakhir adalah menerbitkan Sertifikat Pelaporan SPT Pajak dari server CoreTax pusat guna mendapatkan status wajib pajak patuh.
                          </p>

                          {isApiLoading ? (
                            <div className="w-full py-3 bg-slate-150 border rounded-xl font-bold font-display text-xs text-slate-500 flex items-center justify-center gap-2 font-sans">
                              <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
                              <span>Memverifikasi Akhir Laporan SPT & Menerbitkan BPE...</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={finaliseCoreTaxReporting}
                              className="w-full py-3 bg-blue-900 hover:bg-blue-950 active:scale-[0.99] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm text-center font-display font-sans cursor-pointer"
                            >
                              <FileText className="w-4 h-4 text-amber-400" />
                              <span>PROSES AKHIR LAPORAN & TERBITKAN BUKTI BPE</span>
                            </button>
                          )}
                        </div>
                      )}

                      {/* STEP 5: COMPLIANCE ARCHIVED (REPORTED STATUS) */}
                      {coreTaxStatus === 'REPORTED' && (
                        <div className="bg-white border border-slate-150 rounded-xl p-5 space-y-4 shadow-tiny">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center text-[11px] font-mono font-bold">✓</span>
                              <h3 className="font-display font-bold text-sm text-emerald-800">E-Filing Masa Pajak Selesai & Berhasil</h3>
                            </div>
                            <span className="bg-emerald-100 text-[8.5px] text-emerald-700 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">Patuh Pajak</span>
                          </div>

                          {/* BPE OFFICIAL SLIP RECEIPT */}
                          <div className="border-2 border-slate-800 p-5 bg-stone-50 rounded-xl space-y-4 font-mono text-[11px] relative shadow-md">
                            <div className="absolute right-4 top-4 border-2 border-emerald-600 rounded-lg p-1 text-center transform rotate-6 scale-90 select-none bg-white font-mono">
                              <span className="block text-[8px] font-bold text-emerald-600 font-mono">DJP DJP DJP</span>
                              <span className="block text-[10px] font-black text-emerald-600 font-mono uppercase tracking-wider">RECEIVED</span>
                              <span className="block text-[7px] text-slate-400 font-mono font-normal">CoreTax Approved</span>
                            </div>

                            <div className="text-center font-sans border-b border-dashed border-slate-305 pb-3">
                              <p className="font-bold text-xs">DIREKTORAT JENDERAL PAJAK</p>
                              <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5 font-bold">BUKTI PENERIMAAN ELEKTRONIK (BPE)</p>
                            </div>

                            <div className="space-y-1.5 leading-relaxed pt-2 text-slate-755 font-mono">
                              <p>NAMA WAJIB PAJAK : <span className="font-bold">{branding.appName.toUpperCase()} GLOBAL CINEMA</span></p>
                              <p>NPWP            : <span className="font-bold">01.234.567.8-012.000</span></p>
                              <p>MASA / TAHUN PJ  : <span className="font-bold">05 / 2026</span></p>
                              <p>JENIS PAJAK     : <span className="font-bold">PPN DALAM NEGERI (JASA TIKET)</span></p>
                              <p>KODE BILLING    : <span className="font-bold">{coreTaxBillingCode}</span></p>
                              <p>NTPN SEBELUMNYA : <span className="font-bold">{coreTaxNtpn}</span></p>
                              <p>NOMINAL SETOR   : <span className="font-bold text-emerald-700">Rp {coreTaxAmountDue.toLocaleString('id-ID')}</span></p>
                              <p>STATUS SPT      : <span className="font-bold text-emerald-700">[NIHIL - SELESAI SINKRONISASI]</span></p>
                            </div>

                            <div className="border-t border-dashed border-slate-300 pt-3 flex flex-col md:flex-row items-center justify-between gap-4 font-sans text-[10px]">
                              <div>
                                <p className="text-[9px] text-slate-450 text-slate-400">Security Verification Code (SHA-1):</p>
                                <p className="font-mono text-[9px] text-slate-600 font-bold select-all break-all">{coreTaxBpeHash}</p>
                              </div>
                              <div className="w-12 h-12 bg-white border border-slate-200 flex items-center justify-center font-mono text-[6px] text-slate-400 text-center uppercase tracking-tighter shrink-0 select-none font-bold">
                                QR CODE VERIFIKASI DJP
                              </div>
                            </div>
                          </div>

                          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs flex items-start gap-2.5 font-sans">
                            <span className="text-xl">🎉</span>
                            <div className="text-blue-900 leading-relaxed font-sans">
                              <strong>Kepatuhan Bulanan Tercapai!</strong> Bioskop Anda telah menunaikan kewajiban kenegaraan secara otomatis menggunakan alur API sistem CoreTax. Anda patuh terhadap regulasi pajak pusat dan daerah sehingga operasional aman dari penalti.
                            </div>
                          </div>
                        </div>
                      )}

                    </div>

                    {/* RIGHT PANEL: TECHNICAL REST API SPECIFICATION DOCS & FLOW SCHEMA */}
                    <div className="lg:col-span-5 space-y-6">
                      
                      {/* STATS BREAKDOWN */}
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3 font-sans">
                        <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-widest block font-mono">STATUS KEPATUHAN PAJAK</span>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">Status Wajib Pajak</span>
                          <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">AKTIF (PATUH)</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500 font-sans">ID Perangkat Sistem</span>
                          <span className="text-xs font-bold font-mono text-slate-700">CINE-DJP-G3X</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500 font-sans">Penanggung Jawab</span>
                          <span className="text-xs font-bold text-slate-750 font-mono">PT BIOSKOP NUSANTARA</span>
                        </div>
                      </div>

                      {/* TECHNICAL JSON API INTERACTIVE SCHEMA PREVIEW */}
                      <div className="bg-slate-900 text-slate-300 rounded-xl p-4 font-mono text-[10.5px] space-y-2 border border-slate-800 shadow-md">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 text-slate-400 text-[9.5px]">
                          <span>REST API REQUEST SPECIFICATION</span>
                          <span className="bg-amber-400/25 border border-amber-400/35 text-amber-300 text-[8px] font-mono font-bold px-1 rounded uppercase tracking-wider">JSON SCHEMA</span>
                        </div>
                        
                        <div className="text-slate-400 text-[10px] space-y-1">
                          <p className="text-emerald-400"><strong className="text-slate-200 font-mono">METHOD:</strong> POST</p>
                          <p className="text-emerald-400"><strong className="text-slate-200 font-mono">ENDPOINT:</strong> <span className="select-all block text-[9.5px] break-all bg-slate-950 p-1 rounded font-mono mt-0.5 text-blue-300">https://api.pajak.go.id/v1/spt-masa/PPN</span></p>
                        </div>
                        
                        <div className="border-t border-slate-800 my-2"></div>
                        
                        <span className="text-[9.5px] text-slate-500 uppercase block font-semibold font-mono">PAYLOAD SENT TO CORETAX:</span>
                        <pre className="text-slate-200 whitespace-pre-wrap select-all font-mono text-[9px] bg-slate-950 p-2 rounded max-h-48 overflow-y-auto leading-normal">
{`{
  "npwp": "01.234.567.8-012.000",
  "wajib_pajak": "${branding.appName.toUpperCase()} GLOBAL CORP",
  "masa_pajak": "05-2026",
  "tarif_pajak_persen": ${taxRate},
  "omzet_bruto_rp": ${coreTaxGrossRevenue},
  "pajak_terutang_rp": ${coreTaxAmountDue},
  "transaksi_count": ${bookings.length},
  "metadata": {
    "pos_version": "POS-BIOSKOP-G3.2",
    "signature": "SHA256:${coreTaxBpeHash || 'SINKRONISASI-TERCATAT-DJP'}"
  }
}`}
                        </pre>

                        <div className="border-t border-slate-800 my-2"></div>
                        <span className="text-[9px] text-slate-500 font-semibold italic block font-sans">
                          💡 CoreTax DJP API membutuhkan parameter integrasi di atas untuk merekap data secara instan dari POS penonton ke kas negara.
                        </span>
                      </div>

                    </div>

                  </div>

                  {/* REPORT HISTORY ARCHIVE FOOTER */}
                  <div className="bg-white border border-slate-150 rounded-2xl p-5 space-y-4 shadow-tiny font-sans">
                    <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center justify-between font-sans">
                      <span>Arsip Pelaporan SPT Pajak Terproses (Historical compliance logs)</span>
                      <span className="font-mono text-[10px] text-slate-450">{coreTaxHistory.length} Record Terpilih</span>
                    </h3>

                    <div className="overflow-x-auto border border-slate-100 rounded-xl">
                      <table className="w-full text-left text-xs font-sans">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-[9px] font-bold font-sans">
                            <th className="p-3">ID Log</th>
                            <th className="p-3">Masa</th>
                            <th className="p-3 text-right">Omzet Bruto</th>
                            <th className="p-3 text-right">Setoran Pajak</th>
                            <th className="p-3">Kode Billing</th>
                            <th className="p-3 font-mono">NTPN</th>
                            <th className="p-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans">
                          {coreTaxHistory.map((historyItem) => (
                            <tr key={historyItem.id} className="hover:bg-slate-50 font-sans">
                              <td className="p-3 font-mono text-[10px] font-bold text-slate-600">{historyItem.id}</td>
                              <td className="p-3 font-medium font-sans">{historyItem.masaPajak}</td>
                              <td className="p-3 text-right font-mono">Rp {historyItem.omzet.toLocaleString('id-ID')}</td>
                              <td className="p-3 text-right font-mono font-semibold text-emerald-650">Rp {historyItem.nominalPajak.toLocaleString('id-ID')}</td>
                              <td className="p-3 font-mono text-slate-500 text-[11px]">{historyItem.billingCode || '-'}</td>
                              <td className="p-3 font-mono text-slate-500 text-[10px] uppercase">{historyItem.ntpn || '-'}</td>
                              <td className="p-3 font-semibold text-[10px] font-sans">
                                {historyItem.bpeHash ? (
                                  <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded tracking-wide border border-emerald-100 font-mono">✓ REPORTED</span>
                                ) : (
                                  <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded tracking-wide border border-amber-100 font-sans">DRAFT</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              );
            })()}

          </main>

        </div>
      </div>

      {/* VOUCHER PRINTING OVERLAY MODAL */}
      {printModalVouchers && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col animate-fade-in text-slate-800">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="font-display font-bold text-base text-slate-800 flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-amber-500 animate-pulse" />
                  <span>Kupon Fisik Siap Cetak (Voucher Printer)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Total {printModalVouchers.length} voucher terpilih. Tekan tombol cetak di bawah atau potong menggunakan garis putus-putus.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPrintModalVouchers(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Content - Scrollable tickets sheet */}
            <div id="printable-voucher-sheet" className="flex-1 overflow-y-auto p-4 bg-slate-100 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-4">
              {printModalVouchers.map((v, i) => (
                <div 
                  key={v.id} 
                  className="bg-white border-2 border-dashed border-slate-350 rounded-2xl p-4 relative overflow-hidden flex flex-col justify-between shadow-sm min-h-[160px] cursor-default hover:border-slate-800 transition-colors"
                >
                  {/* Side Notch cutouts for ticket look */}
                  <div className="absolute -left-3 top-1/2 -mt-3 w-6 h-6 bg-slate-100 border-r-2 border-dashed border-slate-350 rounded-full" />
                  <div className="absolute -right-3 top-1/2 -mt-3 w-6 h-6 bg-slate-100 border-l-2 border-dashed border-slate-350 rounded-full" />

                  {/* Coupon Header */}
                  <div className="flex items-center justify-between">
                    <span className="font-display font-black text-xs tracking-tight text-blue-900 uppercase">
                      {branding.appName} GIFT TICKET
                    </span>
                    <span className="text-[10px] font-mono text-slate-405 font-bold">#{(i+1).toString().padStart(3, '0')}</span>
                  </div>

                  {/* Coupon Body */}
                  <div className="my-3 text-center">
                    <span className="text-[9px] font-bold text-slate-450 uppercase block tracking-widest text-slate-400">VOUCHER VALUE</span>
                    <h4 className="font-display font-black text-xl text-slate-800 tracking-tight leading-none mt-1">
                      Rp {v.amount.toLocaleString('id-ID')}
                    </h4>
                    
                    <div className="mt-3 bg-slate-50 border border-slate-100 p-2 rounded-xl">
                      <span className="text-[9px] text-slate-400 font-bold block mb-0.5 uppercase tracking-wide">REDEEM CODE:</span>
                      <span className="font-mono font-black text-sm text-slate-900 tracking-widest select-all block bg-white px-1 py-0.5 rounded border border-dashed border-slate-200">
                        {v.code}
                      </span>
                    </div>
                  </div>

                  {/* Coupon Footer */}
                  <div className="border-t border-dashed border-slate-150 pt-2 flex items-center justify-between text-[8px] text-slate-400 leading-tight">
                    <span>Cetak di atas kertas bioskop & gosok kode</span>
                    <span className="font-bold uppercase tracking-wider text-blue-900 text-[7px] bg-blue-50 px-1 py-0.5 rounded">TiketFisik</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Actions */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 max-w-sm font-medium leading-relaxed">
                Petunjuk: Sambungkan perangkat Anda ke printer, lalu potong voucher di sepanjang batas luar yang bergaris putus-putus.
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPrintModalVouchers(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 font-bold text-xs rounded-xl cursor-pointer transition-all"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      const vouchersHTML = printModalVouchers.map((v, i) => `
                        <div class="coupon">
                          <div class="header">
                            <span>${branding.appName.toUpperCase()} GIFT TICKET</span>
                            <span class="token-num">#${(i+1).toString().padStart(3, '0')}</span>
                          </div>
                          <div class="body">
                            <div style="font-size: 8px; font-weight: bold; color: #64748b; text-transform: uppercase;">Voucher Value</div>
                            <div class="value">Rp ${v.amount.toLocaleString('id-ID')}</div>
                            <div class="code-box">
                              <div class="code-title font-bold">REDEEM CODE (GOSOK DI SINI):</div>
                              <div class="code-text">${v.code}</div>
                            </div>
                          </div>
                          <div class="footer">
                            <span>Gosok & redeem kode di dompet beranda</span>
                            <span style="font-weight: bold; color: #1e3a8a;">WhiteLabel</span>
                          </div>
                        </div>
                      `).join('');

                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>Cetak Voucher - ${branding.appName}</title>
                            <style>
                              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@450;700;900&family=JetBrains+Mono:wght@700;900&display=swap');
                              body {
                                font-family: 'Inter', sans-serif;
                                background: white;
                                margin: 20px;
                                padding: 0;
                              }
                              .grid {
                                display: grid;
                                grid-template-columns: 1fr 1fr;
                                gap: 20px;
                              }
                              .coupon {
                                border: 2px dashed #64748b;
                                border-radius: 14px;
                                padding: 18px;
                                box-sizing: border-box;
                                min-height: 160px;
                                display: flex;
                                flex-direction: column;
                                justify-content: space-between;
                                page-break-inside: avoid;
                                background: white;
                              }
                              .header {
                                display: flex;
                                justify-content: space-between;
                                font-size: 11px;
                                font-weight: 950;
                                color: #1e3a8a;
                                text-transform: uppercase;
                                letter-spacing: 0.5px;
                              }
                              .token-num {
                                font-family: 'JetBrains Mono', monospace;
                                color: #94a3b8;
                              }
                              .body {
                                text-align: center;
                                margin: 4px 0;
                              }
                              .value {
                                font-size: 21px;
                                font-weight: 1000;
                                color: #0f172a;
                                margin: 2px 0;
                              }
                              .code-box {
                                background: #f8fafc;
                                border: 1.5px dashed #cbd5e1;
                                border-radius: 10px;
                                padding: 8px;
                                margin-top: 6px;
                              }
                              .code-title {
                                font-size: 7.5px;
                                color: #64748b;
                                font-weight: bold;
                                letter-spacing: 0.5px;
                              }
                              .code-text {
                                font-family: 'JetBrains Mono', monospace;
                                font-size: 14px;
                                font-weight: 950;
                                color: #020617;
                                letter-spacing: 1.5px;
                              }
                              .footer {
                                font-size: 8px;
                                color: #64748b;
                                display: flex;
                                justify-content: space-between;
                                border-top: 1px dashed #e2e8f0;
                                padding-top: 6px;
                              }
                            </style>
                          </head>
                          <body onload="window.print(); window.close();">
                            <h2 style="text-align:center; font-size:15px; font-weight: 900; margin-bottom:25px; color: #020617; text-transform: uppercase; font-family: 'Inter', sans-serif;">
                              Lembar Kupon Voucher Fisik Top-up (${branding.appName})
                            </h2>
                            <div class="grid">
                              ${vouchersHTML}
                            </div>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 font-bold text-xs rounded-xl shadow-sm cursor-pointer flex items-center gap-1.5 transition-all"
                >
                  <span>🖨️ PROSES CETAK (PRINT)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
