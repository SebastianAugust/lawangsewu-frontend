import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTour } from "../contexts/TourContext";
import { cleanupTestOrders } from "../api/order";
import TourOverlay from "./TourOverlay";

const DEBUG = true;
const dlog = (...a) => DEBUG && console.log("[Tour]", ...a);

// Steps:
//   page:     pathname this step belongs to
//   target:   CSS selector for highlighted element, or null for center
//   placement:'top'|'bottom'|'left'|'right'|'center'
//   mode:     'info' (Lanjut button) | 'wait' (action required)
//   waitFor:  event name (window) that satisfies 'wait' steps
//   waitForLocation: pathname (advances when location changes to this)
const TOUR_STEPS = [
  {
    page: "/",
    target: null,
    placement: "center",
    title: "Selamat datang",
    content:
      "Tutorial ini akan mengajarkan cara menggunakan Lawang Sewu POS. Ikuti setiap langkah dengan seksama — beberapa langkah mengharuskan kamu melakukan aksi langsung.",
    mode: "info",
  },
  {
    page: "/",
    target: '[data-tour="search-menu"]',
    placement: "bottom",
    content: "Gunakan kolom pencarian ini untuk mencari menu berdasarkan nama.",
    mode: "info",
  },
  {
    page: "/",
    target: '[data-tour="category-filter"]',
    placement: "bottom",
    content:
      "Klik kategori untuk memfilter menu — contoh: klik 'Makanan' untuk lihat menu makanan saja.",
    mode: "info",
  },
  {
    page: "/",
    target: '[data-tour="menu-grid"]',
    placement: "top",
    content:
      "Sekarang klik salah satu menu di bawah untuk menambahkan ke pesanan.",
    mode: "wait",
    waitFor: "app:menu-clicked",
  },
  {
    page: "/",
    target: '[data-tour="menu-active-panel"]',
    placement: "top",
    content:
      "Pilih varian (jika ada), atur jumlah dengan tombol +/-, lalu klik tombol oranye di kanan untuk memasukkan ke cart.",
    mode: "wait",
    waitFor: "app:added-to-cart",
  },
  {
    page: "/",
    target: '[data-tour="cart"]',
    placement: "left",
    content:
      "Pesanan yang sudah dipilih muncul di sini. Kamu bisa klik Edit untuk mengubah jumlah/varian, atau Hapus untuk menghapus item.",
    mode: "info",
  },
  {
    page: "/",
    target: '[data-tour="customer-name"]',
    placement: "top",
    content:
      "Ketik nama pelanggan untuk pesanan ini. Contoh: ketik 'Tutorial'.",
    mode: "wait",
    waitFor: "app:customer-name-entered",
  },
  {
    page: "/",
    target: '[data-tour="pay-button"]',
    placement: "top",
    content: "Klik tombol Lanjut Bayar untuk membuka layar pembayaran.",
    mode: "wait",
    waitFor: "app:pay-clicked",
  },
  {
    page: "/",
    target: '[data-tour="payment-modal"]',
    placement: "left",
    content:
      "Pilih metode pembayaran. Untuk Cash, masukkan jumlah uang yang diterima — tombol cepat tersedia untuk nominal umum.",
    mode: "info",
  },
  {
    page: "/",
    target: '[data-tour="payment-confirm"]',
    placement: "top",
    content:
      "Klik tombol Konfirmasi Bayar untuk menyelesaikan transaksi.",
    mode: "wait",
    waitFor: "app:order-created",
  },
  {
    page: "/",
    target: '[data-tour="receipt-modal"]',
    placement: "left",
    content:
      "Struk pesanan muncul di sini. Kamu bisa cetak struk atau tutup. Klik Lanjut untuk menutup struk dan lanjut tutorial.",
    mode: "info",
    onAdvance: "app:close-receipt",
  },
  {
    page: "/",
    target: '[data-tour="nav-orders"]',
    placement: "bottom",
    content:
      "Pesanan berhasil! Sekarang klik tab 'Riwayat' di navbar untuk melihat pesanan kamu.",
    mode: "wait",
    waitForLocation: "/orders",
  },
  {
    page: "/orders",
    target: null,
    placement: "center",
    title: "Halaman Riwayat",
    content: "Ini halaman Riwayat Pesanan. Semua pesanan tercatat di sini.",
    mode: "info",
  },
  {
    page: "/orders",
    target: '[data-tour="date-filter"]',
    placement: "bottom",
    content: "Gunakan filter tanggal untuk melihat pesanan di hari tertentu.",
    mode: "info",
  },
  {
    page: "/orders",
    target: '[data-tour="order-summary"]',
    placement: "bottom",
    content:
      "Ringkasan cepat: jumlah pesanan, total pendapatan, dan jumlah void hari itu.",
    mode: "info",
  },
  {
    page: "/orders",
    target: '[data-tour="order-list"]',
    placement: "top",
    content: "Klik salah satu pesanan untuk melihat detail isinya.",
    mode: "wait",
    waitFor: "app:order-expanded",
  },
  {
    page: "/orders",
    target: '[data-tour="void-request-btn"]',
    placement: "top",
    content:
      "Untuk membatalkan pesanan, klik 'Request Void'. Owner harus menyetujui sebelum pesanan benar-benar dibatalkan.",
    mode: "wait",
    waitFor: "app:void-modal-opened",
  },
  {
    page: "/orders",
    target: '[data-tour="void-form"]',
    placement: "top",
    content:
      "Tulis alasan void (misal 'salah input'), lalu klik 'Kirim Permintaan Void'.",
    mode: "wait",
    waitFor: "app:void-submitted",
  },
  {
    page: "/orders",
    target: null,
    placement: "center",
    title: "Tutorial Selesai",
    content:
      "Kamu sudah menguasai fitur dasar Lawang Sewu POS. Pesanan dummy yang kamu buat tadi sedang dihapus otomatis. Klik tombol 'Tutorial' di navbar kapan saja untuk mengulang.",
    mode: "info",
  },
];

