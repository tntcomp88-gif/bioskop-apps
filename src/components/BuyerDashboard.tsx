import React, { useState, useEffect } from 'react';
import { 
  Film, User as UserIcon, Calendar, Grid, Ticket, Search, Check, Wallet, 
  MapPin, Clock, ArrowRight, Sparkles, Sliders, AlertCircle, Phone, Mail, LogOut
} from 'lucide-react';
import { Movie, Cinema, Schedule, Booking, User, AppBranding, Voucher } from '../types';

interface BuyerDashboardProps {
  currentUser: User;
  onLogout: () => void;
  movies: Movie[];
  cinemas: Cinema[];
  schedules: Schedule[];
  bookings: Booking[];
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  vouchers: Voucher[];
  setVouchers: React.Dispatch<React.SetStateAction<Voucher[]>>;
  onOpenReceipt: (booking: Booking) => void;
  branding: AppBranding;
}

export default function BuyerDashboard({
  currentUser,
  onLogout,
  movies,
  cinemas,
  schedules,
  bookings,
  setBookings,
  vouchers,
  setVouchers,
  onOpenReceipt,
  branding
}: BuyerDashboardProps) {

  const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'history' | 'profile'>('catalog');

  // Search & Filtering States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGenre, setSelectedGenre] = useState<string>('All');

  // Selected Movie to Book
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  // Booking Flow Steps
  const [ticketQty, setTicketQty] = useState<number>(1); // Range 1-8 as requested
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  
  // Buyer Local Profile states for modification
  const [buyerName, setBuyerName] = useState<string>(currentUser.name);
  const [buyerEmail, setBuyerEmail] = useState<string>(currentUser.email);
  const [buyerPhone, setBuyerPhone] = useState<string>(currentUser.phone || '');
  const [buyerBalance, setBuyerBalance] = useState<number>(currentUser.balance);

  // Status Alerts
  const [errorAlert, setErrorAlert] = useState<string>('');
  const [successAlert, setSuccessAlert] = useState<string>('');
  
  // Wallet Top-up states
  const [isWalletModalOpen, setIsWalletModalOpen] = useState<boolean>(false);
  const [voucherCodeInput, setVoucherCodeInput] = useState<string>('');
  const [redeemingVoucherError, setRedeemingVoucherError] = useState<string>('');

  // Handle Voucher Redemption Code Submit
  const handleRedeemVoucherCode = (e: React.FormEvent) => {
    e.preventDefault();
    setRedeemingVoucherError('');

    if (!voucherCodeInput.trim()) {
      setRedeemingVoucherError('Silakan masukkan sandi kupon terlebih dahulu!');
      return;
    }

    const cleanedCode = voucherCodeInput.trim().toUpperCase();
    const vchIndex = vouchers.findIndex(v => v.code.toUpperCase() === cleanedCode);

    if (vchIndex === -1) {
      setRedeemingVoucherError('Kode voucher tidak ditemukan! Periksa kembali huruf dan angka kode voucher.');
      return;
    }

    const vch = vouchers[vchIndex];

    if (vch.isRedeemed) {
      setRedeemingVoucherError(`Kupon ini sudah pernah digunakan atau hangus.`);
      return;
    }

    // Process claim!
    const updatedVouchers = [...vouchers];
    updatedVouchers[vchIndex] = {
      ...vch,
      isRedeemed: true,
      redeemedBy: currentUser.name,
      redeemedAt: new Date().toISOString()
    };

    setVouchers(updatedVouchers);
    localStorage.setItem('cinema_db_vouchers', JSON.stringify(updatedVouchers));

    const newBalance = buyerBalance + vch.amount;
    setBuyerBalance(newBalance);
    updateUserData({ balance: newBalance });

    setVoucherCodeInput('');
    setIsWalletModalOpen(false);

    setSuccessAlert(`🎉 Berhasil menukarkan voucher! Saldo dompet Anda bertambah Rp ${vch.amount.toLocaleString('id-ID')} secara instan.`);
    setTimeout(() => setSuccessAlert(''), 5500);
  };
  
  // Persist updated user state to localStorage
  const updateUserData = (updatedFields: Partial<User>) => {
    const updatedUser = { ...currentUser, ...updatedFields };
    localStorage.setItem('cinema_current_user', JSON.stringify(updatedUser));
    
    // For registers database
    const savedUsersRaw = localStorage.getItem('cinema_registered_users');
    if (savedUsersRaw) {
      const registeredUsers: User[] = JSON.parse(savedUsersRaw);
      const idx = registeredUsers.findIndex(u => u.id === currentUser.id);
      if (idx !== -1) {
        registeredUsers[idx] = { ...registeredUsers[idx], ...updatedFields };
        localStorage.setItem('cinema_registered_users', JSON.stringify(registeredUsers));
      }
    }
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorAlert('');
    setSuccessAlert('');

    if (!buyerName || !buyerEmail || !buyerPhone) {
      setErrorAlert('Pastikan semua isian profil terisi lengkap.');
      return;
    }

    updateUserData({
      name: buyerName,
      email: buyerEmail,
      phone: buyerPhone
    });

    setSuccessAlert('Data pribadi Anda berhasil diperbarui secara personal!');
    setTimeout(() => setSuccessAlert(''), 4000);
  };

  const handleTopUp = () => {
    const amount = 100000;
    const newBalance = buyerBalance + amount;
    setBuyerBalance(newBalance);
    updateUserData({ balance: newBalance });
    setSuccessAlert('Top up berhasil! Saldo dompet Anda sekarang bertambah Rp 100.000');
    setTimeout(() => setSuccessAlert(''), 4500);
  };

  // Reset booking controls when selecting a different movie
  useEffect(() => {
    if (selectedMovie) {
      const movieSchedules = schedules.filter(s => s.movieId === selectedMovie.id);
      if (movieSchedules.length > 0) {
        setSelectedScheduleId(movieSchedules[0].id);
      } else {
        setSelectedScheduleId('');
      }
      setSelectedSeats([]);
      setTicketQty(1);
    }
  }, [selectedMovie, schedules]);

  // Reset selected seats when ticket quantity of schedule changes
  useEffect(() => {
    setSelectedSeats([]);
  }, [ticketQty, selectedScheduleId]);

  // Unique list of genres for dropdown
  const allGenres = ['All', ...Array.from(new Set(movies.map(m => m.genre)))];

  const filteredMovies = movies.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          m.synopsis.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = selectedGenre === 'All' || m.genre === selectedGenre;
    return matchesSearch && matchesGenre;
  });

  const selectedScheduleObj = schedules.find(s => s.id === selectedScheduleId);
  const selectedCinemaObj = selectedScheduleObj 
    ? cinemas.find(c => c.id === selectedScheduleObj.cinemaId) 
    : null;

  // Find all seats already booked for the selected schedule
  const getBookedSeatsForSchedule = (schedId: string): string[] => {
    return bookings
      .filter(b => b.scheduleId === schedId)
      .reduce((acc, b) => [...acc, ...b.seats], [] as string[]);
  };

  const bookedSeats = selectedScheduleId ? getBookedSeatsForSchedule(selectedScheduleId) : [];

  const handleSeatClick = (seatId: string) => {
    setErrorAlert('');
    if (selectedSeats.includes(seatId)) {
      // Toggle off
      setSelectedSeats(prev => prev.filter(s => s !== seatId));
    } else {
      // Check if maximum quantity selected is already reached
      if (selectedSeats.length >= ticketQty) {
        setErrorAlert(`Anda hanya memilih opsi pembelian sebanyak ${ticketQty} kursi. Silakan ubah jumlah tiket terlebih dahulu if ingin memesan lebih.`);
        return;
      }
      setSelectedSeats(prev => [...prev, seatId]);
    }
  };

  const handleCheckout = () => {
    setErrorAlert('');
    setSuccessAlert('');

    if (!selectedMovie || !selectedScheduleObj || !selectedCinemaObj) {
      setErrorAlert('Silakan lengkapi pemilihan film dan jadwal tayang.');
      return;
    }

    if (selectedSeats.length !== ticketQty) {
      setErrorAlert(`Harap pilih tepat ${ticketQty} kursi pada denah studio di bawah sebelum melanjutkan checkout.`);
      return;
    }

    const totalCost = ticketQty * selectedScheduleObj.price;
    if (buyerBalance < totalCost) {
      setErrorAlert(`Saldo dompet Anda tidak mencukupi. Diperlukan Rp ${totalCost.toLocaleString('id-ID')}, sedangkan saldo Anda dalah Rp ${buyerBalance.toLocaleString('id-ID')}. Silakan klik tombol "Top Up Saldo" di bagian dompet.`);
      return;
    }

    // --- CONCURRENCY DOUBLE-BOOKING RESOLUTION SYSTEM ---
    
    // Fetch fresh database snapshot from localStorage to simulate accurate server-auth clock checks
    const freshBookingsRaw = localStorage.getItem('cinema_db_bookings');
    let freshBookings: Booking[] = freshBookingsRaw ? JSON.parse(freshBookingsRaw) : [...bookings];

    // Check if any of selectedSeats are already occupied in the actual (fresh) database snapshot
    const freshBookedSeats = freshBookings
      .filter(b => b.scheduleId === selectedScheduleObj.id)
      .reduce((acc, b) => [...acc, ...b.seats], [] as string[]);

    const conflictingSeats = selectedSeats.filter(seat => freshBookedSeats.includes(seat));

    if (conflictingSeats.length > 0) {
      setErrorAlert(
        `🚨 TRANSAKSI DITOLAK! Kursi ${conflictingSeats.join(', ')} baru saja dipesan oleh pelanggan lain pada milidetik yang sama. Sistem mengamankan transaksi Anda dengan menolak reservasi ganda. Silakan pilih kursi lain yang tersedia.`
      );
      
      // Update global parent bookings array so the layout updates immediately showing "X" (booked)
      setBookings(freshBookings);
      
      // Keep only non-conflicting seats in user's selection
      setSelectedSeats(prev => prev.filter(s => !conflictingSeats.includes(s)));
      return;
    }

    // If free of conflicts, proceed to register the booking safely!
    const newBooking: Booking = {
      id: `book-${Date.now()}`,
      userId: currentUser.id,
      userName: buyerName,
      scheduleId: selectedScheduleObj.id,
      movieTitle: selectedMovie.title,
      cinemaName: selectedScheduleObj.cinemaName,
      showtime: selectedScheduleObj.showtime,
      seats: [...selectedSeats],
      pricePaid: totalCost,
      bookingDate: new Date().toISOString()
    };

    // Deduct Balance
    const remainingBalance = buyerBalance - totalCost;
    setBuyerBalance(remainingBalance);
    updateUserData({ balance: remainingBalance });

    // Save bookings locally
    const currentBookings = [newBooking, ...freshBookings];
    setBookings(currentBookings);
    localStorage.setItem('cinema_db_bookings', JSON.stringify(currentBookings));
    localStorage.setItem('cinema_bookings', JSON.stringify(currentBookings));

    // Clear seat selection & focus
    setSelectedSeats([]);
    setSuccessAlert('Selamat! Pemesanan kursi bioskop berhasil diproses secara resmi.');
    
    // Open print preview/receipt modal
    onOpenReceipt(newBooking);
  };

  // Helper rows generators
  const getRowLetters = (rowsCount: number) => {
    const letters = [];
    for (let i = 0; i < rowsCount; i++) {
      letters.push(String.fromCharCode(65 + i));
    }
    return letters;
  };

  // Buyer booking history
  const buyerBookings = bookings.filter(b => b.userId === currentUser.id);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      
      {/* Top Navbar */}
      <nav className="bg-white border-b border-slate-150 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-sm font-bold text-white shrink-0">
              {branding.appLogoChar}
            </div>
            <div>
              <span className="font-display font-bold tracking-tight text-lg text-slate-800">
                {branding.appName}
              </span>
              <span className="ml-3 hidden sm:inline-block px-2 py-0.5 bg-slate-100 border border-slate-150 rounded text-[10px] text-slate-400 font-mono tracking-tighter">JWT_AUTH_ACTIVE</span>
            </div>
          </div>

          {/* Core Hub Actions */}
          <div className="flex items-center gap-6">
            <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
              <button
                onClick={() => { setActiveSubTab('catalog'); setSelectedMovie(null); }}
                className={`px-3.5 py-1.5 rounded-md cursor-pointer transition-all ${activeSubTab === 'catalog' ? 'bg-white text-blue-900 shadow-tiny' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Katalog Film
              </button>
              <button
                onClick={() => setActiveSubTab('history')}
                className={`px-3.5 py-1.5 rounded-md cursor-pointer transition-all ${activeSubTab === 'history' ? 'bg-white text-blue-900 shadow-tiny' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Tiket Saya ({buyerBookings.length})
              </button>
              <button
                onClick={() => setActiveSubTab('profile')}
                className={`px-3.5 py-1.5 rounded-md cursor-pointer transition-all ${activeSubTab === 'profile' ? 'bg-white text-blue-900 shadow-tiny' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Profil
              </button>
            </div>

            {/* Simulated Wallet widget */}
            <div className="hidden sm:flex items-center gap-2.5 bg-blue-50/50 hover:bg-blue-50 py-1.5 px-3.5 rounded-xl border border-blue-105 transition-all text-xs">
              <Wallet className="w-4 h-4 text-amber-600" />
              <div>
                <span className="text-[9px] text-slate-400 block uppercase font-bold">Dompet Saya</span>
                <span className="font-mono font-bold text-blue-900">Rp {buyerBalance.toLocaleString('id-ID')}</span>
              </div>
              <button
                onClick={() => setIsWalletModalOpen(true)}
                className="ml-2.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-extrabold p-1 px-2.5 rounded-md cursor-pointer text-[10px] active:scale-95"
                title="Isi Saldo atau Tukarkan Voucher"
              >
                + Top Up
              </button>
            </div>

            <button
              onClick={onLogout}
              className="p-2 bg-slate-50 hover:bg-red-50 hover:text-red-650 rounded-xl transition-all cursor-pointer border border-slate-200"
              title="Logout"
            >
              <LogOut className="w-4 h-4 text-slate-500 hover:text-red-650" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Wallet Widget for Mobile/Small views */}
        <div className="sm:hidden block mb-6 p-4 bg-white border border-slate-150 rounded-2xl shadow-tiny">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-xs">
              <Wallet className="w-5 h-5 text-amber-500" />
              <div>
                <span className="text-[9px] text-slate-400 block uppercase font-bold">Saldo Pembeli</span>
                <span className="font-mono font-bold text-slate-800 text-sm">Rp {buyerBalance.toLocaleString('id-ID')}</span>
              </div>
            </div>
            <button
              onClick={() => setIsWalletModalOpen(true)}
              className="bg-blue-900 hover:bg-blue-800 text-white font-bold py-1.5 px-3.5 rounded-lg cursor-pointer text-xs active:scale-95 transition-all"
            >
              + Top Up / Redeem
            </button>
          </div>
        </div>

        {/* Dynamic Alerts inside Dashboard */}
        {errorAlert && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 text-xs rounded-xl flex items-start gap-2.5 border border-red-100 animate-fade-in shadow-tiny">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <span>{errorAlert}</span>
          </div>
        )}

        {successAlert && (
          <div className="mb-6 p-4 bg-emerald-50 text-emerald-800 text-xs rounded-xl flex items-start gap-2.5 border border-emerald-100 animate-fade-in shadow-tiny">
            <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
            <span>{successAlert}</span>
          </div>
        )}

        {/* ======================= TAB: CATALOG ======================= */}
        {activeSubTab === 'catalog' && !selectedMovie && (
          <div className="space-y-8 animate-fade-in">
            {/* Promo Banner / Jumbotron */}
            <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-amber-951 rounded-3xl p-8 sm:p-10 text-white relative overflow-hidden shadow-md">
              <div className="absolute top-[10%] right-[5%] w-[400px] h-[400px] bg-amber-450 rounded-full blur-3xl opacity-15 pointer-events-none" />
              <div className="relative z-10 max-w-xl">
                <span className="inline-flex items-center gap-1 bg-amber-500 font-display font-bold text-[10px] uppercase tracking-wide px-3 py-1.5 rounded-full mb-4">
                  <Sparkles className="w-3 h-3 text-white" /> Cinema Online PWA
                </span>
                <h1 className="font-display font-extrabold text-2xl sm:text-3.5xl tracking-tight leading-none text-white">
                  Pesan Tiket Bioskop Tanpa Ribet
                </h1>
                <p className="text-slate-300 text-xs sm:text-sm mt-3 leading-relaxed">
                  Dapatkan pengalaman menonton film terbaik dengan memesan kursi favorit Anda langsung dari web PWA atau aplikasi Android. Pilih 1 hingga 8 kursi secara instan.
                </p>
                <div className="mt-6 flex flex-wrap gap-2 text-xs font-medium text-slate-100">
                  <span className="bg-blue-800/80 px-3.5 py-1.5 border border-blue-700 rounded-lg">🍿 Caching Cepat</span>
                  <span className="bg-blue-800/80 px-3.5 py-1.5 border border-blue-700 rounded-lg">🛋️ Denah Seating Presisi</span>
                  <span className="bg-blue-800/80 px-3.5 py-1.5 border border-blue-700 rounded-lg">🛡️ Autentikasi JWT Terenkripsi</span>
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 border border-slate-150 rounded-2xl shadow-tiny">
              <div className="relative w-full sm:max-w-md">
                <span className="absolute left-3.5 top-3.5 text-slate-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Cari judul film atau sutradara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-900 focus:bg-white rounded-xl py-2.5 pl-10 pr-4 text-xs outline-none transition-all placeholder:text-slate-400 font-sans"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1">
                  <Sliders className="w-3 h-3" /> Genre
                </span>
                <select
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  className="bg-slate-50 border border-slate-200 p-2 text-xs rounded-xl outline-none focus:border-blue-900 flex-grow sm:flex-grow-0"
                >
                  {allGenres.map(g => (
                    <option key={g} value={g}>{g === 'All' ? 'Semua Genre' : g}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Movies Catalogue Grid */}
            <div>
              <h2 className="font-display font-bold text-slate-800 text-lg mb-4">Film Yang Sedang Tayang ({filteredMovies.length})</h2>
              
              {filteredMovies.length === 0 ? (
                <div className="text-center py-16 bg-white border border-slate-150 rounded-2xl">
                  <p className="text-slate-400 font-medium text-xs">Tidak ada film yang cocok dengan pencarian Anda.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {filteredMovies.map(m => {
                    const availableSchedules = schedules.filter(s => s.movieId === m.id);
                    return (
                      <div 
                        key={m.id} 
                        className="bg-white border border-slate-150 hover:border-slate-300 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-md flex flex-col group"
                      >
                        {/* Film Poster Cover */}
                        <div className="relative aspect-[3/4] bg-slate-100 overflow-hidden cursor-pointer" onClick={() => setSelectedMovie(m)}>
                          <img
                            src={m.posterUrl}
                            alt={m.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                            <span className="w-full bg-amber-500 hover:bg-amber-650 text-white font-display font-semibold py-2.5 px-3 rounded-xl text-center text-xs shadow-md">
                              Pesan Kursi Sekarang
                            </span>
                          </div>
                          
                          <span className="absolute top-3 left-3 bg-blue-900 border border-blue-800 text-white text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider block">
                            {m.genre}
                          </span>
                        </div>

                        {/* Details */}
                        <div className="p-4 flex-grow flex flex-col">
                          <h3 
                            className="font-display font-bold text-xs text-slate-800 hover:text-blue-900 cursor-pointer line-clamp-1"
                            onClick={() => setSelectedMovie(m)}
                          >
                            {m.title}
                          </h3>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">Sutradara: {m.director}</p>
                          <p className="text-[10px] text-slate-550 line-clamp-2 mt-2 leading-relaxed flex-grow">
                            {m.synopsis}
                          </p>

                          <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-medium">
                              {availableSchedules.length} Jadwal Tayang
                            </span>
                            <button
                              onClick={() => setSelectedMovie(m)}
                              className="text-[10px] font-bold text-blue-900 hover:text-amber-500 tracking-wide inline-flex items-center gap-1 transition-all cursor-pointer"
                            >
                              Detail & Pesan <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ======================= DETAILED MOVIE BOOKING PROCESS ======================= */}
        {activeSubTab === 'catalog' && selectedMovie && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
            
            {/* Back to Catalogue */}
            <div className="lg:col-span-12">
              <button
                onClick={() => setSelectedMovie(null)}
                className="text-xs font-semibold text-slate-500 hover:text-blue-900 cursor-pointer flex items-center gap-1.5"
              >
                ← Kembali ke Katalog Utama
              </button>
            </div>

            {/* Left Column: Movie Detail Card & Configurator & Schedules */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Cinematic Cover */}
              <div className="bg-white border border-slate-150 rounded-2xl p-5 shadow-tiny flex sm:flex-row lg:flex-col gap-5 items-start">
                <img
                  src={selectedMovie.posterUrl}
                  alt={selectedMovie.title}
                  className="w-28 sm:w-36 lg:w-full aspect-[3/4] object-cover rounded-xl bg-slate-100 shadow-sm"
                  referrerPolicy="no-referrer"
                />
                <div className="space-y-2">
                  <span className="bg-blue-50 text-blue-900 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider block w-max">
                    {selectedMovie.genre}
                  </span>
                  <h2 className="font-display font-extrabold text-lg text-slate-800 tracking-tight leading-snug">
                    {selectedMovie.title}
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium">Director: {selectedMovie.director}</p>
                  <p className="text-xs text-slate-500 leading-relaxed pt-2">
                    {selectedMovie.synopsis}
                  </p>
                </div>
              </div>

              {/* Step 1: Ticket Quantity Selector (1-8 Seats mandated) */}
              <div className="bg-white border border-slate-150 rounded-2xl p-5 shadow-tiny space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Langkah 1</span>
                  <span className="text-[10px] font-semibold text-blue-900 font-mono">Jumlah Kursi</span>
                </div>
                <label className="block text-xs font-bold text-slate-600">Berapa tiket yang ingin dipesan kelompok Anda?</label>
                <p className="text-[10px] text-slate-400">Aturan pemesanan dibatasi minimum 1 hingga maksimum 8 kursi per satu baris transaksi.</p>
                
                {/* Visual Picker for 1-8 */}
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {Array.from({ length: 8 }).map((_, i) => {
                    const num = i + 1;
                    return (
                      <button
                        key={num}
                        onClick={() => setTicketQty(num)}
                        className={`py-2.5 px-3 hover:border-blue-900 border text-xs font-bold rounded-lg cursor-pointer transition-all ${
                          ticketQty === num 
                            ? 'bg-blue-900 border-blue-900 text-white shadow-sm' 
                            : 'bg-slate-50 text-slate-650 border-slate-200'
                        }`}
                      >
                        {num} Kursi
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Showtimes Schedule Selector */}
              <div className="bg-white border border-slate-150 rounded-2xl p-5 shadow-tiny space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Langkah 2</span>
                  <span className="text-[10px] font-semibold text-blue-900 font-mono">Jadwal & Studio</span>
                </div>
                
                <p className="text-xs font-bold text-slate-600">Pilih jam tayang dan lokasi cinema yang tersedia:</p>

                {schedules.filter(s => s.movieId === selectedMovie.id).length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-xl text-center border border-dashed border-slate-200 text-slate-400 text-xs font-medium">
                    Maaf, belum ada jadwal tayang aktif untuk film ini. Hubungi Admin Tiket.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto no-scrollbar">
                    {schedules.filter(s => s.movieId === selectedMovie.id).map(s => {
                      const isSelected = selectedScheduleId === s.id;
                      return (
                        <div
                          key={s.id}
                          onClick={() => setSelectedScheduleId(s.id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                            isSelected 
                              ? 'bg-blue-50/50 border-blue-900 shadow-inner' 
                              : 'bg-slate-50 border-slate-200 hover:border-slate-350'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-805 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-blue-900 shrink-0" />
                              {s.cinemaName}
                            </span>
                            <span className="font-mono text-xs font-bold text-amber-600">
                              Rp {s.price.toLocaleString('id-ID')}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-sans">{s.showtime.split('T')[0]}</span>
                            <span className="text-slate-300">|</span>
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-sans">{s.showtime.split('T')[1].substring(0, 5)} WIB</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* Right Column: Dynamic Interactive Seating Chart & Checkout Summary */}
            <div className="lg:col-span-8 bg-white border border-slate-150 rounded-2xl p-6 sm:p-8 shadow-tiny space-y-6">
              
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Langkah 3</span>
                  <h3 className="font-display font-extrabold text-sm text-slate-800 mt-0.5 uppercase">
                    Pilih Kursi Di Bawah Screen ({selectedSeats.length}/{ticketQty} Terpilih)
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-3.5 text-[10px] text-slate-505 font-semibold">
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-white border border-slate-200 rounded-sm inline-block" />
                    <span>Tersedia</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-blue-900 border border-blue-900 rounded-sm inline-block" />
                    <span>Dipilih</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-slate-300 border border-slate-400 rounded-sm inline-block" />
                    <span>Terbeli (X)</span>
                  </div>
                  <div className="flex items-center gap-1" title="Dilarang diduduki - Ditetapkan oleh Admin">
                    <span className="w-3 h-3 bg-red-100 text-red-500 border border-red-200 rounded-sm inline-block text-center text-[8px] font-bold">🚫</span>
                    <span>Diblokir</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Grid Loader */}
              {!selectedScheduleObj || !selectedCinemaObj ? (
                <div className="py-20 text-center text-slate-400 text-xs font-medium">
                  Harap selesaikan pemilihan langkah 1 dan langkah 2 untuk memuat denah bioskop.
                </div>
              ) : (
                <div className="border border-slate-100 bg-slate-50/40 rounded-2xl p-6 sm:p-8">
                  
                  {/* Screen Representation */}
                  <div className="w-4/5 mx-auto bg-slate-250 text-[10px] text-slate-450 font-display font-medium tracking-widest text-center py-2.5 rounded-b-xl border-t-2 border-slate-300 mb-12 shadow-sm uppercase">
                    LAYAR TEATER / MOVIE SCREEN PROJECTION
                  </div>

                  {/* Visual grid layout generator */}
                  <div className="w-full overflow-x-auto pb-6 no-scrollbar">
                    <div className="min-w-[420px] flex flex-col gap-3 justify-center items-center">
                      {getRowLetters(selectedCinemaObj.rows).map((rowLetter) => (
                        <div key={rowLetter} className="flex gap-2.5 items-center">
                          {/* Row label */}
                          <span className="w-5 text-center font-display font-bold text-xs text-slate-400 mr-2">{rowLetter}</span>
                          
                          {Array.from({ length: selectedCinemaObj.cols }).map((_, colIndex) => {
                            const colNum = colIndex + 1;
                            const seatId = `${rowLetter}-${colNum}`;
                            
                            const isRemoved = (selectedCinemaObj.removedSeats || []).includes(seatId);
                            const isAlreadyBooked = bookedSeats.includes(seatId);
                            const isForbidden = selectedCinemaObj.forbiddenSeats.includes(seatId);
                            const isSelected = selectedSeats.includes(seatId);

                            if (isRemoved) {
                              return (
                                <React.Fragment key={seatId}>
                                  {((selectedCinemaObj.aisleAfterCol && colIndex === selectedCinemaObj.aisleAfterCol) || 
                                    (selectedCinemaObj.aisleAfterCol2 && colIndex === selectedCinemaObj.aisleAfterCol2)) && (
                                    <div 
                                      className={`h-8.5 select-none pointer-events-none shrink-0 ${
                                        selectedCinemaObj.aisleWidth === 2 ? 'w-14 mx-1' : 'w-7 mx-0.5'
                                      }`}
                                    />
                                  )}
                                  <div className="w-8.5 h-8.5 select-none pointer-events-none opacity-0 shrink-0" />
                                </React.Fragment>
                              );
                            }

                            let buttonClasses = '';
                            let disabledState = false;
                            let seatContent: React.ReactNode = colNum;

                            if (isAlreadyBooked) {
                              buttonClasses = 'bg-slate-300 text-slate-500 border-slate-300 cursor-not-allowed';
                              disabledState = true;
                              seatContent = 'X';
                            } else if (isForbidden) {
                              buttonClasses = 'bg-red-50 text-red-500 border-red-152 cursor-not-allowed';
                              disabledState = true;
                              seatContent = <span className="text-[8.5px]" title="Kursi rusak/diblokir oleh Admin">🚫</span>;
                            } else if (isSelected) {
                              buttonClasses = 'bg-blue-900 border-blue-900 text-white shadow-tiny animate-pulse scale-[1.03] ring-2 ring-amber-400';
                            } else {
                              buttonClasses = 'bg-white text-slate-650 border-slate-205 hover:border-blue-900 hover:text-blue-905';
                            }

                            return (
                              <React.Fragment key={seatId}>
                                {((selectedCinemaObj.aisleAfterCol && colIndex === selectedCinemaObj.aisleAfterCol) || 
                                  (selectedCinemaObj.aisleAfterCol2 && colIndex === selectedCinemaObj.aisleAfterCol2)) && (
                                  <div 
                                    className={`h-8.5 select-none pointer-events-none shrink-0 ${
                                      selectedCinemaObj.aisleWidth === 2 ? 'w-14 mx-1' : 'w-7 mx-0.5'
                                    }`}
                                  />
                                )}
                                <button
                                  type="button"
                                  disabled={disabledState}
                                  onClick={() => handleSeatClick(seatId)}
                                  className={`w-8.5 h-8.5 rounded-md flex items-center justify-center text-[10px] font-bold transition-all ${buttonClasses} ${disabledState ? '' : 'cursor-pointer'}`}
                                >
                                  {seatContent}
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

                  {/* Dynamic checkout and cost visualizer */}
                  <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-8">
                    
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Ringkasan Kursi Terpilih</span>
                      <p className="font-mono text-xs font-bold text-blue-900 mt-0.5">
                        {selectedSeats.length > 0 ? selectedSeats.join(', ') : 'Belum memilih kursi'}
                      </p>
                      
                      <div className="flex gap-4 text-xs font-semibold mt-3 text-slate-500 font-sans">
                        <span>Tiket: {ticketQty} x Rp {selectedScheduleObj.price.toLocaleString('id-ID')}</span>
                        <span>Total: <strong className="text-amber-600 font-mono text-sm leading-none">Rp {(ticketQty * selectedScheduleObj.price).toLocaleString('id-ID')}</strong></span>
                      </div>
                    </div>

                    <div className="w-full sm:w-auto">
                      <button
                        onClick={handleCheckout}
                        disabled={selectedSeats.length !== ticketQty}
                        className={`w-full sm:w-auto px-7 py-3 text-xs font-display font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 ${
                          selectedSeats.length === ticketQty
                            ? 'bg-amber-500 hover:bg-amber-600 text-white cursor-pointer active:scale-95 hover:shadow-lg'
                            : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                        <span>Selesaikan Pemesanan & Checkout</span>
                      </button>
                      <p className="text-[10px] text-slate-400 mt-1.5 text-center sm:text-right">
                        Sisa wajib pilih: {ticketQty - selectedSeats.length} kursi lagi
                      </p>
                    </div>

                  </div>

                </div>
              )}

            </div>

          </div>
        )}

        {/* ======================= TAB: HISTORY / USER TICKETS ======================= */}
        {activeSubTab === 'history' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="font-display font-bold text-slate-800 text-lg">Tiket Bioskop Anda ({buyerBookings.length})</h2>
              <p className="text-xs text-slate-400 mt-0.5">Daftar lengkap transaksi tiket Anda. Klik "Lihat Invoice/Tiket" untuk memunculkan e-Ticket berkode batangan hologram.</p>
            </div>

            {buyerBookings.length === 0 ? (
              <div className="text-center py-20 bg-white border border-slate-150 rounded-2xl">
                <Ticket className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400 font-semibold text-xs">Anda belum memiliki transaksi pemesanan tiket apa pun.</p>
                <button
                  onClick={() => setActiveSubTab('catalog')}
                  className="mt-4 px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-sm transition-all"
                >
                  Jelajahi Film Pemutaran
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {buyerBookings.map(b => (
                  <div key={b.id} className="bg-white border border-slate-150 hover:border-slate-350 rounded-2xl p-5 shadow-tiny flex flex-col justify-between transition-all group">
                    <div className="space-y-3 pb-3 border-b border-dashed border-slate-150">
                      
                      <div className="flex justify-between items-start">
                        <span className="text-[9px] bg-amber-50 text-amber-700 font-mono font-bold px-2 py-0.5 rounded-full border border-amber-100">
                          Invoice: {b.id.substring(5)}
                        </span>
                        <span className="text-[9px] text-slate-400 font-sans">{b.bookingDate.split('T')[0]}</span>
                      </div>

                      <h3 className="font-display font-bold text-xs text-slate-800 line-clamp-1">{b.movieTitle}</h3>
                      
                      <div className="space-y-1.5 text-[10px] text-slate-500 font-semibold">
                        <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-blue-900 shrink-0" /> {b.cinemaName}</p>
                        <p className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-450 shrink-0" /> {b.showtime.replace('T', ' ')} WIB</p>
                        <p className="flex items-center gap-1.5">
                          <Grid className="w-3.5 h-3.5 text-amber-600 shrink-0" /> 
                          Kursi: <span className="font-mono bg-slate-100 text-slate-705 px-1.5 rounded text-[9.5px] font-bold">{b.seats.join(', ')}</span>
                          <span className="text-slate-300">({b.seats.length} tiket)</span>
                        </p>
                      </div>

                    </div>

                    <div className="pt-3.5 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Harga Dibayar</span>
                        <span className="font-mono font-bold text-xs text-blue-900">Rp {b.pricePaid.toLocaleString('id-ID')}</span>
                      </div>

                      <button
                        onClick={() => onOpenReceipt(b)}
                        className="px-4 py-2 bg-slate-50 border border-slate-205 hover:bg-amber-50 hover:border-amber-400 hover:text-amber-700 text-slate-600 cursor-pointer text-[10px] font-bold rounded-lg transition-all"
                      >
                        Lihat Invoice
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {/* ======================= TAB: USER PROFILE PERSONAL DATA ======================= */}
        {activeSubTab === 'profile' && (
          <div className="max-w-xl bg-white border border-slate-150 rounded-2xl p-6 sm:p-8 space-y-6 animate-fade-in shadow-tiny">
            <div>
              <span className="bg-blue-50 text-blue-900 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase block w-max mb-2">
                Hak Milik Akun
              </span>
              <h2 className="font-display font-bold text-slate-800 text-lg">Kelola Data Anda Secara Personal</h2>
              <p className="text-xs text-slate-400 mt-1">Perbarui rincian pengguna Anda untuk informasi slip invoice pembelian.</p>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nama Pemilik Akun</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-slate-400"><UserIcon className="w-4 h-4" /></span>
                  <input
                    type="text"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-900 py-3 pl-10 pr-4 text-xs font-medium rounded-xl outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Alamat Email</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-slate-400"><Mail className="w-4 h-4" /></span>
                    <input
                      type="email"
                      value={buyerEmail}
                      onChange={(e) => setBuyerEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-900 py-3 pl-10 pr-4 text-xs font-medium rounded-xl outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nomor Handphone</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-slate-400"><Phone className="w-4 h-4" /></span>
                    <input
                      type="tel"
                      value={buyerPhone}
                      onChange={(e) => setBuyerPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-900 py-3 pl-10 pr-4 text-xs font-medium rounded-xl outline-none"
                      required
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 bg-blue-900 hover:bg-blue-800 text-white text-xs font-display font-semibold shadow-md active:scale-95 transition-all cursor-pointer rounded-xl flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Simpan Detail Informasi</span>
              </button>
            </form>

            <div className="pt-4 border-t border-slate-100 bg-slate-50 p-4 rounded-xl space-y-1 text-slate-600 font-sans text-xs">
              <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Status Keamanan Token</span>
              <p className="font-mono text-[10px] text-blue-900 select-all truncate break-all bg-white p-2.5 rounded border border-slate-200">
                Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6... (Secure JWT)
              </p>
              <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1 pt-1">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>JWT ditandatangani menggunakan algoritme tanda tangan rahasia modern HS256.</span>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* WALLET TOP-UP & VOUCHER REDEMPTION MODAL */}
      {isWalletModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-fade-in text-slate-800">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-900">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-slate-800 mb-0.5">Dompet Digital & Isi Saldo</h3>
                  <p className="text-[10px] text-slate-400">Pilih metode pengisian saldo dompet Anda</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsWalletModalOpen(false);
                  setVoucherCodeInput('');
                  setRedeemingVoucherError('');
                }}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Current Balance Row */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 mb-5 flex items-center justify-between">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Saldo Utama Saat Ini</span>
                <span className="font-display font-black text-slate-800 text-lg">
                  Rp {buyerBalance.toLocaleString('id-ID')}
                </span>
              </div>
              <span className="text-[10px] font-bold text-teal-850 bg-teal-50 border border-teal-100 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-ping" />
                Sistem Aktif
              </span>
            </div>

            <div className="space-y-5">
              {/* WAY 1: REDEEM VOUCHER */}
              <div className="border border-slate-200 rounded-2xl p-4 space-y-3">
                <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-105 px-2 py-0.5 rounded uppercase tracking-wider block w-max">
                  Metode 1: Tukarkan Kupon Fisik
                </span>
                <div>
                  <h4 className="font-display font-bold text-xs text-slate-800">Redeem Kode Voucher Kasir</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Mempunyai voucher cetak dari konter kasir bioskop? Masukkan kodenya disini:</p>
                </div>

                <form onSubmit={handleRedeemVoucherCode} className="space-y-2">
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={14}
                      value={voucherCodeInput}
                      onChange={(e) => setVoucherCodeInput(e.target.value)}
                      placeholder="CINE-XXXX-XXXX"
                      className="w-full bg-slate-50 border border-slate-250 py-3 px-4 text-xs font-mono font-black tracking-widest text-slate-900 placeholder:text-slate-350 outline-none rounded-xl focus:bg-white focus:border-blue-900 transition-all text-center uppercase"
                    />
                  </div>

                  {redeemingVoucherError && (
                    <div className="p-2.5 bg-red-50 text-red-700 text-[10px] rounded-lg flex items-start gap-1.5 border border-red-100 animate-fade-in font-medium leading-relaxed">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-500" />
                      <span>{redeemingVoucherError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-display font-bold py-2.5 px-4 text-xs rounded-xl shadow-tiny active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>CLAIM SALDO VOUCHER</span>
                  </button>
                </form>
              </div>

              {/* WAY 2: FAST DEMO INCENTIVE */}
              <div className="border border-slate-200 rounded-2xl p-4 space-y-2.5">
                <span className="text-[9px] font-bold text-blue-900 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded uppercase tracking-wider block w-max">
                  Metode 2: Simulasi Demo
                </span>
                <div>
                  <h4 className="font-display font-bold text-xs text-slate-800">Top Up Uji Coba Instan</h4>
                  <p className="text-[10px] text-slate-400">Seksi simulasi untuk mempermudah tes transaksi tanpa membeli kupon fisik asli:</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const amount = 100000;
                    const newBalance = buyerBalance + amount;
                    setBuyerBalance(newBalance);
                    updateUserData({ balance: newBalance });
                    setIsWalletModalOpen(false);
                    setSuccessAlert('🎁 Top Up simulasi berhasil! Rp 100.000 telah ditambahkan ke dompet Anda.');
                    setTimeout(() => setSuccessAlert(''), 4500);
                  }}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white font-display font-bold py-2.5 px-4 text-xs rounded-xl active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <span>⚡ TAMBAH SALDO Rp 100.000 INSTAN</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
