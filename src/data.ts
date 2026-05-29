import { Movie, Cinema, Schedule, Booking, User } from './types';

// Let's reference our custom generated images
const POSTER_GARUDA = '/src/assets/images/poster_garuda_1779768029884.png';
const POSTER_SURGA = '/src/assets/images/poster_surga_1779768047599.png';
const POSTER_LELUHUR = '/src/assets/images/poster_leluhur_1779768065564.png';
const POSTER_PANTAI = '/src/assets/images/poster_pantai_1779768084297.png';

export const INITIAL_MOVIES: Movie[] = [
  {
    id: 'movie-1',
    title: 'Garuda: Sang Legenda',
    director: 'Joko Anwar',
    genre: 'Aksi / Laga',
    synopsis: 'Kisah kepahlawanan modern di bawah bayang-bayang kegelapan kuno. Membawa zirah emas dan biru berteknologi tinggi untuk melindungi kota.',
    posterUrl: POSTER_GARUDA,
  },
  {
    id: 'movie-2',
    title: 'Surga di Balik Awan',
    director: 'Teddy Soeriaatmadja',
    genre: 'Drama Romantis',
    synopsis: 'Sebuah perjalanan cinta penuh pengorbanan melintasi batas waktu di atas samudera awan pegunungan yang menawan.',
    posterUrl: POSTER_SURGA,
  },
  {
    id: 'movie-3',
    title: 'Leluhur',
    director: 'Kimo Stamboel',
    genre: 'Horor / Misteri',
    synopsis: 'Kutukan mistis bangkit ketika suatu topeng kayu keramat dari leluhur kuno digegerkan dari tidurnya di tengah hutan rimba.',
    posterUrl: POSTER_LELUHUR,
  },
  {
    id: 'movie-4',
    title: 'Mimpi Anak Pantai',
    director: 'Riri Riza',
    genre: 'Drama Keluarga',
    synopsis: 'Kisah penuh inspirasi tentang seorang anak pesisir pantai yang bercita-cita mengarungi dunia akademis melawan keterbatasan.',
    posterUrl: POSTER_PANTAI,
  },
];

export const INITIAL_CINEMAS: Cinema[] = [
  {
    id: 'cinema-1',
    name: 'Cinema 1 Executive',
    rows: 8, // A to H
    cols: 10, // 1 to 10
    forbiddenSeats: ['B-5', 'H-1', 'H-10'], // Damaged or blocked by admin
    removedSeats: ['A-1', 'A-2', 'A-9', 'A-10', 'E-5', 'F-5'], // Front corners empty, row E/F center gaps
    aisleAfterCol: 5,
    aisleWidth: 1,
  },
  {
    id: 'cinema-2',
    name: 'Cinema 2 Premier',
    rows: 6, // A to F
    cols: 8, // 1 to 8
    forbiddenSeats: ['D-4', 'D-5'],
    removedSeats: ['A-1', 'A-8', 'F-1', 'F-8'], // Corner layouts
    aisleAfterCol: 4,
    aisleWidth: 1,
  },
  {
    id: 'cinema-3',
    name: 'Cinema 3 Gold Screen',
    rows: 8,
    cols: 12,
    forbiddenSeats: [],
    removedSeats: ['A-1', 'A-2', 'A-11', 'A-12', 'B-1', 'B-12'], // Rounded design
    aisleAfterCol: 3,
    aisleAfterCol2: 9,
    aisleWidth: 1,
  },
];

// Current relative time for schedules is simulated based on 2026-05-26
export const INITIAL_SCHEDULES: Schedule[] = [
  // Movie 1: Garuda
  {
    id: 'sched-1',
    movieId: 'movie-1',
    cinemaId: 'cinema-1',
    cinemaName: 'Cinema 1 Executive',
    showtime: '2026-05-27T14:30:00', // Tomorrow, can download (H-1 is May 26)
    price: 55000,
  },
  {
    id: 'sched-2',
    movieId: 'movie-1',
    cinemaId: 'cinema-2',
    cinemaName: 'Cinema 2 Premier',
    showtime: '2026-05-27T19:00:00', // Tomorrow, can download
    price: 75000,
  },
  {
    id: 'sched-3',
    movieId: 'movie-1',
    cinemaId: 'cinema-1',
    cinemaName: 'Cinema 1 Executive',
    showtime: '2026-05-26T13:00:00', // Today, cannot download anymore (already screening day)
    price: 50000,
  },
  // Movie 2: Surga
  {
    id: 'sched-4',
    movieId: 'movie-2',
    cinemaId: 'cinema-2',
    cinemaName: 'Cinema 2 Premier',
    showtime: '2026-05-28T16:00:00', // H-2 (At least H-1), can download
    price: 75000,
  },
  {
    id: 'sched-5',
    movieId: 'movie-2',
    cinemaId: 'cinema-3',
    cinemaName: 'Cinema 3 Gold Screen',
    showtime: '2026-05-26T15:30:00', // Today, cannot download
    price: 60000,
  },
  // Movie 3: Leluhur
  {
    id: 'sched-6',
    movieId: 'movie-3',
    cinemaId: 'cinema-3',
    cinemaName: 'Cinema 3 Gold Screen',
    showtime: '2026-05-27T21:00:00', // Tomorrow, can download
    price: 65000,
  },
  // Movie 4: Mimpi Anak Pantai
  {
    id: 'sched-7',
    movieId: 'movie-4',
    cinemaId: 'cinema-1',
    cinemaName: 'Cinema 1 Executive',
    showtime: '2026-05-28T11:00:00', // Day after tomorrow, can download
    price: 55000,
  },
];

export const INITIAL_BOOKINGS: Booking[] = [];

// Helper to generate a fake JWT Token standard
export function generateJWT(user: User): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    exp: Date.now() + 2 * 60 * 60 * 1000, // Valid for 2 hours
  }));
  const signature = 'simulated_signature_hash_xyz123';
  return `${header}.${payload}.${signature}`;
}

// Decode and validation of JWT token
export function parseAndVerifyJWT(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payloadJson = atob(parts[1]);
    const payload = JSON.parse(payloadJson);
    if (payload.exp < Date.now()) {
      return null; // Expired
    }
    return payload;
  } catch (e) {
    return null;
  }
}
