import { useState, useEffect } from "react";
import { getAuditLogs } from "../api/audit";
import { getBranches } from "../api/branch";
import MainLayout from "../layouts/MainLayout";
import {
  LogIn,
  LogOut,
  ShoppingCart,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Pencil,
  Trash2,
  FileText,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Filter,
  Store,
} from "lucide-react";

const ACTION_LABELS = {
  login: {
    text: "Login",
    style: "bg-blue-100 text-blue-700",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-500",
    icon: LogIn,
  },
  logout: {
    text: "Logout",
    style: "bg-slate-100 text-slate-600",
    iconBg: "bg-slate-50",
    iconColor: "text-slate-500",
    icon: LogOut,
  },
  create_order: {
    text: "Buat Pesanan",
    style: "bg-emerald-100 text-emerald-700",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-500",
    icon: ShoppingCart,
  },
  void_request: {
    text: "Request Void",
    style: "bg-amber-100 text-amber-700",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    icon: AlertTriangle,
  },
  void_approve: {
    text: "Approve Void",
    style: "bg-rose-100 text-rose-700",
    iconBg: "bg-rose-50",
    iconColor: "text-rose-500",
    icon: CheckCircle2,
  },
  void_reject: {
    text: "Tolak Void",
    style: "bg-orange-100 text-orange-700",
    iconBg: "bg-orange-50",
    iconColor: "text-orange-500",
    icon: XCircle,
  },
  create_menu: {
    text: "Tambah Menu",
    style: "bg-purple-100 text-purple-700",
    iconBg: "bg-purple-50",
    iconColor: "text-purple-500",
    icon: Plus,
  },
  update_menu: {
    text: "Edit Menu",
    style: "bg-amber-100 text-amber-700",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    icon: Pencil,
  },
  delete_menu: {
    text: "Hapus Menu",
    style: "bg-rose-100 text-rose-700",
    iconBg: "bg-rose-50",
    iconColor: "text-rose-500",
    icon: Trash2,
  },
};

