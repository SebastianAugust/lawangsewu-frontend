import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
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

// ───── Module-level constants ─────
// Hoisted out of the component so they are allocated once instead of on every
// render. Nothing here depends on state.

// Cart key convention: "<menuId>" for plain menus, "<menuId>-<variantId>" for
// a specific variant. Each key is an independent cart line.
const cartKeyFor = (menu, variant) =>
  variant ? `${menu.id}-${variant.id}` : `${menu.id}`;

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
// QRIS leads because it is what the counter reaches for most; `cash` is still
// the value the page starts and resets to.
const FOOTER_PAYMENT_METHODS = [
  { value: "qris", label: "QRIS" },
  { value: "cash", label: "CASH" },
  { value: "transfer", label: "TRANSFER" },
];

// Tampilan metode di modal konfirmasi. Warna dibedakan per metode supaya
// kasir langsung sadar kalau yang kepencet bukan yang dimaksud.
const PAYMENT_METHOD_BADGES = {
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

const QTY_ICON = { width: 18, height: 18 };
const QTY_MINUS_BASE = {
  width: 32,
  height: 32,
  fontSize: 18,
  background: "#ffffff",
  border: "0.5px solid rgba(0,0,0,0.1)",
  color: "#475569",
};
const QTY_PLUS_STYLE = {
  width: 32,
  height: 32,
  fontSize: 18,
  background: "#1e3a5f",
  color: "#ffffff",
};

const categoryPillStyle = (active) => ({
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

// ───── Leaf components ─────
// These are the memo boundaries that matter. Adding one item to the cart used
// to re-render every menu row on the page; now only the row whose qty actually
// changed does any work, because each row takes primitives plus callbacks
// whose identity is stable across renders.

// The single qty control, shared by the menu list and the cart so the two
// panels stay visually identical. Callers pass zero-arg handlers.
const QtyStepper = memo(function QtyStepper({
  qty,
  onIncrement,
  onDecrement,
  tourAnchor,
}) {
  const disabled = qty === 0;
  return (
    <div data-tour={tourAnchor} className="flex items-center gap-2 shrink-0">
      <button
        onClick={onDecrement}
        disabled={disabled}
        aria-label="Kurangi jumlah"
        className="press-scale flex items-center justify-center rounded-full shrink-0"
        style={{
          ...QTY_MINUS_BASE,
          opacity: disabled ? 0.4 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        <Minus style={QTY_ICON} strokeWidth={2.5} />
      </button>
      {/* key={qty} remounts the span so the pop replays on every change. */}
      <span
        key={qty}
        className="qty-pop text-center font-bold tabular-nums"
        style={{ fontSize: 16, minWidth: 20, color: "#1e293b" }}
      >
        {qty}
      </span>
      <button
        onClick={onIncrement}
        aria-label="Tambah jumlah"
        className="press-scale flex items-center justify-center rounded-full shrink-0"
        style={QTY_PLUS_STYLE}
      >
        <Plus style={QTY_ICON} strokeWidth={2.5} />
      </button>
    </div>
  );
});

// Menu WITHOUT variants: name/price + inline qty control.
const MenuRow = memo(function MenuRow({
  menu,
  qty,
  flash,
  index,
  isFirst,
  onIncrement,
  onDecrement,
}) {
  const handleIncrement = useCallback(
    () => onIncrement(menu, null),
    [onIncrement, menu],
  );
  const handleDecrement = useCallback(
    () => onDecrement(menu, null, qty),
    [onDecrement, menu, qty],
  );

  return (
    <div
      className={`stagger-item flex items-center gap-3 ${flash ? "row-flash" : ""}`}
      style={{
        "--i": index,
        paddingTop: 12,
        paddingBottom: 12,
        borderBottom: "0.5px solid rgba(0,0,0,0.08)",
      }}
    >
      <div className="flex-1 min-w-0">
        <p
          className="truncate"
          style={{
            fontSize: 15,
            fontWeight: 500,
            color: "#1e293b",
            letterSpacing: "-0.1px",
          }}
        >
          {menu.name}
        </p>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#2563eb", marginTop: 2 }}>
          {getMenuDisplayPrice(menu)}
        </p>
      </div>
      <QtyStepper
        qty={qty}
        onIncrement={handleIncrement}
        onDecrement={handleDecrement}
        tourAnchor={isFirst ? "menu-active-panel" : undefined}
      />
    </div>
  );
});

// One variant of a menu that has them — its own price and its own cart line.
const VariantRow = memo(function VariantRow({
  menu,
  variant,
  qty,
  flash,
  isFirst,
  onIncrement,
  onDecrement,
}) {
  const handleIncrement = useCallback(
    () => onIncrement(menu, variant),
    [onIncrement, menu, variant],
  );
  const handleDecrement = useCallback(
    () => onDecrement(menu, variant, qty),
    [onDecrement, menu, variant, qty],
  );

  return (
    <div
      className={`flex items-center gap-3 ${flash ? "row-flash" : ""}`}
      style={{ paddingTop: 12, paddingBottom: 12 }}
    >
      <span
        className="flex-1 min-w-0 truncate"
        style={{ fontSize: 14, fontWeight: 500, color: "#475569" }}
      >
        {variant.name}
      </span>
      {/* shrink-0 + nowrap: the name is the only thing allowed to give way,
          so a long variant name can never squeeze or wrap the price. */}
      <span
        className="shrink-0 whitespace-nowrap"
        style={{ fontSize: 13, fontWeight: 600, color: "#2563eb" }}
      >
        Rp {variant.price.toLocaleString()}
      </span>
      <QtyStepper
        qty={qty}
        onIncrement={handleIncrement}
        onDecrement={handleDecrement}
        tourAnchor={isFirst ? "menu-active-panel" : undefined}
      />
    </div>
  );
});

// Menu WITH variants: main row (name only), then each variant as an indented
// sub-row with its own qty control. Not memoised itself — the memo that pays
// off is on VariantRow; this wrapper only creates elements.
function MenuWithVariants({
  menu,
  index,
  qtyByKey,
  flashRows,
  isFirstMenu,
  onIncrement,
  onDecrement,
}) {
  return (
    <div
      className="stagger-item"
      style={{ "--i": index, borderBottom: "0.5px solid rgba(0,0,0,0.08)" }}
    >
      <div
        className="flex items-center gap-3"
        style={{ paddingTop: 12, paddingBottom: 6 }}
      >
        <div className="flex-1 min-w-0">
          <p
            className="truncate"
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: "#1e293b",
              letterSpacing: "-0.1px",
            }}
          >
            {menu.name}
          </p>
        </div>
      </div>
      <div style={{ paddingLeft: 56, paddingBottom: 6 }}>
        {menu.variants.map((variant, variantIndex) => {
          const key = `${menu.id}-${variant.id}`;
          return (
            <VariantRow
              key={variant.id}
              menu={menu}
              variant={variant}
              qty={qtyByKey[key] || 0}
              flash={Boolean(flashRows[key])}
              isFirst={isFirstMenu && variantIndex === 0}
              onIncrement={onIncrement}
              onDecrement={onDecrement}
            />
          );
        })}
      </div>
    </div>
  );
}

const CategoryPill = memo(function CategoryPill({ id, name, active, onSelect }) {
  const handleClick = useCallback(() => onSelect(id), [onSelect, id]);
  return (
    <button
      onClick={handleClick}
      className="press-scale"
      style={categoryPillStyle(active)}
    >
      {name}
    </button>
  );
});

// A line in the right-hand cart. It carries its own qty control so a cashier
// can fix a quantity without hunting the item back down in the menu list. The
// `cart` array stays the single source of truth, so the menu row on the left
// follows along automatically — including back to 0, which drops the line.
const CartLine = memo(function CartLine({
  item,
  exiting,
  onIncrement,
  onDecrement,
}) {
  const handleIncrement = useCallback(
    () => onIncrement(item.cart_key),
    [onIncrement, item.cart_key],
  );
  const handleDecrement = useCallback(
    () => onDecrement(item.cart_key, item.quantity),
    [onDecrement, item.cart_key, item.quantity],
  );

  return (
    <div
      className={`flex items-center gap-3 py-2.5 px-2 ${
        exiting ? "cart-item-exit" : "cart-item-enter"
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
        {/* Unit price — the quantity itself now lives in the stepper below. */}
        <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
          Rp {item.price.toLocaleString()}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <p
          className="whitespace-nowrap tabular-nums"
          style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}
        >
          Rp {item.subtotal.toLocaleString()}
        </p>
        <QtyStepper
          qty={item.quantity}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
        />
      </div>
    </div>
  );
});

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

  // QRIS is the counter's most common method, so it is both the first button
  // and the one already selected when the page opens.
  const [paymentMethod, setPaymentMethod] = useState("qris");
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

  // Pending flash/exit timers, cleared on unmount so navigating away mid-
  // animation does not leave setState calls queued against a dead component.
  const timersRef = useRef([]);
  const track = useCallback((id) => {
    timersRef.current.push(id);
    return id;
  }, []);
  useEffect(
    () => () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    },
    [],
  );

  const markFlash = useCallback(
    (cartKey) => {
      setFlashRows((prev) => ({ ...prev, [cartKey]: (prev[cartKey] || 0) + 1 }));
      track(
        setTimeout(() => {
          setFlashRows((prev) => {
            const next = { ...prev };
            delete next[cartKey];
            return next;
          });
        }, 320),
      );
    },
    [track],
  );

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

  const filteredMenus = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    return menus.filter((m) => {
      const matchCategory = selectedCategory
        ? m.category_id === selectedCategory
        : true;
      const matchSearch = needle ? m.name.toLowerCase().includes(needle) : true;
      return matchCategory && matchSearch;
    });
  }, [menus, selectedCategory, searchQuery]);

  // Group filtered menus by category, preserving the category list order.
  // Categories with no matching menus are skipped; menus without a known
  // category are bucketed under "Lainnya". One pass into a Map rather than a
  // filter per category, so this stays linear as the menu list grows.
  const menusByCategory = useMemo(() => {
    const byCategory = new Map();
    for (const menu of filteredMenus) {
      const bucket = byCategory.get(menu.category_id);
      if (bucket) bucket.push(menu);
      else byCategory.set(menu.category_id, [menu]);
    }

    const groups = [];
    for (const category of categories) {
      const items = byCategory.get(category.id);
      if (items?.length) groups.push({ category, items });
    }

    const known = new Set(categories.map((c) => c.id));
    const orphanMenus = filteredMenus.filter((m) => !known.has(m.category_id));
    if (orphanMenus.length > 0) {
      groups.push({
        category: { id: "__other__", name: "Lainnya" },
        items: orphanMenus,
      });
    }
    return groups;
  }, [filteredMenus, categories]);

  // First menu row overall — carries the data-tour="menu-active-panel" anchor
  // that the guided tour highlights (the old "active panel" no longer exists).
  const firstMenuId = menusByCategory[0]?.items[0]?.id;

  // qty lookup for the menu rows. Replaces a cart.find() per row and, more
  // importantly, lets each row take a plain number as a prop so React.memo can
  // actually bail out.
  const qtyByKey = useMemo(() => {
    const map = {};
    for (const item of cart) map[item.cart_key] = item.quantity;
    return map;
  }, [cart]);

  const totalPrice = useMemo(
    () => cart.reduce((sum, item) => sum + item.subtotal, 0),
    [cart],
  );
  const totalItems = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  );

  // Bumping a line that already exists. Shared by the + in the menu list and
  // the + in the cart, so both write through the same cart state.
  const incrementByKey = useCallback(
    (cartKey) => {
      setCart((prev) =>
        prev.map((item) =>
          item.cart_key === cartKey
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * item.price,
              }
            : item,
        ),
      );
      // Tapping + cancels a pending exit so the line stops fading out.
      setExitingKeys((keys) => keys.filter((k) => k !== cartKey));
      markFlash(cartKey);
    },
    [markFlash],
  );

  // - control: remove one; at qty 1 the line is dropped from the cart entirely.
  // Keyed rather than menu-based so the cart panel can call it directly.
  //
  // `currentQty` is what the row that was tapped had on screen. It only picks
  // which branch to take; both branches re-check the real quantity inside the
  // state updater, so a stale value can never write a wrong number.
  const decrementByKey = useCallback(
    (cartKey, currentQty) => {
      if (currentQty > 1) {
        setCart((prev) =>
          prev.map((item) =>
            item.cart_key === cartKey && item.quantity > 1
              ? {
                  ...item,
                  quantity: item.quantity - 1,
                  subtotal: (item.quantity - 1) * item.price,
                }
              : item,
          ),
        );
        return;
      }

      // Let the cart line play its exit before the data is dropped. The
      // removal itself is unchanged — only deferred by the animation length.
      setExitingKeys((keys) =>
        keys.includes(cartKey) ? keys : [...keys, cartKey],
      );
      track(
        setTimeout(() => {
          setCart((c) => {
            // If the user tapped + again mid-exit, the line is wanted after all.
            const cur = c.find((i) => i.cart_key === cartKey);
            if (cur && cur.quantity > 1) return c;
            return c.filter((item) => item.cart_key !== cartKey);
          });
          setExitingKeys((keys) => keys.filter((k) => k !== cartKey));
        }, 150),
      );
    },
    [track],
  );

  // + control in the menu list: add one of this menu/variant to the cart
  // (0 to 1, 1 to 2, ...). Creates the line when it does not exist yet.
  const incrementItem = useCallback(
    (menu, variant) => {
      const cartKey = cartKeyFor(menu, variant);
      const price = variant ? variant.price : menu.price;
      const displayName = variant ? `${menu.name} (${variant.name})` : menu.name;

      setCart((prev) => {
        const existing = prev.find((item) => item.cart_key === cartKey);
        if (existing) {
          return prev.map((item) =>
            item.cart_key === cartKey
              ? {
                  ...item,
                  quantity: item.quantity + 1,
                  subtotal: (item.quantity + 1) * item.price,
                }
              : item,
          );
        }
        return [
          ...prev,
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
        ];
      });

      setExitingKeys((keys) => keys.filter((k) => k !== cartKey));
      markFlash(cartKey);
      // Tour still expects the two legacy menu events; both fire on +, so the
      // tutorial advances as the user taps + (once per step) through the flow.
      // Deliberately not fired from the cart's own +, which is not a tour step.
      window.dispatchEvent(new Event("app:menu-clicked"));
      window.dispatchEvent(new Event("app:added-to-cart"));
    },
    [markFlash],
  );

  const decrementItem = useCallback(
    (menu, variant, currentQty) =>
      decrementByKey(cartKeyFor(menu, variant), currentQty),
    [decrementByKey],
  );

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

  const handleSelectCategory = useCallback((id) => setSelectedCategory(id), []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    searchInputRef.current?.focus();
  }, []);

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
      setPaymentMethod("qris"); // back to default for the next order
      setShowConfirmation(false);
      setShowReceipt(true);
      setSuccess(
        dailySequence
          ? `Pesanan ke-${dailySequence} hari ini tersimpan!`
          : "Pesanan berhasil disimpan!",
      );
      track(setTimeout(() => setSuccess(""), 3000));
      window.dispatchEvent(new Event("app:order-created"));
    } catch {
      alert("Gagal menyimpan pesanan");
    } finally {
      setSubmitting(false);
    }
  };

  const activeBadge =
    PAYMENT_METHOD_BADGES[paymentMethod] || PAYMENT_METHOD_BADGES.qris;
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
                    ? "9px 40px 9px 36px"
                    : "9px 16px 9px 36px",
                  fontSize: 13,
                  color: "#1e293b",
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  title="Bersihkan pencarian"
                  aria-label="Bersihkan pencarian"
                  onClick={handleClearSearch}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#64748b")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
                  style={{
                    position: "absolute",
                    right: 5,
                    top: "50%",
                    transform: "translateY(-50%)",
                    // 28x28 tap target. The glyph stays 14px; the padding
                    // around it is what makes this hittable with a thumb.
                    width: 28,
                    height: 28,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                    borderRadius: 8,
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
            <CategoryPill
              id={null}
              name="Semua"
              active={!selectedCategory}
              onSelect={handleSelectCategory}
            />
            {categories.map((cat) => (
              <CategoryPill
                key={cat.id}
                id={cat.id}
                name={cat.name}
                active={selectedCategory === cat.id}
                onSelect={handleSelectCategory}
              />
            ))}
          </div>

          <div
            data-tour="menu-grid"
            data-scroll-reset
            className="flex-1 overflow-y-auto pr-1 -mr-1 pb-24 lg:pb-0"
          >
            {menusByCategory.length === 0 ? (
              <div className="text-center py-16">
                <UtensilsCrossed className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 text-sm font-medium">
                  Menu tidak ditemukan
                </p>
                <p className="text-slate-300 text-xs mt-1">Coba kata kunci lain</p>
              </div>
            ) : (
              <div className="space-y-6">
                {menusByCategory.map(({ category, items }) => (
                  <section key={category.id}>
                    <div
                      className="flex items-center mb-3"
                      style={{ gap: 6, paddingTop: 10 }}
                    >
                      <Tag style={{ width: 13, height: 13, color: "#1e3a5f" }} />
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
                      {items.map((menu, menuIndex) =>
                        menu.variants?.length > 0 ? (
                          <MenuWithVariants
                            key={menu.id}
                            menu={menu}
                            index={menuIndex}
                            qtyByKey={qtyByKey}
                            flashRows={flashRows}
                            isFirstMenu={menu.id === firstMenuId}
                            onIncrement={incrementItem}
                            onDecrement={decrementItem}
                          />
                        ) : (
                          <MenuRow
                            key={menu.id}
                            menu={menu}
                            qty={qtyByKey[`${menu.id}`] || 0}
                            flash={Boolean(flashRows[`${menu.id}`])}
                            index={menuIndex}
                            isFirst={menu.id === firstMenuId}
                            onIncrement={incrementItem}
                            onDecrement={decrementItem}
                          />
                        ),
                      )}
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
                  style={{
                    width: 34,
                    height: 34,
                    background: "#eff6ff",
                    borderRadius: 9,
                  }}
                >
                  <ShoppingBag
                    style={{ width: 16, height: 16, color: "#2563eb" }}
                    strokeWidth={2.2}
                  />
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

          <div data-scroll-reset className="flex-1 overflow-y-auto px-4 py-3">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                  <ShoppingBag className="w-7 h-7 text-slate-300" />
                </div>
                <p className="text-slate-700 font-semibold text-sm">
                  Keranjang kosong
                </p>
                <p className="text-slate-400 text-xs mt-1">
                  Pilih menu di sebelah kiri untuk memulai pesanan
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {cart.map((item) => (
                  <CartLine
                    key={item.cart_key}
                    item={item}
                    exiting={exitingKeys.includes(item.cart_key)}
                    onIncrement={incrementByKey}
                    onDecrement={decrementByKey}
                  />
                ))}
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div className="px-5 py-4 border-t border-slate-100 bg-stone-50/50">
              <div className="flex mb-3" style={{ gap: 6 }}>
                {FOOTER_PAYMENT_METHODS.map((m) => {
                  const active = paymentMethod === m.value;
                  return (
                    <button
                      key={m.value}
                      onClick={() => {
                        setPaymentMethod(m.value);
                        window.dispatchEvent(
                          new Event("app:payment-method-selected"),
                        );
                      }}
                      className="flex-1"
                      style={{
                        padding: "8px 4px",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        transition: "all 0.15s ease",
                        ...(active
                          ? {
                              background: "#eff6ff",
                              border: "1px solid #2563eb",
                              color: "#1d4ed8",
                            }
                          : {
                              background: "#ffffff",
                              border: "0.5px solid rgba(0,0,0,0.1)",
                              color: "#64748b",
                            }),
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
                      window.dispatchEvent(
                        new Event("app:customer-name-entered"),
                      );
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
