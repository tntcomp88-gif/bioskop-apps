import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, doc, getDoc, setDoc, deleteDoc, getDocs, 
  collection, onSnapshot, getDocFromServer 
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { Movie, Cinema, Schedule, Booking, Voucher, User, AppBranding } from './types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection in compliance with guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

// Highly-tuned helper routines to write objects into Firestore instantly with strict error catching
export async function saveMovieToFirestore(movie: Movie) {
  const path = `movies/${movie.id}`;
  try {
    await setDoc(doc(db, 'movies', movie.id), movie);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteMovieFromFirestore(movieId: string) {
  const path = `movies/${movieId}`;
  try {
    await deleteDoc(doc(db, 'movies', movieId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveCinemaToFirestore(cinema: Cinema) {
  const path = `cinemas/${cinema.id}`;
  try {
    await setDoc(doc(db, 'cinemas', cinema.id), cinema);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteCinemaFromFirestore(cinemaId: string) {
  const path = `cinemas/${cinemaId}`;
  try {
    await deleteDoc(doc(db, 'cinemas', cinemaId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveScheduleToFirestore(schedule: Schedule) {
  const path = `schedules/${schedule.id}`;
  try {
    await setDoc(doc(db, 'schedules', schedule.id), schedule);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteScheduleFromFirestore(scheduleId: string) {
  const path = `schedules/${scheduleId}`;
  try {
    await deleteDoc(doc(db, 'schedules', scheduleId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveBookingToFirestore(booking: Booking) {
  const path = `bookings/${booking.id}`;
  try {
    await setDoc(doc(db, 'bookings', booking.id), booking);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveVoucherToFirestore(voucher: Voucher) {
  const path = `vouchers/${voucher.id}`;
  try {
    await setDoc(doc(db, 'vouchers', voucher.id), voucher);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteVoucherFromFirestore(voucherId: string) {
  const path = `vouchers/${voucherId}`;
  try {
    await deleteDoc(doc(db, 'vouchers', voucherId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveUserToFirestore(user: User) {
  const path = `users/${user.id}`;
  try {
    await setDoc(doc(db, 'users', user.id), user);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveBrandingToFirestore(branding: AppBranding) {
  const path = 'branding/config';
  try {
    // Keep styling configs globally stored in a dedicated document
    await setDoc(doc(db, 'branding', 'config'), branding);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}
