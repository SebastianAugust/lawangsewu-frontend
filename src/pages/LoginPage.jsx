import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/auth";
import { User, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    setError("");
    try {
      const response = await login({ username, password });
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("role", response.data.user.role);
      localStorage.setItem("userName", response.data.user.name);
      // Owner has no branch (branch_id null) → "lihat semua cabang".
      // Kasir is bound to one cabang; persist it for the navbar + filters.
      const branchId = response.data.branch_id ?? null;
      const branchName = response.data.branch_name ?? null;
      if (branchId != null) {
        localStorage.setItem("branch_id", String(branchId));
        localStorage.setItem("branch_name", branchName ?? "");
      } else {
        localStorage.removeItem("branch_id");
        localStorage.removeItem("branch_name");
      }
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login gagal. Periksa kembali username & password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6">
      <div
        className="w-full max-w-[400px] bg-white rounded-[20px] border border-black/[0.07] p-10"
        style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}
      >
        <div className="animate-slide-up">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-10 h-10 bg-blue-900 rounded-xl flex items-center justify-center mb-4">
              <span className="text-white font-bold text-sm tracking-tight">
                LS
              </span>
            </div>
            <p className="text-[22px] font-bold text-slate-800 tracking-tight leading-none">
              Lawang Sewu
            </p>
            <p className="text-[13px] text-slate-400 mt-2">
              Point of Sale System
            </p>
          </div>

          {error && (
            <div className="mb-5 bg-[#fef2f2] text-[#dc2626] text-[13px] px-3.5 py-2.5 rounded-lg flex items-start gap-2">
              <span className="font-bold">!</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Masukkan username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-black/[0.08] rounded-[10px] pl-11 pr-4 py-3 text-sm placeholder:text-slate-300 focus:outline-none focus:ring-[3px] focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-black/[0.08] rounded-[10px] pl-11 pr-11 py-3 text-sm placeholder:text-slate-300 focus:outline-none focus:ring-[3px] focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-900 hover:bg-blue-800 disabled:bg-slate-300 text-white py-[13px] rounded-xl font-semibold text-[15px] transition flex items-center justify-center gap-2 group"
            >
              {loading ? (
                "Memproses..."
              ) : (
                <>
                  Masuk
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-400 text-center">
              Butuh bantuan akses? Hubungi administrator restoran Anda.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