function GuidedTour() {
  const { running, stepIdx, tourId, next, stop } = useTour();
  const location = useLocation();
  const navigate = useNavigate();
  const stepIdxRef = useRef(stepIdx);
  const cleanedUpRef = useRef(false);
  const tourIdRef = useRef(tourId);

  useEffect(() => {
    stepIdxRef.current = stepIdx;
  }, [stepIdx]);

  // Reset cleanup guard each new tour run
  useEffect(() => {
    if (tourId !== tourIdRef.current) {
      tourIdRef.current = tourId;
      cleanedUpRef.current = false;
      dlog("new tour run", tourId);
    }
  }, [tourId]);

  // Tour mode flag: createOrder() reads this to mark orders as is_test.
  useEffect(() => {
    if (!running) return;
    window.__TOUR_MODE__ = true;
    dlog("tour started, __TOUR_MODE__=true");
    return () => {
      window.__TOUR_MODE__ = false;
      dlog("tour ended, __TOUR_MODE__=false");
      if (!cleanedUpRef.current) {
        cleanedUpRef.current = true;
        cleanupTestOrders()
          .then((r) => dlog("cleanup result", r?.data))
          .catch((e) => dlog("cleanup failed", e?.message));
      }
    };
  }, [running]);

  // Listen for action events to satisfy 'wait' steps
  useEffect(() => {
    if (!running) return;
    const advanceIfMatching = (evtName) => {
      const step = TOUR_STEPS[stepIdxRef.current];
      dlog("event", evtName, "current step waitFor =", step?.waitFor);
      if (step?.mode === "wait" && step.waitFor === evtName) {
        dlog("match → next");
        next();
      }
    };
    const events = [
      "app:menu-clicked",
      "app:added-to-cart",
      "app:customer-name-entered",
      "app:pay-clicked",
      "app:order-created",
      "app:order-expanded",
      "app:void-modal-opened",
      "app:void-submitted",
    ];
    const handlers = events.map((name) => {
      const h = () => advanceIfMatching(name);
      window.addEventListener(name, h);
      return [name, h];
    });
    return () => {
      handlers.forEach(([n, h]) => window.removeEventListener(n, h));
    };
  }, [running, next]);

  // Auto-advance when location matches waitForLocation
  useEffect(() => {
    if (!running) return;
    const step = TOUR_STEPS[stepIdxRef.current];
    if (
      step?.mode === "wait" &&
      step.waitForLocation === location.pathname
    ) {
      dlog("location match", location.pathname, "→ next");
      next();
    }
  }, [location.pathname, running, next]);

  // End tour when stepIdx goes beyond last
  useEffect(() => {
    if (running && stepIdx >= TOUR_STEPS.length) {
      dlog("past last step → stop");
      stop();
    }
  }, [stepIdx, running, stop]);

  if (!running) return null;

  const step = TOUR_STEPS[stepIdx];
  if (!step) return null;

  // If we're on the wrong page for this step, just don't render the
  // overlay (the page-change effect or step's wait will trigger).
  if (step.page !== location.pathname) {
    dlog("step page", step.page, "≠ current", location.pathname);
    return null;
  }

  const handleNext = () => {
    // Some 'info' steps need a side-effect on advance (e.g. close receipt
    // modal so we can reach the navbar). Dispatch the configured event.
    if (step.onAdvance) {
      window.dispatchEvent(new Event(step.onAdvance));
    }
    // Programmatic navigate is unused — we always wait for user click
    // on the spotlighted nav link instead.
    void navigate;
    next();
  };

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <TourOverlay
      key={`${tourId}-${stepIdx}`}
      step={step}
      stepIdx={stepIdx}
      totalSteps={TOUR_STEPS.length}
      onNext={handleNext}
      onClose={stop}
      isMobile={isMobile}
    />
  );
}

export default GuidedTour;
