import React, { useState, useEffect } from 'react';
import { User, Movie, Cinema, Schedule, Booking, AppBranding, Voucher } from './types';
import { 
  INITIAL_MOVIES, INITIAL_CINEMAS, INITIAL_SCHEDULES, INITIAL_BOOKINGS, 
  parseAndVerifyJWT 
} from './data';
import {
  db,
  saveMovieToFirestore,
  deleteMovieFromFirestore,
  saveCinemaToFirestore,
  deleteCinemaFromFirestore,
  saveScheduleToFirestore,
  deleteScheduleFromFirestore,
  saveBookingToFirestore,
  saveVoucherToFirestore,
  deleteVoucherFromFirestore,
  saveBrandingToFirestore,
  saveUserToFirestore
} from './firebase';
import { onSnapshot, collection, doc } from 'firebase/firestore';
import LoginScreen from './components/LoginScreen';
import AdminPanel from './components/AdminPanel';
import BuyerDashboard from './components/BuyerDashboard';
import ReceiptModal from './components/ReceiptModal';
import { Shield, Smartphone, CheckCircle, Wifi } from 'lucide-react';

export default function App() {
  // Authentication & Session state
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('cinema_jwt_token');
  });
  
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('cinema_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  // App Branding config
  const [branding, setBranding] = useState<AppBranding>(() => {
    const saved = localStorage.getItem('cinema_branding');
    return saved ? JSON.parse(saved) : {
      appName: 'CineTicket',
      appLogoChar: '🎬',
      themeColor: 'blue'
    };
  });

  // Application DB States
  const [movies, setMovies] = useState<Movie[]>(() => {
    const saved = localStorage.getItem('cinema_db_movies');
    return saved ? JSON.parse(saved) : INITIAL_MOVIES;
  });

  const [cinemas, setCinemas] = useState<Cinema[]>(() => {
    const saved = localStorage.getItem('cinema_db_cinemas');
    return saved ? JSON.parse(saved) : INITIAL_CINEMAS;
  });

  const [schedules, setSchedules] = useState<Schedule[]>(() => {
    const saved = localStorage.getItem('cinema_db_schedules');
    return saved ? JSON.parse(saved) : INITIAL_SCHEDULES;
  });

  const [bookings, setBookings] = useState<Booking[]>(() => {
    const saved = localStorage.getItem('cinema_db_bookings');
    return saved ? JSON.parse(saved) : INITIAL_BOOKINGS;
  });

  const [vouchers, setVouchers] = useState<Voucher[]>(() => {
    const saved = localStorage.getItem('cinema_db_vouchers');
    return saved ? JSON.parse(saved) : [];
  });

  // Modal State for Invoice receipt
  const [activeReceipt, setActiveReceipt] = useState<Booking | null>(null);

  // Firestore Real-Time Query Listeners to achieve multiplayer/multi-browser remote database sync
  useEffect(() => {
    // 1. Movies Listener
    const unsubMovies = onSnapshot(collection(db, 'movies'), (snapshot) => {
      const docs: Movie[] = [];
      snapshot.forEach(docSnap => {
        docs.push(docSnap.data() as Movie);
      });
      if (docs.length > 0) {
        setMovies(docs);
      } else {
        // Automatically seed remote Firestore database if blank
        INITIAL_MOVIES.forEach(m => saveMovieToFirestore(m));
      }
    });

    // 2. Cinemas Listener
    const unsubCinemas = onSnapshot(collection(db, 'cinemas'), (snapshot) => {
      const docs: Cinema[] = [];
      snapshot.forEach(docSnap => {
        docs.push(docSnap.data() as Cinema);
      });
      if (docs.length > 0) {
        setCinemas(docs);
      } else {
        INITIAL_CINEMAS.forEach(c => saveCinemaToFirestore(c));
      }
    });

    // 3. Schedules Listener
    const unsubSchedules = onSnapshot(collection(db, 'schedules'), (snapshot) => {
      const docs: Schedule[] = [];
      snapshot.forEach(docSnap => {
        docs.push(docSnap.data() as Schedule);
      });
      if (docs.length > 0) {
        setSchedules(docs);
      } else {
        INITIAL_SCHEDULES.forEach(s => saveScheduleToFirestore(s));
      }
    });

    // 4. Bookings Listener
    const unsubBookings = onSnapshot(collection(db, 'bookings'), (snapshot) => {
      const docs: Booking[] = [];
      snapshot.forEach(docSnap => {
        docs.push(docSnap.data() as Booking);
      });
      // Sort bookings chronologically descending (latest first)
      docs.sort((a, b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime());
      setBookings(docs);
    });

    // 5. Vouchers Listener
    const unsubVouchers = onSnapshot(collection(db, 'vouchers'), (snapshot) => {
      const docs: Voucher[] = [];
      snapshot.forEach(docSnap => {
        docs.push(docSnap.data() as Voucher);
      });
      setVouchers(docs);
    });

    // 6. Branding Configuration Listener
    const unsubBranding = onSnapshot(collection(db, 'branding'), (snapshot) => {
      snapshot.forEach(docSnap => {
        if (docSnap.id === 'config') {
          setBranding(docSnap.data() as AppBranding);
        }
      });
    });

    return () => {
      unsubMovies();
      unsubCinemas();
      unsubSchedules();
      unsubBookings();
      unsubVouchers();
      unsubBranding();
    };
  }, []);

  // Sync users list real-time to listen for any external profile updates or balance adjustments
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      const unsubUser = onSnapshot(doc(db, 'users', currentUser.id), (docSnap) => {
        if (docSnap.exists()) {
          const updatedUser = docSnap.data() as User;
          setCurrentUser(updatedUser);
          localStorage.setItem('cinema_current_user', JSON.stringify(updatedUser));
        }
      });
      return () => unsubUser();
    }
  }, [currentUser?.id]);

  // Synchronize local states to LocalStorage as a high-speed offline fallback
  useEffect(() => {
    localStorage.setItem('cinema_db_movies', JSON.stringify(movies));
  }, [movies]);

  useEffect(() => {
    localStorage.setItem('cinema_db_cinemas', JSON.stringify(cinemas));
  }, [cinemas]);

  useEffect(() => {
    localStorage.setItem('cinema_db_schedules', JSON.stringify(schedules));
  }, [schedules]);

  useEffect(() => {
    localStorage.setItem('cinema_db_bookings', JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    localStorage.setItem('cinema_db_vouchers', JSON.stringify(vouchers));
  }, [vouchers]);

  useEffect(() => {
    localStorage.setItem('cinema_branding', JSON.stringify(branding));
  }, [branding]);

  // Handle wrapped dispatcher state updates to write to remote Firestore database instantly
  const wrappedSetMovies = (update: React.SetStateAction<Movie[]>) => {
    setMovies(prev => {
      const next = typeof update === 'function' ? update(prev) : update;
      const added = next.filter(n => !prev.some(p => p.id === n.id));
      const removed = prev.filter(p => !next.some(n => n.id === n.id));
      
      added.forEach(m => saveMovieToFirestore(m));
      removed.forEach(m => deleteMovieFromFirestore(m.id));
      return next;
    });
  };

  const wrappedSetCinemas = (update: React.SetStateAction<Cinema[]>) => {
    setCinemas(prev => {
      const next = typeof update === 'function' ? update(prev) : update;
      next.forEach(c => {
        const p = prev.find(item => item.id === c.id);
        if (!p || JSON.stringify(p) !== JSON.stringify(c)) {
          saveCinemaToFirestore(c);
        }
      });
      return next;
    });
  };

  const wrappedSetSchedules = (update: React.SetStateAction<Schedule[]>) => {
    setSchedules(prev => {
      const next = typeof update === 'function' ? update(prev) : update;
      const added = next.filter(n => !prev.some(p => p.id === n.id));
      const removed = prev.filter(p => !next.some(n => n.id === p.id));
      
      added.forEach(s => saveScheduleToFirestore(s));
      removed.forEach(s => deleteScheduleFromFirestore(s.id));
      return next;
    });
  };

  const wrappedSetBookings = (update: React.SetStateAction<Booking[]>) => {
    setBookings(prev => {
      const next = typeof update === 'function' ? update(prev) : update;
      const added = next.filter(n => !prev.some(p => p.id === n.id));
      added.forEach(b => saveBookingToFirestore(b));
      return next;
    });
  };

  const wrappedSetVouchers = (update: React.SetStateAction<Voucher[]>) => {
    setVouchers(prev => {
      const next = typeof update === 'function' ? update(prev) : update;
      next.forEach(v => {
        const p = prev.find(item => item.id === v.id);
        if (!p || JSON.stringify(p) !== JSON.stringify(v)) {
          saveVoucherToFirestore(v);
        }
      });
      const removed = prev.filter(p => !next.some(n => n.id === p.id));
      removed.forEach(v => deleteVoucherFromFirestore(v.id));
      return next;
    });
  };

  const wrappedSetBranding = (update: React.SetStateAction<AppBranding>) => {
    setBranding(prev => {
      const next = typeof update === 'function' ? update(prev) : update;
      saveBrandingToFirestore(next);
      return next;
    });
  };

  // Session token verifying and expire guards
  useEffect(() => {
    if (token) {
      const payload = parseAndVerifyJWT(token);
      if (!payload) {
        handleLogout();
      }
    }
  }, [token]);

  const handleLoginSuccess = (newToken: string, user: User) => {
    setToken(newToken);
    setCurrentUser(user);
    localStorage.setItem('cinema_jwt_token', newToken);
    localStorage.setItem('cinema_current_user', JSON.stringify(user));
    saveUserToFirestore(user);
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem('cinema_jwt_token');
    localStorage.removeItem('cinema_current_user');
  };

  return (
    <div className="min-h-screen bg-slate-50 relative selection:bg-amber-450 selection:text-slate-900">
      
      {/* Dynamic Route Rendering based on Token Role */}
      {!token || !currentUser ? (
        <LoginScreen onLoginSuccess={handleLoginSuccess} branding={branding} />
      ) : currentUser.role === 'admin' ? (
        <AdminPanel
          currentUser={currentUser}
          onLogout={handleLogout}
          movies={movies}
          setMovies={wrappedSetMovies}
          cinemas={cinemas}
          setCinemas={wrappedSetCinemas}
          schedules={schedules}
          setSchedules={wrappedSetSchedules}
          bookings={bookings}
          vouchers={vouchers}
          setVouchers={wrappedSetVouchers}
          branding={branding}
          setBranding={wrappedSetBranding}
        />
      ) : (
        <BuyerDashboard
          currentUser={currentUser}
          onLogout={handleLogout}
          movies={movies}
          cinemas={cinemas}
          schedules={schedules}
          bookings={bookings}
          setBookings={wrappedSetBookings}
          vouchers={vouchers}
          setVouchers={wrappedSetVouchers}
          onOpenReceipt={(booking) => setActiveReceipt(booking)}
          branding={branding}
        />
      )}

      {/* Persistent Receipt Invoice Modal */}
      {activeReceipt && (
        <ReceiptModal
          booking={activeReceipt}
          onClose={() => setActiveReceipt(null)}
        />
      )}

      {/* Floating PWA & Remote System Connection Badge */}
      <div className="fixed bottom-4 right-4 z-40 max-w-sm bg-white/95 backdrop-blur border border-slate-150 rounded-2xl p-3.5 shadow-xl hidden md:flex gap-3 items-start animate-fade-in text-[11px] leading-relaxed">
        <Wifi className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-display font-bold text-slate-800 uppercase tracking-wider block text-[10px]">
            Aplikasi Online Terhubung (Firebase Active)
          </span>
          <p className="text-slate-500 mt-1">
            Sistem database saat ini sinkron secara online menggunakan **Google Firestore**. Semua jadwal film, kursi teater, pemesanan tiket, dan saldo tersinkronisasi langsung antar perangkat.
          </p>
          <div className="mt-2 text-slate-400 font-mono text-[9px] flex items-center gap-1.5 font-bold uppercase">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span>CLOUD FIRESTORE DB READY • MULTI-USER SYNC</span>
          </div>
        </div>
      </div>

    </div>
  );
}
