import { useState, useEffect } from "react";
import { getVoidRequests, approveVoid, rejectVoid } from "../api/order";
import MainLayout from "../layouts/MainLayout";
import {
  Ban,
  Check,
  X,
  Clock,
  User,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

function VoidRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [processingId, setProcessingId] = useState(null);

  const loadRequests = () => {
    getVoidRequests().then((res) => setRequests(res.data));
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = async (id) => {
    if (!confirm("Yakin setujui void? Transaksi akan dibatalkan.")) return;
    setProcessingId(id);
    try {
      await approveVoid(id);
      loadRequests();
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id) => {
    if (!confirm("Yakin tolak permintaan void ini?")) return;
    setProcessingId(id);
    try {
      await rejectVoid(id);
      loadRequests();
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-3xl font-bold text-slate-900 tracking-tight">
              Permintaan Void
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Tinjau dan setujui pembatalan transaksi dari kasir.
            </p>
          </div>
          {requests.length > 0 && (
            <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-full">
              <Clock className="w-3.5 h-3.5" />
              {requests.length} pending
            </span>
          )}
        </div>

        {requests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/70 p-16 text-center shadow-sm">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <p className="text-slate-700 font-semibold">Tidak ada permintaan</p>
            <p className="text-slate-400 text-sm mt-1">
              Semua transaksi sudah ter-handle dengan baik.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((order) => {
              const isProcessing = processingId === order.id;
              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden transition ${
                    isProcessing ? "opacity-50 pointer-events-none" : "hover:shadow-md"
                  }`}
                >
                  {/* Top alert bar */}
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200/50 px-5 py-2.5 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <p className="text-xs text-amber-800 font-semibold flex-1">
                      Menunggu keputusan owner
                    </p>
                    <span className="text-[11px] font-bold text-amber-700 bg-white/80 px-2 py-0.5 rounded-md">
                      Order #{order.id}
                    </span>
                  </div>

                  <div className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                          <User className="w-3.5 h-3.5" />
                          <span>
                            Diajukan oleh{" "}
                            <span className="font-semibold text-slate-700">
                              {order.user?.name}
                            </span>
                          </span>
                          <span>·</span>
                          <span>
                            {new Date(order.created_at).toLocaleString("id-ID")}
                          </span>
                        </div>

                        <div className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5 mb-4 flex items-start gap-2">
                          <Ban className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider mb-0.5">
                              Alasan Void
                            </p>
                            <p className="text-sm text-rose-700 font-medium">
                              {order.void_reason}
                            </p>
                          </div>
                        </div>

                        <div className="bg-stone-50 rounded-xl p-3 border border-slate-200/50">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Detail Pesanan
                          </p>
                          <div className="space-y-1">
                            {order.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex justify-between text-sm"
                              >
                                <span className="text-slate-600">
                                  {item.menu?.name}{" "}
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
                        </div>
                      </div>

                      <div className="sm:text-right sm:min-w-[180px]">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                          Total
                        </p>
                        <p className="font-display text-2xl font-bold text-slate-900 mb-4">
                          Rp {order.total_price.toLocaleString()}
                        </p>
                        <div className="flex sm:flex-col gap-2">
                          <button
                            onClick={() => handleApprove(order.id)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm shadow-rose-500/20"
                          >
                            <Check className="w-4 h-4" strokeWidth={2.5} />
                            Setujui Void
                          </button>
                          <button
                            onClick={() => handleReject(order.id)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition"
                          >
                            <X className="w-4 h-4" strokeWidth={2.5} />
                            Tolak
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default VoidRequestsPage;
