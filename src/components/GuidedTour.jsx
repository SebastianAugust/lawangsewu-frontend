import { useEffect, useRef } from "react";
import { useJoyride, STATUS, ACTIONS, EVENTS } from "react-joyride";
import { useNavigate, useLocation } from "react-router-dom";

// Each step has `page` (custom) — pathname the step belongs to. The tour
// drives navigation between pages when consecutive steps belong to
// different pages.
const TOUR_STEPS = [
  // === HALAMAN KASIR ===
  {
    target: "body",
    content:
      'Selamat datang di Lawang Sewu POS! Tutorial ini akan memandu kamu menggunakan fitur kasir & riwayat. Klik "Lanjut" untuk mulai.',
    placement: "center",
    disableBeacon: true,
    page: "/",
  },
  {
    target: '[data-tour="search-menu"]',
    content:
      "Gunakan kolom ini untuk mencari menu berdasarkan nama. Ketik nama menu dan hasil langsung muncul.",
    placement: "bottom",
    disableBeacon: true,
    page: "/",
  },
  {
    target: '[data-tour="category-filter"]',
    content:
      "Filter menu berdasarkan kategori — Semua, Makanan, Minuman, atau Snack. Klik kategori untuk menyaring.",
    placement: "bottom",
    disableBeacon: true,
    page: "/",
  },
  {
    target: '[data-tour="menu-grid"]',
    content:
      "Daftar menu yang tersedia. Klik menu untuk membuka panel input jumlah. Kalau menu punya varian (misal Paha/Dada), pilih varian dulu baru atur jumlah.",
    placement: "top",
    disableBeacon: true,
    page: "/",
  },
  {
    target: '[data-tour="cart"]',
    content:
      "Semua pesanan yang dipilih muncul di sini. Kamu bisa edit jumlah/varian atau hapus item dari daftar.",
    placement: "left",
    disableBeacon: true,
    page: "/",
  },
  {
    target: '[data-tour="pay-button"]',
    content:
      "Setelah pesanan lengkap, klik tombol Bayar. Akan muncul layar konfirmasi untuk pilih metode pembayaran (Cash/QRIS/Transfer).",
    placement: "top",
    disableBeacon: true,
    page: "/",
  },

  // === HALAMAN RIWAYAT ===
  {
    target: "body",
    content: "Sekarang kita pindah ke halaman Riwayat Pesanan.",
    placement: "center",
    disableBeacon: true,
    page: "/orders",
  },
  {
    target: '[data-tour="date-filter"]',
    content: "Pilih tanggal untuk melihat pesanan di hari tertentu.",
    placement: "bottom",
    disableBeacon: true,
    page: "/orders",
  },
  {
    target: '[data-tour="order-summary"]',
    content:
      "Ringkasan cepat: total pesanan, pendapatan, dan jumlah void hari itu.",
    placement: "bottom",
    disableBeacon: true,
    page: "/orders",
  },
  {
    target: '[data-tour="order-list"]',
    content:
      "Semua pesanan muncul di sini. Klik pesanan untuk melihat detail isinya. Di dalam detail, kamu bisa request void (batalkan pesanan) dengan mengisi alasan.",
    placement: "top",
    disableBeacon: true,
    page: "/orders",
  },

  // === SELESAI ===
  {
    target: "body",
    content:
      'Tutorial selesai! Kamu sudah siap menggunakan Lawang Sewu POS. Klik tombol "Tutorial" di navbar kapan saja untuk mengulang.',
    placement: "center",
    disableBeacon: true,
    page: "/orders",
  },
];

const tourStyles = {
  options: {
    primaryColor: "#f59e0b",
    textColor: "#1e293b",
    backgroundColor: "#ffffff",
    arrowColor: "#ffffff",
    overlayColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 10000,
  },
  tooltipContainer: { textAlign: "left" },
  buttonNext: {
    backgroundColor: "#f59e0b",
    borderRadius: "8px",
    padding: "8px 16px",
    fontSize: "13px",
    fontWeight: "600",
  },
  buttonBack: { color: "#64748b", fontSize: "13px", marginRight: 8 },
  buttonSkip: { color: "#94a3b8", fontSize: "13px" },
  tooltip: {
    borderRadius: "12px",
    padding: "20px",
    fontSize: "14px",
    lineHeight: "1.6",
  },
};

const TOUR_LOCALE = {
  back: "Kembali",
  close: "Tutup",
  last: "Selesai",
  next: "Lanjut",
  skip: "Lewati",
};

// Time to wait after route change before resuming the tour, so the new
// page has mounted and target elements exist in the DOM.
const PAGE_TRANSITION_DELAY = 600;

function GuidedTour({ run, onFinish }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Refs let the Joyride callback always see fresh values without rebuilding
  // the callback on every render (which would reset the tour).
  const controlsRef = useRef(null);
  const locationRef = useRef(location.pathname);
  useEffect(() => {
    locationRef.current = location.pathname;
  }, [location.pathname]);

  const { controls, Tour } = useJoyride({
    steps: TOUR_STEPS,
    continuous: true,
    showSkipButton: true,
    showProgress: true,
    disableOverlayClose: true,
    scrollToFirstStep: true,
    spotlightPadding: 6,
    styles: tourStyles,
    locale: TOUR_LOCALE,
    callback: (data) => {
      const { status, action, index, type } = data;

      if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        onFinish();
        return;
      }

      if (type === EVENTS.STEP_AFTER) {
        const direction = action === ACTIONS.PREV ? -1 : 1;
        const nextIndex = index + direction;
        if (nextIndex < 0 || nextIndex >= TOUR_STEPS.length) return;

        const nextStep = TOUR_STEPS[nextIndex];
        // Cross-page transition: navigate first, then explicitly drive
        // Joyride to the right step after the new page mounts. Joyride's
        // auto-advance can race with the route change, leaving the tour
        // stuck — calling controls.go(nextIndex) guarantees resume.
        if (nextStep.page !== locationRef.current) {
          navigate(nextStep.page);
          setTimeout(() => {
            controlsRef.current?.go(nextIndex);
          }, PAGE_TRANSITION_DELAY);
        }
      }

      // Target gone (user navigated away mid-tour). Recover by jumping
      // forward instead of stalling.
      if (type === EVENTS.TARGET_NOT_FOUND) {
        const nextIndex = index + 1;
        if (nextIndex < TOUR_STEPS.length && controlsRef.current) {
          controlsRef.current.go(nextIndex);
        } else {
          onFinish();
        }
      }
    },
  });

  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

  // Drive the tour from the `run` prop: start when true, stop when false.
  useEffect(() => {
    if (!controls) return;
    if (run) controls.start(0);
    else controls.stop();
  }, [run, controls]);

  return Tour;
}

export default GuidedTour;