function AuditLogPage() {
  const isOwner = localStorage.getItem("role") === "owner";
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [filterAction, setFilterAction] = useState("");
  const [page, setPage] = useState(1);
  const [expandedLog, setExpandedLog] = useState(null);
  // Branch filter is owner-only — a kasir's logs are scoped by the backend.
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState("");

  const loadLogs = () => {
    const params = { date, page };
    if (filterAction) params.action = filterAction;
    if (isOwner && branchId) params.branch_id = branchId;
    getAuditLogs(params).then((res) => {
      setLogs(res.data.data);
      setPagination({
        current: res.data.current_page,
        last: res.data.last_page,
        total: res.data.total,
      });
    });
  };

  useEffect(() => {
    if (isOwner) {
      getBranches().then((res) => setBranches(res.data));
    }
  }, [isOwner]);

  useEffect(() => {
    loadLogs();
  }, [date, filterAction, page, branchId]);

  useEffect(() => {
    setPage(1);
  }, [date, filterAction, branchId]);

  const getActionLabel = (action) =>
    ACTION_LABELS[action] || {
      text: action,
      style: "bg-slate-100 text-slate-600",
      iconBg: "bg-slate-50",
      iconColor: "text-slate-500",
      icon: FileText,
    };

  const formatDetails = (details) => {
    if (!details) return null;
    return Object.entries(details).map(([key, value]) => {
      const displayValue =
        typeof value === "object" ? JSON.stringify(value) : String(value);
      return { key, value: displayValue };
    });
  };

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div>
            <h2 className="font-display text-3xl font-bold text-slate-900 tracking-tight">
              Audit Log
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Semua aktivitas tercatat di sini untuk transparansi.
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
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition appearance-none"
              >
                <option value="">Semua Aktivitas</option>
                <option value="login">Login</option>
                <option value="logout">Logout</option>
                <option value="create_order">Buat Pesanan</option>
                <option value="void_request">Request Void</option>
                <option value="void_approve">Approve Void</option>
                <option value="void_reject">Tolak Void</option>
                <option value="create_menu">Tambah Menu</option>
                <option value="update_menu">Edit Menu</option>
                <option value="delete_menu">Hapus Menu</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition"
              />
            </div>
          </div>
        </div>

        {/* Stats bar */}
        {pagination && (
          <div className="bg-white rounded-2xl border border-slate-200/70 px-5 py-3 mb-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <FileText className="w-4 h-4 text-slate-400" />
              Menampilkan{" "}
              <span className="font-bold text-slate-800">{logs.length}</span>{" "}
              dari{" "}
              <span className="font-bold text-slate-800">
                {pagination.total}
              </span>{" "}
              log
            </div>
            {pagination.last > 1 && (
              <p className="text-xs text-slate-400">
                Halaman {pagination.current} / {pagination.last}
              </p>
            )}
          </div>
        )}

        {/* Log list */}
        {logs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/70 p-16 text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Inbox className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-slate-700 font-semibold">Belum ada aktivitas</p>
            <p className="text-slate-400 text-sm mt-1">
              Tidak ada log pada tanggal atau filter yang dipilih.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => {
              const action = getActionLabel(log.action);
              const ActionIcon = action.icon;
              const isExpanded = expandedLog === log.id;
              const details = formatDetails(log.details);

              return (
                <div
                  key={log.id}
                  className={`bg-white rounded-2xl border border-slate-200/70 overflow-hidden transition ${
                    isExpanded ? "shadow-md ring-1 ring-amber-500/10" : "shadow-sm hover:shadow-md"
                  }`}
                >
                  <div
                    className="px-5 py-3.5 flex items-center gap-4 cursor-pointer hover:bg-stone-50/50 transition"
                    onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl ${action.iconBg} flex items-center justify-center shrink-0`}
                    >
                      <ActionIcon
                        className={`w-4 h-4 ${action.iconColor}`}
                        strokeWidth={2.2}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${action.style}`}
                        >
                          {action.text}
                        </span>
                        <span className="text-sm font-semibold text-slate-800">
                          {log.user?.name || "System"}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          {log.user?.role}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                        <span>
                          {new Date(log.created_at).toLocaleString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                        {log.target_type && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span>
                              {log.target_type} #{log.target_id}
                            </span>
                          </>
                        )}
                        {log.ip_address && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span className="font-mono">{log.ip_address}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </div>

                  {/* Details */}
                  {isExpanded && details && (
                    <div className="px-5 pb-5 border-t border-slate-100">
                      <div className="mt-3 bg-stone-50 rounded-xl p-4 border border-slate-200/50">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <FileText className="w-3 h-3" />
                          Detail Aktivitas
                        </p>
                        <div className="space-y-2">
                          {details.map(({ key, value }) => (
                            <div
                              key={key}
                              className="grid grid-cols-[120px_1fr] gap-3 text-xs items-start"
                            >
                              <span className="text-slate-500 font-semibold">
                                {key}
                              </span>
                              <span className="text-slate-800 break-all font-mono bg-white px-2 py-1 rounded-md border border-slate-200/50">
                                {value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.last > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold transition ${
                page === 1
                  ? "bg-slate-50 text-slate-300 cursor-not-allowed"
                  : "bg-white border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 shadow-sm"
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Sebelumnya
            </button>
            <div className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-sm">
              {pagination.current}{" "}
              <span className="text-slate-400 font-medium">/ {pagination.last}</span>
            </div>
            <button
              onClick={() => setPage(Math.min(pagination.last, page + 1))}
              disabled={page === pagination.last}
              className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold transition ${
                page === pagination.last
                  ? "bg-slate-50 text-slate-300 cursor-not-allowed"
                  : "bg-white border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 shadow-sm"
              }`}
            >
              Selanjutnya
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default AuditLogPage;
