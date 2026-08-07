import { useState, useEffect, useRef } from "react";
import { getMenus, getCategories } from "../api/menu";
import { createOrder, getOrders } from "../api/order";
import BluetoothPrinterButton from "../components/BluetoothPrinterButton";
import MainLayout from "../layouts/MainLayout";
import {
  Search,
  ShoppingBag,
  Plus,
  Minus,
  CheckCircle2,
  X,
  UtensilsCrossed,
  Tag,
  User,
  Receipt as ReceiptIcon,
  Wallet,
  Smartphone,
  Landmark,
} from "lucide-react";

function CashierPage() {
  const [menus, setMenus] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [success, setSuccess] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const searchInputRef = useRef(null);

  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [lastOrder, setLastOrder] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // ───── Animation bookkeeping (presentation only, never touches cart data) ─────
  // Menu rows that should flash right now, keyed by cart_key.
  const [flashRows, setFlashRows] = useState({});
  // Cart lines currently sliding out; kept rendered until the exit finishes.
  const [exitingKeys, setExitingKeys] = useState([]);
  // Bumped whenever the total changes, to retrigger the colour flash.
  const [totalPulse, setTotalPulse] = useState(0);
  const [badgePulse, setBadgePulse] = useState(0);
  const prevTotalRef = useRef(0);
  const prevItemsRef = useRef(0);

  const markFlash = (cartKey) => {
    setFlashRows((prev) => ({ ...prev, [cartKey]: (prev[cartKey] || 0) + 1 }));
    setTimeout(() => {
      setFlashRows((prev) => {
        const next = { ...prev };
        delete next[cartKey];
        return next;
      });
    }, 320);
  };

  useEffect(() => {
    getMenus().then((res) => setMenus(res.data));
    getCategories().then((res) => setCategories(res.data));
  }, []);

  // Tour observation: dispatch `app:receipt-closed` when user closes the
  // receipt modal (true → false transition). Used by the tutorial to
  // advance from the receipt step.
  const prevShowReceiptRef = useRef(false);
  useEffect(() => {
    if (prevShowReceiptRef.current && !showReceipt) {
      window.dispatchEvent(new Event("app:receipt-closed"));
    }
    prevShowReceiptRef.current = showReceipt;
  }, [showReceipt]);

  const filteredMenus = menus.filter((m) => {
    const matchCategory = selectedCategory ? m.category_id === selectedCategory : true;
    const matchSearch = searchQuery
      ? m.name.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchCategory && matchSearch;
  });

  // Group filtered menus by category, preserving the category list order.
  // Categories with no matching menus are skipped; menus without a known
  // category are bucketed under "Lainnya".
  const menusByCategory = categories
    .map((cat) => ({
      category: cat,
      items: filteredMenus.filter((m) => m.category_id === cat.id),
    }))
    .filter((g) => g.items.length > 0);
  const orphanMenus = filteredMenus.filter(
    (m) => !categories.some((c) => c.id === m.category_id),
  );
  if (orphanMenus.length > 0) {
    menusByCategory.push({
      category: { id: "__other__", name: "Lainnya" },
      items: orphanMenus,
    });
  }

  // First menu row overall — carries the data-tour="menu-active-panel" anchor
  // that the guided tour highlights (the old "active panel" no longer exists).
  const firstMenuId = menusByCategory[0]?.items[0]?.id;

  // Cart key convention: "<menuId>" for plain menus, "<menuId>-<variantId>"
  // for a specific variant. Each key is an independent cart line.
  const cartKeyFor = (menu, variant) =>
    variant ? `${menu.id}-${variant.id}` : `${menu.id}`;

  const getCartQty = (cartKey) =>
    cart.find((item) => item.cart_key === cartKey)?.quantity || 0;

  // + control: add one of this menu/variant to the cart (0→1, 1→2, ...).
  const incrementItem = (menu, variant) => {
    const cartKey = cartKeyFor(menu, variant);
    const price = variant ? variant.price : menu.price;
    const displayName = variant ? `${menu.name} (${variant.name})` : menu.name;
    const existing = cart.find((item) => item.cart_key === cartKey);
    if (existing) {
      setCart(
        cart.map((item) =>
          item.cart_key === cartKey
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * item.price,
              }
            : item,
        ),
      );
    } else {
      setCart([
        ...cart,
        {
          cart_key: cartKey,
          menu_id: menu.id,
          menu_variant_id: variant?.id || null,
          variant_name: variant?.name || null,
          name: displayName,
          price,
          quantity: 1,
          subtotal: price,
        },
      ]);
    }
    // Tapping + cancels a pending exit so the line stops fading out.
    setExitingKeys((keys) => keys.filter((k) => k !== cartKey));
    markFlash(cartKey);
    // Tour still expects the two legacy menu events; both fire on +, so the
    // tutorial advances as the user taps + (once per step) through the flow.
    window.dispatchEvent(new Event("app:menu-clicked"));
    window.dispatchEvent(new Event("app:added-to-cart"));
  };

  // - control: remove one; at qty 1 the line is dropped from the cart entirely.
  const decrementItem = (menu, variant) => {
    const cartKey = cartKeyFor(menu, variant);
    const existing = cart.find((item) => item.cart_key === cartKey);
    if (!existing) return;
    if (existing.quantity <= 1) {
      // Let the cart line play its exit before the data is dropped. The
      // removal itself is unchanged — only deferred by the animation length.
      setExitingKeys((keys) => [...keys, cartKey]);
      setTimeout(() => {
        setCart((c) => {
          // If the user tapped + again mid-exit, the line is wanted after all.
          const cur = c.find((i) => i.cart_key === cartKey);
          if (cur && cur.quantity > 1) return c;
          return c.filter((item) => item.cart_key !== cartKey);
        });
        setExitingKeys((keys) => keys.filter((k) => k !== cartKey));
      }, 150);
    } else {
      setCart(
        cart.map((item) =>
          item.cart_key === cartKey
            ? {
                ...item,
                quantity: item.quantity - 1,
                subtotal: (item.quantity - 1) * item.price,
              }
            : item,
        ),
      );
    }
  };

  const totalPrice = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Flash the total when it changes; pop the badge only when the count grows.
  useEffect(() => {
    if (prevTotalRef.current !== totalPrice && totalPrice > 0) {
      setTotalPulse((n) => n + 1);
    }
    prevTotalRef.current = totalPrice;
  }, [totalPrice]);

  useEffect(() => {
    if (totalItems > prevItemsRef.current) setBadgePulse((n) => n + 1);
    prevItemsRef.current = totalItems;
  }, [totalItems]);

  // "Bayar" hanya membuka ringkasan — kasir sering salah pencet metode di
  // panel kanan, jadi transaksi baru diproses setelah dikonfirmasi di modal.
  const handleOpenConfirmation = () => {
    if (submitting || cart.length === 0) return;
    window.dispatchEvent(new Event("app:pay-clicked"));
    setShowConfirmation(true);
  };

  // "Ubah": tutup modal saja. Cart, nama pelanggan, dan metode tetap utuh —
  // kasir tinggal pilih ulang metode di panel kanan lalu tekan Bayar lagi.
  const handleChangePaymentMethod = () => {
    if (submitting) return;
    setShowConfirmation(false);
  };

  // Dipanggil dari tombol "Konfirmasi Bayar" di modal. Isi fungsinya sama
  // persis seperti sebelumnya — hanya triggernya yang pindah.
  const handleSubmitOrder = async () => {
    if (submitting || cart.length === 0) return;
    setSubmitting(true);
    try {
      const orderData = {
        customer_name: customerName || null,
        items: cart.map((item) => ({
          menu_id: item.menu_id,
          menu_variant_id: item.menu_variant_id,
          variant_name: item.variant_name,
          quantity: item.quantity,
          subtotal: item.subtotal,
        })),
        payment_method: paymentMethod,
        // Modal konfirmasi tidak meminta nominal tunai, tapi
        // backend mewajibkan cash_received saat metode cash
        // (OrderController: required_if:payment_method,cash). Kirim uang pas —
        // transaksi tercatat lunas dan kembaliannya 0.
        cash_received: paymentMethod === "cash" ? totalPrice : null,
      };
      const response = await createOrder(orderData);
      const newOrder = response.data;

      // Compute today's sequence: count orders today with created_at <= this one
      const today = new Date(newOrder.created_at || Date.now())
        .toISOString()
        .split("T")[0];
      let dailySequence = null;
      try {
        const todayRes = await getOrders(today);
        const todayOrders = todayRes.data || [];
        const newOrderTime = new Date(newOrder.created_at).getTime();
        const found = todayOrders.find((o) => o.id === newOrder.id);
        if (found) {
          dailySequence = todayOrders.filter(
            (o) => new Date(o.created_at).getTime() <= newOrderTime,
          ).length;
        } else {
          dailySequence = todayOrders.length + 1;
        }
      } catch {
        // best-effort; receipt will hide the line if null
      }

      setLastOrder({
        ...newOrder,
        cart: [...cart],
        customer_name: customerName,
        cash_received: null,
        change_amount: null,
        daily_sequence: dailySequence,
      });
      setCart([]);
      setCustomerName("");
      setPaymentMethod("cash"); // back to default for the next order
      setShowConfirmation(false);
      setShowReceipt(true);
      setSuccess(
        dailySequence
          ? `Pesanan ke-${dailySequence} hari ini tersimpan!`
          : "Pesanan berhasil disimpan!",
      );
      setTimeout(() => setSuccess(""), 3000);
      window.dispatchEvent(new Event("app:order-created"));
    } catch {
      alert("Gagal menyimpan pesanan");
    } finally {
      setSubmitting(false);
    }
  };

  const getMenuDisplayPrice = (menu) => {
    if (menu.variants?.length > 0) {
      const prices = menu.variants.map((v) => v.price);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      return min === max
        ? `Rp ${min.toLocaleString()}`
        : `Rp ${min.toLocaleString()} – ${max.toLocaleString()}`;
    }
    return `Rp ${menu.price.toLocaleString()}`;
  };

  // Payment selector in the right panel — the only place the method is chosen.
  const footerPaymentMethods = [
    { value: "cash", label: "CASH" },
    { value: "qris", label: "QRIS" },
    { value: "transfer", label: "TRANSFER" },
  ];

  // Tampilan metode di modal konfirmasi. Warna dibedakan per metode supaya
  // kasir langsung sadar kalau yang kepencet bukan yang dimaksud.
  const paymentMethodBadges = {
    cash: {
      label: "CASH",
      icon: Wallet,
      bg: "#ecfdf5",
      border: "#10b981",
      text: "#047857",
      soft: "#059669",
    },
    qris: {
      label: "QRIS",
      icon: Smartphone,
      bg: "#eff6ff",
      border: "#2563eb",
      text: "#1d4ed8",
      soft: "#2563eb",
    },
    transfer: {
      label: "TRANSFER",
      icon: Landmark,
      bg: "#f5f3ff",
      border: "#7c3aed",
      text: "#6d28d9",
      soft: "#7c3aed",
    },
  };
  const activeBadge = paymentMethodBadges[paymentMethod] || paymentMethodBadges.cash;
  const ActiveBadgeIcon = activeBadge.icon;

  return (
    <MainLayout>
      {/* RECEIPT MODAL */}
      {showReceipt && lastOrder && (
        <div className="backdrop-enter fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div data-tour="receipt-modal" className="modal-enter bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="bg-blue-900 p-6 text-center text-white relative overflow-hidden">
              <button
                onClick={() => setShowReceipt(false)}
                className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="relative w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-white/40">
                <CheckCircle2 className="w-7 h-7" strokeWidth={2.5} />
              </div>
              <h3 className="font-display text-xl font-bold">Pesanan Berhasil</h3>
              <p className="text-sm text-white/80 mt-1">
                {new Date(lastOrder.created_at).toLocaleString("id-ID")}
              </p>
              {lastOrder.daily_sequence && (
                <p className="inline-block mt-2 px-3 py-1 bg-white/20 rounded-full text-xs font-bold tracking-wide">
                  Pesanan ke-{lastOrder.daily_sequence} hari ini
                </p>
              )}
            </div>

            <div className="p-6">
              {lastOrder.customer_name && (
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-dashed border-slate-200">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700">
                    {lastOrder.customer_name}
                  </span>
                </div>
              )}
              <div className="space-y-2 mb-4">
                {lastOrder.cart.map((item) => (
                  <div key={item.cart_key} className="flex justify-between text-sm">
                    <span className="text-slate-600 flex-1">
                      {item.name}{" "}
                      <span className="text-slate-400">×{item.quantity}</span>
                    </span>
                    <span className="font-semibold text-slate-800">
                      Rp {item.subtotal.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-slate-200 pt-3 space-y-1.5">
                <div className="flex justify-between font-display font-bold text-lg">
                  <span>Total</span>
                  <span className="text-amber-600">
                    Rp {lastOrder.total_price.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Metode</span>
                  <span className="uppercase font-semibold tracking-wide">
                    {lastOrder.payment_method}
                  </span>
                </div>
                {/* Nominal tunai hanya tampil kalau memang tercatat. Modal
                    konfirmasi tidak meminta nominal, jadi order baru tidak
                    menyimpannya — tanpa penjagaan ini barisnya jadi "Rp "
                    kosong. Order lama yang punya nilainya tetap tampil. */}
                {lastOrder.payment_method === "cash" &&
                  lastOrder.cash_received != null && (
                    <>
                      <div className="flex justify-between text-sm text-slate-600">
                        <span>Tunai diterima</span>
                        <span>Rp {lastOrder.cash_received.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold text-emerald-600">
                        <span>Kembalian</span>
                        <span>Rp {lastOrder.change_amount?.toLocaleString()}</span>
                      </div>
                    </>
                  )}
              </div>
              <div className="mt-6 space-y-2">
                <BluetoothPrinterButton order={lastOrder} />
                <button
                  onClick={() => setShowReceipt(false)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl text-sm font-semibold transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT CONFIRMATION MODAL */}
      {showConfirmation && (
        <div className="backdrop-enter fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[55] p-4">
          <div
            data-tour="payment-modal"
            className="modal-enter bg-white w-full max-w-md shadow-2xl overflow-hidden"
            style={{ borderRadius: 20 }}
          >
            <div className="px-6 pt-6 pb-4 flex items-start justify-between border-b border-slate-100">
              <div className="min-w-0">
                <h3
                  className="font-display"
                  style={{ fontSize: 17, fontWeight: 700, color: "#1e3a5f" }}
                >
                  Konfirmasi Pembayaran
                </h3>
                <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                  {customerName ? (
                    <>
                      untuk{" "}
                      <span style={{ fontWeight: 600, color: "#475569" }}>
                        {customerName}
                      </span>
                    </>
                  ) : (
                    "Periksa pesanan dan metode bayar sebelum diproses"
                  )}
                </p>
              </div>
              <button
                onClick={handleChangePaymentMethod}
                disabled={submitting}
                aria-label="Tutup konfirmasi"
                className="press-scale w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition shrink-0 disabled:opacity-50"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="p-6">
              {/* Ringkasan pesanan */}
              <div
                className="mb-5 max-h-44 overflow-y-auto"
                style={{ background: "#f8fafc", borderRadius: 14, padding: 16 }}
              >
                {cart.map((item) => (
                  <div
                    key={item.cart_key}
                    className="flex justify-between items-baseline gap-3 py-1"
                  >
                    <span
                      className="min-w-0"
                      style={{ fontSize: 13, color: "#475569" }}
                    >
                      {item.name}{" "}
                      <span style={{ color: "#94a3b8" }}>×{item.quantity}</span>
                    </span>
                    <span
                      className="whitespace-nowrap tabular-nums"
                      style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}
                    >
                      Rp {item.subtotal.toLocaleString()}
                    </span>
                  </div>
                ))}
                <div
                  className="flex justify-between items-baseline mt-2 pt-2"
                  style={{ borderTop: "1px solid #e2e8f0" }}
                >
                  <span
                    className="font-display"
                    style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}
                  >
                    Total
                  </span>
                  <span
                    className="font-display tabular-nums"
                    style={{ fontSize: 20, fontWeight: 700, color: "#1e3a5f" }}
                  >
                    Rp {totalPrice.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Metode bayar — hanya ditampilkan, dipilihnya tetap di panel kanan */}
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#94a3b8",
                  letterSpacing: "0.6px",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Metode Pembayaran
              </p>
              <div
                className="flex items-center justify-between gap-3 mb-5"
                style={{
                  background: activeBadge.bg,
                  border: `1.5px solid ${activeBadge.border}`,
                  borderRadius: 14,
                  padding: "14px 16px",
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="flex items-center justify-center shrink-0"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 11,
                      background: "#ffffff",
                    }}
                  >
                    <ActiveBadgeIcon
                      style={{ width: 20, height: 20, color: activeBadge.soft }}
                      strokeWidth={2.2}
                    />
                  </div>
                  <div className="min-w-0">
                    <p
                      className="font-display truncate"
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: activeBadge.text,
                        letterSpacing: "0.5px",
                        lineHeight: 1.15,
                      }}
                    >
                      {activeBadge.label}
                    </p>
                    <p style={{ fontSize: 11, color: activeBadge.soft, marginTop: 2 }}>
                      Pastikan metode sudah benar
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleChangePaymentMethod}
                  disabled={submitting}
                  className="press-scale shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: "#ffffff",
                    border: `1px solid ${activeBadge.border}`,
                    color: activeBadge.text,
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "6px 14px",
                  }}
                >
                  Ubah
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfirmation(false)}
                  disabled={submitting}
                  className="press-scale flex-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  style={{
                    color: "#475569",
                    borderRadius: 11,
                    fontSize: 14,
                    fontWeight: 600,
                    padding: 12,
                  }}
                >
                  Batal
                </button>
                <button
                  data-tour="payment-confirm"
                  onClick={handleSubmitOrder}
                  disabled={submitting}
                  className={`press-pay flex-1 hover:bg-blue-800 disabled:cursor-not-allowed text-white flex items-center justify-center gap-2 ${
                    submitting ? "loading-pulse" : ""
                  }`}
                  style={{
                    background: "#1e3a5f",
                    borderRadius: 11,
                    fontSize: 14,
                    fontWeight: 600,
                    padding: 12,
                  }}
                >
                  {submitting ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {submitting ? "Memproses..." : "Konfirmasi Bayar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CASHIER */}
      <div className="flex gap-5 h-[calc(100vh-5.5rem)]">
        {/* Drawer overlay (only when cart open on <lg) */}
        <div
          onClick={() => setCartOpen(false)}
          className={`lg:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 transition-opacity ${
            cartOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        />

        {/* Floating cart button — only on <lg */}
        <button
          onClick={() => setCartOpen(true)}
          className={`lg:hidden fixed bottom-5 right-5 z-30 inline-flex items-center gap-2.5 bg-slate-900 hover:bg-slate-800 text-white pl-4 pr-5 py-3.5 rounded-2xl shadow-2xl shadow-slate-900/30 transition-all ${
            cartOpen ? "opacity-0 pointer-events-none translate-y-2" : "opacity-100"
          }`}
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5" strokeWidth={2.2} />
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-slate-900">
                {totalItems}
              </span>
            )}
          </div>
          <div className="flex flex-col items-start leading-tight">
            <span className="text-[10px] text-slate-300 uppercase font-semibold tracking-wider">
              Keranjang
            </span>
            <span className="font-display font-bold text-sm">
              {cart.length > 0 ? `Rp ${totalPrice.toLocaleString()}` : "Kosong"}
            </span>
          </div>
        </button>

        {/* LEFT — Menu */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-3 mb-4">
            <div data-tour="search-menu" className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                style={{ color: "#cbd5e1" }}
              />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Cari menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full focus:outline-none focus:border-blue-500"
                style={{
                  background: "#ffffff",
                  border: "0.5px solid rgba(0,0,0,0.08)",
                  borderRadius: 10,
                  padding: searchQuery
                    ? "9px 36px 9px 36px"
                    : "9px 16px 9px 36px",
                  fontSize: 13,
                  color: "#1e293b",
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  title="Bersihkan pencarian"
                  onClick={() => {
                    setSearchQuery("");
                    searchInputRef.current?.focus();
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#64748b")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    display: "flex",
                    alignItems: "center",
                    padding: 0,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "#94a3b8",
                  }}
                >
                  <X style={{ width: 14, height: 14 }} />
                </button>
              )}
            </div>
            <div
              className="hidden md:block whitespace-nowrap"
              style={{
                background: "#ffffff",
                border: "0.5px solid rgba(0,0,0,0.08)",
                borderRadius: 8,
                padding: "6px 12px",
                fontSize: 12,
                color: "#94a3b8",
              }}
            >
              {filteredMenus.length} menu
            </div>
          </div>

          <div
            data-tour="category-filter"
            className="flex mb-4 overflow-x-auto pb-1 -mx-1 px-1"
            style={{ gap: 7 }}
          >
            {(() => {
              const pillStyle = (active) => ({
                fontSize: 12,
                fontWeight: 500,
                padding: "6px 16px",
                borderRadius: 100,
                whiteSpace: "nowrap",
                transition:
                  "background-color 150ms cubic-bezier(0.25, 0.46, 0.45, 0.94), color 150ms cubic-bezier(0.25, 0.46, 0.45, 0.94), border-color 150ms cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 150ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                ...(active
                  ? { background: "#1e3a5f", color: "#ffffff", border: "0.5px solid transparent" }
                  : { background: "#ffffff", color: "#64748b", border: "0.5px solid rgba(0,0,0,0.1)" }),
              });
              return (
                <>
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="press-scale"
                    style={pillStyle(!selectedCategory)}
                  >
                    Semua
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className="press-scale"
                      style={pillStyle(selectedCategory === cat.id)}
                    >
                      {cat.name}
                    </button>
                  ))}
                </>
              );
            })()}
          </div>

          <div data-tour="menu-grid" className="flex-1 overflow-y-auto pr-1 -mr-1 pb-24 lg:pb-0">
            {menusByCategory.length === 0 ? (
              <div className="text-center py-16">
                <UtensilsCrossed className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 text-sm font-medium">Menu tidak ditemukan</p>
                <p className="text-slate-300 text-xs mt-1">Coba kata kunci lain</p>
              </div>
            ) : (
              <div className="space-y-6">
                {menusByCategory.map(({ category, items }) => (
                  <section key={category.id}>
                    <div className="flex items-center mb-3" style={{ gap: 6, paddingTop: 10 }}>
                      <Tag
                        style={{ width: 13, height: 13, color: "#1e3a5f" }}
                      />
                      <h3
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#1e3a5f",
                          letterSpacing: "0.6px",
                          textTransform: "uppercase",
                        }}
                      >
                        {category.name}
                      </h3>
                      <span
                        className="tabular-nums"
                        style={{
                          fontSize: 10,
                          fontWeight: 400,
                          color: "#94a3b8",
                          textTransform: "none",
                          letterSpacing: 0,
                        }}
                      >
                        {items.length} menu
                      </span>
                      <div className="flex-1 h-px bg-slate-200/70 ml-2" />
                    </div>
                    <div className="flex flex-col">
                      {items.map((menu, menuIndex) => {
                        const hasVariants = menu.variants?.length > 0;

                        // Menu WITHOUT variants: name/price + inline qty control.
                        if (!hasVariants) {
                          const qty = getCartQty(`${menu.id}`);
                          const isFirst = menu.id === firstMenuId;
                          return (
                            <div
                              key={menu.id}
                              // Stagger key includes the query so re-filtering
                              // replays the entrance for the new result set.
                              className={`stagger-item flex items-center gap-3 ${
                                flashRows[`${menu.id}`] ? "row-flash" : ""
                              }`}
                              style={{
                                "--i": menuIndex,
                                paddingTop: 12,
                                paddingBottom: 12,
                                borderBottom: "0.5px solid rgba(0,0,0,0.08)",
                              }}
                            >
                              <div className="flex-1 min-w-0">
                                <p
                                  className="truncate"
                                  style={{ fontSize: 15, fontWeight: 500, color: "#1e293b", letterSpacing: "-0.1px" }}
                                >
                                  {menu.name}
                                </p>
                                <p style={{ fontSize: 13, fontWeight: 600, color: "#2563eb", marginTop: 2 }}>
                                  {getMenuDisplayPrice(menu)}
                                </p>
                              </div>
                              <div
                                data-tour={isFirst ? "menu-active-panel" : undefined}
                                className="flex items-center gap-2 shrink-0"
                              >
                                <button
                                  onClick={() => decrementItem(menu, null)}
                                  disabled={qty === 0}
                                  className="press-scale flex items-center justify-center rounded-full shrink-0"
                                  style={{
                                    width: 32, height: 32, fontSize: 18,
                                    background: "#ffffff", border: "0.5px solid rgba(0,0,0,0.1)", color: "#475569",
                                    opacity: qty === 0 ? 0.4 : 1, cursor: qty === 0 ? "not-allowed" : "pointer",
                                  }}
                                >
                                  <Minus style={{ width: 18, height: 18 }} strokeWidth={2.5} />
                                </button>
                                {/* key={qty} remounts the span so the pop
                                    replays on every change. */}
                                <span
                                  key={qty}
                                  className="qty-pop text-center font-bold tabular-nums"
                                  style={{ fontSize: 16, minWidth: 20, color: "#1e293b" }}
                                >
                                  {qty}
                                </span>
                                <button
                                  onClick={() => incrementItem(menu, null)}
                                  className="press-scale flex items-center justify-center rounded-full shrink-0"
                                  style={{ width: 32, height: 32, fontSize: 18, background: "#1e3a5f", color: "#ffffff" }}
                                >
                                  <Plus style={{ width: 18, height: 18 }} strokeWidth={2.5} />
                                </button>
                              </div>
                            </div>
                          );
                        }

                        // Menu WITH variants: main row (name only), then each
                        // variant as an indented sub-row with its own qty control.
                        return (
                          <div
                            key={menu.id}
                            className="stagger-item"
                            style={{
                              "--i": menuIndex,
                              borderBottom: "0.5px solid rgba(0,0,0,0.08)",
                            }}
                          >
                            <div
                              className="flex items-center gap-3"
                              style={{ paddingTop: 12, paddingBottom: 6 }}
                            >
                              <div className="flex-1 min-w-0">
                                <p
                                  className="truncate"
                                  style={{ fontSize: 15, fontWeight: 500, color: "#1e293b", letterSpacing: "-0.1px" }}
                                >
                                  {menu.name}
                                </p>
                              </div>
                            </div>
                            <div style={{ paddingLeft: 56, paddingBottom: 6 }}>
                              {menu.variants.map((v, vi) => {
                                const qty = getCartQty(`${menu.id}-${v.id}`);
                                const isFirst = menu.id === firstMenuId && vi === 0;
                                return (
                                  <div
                                    key={v.id}
                                    className={`flex items-center gap-2 ${
                                      flashRows[`${menu.id}-${v.id}`] ? "row-flash" : ""
                                    }`}
                                    style={{ paddingTop: 12, paddingBottom: 12 }}
                                  >
                                    <span
                                      className="flex-1 min-w-0 truncate"
                                      style={{ fontSize: 14, fontWeight: 500, color: "#475569" }}
                                    >
                                      {v.name}
                                    </span>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: "#2563eb" }}>
                                      Rp {v.price.toLocaleString()}
                                    </span>
                                    <div
                                      data-tour={isFirst ? "menu-active-panel" : undefined}
                                      className="flex items-center gap-2 shrink-0"
                                    >
                                      <button
                                        onClick={() => decrementItem(menu, v)}
                                        disabled={qty === 0}
                                        className="press-scale flex items-center justify-center rounded-full shrink-0"
                                        style={{
                                          width: 32, height: 32, fontSize: 18,
                                          background: "#ffffff", border: "0.5px solid rgba(0,0,0,0.1)", color: "#475569",
                                          opacity: qty === 0 ? 0.4 : 1, cursor: qty === 0 ? "not-allowed" : "pointer",
                                        }}
                                      >
                                        <Minus style={{ width: 18, height: 18 }} strokeWidth={2.5} />
                                      </button>
                                      <span
                                        key={qty}
                                        className="qty-pop text-center font-bold tabular-nums"
                                        style={{ fontSize: 16, minWidth: 20, color: "#1e293b" }}
                                      >
                                        {qty}
                                      </span>
                                      <button
                                        onClick={() => incrementItem(menu, v)}
                                        className="press-scale flex items-center justify-center rounded-full shrink-0"
                                        style={{ width: 32, height: 32, fontSize: 18, background: "#1e3a5f", color: "#ffffff" }}
                                      >
                                        <Plus style={{ width: 18, height: 18 }} strokeWidth={2.5} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Cart (inline on lg+, drawer on <lg) */}
        <aside
          data-tour="cart"
          style={{ paddingLeft: 8 }}
          className={`bg-white border border-slate-200/70 flex flex-col overflow-hidden transition-transform duration-200 ease-out
            lg:static lg:w-[360px] xl:w-[380px] lg:rounded-2xl lg:shadow-sm lg:translate-x-0
            fixed inset-y-0 right-0 z-50 w-full max-w-md shadow-2xl
            ${cartOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}`}
        >
          <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-br from-stone-50 to-white">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{ width: 34, height: 34, background: "#eff6ff", borderRadius: 9 }}
                >
                  <ShoppingBag style={{ width: 16, height: 16, color: "#2563eb" }} strokeWidth={2.2} />
                </div>
                <h2 style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>
                  Pesanan
                </h2>
                {cart.length > 0 && (
                  <span
                    key={badgePulse}
                    className="badge-pop rounded-full"
                    style={{
                      background: "#eff6ff",
                      color: "#1d4ed8",
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "3px 9px",
                    }}
                  >
                    {totalItems} item
                  </span>
                )}
              </div>
              <button
                onClick={() => setCartOpen(false)}
                className="lg:hidden w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition shrink-0"
                aria-label="Tutup keranjang"
              >
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>
            {success && (
              <div className="toast-enter mt-3 bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-2 rounded-lg border border-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {success}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                  <ShoppingBag className="w-7 h-7 text-slate-300" />
                </div>
                <p className="text-slate-700 font-semibold text-sm">Keranjang kosong</p>
                <p className="text-slate-400 text-xs mt-1">
                  Pilih menu di sebelah kiri untuk memulai pesanan
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {cart.map((item) => (
                  <div
                    key={item.cart_key}
                    className={`flex items-center gap-3 py-2.5 px-2 ${
                      exitingKeys.includes(item.cart_key)
                        ? "cart-item-exit"
                        : "cart-item-enter"
                    }`}
                  >
                    <div
                      className="flex items-center justify-center shrink-0"
                      style={{ width: 34, height: 34, background: "#eff6ff", borderRadius: 9 }}
                    >
                      <UtensilsCrossed style={{ width: 15, height: 15, color: "#2563eb" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="truncate"
                        style={{ fontSize: 12, fontWeight: 500, color: "#1e293b" }}
                      >
                        {item.name}
                      </p>
                      <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                        ×{item.quantity}
                      </p>
                    </div>
                    <p
                      className="whitespace-nowrap"
                      style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}
                    >
                      Rp {item.subtotal.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div className="px-5 py-4 border-t border-slate-100 bg-stone-50/50">
              <div className="flex mb-3" style={{ gap: 6 }}>
                {footerPaymentMethods.map((m) => {
                  const active = paymentMethod === m.value;
                  return (
                    <button
                      key={m.value}
                      onClick={() => {
                        setPaymentMethod(m.value);
                        window.dispatchEvent(new Event("app:payment-method-selected"));
                      }}
                      className="flex-1"
                      style={{
                        padding: "8px 4px",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        transition: "all 0.15s ease",
                        ...(active
                          ? { background: "#eff6ff", border: "1px solid #2563eb", color: "#1d4ed8" }
                          : { background: "#ffffff", border: "0.5px solid rgba(0,0,0,0.1)", color: "#64748b" }),
                      }}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
              <div className="relative mb-3">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  data-tour="customer-name"
                  type="text"
                  placeholder="Nama pelanggan (opsional)"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    if (e.target.value.trim().length > 0) {
                      window.dispatchEvent(new Event("app:customer-name-entered"));
                    }
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition"
                />
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-3 mb-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                    Total Pembayaran
                  </span>
                  <span
                    key={totalPulse}
                    className="total-flash font-display text-2xl font-bold text-slate-900"
                  >
                    Rp {totalPrice.toLocaleString()}
                  </span>
                </div>
              </div>
              <button
                data-tour="pay-button"
                onClick={handleOpenConfirmation}
                disabled={submitting}
                className={`press-pay w-full hover:bg-blue-800 disabled:cursor-not-allowed text-white flex items-center justify-center gap-2 ${
                  submitting ? "loading-pulse" : ""
                }`}
                style={{
                  background: "#1e3a5f",
                  borderRadius: 11,
                  fontSize: 14,
                  fontWeight: 600,
                  padding: 12,
                }}
              >
                {submitting ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ReceiptIcon className="w-4 h-4" />
                )}
                {submitting ? "Memproses..." : "Bayar"}
              </button>
            </div>
          )}
        </aside>
      </div>
    </MainLayout>
  );
}

export default CashierPage;
