export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'buyer';
  balance: number;
  phone?: string;
  avatarUrl?: string;
}

export interface Movie {
  id: string;
  title: string;
  director: string;
  synopsis: string;
  genre: string;
  posterUrl: string;
}

export interface Cinema {
  id: string;
  name: string;
  rows: number; // e.g., 8 (labeled A to H)
  cols: number; // e.g., 10 (labeled 1 to 10)
  forbiddenSeats: string[]; // e.g., ["A-3", "B-4"] -> seat IDs that cannot be occupied
  removedSeats?: string[]; // e.g., ["A-1", "A-2"] -> seat IDs that do NOT exist in the grid (rendered as empty space)
  aisleAfterCol?: number; // aisle starts after this column index (1-indexed)
  aisleAfterCol2?: number; // second aisle starts after this column index (1-indexed)
  aisleWidth?: number; // width in columns, 1 or 2
}

export interface AppBranding {
  appName: string;
  appLogoChar: string; // single character/letter or emoji
  themeColor: string; // e.g. blue or custom
}

export interface Schedule {
  id: string;
  movieId: string;
  cinemaId: string;
  cinemaName: string;
  showtime: string; // e.g., "2026-05-28T14:30:00"
  price: number; // e.g., 50000
}

export interface Booking {
  id: string;
  userId: string;
  userName: string;
  scheduleId: string;
  movieTitle: string;
  cinemaName: string;
  showtime: string;
  seats: string[]; // e.g., ["B-2", "B-3"]
  pricePaid: number;
  bookingDate: string; // e.g., "2026-05-26T04:30:00"
}

export interface Voucher {
  id: string;
  code: string; // e.g. "TOPUP-XXXX-XXXX"
  amount: number; // e.g. 50000 or 100000
  isRedeemed: boolean;
  redeemedBy?: string; // userName or userId
  redeemedAt?: string; // ISO date string
  createdAt: string; // ISO date string
}

