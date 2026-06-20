import React, { useState, useEffect } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/react';
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
  saveUserToFirestore,
  handleFirestoreError,
  OperationType
} from './firebase';
import { onSnapshot, collection, doc, deleteDoc, getDocs } from 'firebase/firestore';
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
      setMovies(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'movies');
    });

    // 2. Cinemas Listener
    const unsubCinemas = onSnapshot(collection(db, 'cinemas'), (snapshot) => {
      const docs: Cinema[] = [];
      snapshot.forEach(docSnap => {
        docs.push(docSnap.data() as Cinema);
      });
      setCinemas(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'cinemas');
    });

    // 3. Schedules Listener
    const unsubSchedules = onSnapshot(collection(db, 'schedules'), (snapshot) => {
      const docs: Schedule[] = [];
      snapshot.forEach(docSnap => {
        docs.push(docSnap.data() as Schedule);
      });
      setSchedules(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'schedules');
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
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'bookings');
    });

    // 5. Vouchers Listener
    const unsubVouchers = onSnapshot(collection(db, 'vouchers'), (snapshot) => {
      const docs: Voucher[] = [];
      snapshot.forEach(docSnap => {
        docs.push(docSnap.data() as Voucher);
      });
      setVouchers(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'vouchers');
    });

    // 6. Branding Configuration Listener (directly query the config document)
    const unsubBranding = onSnapshot(doc(db, 'branding', 'config'), (docSnap) => {
      if (docSnap.exists()) {
        setBranding(docSnap.data() as AppBranding);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'branding/config');
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
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${currentUser.id}`);
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
      const removed = prev.filter(p => !next.some(n => n.id === p.id));
      
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
      const removed = prev.filter(p => !next.some(n => n.id === p.id));
      removed.forEach(c => deleteCinemaFromFirestore(c.id));
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

  const handleUpdateUser = async (updatedFields: Partial<User>) => {
    if (!currentUser) return;
    const nextUser = { ...currentUser, ...updatedFields };
    setCurrentUser(nextUser);
    localStorage.setItem('cinema_current_user', JSON.stringify(nextUser));

    // For registers offline database fallback
    const savedUsersRaw = localStorage.getItem('cinema_registered_users');
    if (savedUsersRaw) {
      const registeredUsers: User[] = JSON.parse(savedUsersRaw);
      const idx = registeredUsers.findIndex(u => u.id === currentUser.id);
      if (idx !== -1) {
        registeredUsers[idx] = { ...registeredUsers[idx], ...updatedFields };
        localStorage.setItem('cinema_registered_users', JSON.stringify(registeredUsers));
      }
    }

    // Persist the changes directly to the Firestore collection
    await saveUserToFirestore(nextUser);
  };

  const handleClearDatabase = async () => {
    // 1. Clear Local React States
    setMovies([]);
    setCinemas([]);
    setSchedules([]);
    setBookings([]);
    setVouchers([]);

    // 2. Delete all docs in Firestore collections
    const collections = ['movies', 'cinemas', 'schedules', 'bookings', 'vouchers', 'users'];
    for (const colName of collections) {
      try {
        let snap;
        try {
          snap = await getDocs(collection(db, colName));
        } catch (getErr) {
          console.error(`Failed to get collection ${colName}:`, getErr);
          handleFirestoreError(getErr, OperationType.GET, colName);
          continue; // Go to next collection
        }
        for (const docSnap of snap.docs) {
          try {
            await deleteDoc(doc(db, colName, docSnap.id));
          } catch (delErr) {
            console.error(`Failed to delete doc ${docSnap.id} in ${colName}:`, delErr);
            handleFirestoreError(delErr, OperationType.DELETE, `${colName}/${docSnap.id}`);
            // Continue deleting others in collection
          }
        }
      } catch (err) {
        console.error(`Error clearing collection ${colName}:`, err);
      }
    }

    // 3. Clear Local Storage legacy sandboxes
    localStorage.removeItem('cinema_db_movies');
    localStorage.removeItem('cinema_db_cinemas');
    localStorage.removeItem('cinema_db_schedules');
    localStorage.removeItem('cinema_db_bookings');
    localStorage.removeItem('cinema_db_vouchers');
    localStorage.removeItem('cinema_registered_users');
    localStorage.removeItem('cinema_user_passwords');
  };

  const handleSeedDatabase = async () => {
    // Clear first to avoid duplicate collisions
    await handleClearDatabase();

    // Seed default structures in order
    for (const m of INITIAL_MOVIES) {
      await saveMovieToFirestore(m);
    }
    for (const c of INITIAL_CINEMAS) {
      await saveCinemaToFirestore(c);
    }
    for (const s of INITIAL_SCHEDULES) {
      await saveScheduleToFirestore(s);
    }

    // Primary test account Budi Santoso
    const defaultBudi = {
      id: 'buyer-1',
      name: 'Budi Santoso',
      email: 'budi@gmail.com',
      role: 'buyer',
      balance: 150000,
      phone: '081122334455',
      password: 'budi123'
    };
    await saveUserToFirestore(defaultBudi as any);

    // Save passwords to local storage for offline tolerance
    const passwords: Record<string, string> = { 'budi@gmail.com': 'budi123' };
    localStorage.setItem('cinema_user_passwords', JSON.stringify(passwords));
    localStorage.setItem('cinema_registered_users', JSON.stringify([defaultBudi]));
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
          onClearDatabase={handleClearDatabase}
          onSeedDatabase={handleSeedDatabase}
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
          onUpdateUser={handleUpdateUser}
        />
      )}

      {/* Persistent Receipt Invoice Modal */}
      {activeReceipt && (
        <ReceiptModal
          booking={activeReceipt}
          onClose={() => setActiveReceipt(null)}
        />
      )}

      {/* Vercel Speed Insights */}
      <SpeedInsights />

    </div>
  );
}
