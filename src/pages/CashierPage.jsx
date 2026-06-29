import { useState, useEffect, useRef } from "react";
import { getMenus, getCategories } from "../api/menu";
import { createOrder, getOrders } from "../api/order";
import { BASE_URL } from "../api/axios";
import { printReceipt } from "../components/Receipt";
import MainLayout from "../layouts/MainLayout";
import {
  Search,
  ShoppingBag,
  Plus,
  Minus,
  Pencil,
  Trash2,
  CheckCircle2,
  Printer,
  X,
  Wallet,
  Smartphone,
  UtensilsCrossed,
  Tag,
  User,
  Receipt as ReceiptIcon,
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

  const [activeMenu, setActiveMenu] = useState(null);
  const [inputQty, setInputQty] = useState(1);
  const [inputVariant, setInputVariant] = useState(null);

  const [editingCartKey, setEditingCartKey] = useState(null);
  const [editQty, setEditQty] = useState(1);
  const [editVariant, setEditVariant] = useState(null);

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [lastOrder, setLastOrder] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);

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

  const handleMenuClick = (menu) => {
    if (activeMenu?.id === menu.id) {
      setActiveMenu(null);
      return;
    }
    setActiveMenu(menu);
    setInputQty(1);
    setInputVariant(menu.variants?.length > 0 ? menu.variants[0] : null);
    window.dispatchEvent(new Event("app:menu-clicked"));
  };

  const handleAddToCart = () => {
    if (!activeMenu) return;
    if (activeMenu.variants?.length > 0 && !inputVariant) return;
    const variant = inputVariant;
    const cartKey = variant ? `${activeMenu.id}-${variant.id}` : `${activeMenu.id}`;
    const price = variant ? variant.price : activeMenu.price;
    const displayName = variant ? `${activeMenu.name} (${variant.name})` : activeMenu.name;
    const existing = cart.find((item) => item.cart_key === cartKey);
    if (existing) {
      setCart(
        cart.map((item) =>
          item.cart_key === cartKey
            ? {
                ...item,
                quantity: item.quantity + inputQty,
                subtotal: (item.quantity + inputQty) * price,
              }
            : item,
        ),
      );
    } else {
      setCart([
        ...cart,
        {
          cart_key: cartKey,
          menu_id: activeMenu.id,
          menu_variant_id: variant?.id || null,
          variant_name: variant?.name || null,
          name: displayName,
          price,
          quantity: inputQty,
          subtotal: price * inputQty,
        },
      ]);
    }
    setActiveMenu(null);
    setInputQty(1);
    setInputVariant(null);
    window.dispatchEvent(new Event("app:added-to-cart"));
  };

  const handleStartEdit = (item) => {
    setEditingCartKey(item.cart_key);
    setEditQty(item.quantity);
    const menu = menus.find((m) => m.id === item.menu_id);
    setEditVariant(
      menu?.variants?.length > 0
        ? menu.variants.find((v) => v.id === item.menu_variant_id) || menu.variants[0]
        : null,
    );
  };

  const handleSaveEdit = (item) => {
    const menu = menus.find((m) => m.id === item.menu_id);
    if (menu?.variants?.length > 0 && editVariant) {
      const newKey = `${item.menu_id}-${editVariant.id}`;
      if (newKey !== item.cart_key) {
        const existing = cart.find(
          (c) => c.cart_key === newKey && c.cart_key !== item.cart_key,
        );
        if (existing) {
          setCart(
            cart
              .map((c) =>
                c.cart_key === newKey
                  ? {
                      ...c,
                      quantity: c.quantity + editQty,
                      subtotal: (c.quantity + editQty) * c.price,
                    }
                  : c,
              )
              .filter((c) => c.cart_key !== item.cart_key),
          );
        } else {
          setCart(
            cart.map((c) =>
              c.cart_key === item.cart_key
                ? {
                    ...c,
                    cart_key: newKey,
                    menu_variant_id: editVariant.id,
                    variant_name: editVariant.name,
                    name: `${menu.name} (${editVariant.name})`,
                    price: editVariant.price,
                    quantity: editQty,
                    subtotal: editQty * editVariant.price,
                  }
                : c,
            ),
          );
        }
      } else {
        setCart(
          cart.map((c) =>
            c.cart_key === item.cart_key
              ? { ...c, quantity: editQty, subtotal: editQty * c.price }
              : c,
          ),
        );
      }
    } else {
      setCart(
        cart.map((c) =>
          c.cart_key === item.cart_key
            ? { ...c, quantity: editQty, subtotal: editQty * c.price }
            : c,
        ),
      );
    }
    setEditingCartKey(null);
  };

  const removeFromCart = (cartKey) =>
    setCart(cart.filter((item) => item.cart_key !== cartKey));
  const totalPrice = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleProceedToPayment = () => {
    if (cart.length === 0) return;
    setShowConfirmation(true);
    setPaymentMethod("cash");
    setCashReceived("");
    window.dispatchEvent(new Event("app:pay-clicked"));
  };

  const handleSubmitOrder = async () => {
    if (submitting) return;
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
        cash_received: paymentMethod === "cash" ? parseInt(cashReceived) : null,
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
        cash_received: paymentMethod === "cash" ? parseInt(cashReceived) : null,
        change_amount: paymentMethod === "cash" ? parseInt(cashReceived) - totalPrice : null,
        daily_sequence: dailySequence,
      });
      setCart([]);
      setCustomerName("");
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

  const cashReceivedNum = parseInt(cashReceived) || 0;
  const changeAmount = cashReceivedNum - totalPrice;
  const canSubmit = paymentMethod !== "cash" || cashReceivedNum >= totalPrice;
  const quickCashAmounts = [
    totalPrice,
    Math.ceil(totalPrice / 10000) * 10000,
    Math.ceil(totalPrice / 50000) * 50000,
    100000,
  ]
    .filter((v, i, a) => a.indexOf(v) === i && v >= totalPrice)
    .slice(0, 4);

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

  const getImageUrl = (image) => (image ? `${BASE_URL}/storage/${image}` : null);

  const paymentOptions = [
    { value: "cash", label: "Tunai", icon: Wallet, color: "emerald" },
    { value: "qris", label: "QRIS", icon: Smartphone, color: "blue" },
  ];

  return (
    <MainLayout>
      {/* RECEIPT MODAL */}
      {showReceipt && lastOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-slide-up">
          <div data-tour="receipt-modal" className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
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
                {lastOrder.payment_method === "cash" && (
                  <>
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>Tunai diterima</span>
                      <span>Rp {lastOrder.cash_received?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold text-emerald-600">
                      <span>Kembalian</span>
                      <span>Rp {lastOrder.change_amount?.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>
              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => printReceipt(lastOrder)}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  Cetak Struk
                </button>
                <button
                  onClick={() => setShowReceipt(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl text-sm font-semibold transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-slide-up">
          <div data-tour="payment-modal" className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-slate-100">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900">
                  Konfirmasi Pembayaran
                </h3>
                {customerName && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    untuk <span className="font-semibold text-slate-700">{customerName}</span>
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowConfirmation(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="p-6">
              <div className="bg-slate-50 rounded-2xl p-4 mb-5 max-h-44 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.cart_key} className="flex justify-between text-sm py-1">
                    <span className="text-slate-600">
                      {item.name}{" "}
                      <span className="text-slate-400">×{item.quantity}</span>
                    </span>
                    <span className="font-medium text-slate-700">
                      Rp {item.subtotal.toLocaleString()}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between font-display font-bold text-base border-t border-slate-200 mt-2 pt-2">
                  <span>Total</span>
                  <span className="text-amber-600">
                    Rp {totalPrice.toLocaleString()}
                  </span>
                </div>
              </div>

              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Metode Pembayaran
              </p>
              <div className="grid grid-cols-3 gap-2 mb-5">
                {paymentOptions.map((method) => {
                  const Icon = method.icon;
                  const active = paymentMethod === method.value;
                  return (
                    <button
                      key={method.value}
                      onClick={() => {
                        setPaymentMethod(method.value);
                        // Tutorial helper: auto-fill cash with exact total so
                        // the "Konfirmasi Bayar" button activates immediately
                        // and the user can proceed without typing nominal.
                        if (
                          method.value === "cash" &&
                          window.__TOUR_MODE__ &&
                          totalPrice > 0
                        ) {
                          setCashReceived(String(totalPrice));
                        }
                        window.dispatchEvent(new Event("app:payment-method-selected"));
                      }}
                      className={`relative py-3 px-2 rounded-xl text-sm font-semibold transition border-2 flex flex-col items-center gap-1.5 ${
                        active
                          ? "border-amber-500 bg-amber-50 text-amber-700 shadow-sm shadow-amber-500/10"
                          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                      }`}
                    >
                      <Icon className="w-5 h-5" strokeWidth={2.2} />
                      {method.label}
                    </button>
                  );
                })}
              </div>

              {paymentMethod === "cash" && (
                <div className="mb-5">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Uang Diterima
                  </p>
                  <div className="relative mb-2">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-sm">
                      Rp
                    </span>
                    <input
                      type="number"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      placeholder="0"
                      className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl pl-11 pr-4 py-3 text-lg font-bold focus:outline-none focus:border-amber-500 focus:bg-white transition"
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {quickCashAmounts.map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setCashReceived(amount.toString())}
                        className="bg-slate-100 hover:bg-amber-100 hover:text-amber-700 text-xs font-semibold py-2 rounded-lg transition text-slate-600"
                      >
                        {amount >= 1000 ? `${amount / 1000}k` : amount}
                      </button>
                    ))}
                  </div>
                  {cashReceivedNum > 0 && (
                    <div
                      className={`mt-3 p-3 rounded-xl text-sm font-semibold flex items-center justify-between ${
                        changeAmount >= 0
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-600 border border-rose-200"
                      }`}
                    >
                      <span>{changeAmount >= 0 ? "Kembalian" : "Kurang"}</span>
                      <span className="font-display text-lg font-bold">
                        Rp {Math.abs(changeAmount).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl hover:bg-slate-200 font-semibold transition"
                >
                  Batal
                </button>
                <button
                  data-tour="payment-confirm"
                  onClick={handleSubmitOrder}
                  disabled={!canSubmit || submitting}
                  className={`flex-1 py-3 rounded-xl font-semibold transition shadow-sm flex items-center justify-center gap-2 ${
                    canSubmit && !submitting
                      ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20"
                      : "bg-slate-300 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  {submitting && (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
                transition: "all 0.15s ease",
                ...(active
                  ? { background: "#1e3a5f", color: "#ffffff", border: "0.5px solid transparent" }
                  : { background: "#ffffff", color: "#64748b", border: "0.5px solid rgba(0,0,0,0.1)" }),
              });
              return (
                <>
                  <button
                    onClick={() => setSelectedCategory(null)}
                    style={pillStyle(!selectedCategory)}
                  >
                    Semua
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
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
                    <div className="flex items-center mb-3" style={{ gap: 6 }}>
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
                    <div className="grid grid-cols-4 gap-3">
                      {items.map((menu) => {
                        const isMenuActive = activeMenu?.id === menu.id;
                        const imgUrl = getImageUrl(menu.image);
                        return (
                          <div key={menu.id} className="flex flex-col">
                            <button
                              onClick={() => handleMenuClick(menu)}
                              className={`group w-full bg-white text-left transition-all duration-150 overflow-hidden ${
                                isMenuActive
                                  ? "border-[1.5px] border-blue-500 ring-[3px] ring-blue-500/10"
                                  : "border border-black/[0.06] hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(0,0,0,0.09)]"
                              }`}
                              style={{ borderRadius: 12 }}
                            >
                              <div
                                className="relative overflow-hidden"
                                style={{ height: 140, width: "100%", background: "#eef2f7" }}
                              >
                                {imgUrl ? (
                                  <img
                                    src={imgUrl}
                                    alt={menu.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <UtensilsCrossed
                                      style={{ width: 20, height: 20, color: "#93a8c4" }}
                                    />
                                  </div>
                                )}
                                {menu.variants?.length > 0 && (
                                  <span
                                    className="absolute backdrop-blur-sm"
                                    style={{
                                      top: 8,
                                      right: 8,
                                      background: "rgba(255,255,255,0.92)",
                                      color: "#1e3a5f",
                                      fontSize: 9,
                                      fontWeight: 600,
                                      borderRadius: 5,
                                      padding: "2px 6px",
                                      letterSpacing: "0.2px",
                                    }}
                                  >
                                    {menu.variants.length} varian
                                  </span>
                                )}
                              </div>
                              <div style={{ padding: "8px 10px 10px" }}>
                                <p
                                  className="line-clamp-2"
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 500,
                                    color: "#1e293b",
                                    letterSpacing: "-0.1px",
                                    lineHeight: 1.25,
                                  }}
                                >
                                  {menu.name}
                                </p>
                                <p
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: "#2563eb",
                                    marginTop: 4,
                                  }}
                                >
                                  {getMenuDisplayPrice(menu)}
                                </p>
                              </div>
                            </button>

                            {isMenuActive && (
                              <div data-tour="menu-active-panel" className="bg-white border border-amber-200 rounded-2xl shadow-xl shadow-amber-500/10 mt-2 p-4 animate-[fadeIn_0.15s_ease-out]">
                                {menu.variants?.length > 0 && (
                                  <div className="mb-3">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                                      Pilih Varian
                                    </p>
                                    <div className="grid grid-cols-2 gap-1.5">
                                      {menu.variants.map((v) => (
                                        <button
                                          key={v.id}
                                          onClick={() => setInputVariant(v)}
                                          className={`px-3 py-2 rounded-lg text-xs font-medium transition border ${
                                            inputVariant?.id === v.id
                                              ? "border-amber-500 bg-amber-50 text-amber-700"
                                              : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                                          }`}
                                        >
                                          <span className="block font-semibold">{v.name}</span>
                                          <span className="block text-[10px] mt-0.5 opacity-75">
                                            Rp {v.price.toLocaleString()}
                                          </span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => setInputQty(Math.max(1, inputQty - 1))}
                                      className="flex items-center justify-center rounded-full shrink-0"
                                      style={{ width: 22, height: 22, background: "#f1f5f9", color: "#475569" }}
                                    >
                                      <Minus className="w-3 h-3" strokeWidth={2.5} />
                                    </button>
                                    <input
                                      type="number"
                                      value={inputQty}
                                      onChange={(e) =>
                                        setInputQty(Math.max(1, parseInt(e.target.value) || 1))
                                      }
                                      className="text-center bg-transparent text-sm font-bold focus:outline-none"
                                      style={{ width: 40 }}
                                    />
                                    <button
                                      onClick={() => setInputQty(inputQty + 1)}
                                      className="flex items-center justify-center rounded-full shrink-0"
                                      style={{ width: 22, height: 22, background: "#f1f5f9", color: "#475569" }}
                                    >
                                      <Plus className="w-3 h-3" strokeWidth={2.5} />
                                    </button>
                                  </div>
                                  <button
                                    onClick={handleAddToCart}
                                    className="flex-1 bg-blue-900 hover:bg-blue-800 text-white py-2.5 rounded text-xs font-semibold transition"
                                  >
                                    + Rp{" "}
                                    {((inputVariant?.price || menu.price) * inputQty).toLocaleString()}
                                  </button>
                                </div>
                              </div>
                            )}
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
                    className="rounded-full"
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
              <div className="mt-3 bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-2 rounded-lg border border-emerald-200 flex items-center gap-2">
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
                  <div key={item.cart_key} className="group">
                    {editingCartKey === item.cart_key ? (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 my-1">
                        <p className="text-xs font-bold text-slate-800 mb-2">
                          {menus.find((m) => m.id === item.menu_id)?.name}
                        </p>
                        {(() => {
                          const menu = menus.find((m) => m.id === item.menu_id);
                          if (menu?.variants?.length > 0) {
                            return (
                              <div className="mb-2">
                                <div className="flex flex-wrap gap-1.5">
                                  {menu.variants.map((v) => (
                                    <button
                                      key={v.id}
                                      onClick={() => setEditVariant(v)}
                                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition border ${
                                        editVariant?.id === v.id
                                          ? "border-amber-500 bg-amber-100 text-amber-700"
                                          : "border-slate-200 bg-white text-slate-600"
                                      }`}
                                    >
                                      {v.name} · Rp {v.price.toLocaleString()}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center bg-white rounded-lg border border-slate-200">
                            <button
                              onClick={() => setEditQty(Math.max(1, editQty - 1))}
                              className="w-7 h-7 flex items-center justify-center text-slate-500"
                            >
                              <Minus className="w-3 h-3" strokeWidth={2.5} />
                            </button>
                            <input
                              type="number"
                              value={editQty}
                              onChange={(e) =>
                                setEditQty(Math.max(1, parseInt(e.target.value) || 1))
                              }
                              className="w-8 text-center text-xs font-bold bg-transparent focus:outline-none"
                            />
                            <button
                              onClick={() => setEditQty(editQty + 1)}
                              className="w-7 h-7 flex items-center justify-center text-slate-500"
                            >
                              <Plus className="w-3 h-3" strokeWidth={2.5} />
                            </button>
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleSaveEdit(item)}
                              className="bg-amber-500 text-white px-3 py-1.5 rounded-md text-[11px] font-semibold hover:bg-amber-600 transition"
                            >
                              Simpan
                            </button>
                            <button
                              onClick={() => setEditingCartKey(null)}
                              className="bg-slate-200 text-slate-600 px-3 py-1.5 rounded-md text-[11px] font-semibold hover:bg-slate-300 transition"
                            >
                              Batal
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-slate-50 transition">
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
                            {item.quantity} × Rp {item.price.toLocaleString()}
                          </p>
                        </div>
                        <p
                          className="whitespace-nowrap"
                          style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}
                        >
                          Rp {item.subtotal.toLocaleString()}
                        </p>
                        <div className="flex gap-0.5 lg:opacity-60 lg:group-hover:opacity-100 transition">
                          <button
                            onClick={() => handleStartEdit(item)}
                            className="w-9 h-9 flex items-center justify-center text-amber-600 hover:bg-amber-50 rounded-lg transition"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeFromCart(item.cart_key)}
                            className="w-9 h-9 flex items-center justify-center text-rose-500 hover:bg-rose-50 rounded-lg transition"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div className="px-5 py-4 border-t border-slate-100 bg-stone-50/50">
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
                  <span className="font-display text-2xl font-bold text-slate-900">
                    Rp {totalPrice.toLocaleString()}
                  </span>
                </div>
              </div>
              <button
                data-tour="pay-button"
                onClick={handleProceedToPayment}
                className="w-full hover:bg-blue-800 text-white transition flex items-center justify-center gap-2"
                style={{
                  background: "#1e3a5f",
                  borderRadius: 11,
                  fontSize: 14,
                  fontWeight: 600,
                  padding: 12,
                }}
              >
                <ReceiptIcon className="w-4 h-4" />
                Lanjut Bayar
              </button>
            </div>
          )}
        </aside>
      </div>
    </MainLayout>
  );
}

export default CashierPage;
