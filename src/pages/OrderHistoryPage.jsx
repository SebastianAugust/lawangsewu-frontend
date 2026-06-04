import { useState, useEffect } from "react";
import { getOrders, requestVoid } from "../api/order";
import { getBranches } from "../api/branch";
import MainLayout from "../layouts/MainLayout";
import { printReceipt } from "../components/Receipt";
import {
  Calendar,
  ChevronDown,
  Printer,
  Ban,
  CheckCircle2,
  Clock,
  XCircle,
  ShoppingBag,
  Wallet,
  Smartphone,
  AlertTriangle,
  X,
  Inbox,
  Store,
} from "lucide-react";

function OrderHistoryPage() {
  const role = localStorage.getItem("role");
  const isOwner = role === "owner";
  const [orders, setOrders] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [voidOrderId, setVoidOrderId] = useState(null);
  const [voidReason, setVoidReason] = useState("");
  // Branch filter is owner-only — a kasir is scoped to their cabang by backend.
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState("");

  const loadOrders = () => {
    getOrders(date, undefined, isOwner ? branchId : undefined).then((res) =>
      setOrders(res.data),
    );
  };

  useEffect(() => {
    if (isOwner) {
      getBranches().then((res) => setBranches(res.data));
    }
  }, [isOwner]);

  useEffect(() => {
    loadOrders();
  }, [date, branchId]);

  const handleVoidRequest = async (orderId) => {
    if (!voidReason.trim()) return alert("Alasan void harus diisi");
    try {
      await requestVoid(orderId, voidReason);
      setVoidOrderId(null);
      setVoidReason("");
      loadOrders();
      alert("Permintaan void dikirim ke owner");
      window.dispatchEvent(new Event("app:void-submitted"));
    } catch (err) {
      alert(err.response?.data?.message || "Gagal mengirim permintaan void");
    }
  };

  const statusBadge = (status) => {
    if (status === "completed")
      return {
        text: "Selesai",
        style: "bg-emerald-100 text-emerald-700",
        icon: CheckCircle2,
      };
    if (status === "void_pending")
      return {
        text: "Menunggu Void",
        style: "bg-amber-100 text-amber-700",
        icon: Clock,
      };
    if (status === "voided")
      return { text: "Void", style: "bg-rose-100 text-rose-700", icon: XCircle };
    return { text: status, style: "bg-slate-100 text-slate-600", icon: Inbox };
  };

  const paymentInfo = (method) => {
    if (method === "cash") return { label: "Cash", icon: Wallet };
    if (method === "qris") return { label: "QRIS", icon: Smartphone };
    return { label: method, icon: Wallet };
  };

  const totalRevenue = orders
    .filter((o) => o.status === "completed")
    .reduce((sum, o) => sum + o.total_price, 0);

  const completedCount = orders.filter((o) => o.status === "completed").length;
  const voidedCount = orders.filter((o) => o.status === "voided").length;

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div>
            <h2 className="font-display text-3xl font-bold text-slate-900 tracking-tight">
              Riwayat Pesanan
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Daftar transaksi yang telah dilakukan.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isOwner && (
              <div className="relative">
                <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition appearance-none"
                >
                  <option value="">Semua Cabang</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            )}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                data-tour="date-filter"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition"
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        {orders.length > 0 && (
          <div data-tour="order-summary" className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingBag className="w-4 h-4 text-blue-500" />
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                  Total Pesanan
                </p>
              </div>
              <p className="font-display text-2xl font-bold text-slate-900">
                {orders.length}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {completedCount} selesai
              </p>
            </div>
            <div className="bg-blue-900 rounded-md p-5 text-white">
              <p className="text-[11px] text-blue-200 font-bold uppercase tracking-wider mb-2">
                Pendapatan
              </p>
              <p className="font-display text-2xl font-bold tabular-nums">
                Rp {totalRevenue.toLocaleString()}
              </p>
              <p className="text-xs text-blue-200 mt-1">dari pesanan selesai</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Ban className="w-4 h-4 text-rose-500" />
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                  Dibatalkan
                </p>
              </div>
              <p className="font-display text-2xl font-bold text-rose-600">
                {voidedCount}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {orders.filter((o) => o.status === "void_pending").length} pending
              </p>
            </div>
          </div>
        )}

        {/* Orders */}
        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/70 p-16 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Inbox className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-slate-700 font-semibold">Belum ada pesanan</p>
            <p className="text-slate-400 text-sm mt-1">
              Tidak ada transaksi pada tanggal ini.
            </p>
          </div>
        ) : (
          <div data-tour="order-list" className="space-y-2">
            {orders.map((order) => {
              const status = statusBadge(order.status);
              const StatusIcon = status.icon;
              const payment = paymentInfo(order.payment_method);
              const PaymentIcon = payment.icon;
              const isExpanded = expandedOrder === order.id;
              const displayName = order.customer_name || `Pelanggan #${order.id}`;

              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-2xl border border-slate-200/70 overflow-hidden transition-all ${
                    order.status === "voided" ? "opacity-60" : ""
                  } ${isExpanded ? "shadow-md ring-1 ring-amber-500/10" : "shadow-sm hover:shadow-md"}`}
                >
                  <div
                    className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-stone-50/50 transition"
                    onClick={() => {
                      const willExpand = !isExpanded;
                      setExpandedOrder(isExpanded ? null : order.id);
                      if (willExpand) {
                        window.dispatchEvent(new Event("app:order-expanded"));
                      }
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-11 h-11 bg-slate-100 border border-slate-200 rounded-md flex items-center justify-center shrink-0">
                        <span className="text-slate-700 font-semibold text-sm">
                          {displayName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-slate-900 truncate">
                            {displayName}
                          </p>
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${status.style}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {status.text}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            <PaymentIcon className="w-3 h-3" />
                            {payment.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(order.created_at).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          · {order.user?.name} · {order.items?.length} item
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <p className="font-display font-bold text-slate-900">
                        Rp {order.total_price.toLocaleString()}
                      </p>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-slate-100">
                      <div className="py-3 space-y-1.5">
                        {order.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between text-sm"
                          >
                            <span className="text-slate-600">
                              {item.menu?.name}
                              {item.variant_name ? ` (${item.variant_name})` : ""}{" "}
                              <span className="text-slate-400">
                                ×{item.quantity}
                              </span>
                            </span>
                            <span className="font-semibold text-slate-700">
                              Rp {item.subtotal.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>

                      {order.payment_method === "cash" && order.cash_received && (
                        <div className="py-3 border-t border-dashed border-slate-200 space-y-1">
                          <div className="flex justify-between text-sm text-slate-500">
                            <span>Tunai diterima</span>
                            <span>Rp {order.cash_received.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm font-semibold text-emerald-600">
                            <span>Kembalian</span>
                            <span>Rp {order.change_amount.toLocaleString()}</span>
                          </div>
                        </div>
                      )}

                      {order.status === "voided" && order.void_reason && (
                        <div className="mt-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5 flex items-start gap-2">
                          <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-rose-700">
                            <span className="font-bold">Alasan void:</span>{" "}
                            {order.void_reason}
                          </p>
                        </div>
                      )}

                      {order.status === "void_pending" && (
                        <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <p className="text-xs text-amber-800">
                            <span className="font-bold">Menunggu approval owner.</span>{" "}
                            Alasan: {order.void_reason}
                          </p>
                        </div>
                      )}

                      {order.status === "completed" && (
                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                          <button
                            onClick={() => {
                              const sorted = [...orders].sort(
                                (a, b) =>
                                  new Date(a.created_at) - new Date(b.created_at),
                              );
                              const seq =
                                sorted.findIndex((o) => o.id === order.id) + 1;
                              printReceipt({
                                ...order,
                                daily_sequence: seq || null,
                              });
                            }}
                            className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-100 transition"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Cetak Ulang Struk
                          </button>
                          {voidOrderId === order.id ? (
                            <div data-tour="void-form" className="flex gap-2 items-center w-full sm:w-auto">
                              <input
                                type="text"
                                placeholder="Tulis alasan void..."
                                value={voidReason}
                                onChange={(e) => setVoidReason(e.target.value)}
                                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition"
                                autoFocus
                              />
                              <button
                                onClick={() => handleVoidRequest(order.id)}
                                className="bg-rose-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-rose-600 transition"
                              >
                                Kirim
                              </button>
                              <button
                                onClick={() => {
                                  setVoidOrderId(null);
                                  setVoidReason("");
                                }}
                                className="w-7 h-7 flex items-center justify-center bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              data-tour="void-request-btn"
                              onClick={() => {
                                setVoidOrderId(order.id);
                                window.dispatchEvent(new Event("app:void-modal-opened"));
                              }}
                              className="flex items-center gap-1.5 text-rose-500 hover:text-rose-700 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-rose-50 transition"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              Request Void
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default OrderHistoryPage;
