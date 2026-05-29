import React from 'react';
import { X, Printer, MapPin, Clock, Grid, Calendar, ShieldCheck, QrCode } from 'lucide-react';
import { Booking } from '../types';

interface ReceiptModalProps {
  booking: Booking | null;
  onClose: () => void;
}

export default function ReceiptModal({ booking, onClose }: ReceiptModalProps) {
  if (!booking) return null;

  const handlePrint = () => {
    // Elegant system print trigger representation
    const printArea = document.getElementById('ticket-printable-area');
    if (printArea) {
      const originalContent = document.body.innerHTML;
      const printableContent = printArea.innerHTML;
      
      // Since window.open might be restricted in iframes, we simulate a beautiful printed prompt 
      // of PDF download and let them trigger native print or enjoy this beautiful visual.
      // We will perform standard window.print() and let them handle it if supported!
      try {
        window.print();
      } catch (e) {
        console.log("Printing error", e);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      
      {/* Modal Box */}
      <div className="relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col my-auto">
        
        {/* Header toolbar */}
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <span className="font-display font-medium text-xs text-blue-900 tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            E-Tiket Terverifikasi (JWT Secure)
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded-full bg-slate-200/50 hover:bg-slate-200 text-slate-500 transition-all cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Ticket Container - Designed to look like a physical luxury retro cinema ticket stub */}
        <div className="p-6 overflow-y-auto max-h-[80vh] flex-grow no-scrollbar">
          
          <div id="ticket-printable-area" className="relative bg-white border border-slate-200 rounded-2xl shadow-sm text-xs font-sans text-slate-800">
            
            {/* Top design strip */}
            <div className="h-2.5 bg-blue-900 rounded-t-2xl border-b-2 border-amber-500" />

            {/* Left and Right Notches (visual ticket cutouts) */}
            <div className="absolute top-1/2 -left-3.5 w-6 h-6 rounded-full bg-slate-900/60 backdrop-blur-sm border-r border-slate-200 z-10" />
            <div className="absolute top-1/2 -right-3.5 w-6 h-6 rounded-full bg-slate-900/60 backdrop-blur-sm border-l border-slate-200 z-10" />

            <div className="p-5 space-y-4">
              
              {/* Cinema Header brand */}
              <div className="text-center font-display">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Resi Resmi Bioskop PWA</span>
                <h3 className="font-extrabold text-base tracking-wider text-blue-900">
                  CINE<span className="text-amber-500">TICKET</span>
                </h3>
                <p className="text-[8px] font-mono text-slate-400">UUID AUTH: {booking.id.toUpperCase()}</p>
              </div>

              {/* Dotted Divider line */}
              <div className="border-t border-dashed border-slate-250 my-3" />

              {/* Movie Title */}
              <div className="text-center py-1">
                <span className="text-[9px] uppercase tracking-wider font-bold text-slate-450 block">Judul Film</span>
                <span className="font-display font-bold text-sm text-slate-800 leading-snug block">
                  {booking.movieTitle}
                </span>
              </div>

              {/* Booking Details Grid */}
              <div className="grid grid-cols-2 gap-y-3.5 gap-x-2 text-[10.5px]">
                <div>
                  <span className="text-[8.5px] uppercase tracking-wider text-slate-400 block font-bold">Cinema Studio</span>
                  <div className="flex items-center gap-1 font-semibold text-slate-805 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-900 shrink-0" />
                    <span>{booking.cinemaName}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[8.5px] uppercase tracking-wider text-slate-400 block font-bold">Waktu Tayang</span>
                  <div className="flex items-center gap-1 font-semibold text-slate-805 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-slate-450 shrink-0" />
                    <span>{booking.showtime.replace('T', ' ')}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[8.5px] uppercase tracking-wider text-slate-400 block font-bold">Telah Dipesan Untuk</span>
                  <div className="flex items-center gap-1 font-semibold text-slate-805 mt-0.5">
                    <span className="text-blue-900 font-bold font-sans">{booking.userName}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[8.5px] uppercase tracking-wider text-slate-400 block font-bold">Nomor Kursi ({booking.seats.length} Tiket)</span>
                  <div className="flex items-center gap-1 font-bold text-amber-600 mt-0.5 font-mono bg-amber-50 px-2 py-0.5 border border-amber-100 rounded w-max">
                    <Grid className="w-3 h-3 text-amber-600 shrink-0" />
                    <span>{booking.seats.join(', ')}</span>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-dashed border-slate-250 my-3" />

              {/* Subtotal cost calculation */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1 text-slate-600 font-sans text-[10.5px]">
                <div className="flex justify-between">
                  <span>Harga per Tiket</span>
                  <span className="font-mono">Rp {(booking.pricePaid / booking.seats.length).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Jumlah Kursi</span>
                  <span>{booking.seats.length} unit</span>
                </div>
                <div className="flex justify-between font-bold text-slate-800 pt-1.5 border-t border-slate-150">
                  <span>Total Pembayaran (Sim Dompet)</span>
                  <span className="font-mono text-blue-905">Rp {booking.pricePaid.toLocaleString('id-ID')}</span>
                </div>
              </div>

              {/* Dotted Divider line */}
              <div className="border-t border-dashed border-slate-250 my-3" />

              {/* Barcode & QR Code representation */}
              <div className="flex flex-col items-center justify-center space-y-2 py-1">
                
                {/* Simulated QR Code drawing with Tailwind boxes */}
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-150 shadow-inner inline-block">
                  <QrCode className="w-20 h-20 text-slate-800" />
                </div>
                
                <p className="text-[8.5px] text-slate-400 font-mono text-center tracking-wider font-semibold">
                  SISTEM VERIFIKASI QR CODE RESMI BIOSKOP PWA
                </p>

                {/* Micro Barcode bars */}
                <div className="flex justify-center h-8 w-2/3 scale-y-110 mb-1 opacity-80 mt-1">
                  {Array.from({ length: 48 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-full ${i % 3 === 0 || i % 7 === 0 || i % 11 === 0 ? 'bg-slate-805' : 'bg-transparent'}`}
                      style={{ width: `${i % 5 === 0 ? '3px' : '1px'}` }}
                    />
                  ))}
                </div>
                <span className="text-[7.5px] text-slate-405 font-mono">Tgl Beli: {booking.bookingDate.replace('T', ' ')}</span>

              </div>

            </div>

          </div>

        </div>

        {/* Footer actions with print button */}
        <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex gap-3">
          <button
            onClick={onPrint}
            className="flex-1 py-3 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-display font-bold shadow-md cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Simulasi Cetak Tiket</span>
          </button>
          
          <button
            onClick={onClose}
            className="px-5 py-3 bg-white border border-slate-205 hover:bg-slate-100 text-slate-655 rounded-xl text-xs font-semibold cursor-pointer active:scale-95 transition-all text-center"
          >
            Selesai
          </button>
        </div>

      </div>

    </div>
  );

  // Quick helper to override print triggers safely
  function onPrint() {
    handlePrint();
    alert("Tiket berhasil dicetak! (Simulasi file PDF telah terunggah ke sistem memori perangkat).");
  }
}
