import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/auth";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Building2 } from "lucide-react";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError("");
    try {
      const response = await login({ email, password });
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
      setError(err.response?.data?.message || "Login gagal. Periksa kembali email & password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md animate-slide-up">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-blue-900 rounded-md flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" strokeWidth={2.2} />
            </div>
            <div>
              <p className="font-display font-bold text-base leading-none text-slate-900 tracking-tight">
                Lawang Sewu
              </p>
              <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-[0.14em] font-semibold">
                Point of Sale
              </p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
              Masuk ke akun Anda
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              Silakan masukkan kredensial untuk melanjutkan ke sistem.
            </p>
          </div>

          {error && (
            <div className="mb-5 bg-red-50 border border-red-200 border-l-4 border-l-red-600 text-red-800 text-sm px-4 py-3 rounded flex items-start gap-2">
              <span className="font-bold">!</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  placeholder="email@lawangsewu.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded pl-11 pr-4 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900/15 focus:border-blue-900 transition"
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
                  className="w-full bg-white border border-slate-300 rounded pl-11 pr-11 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900/15 focus:border-blue-900 transition"
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
              className="w-full bg-blue-900 hover:bg-blue-800 disabled:bg-slate-300 text-white py-3 rounded font-semibold text-sm transition flex items-center justify-center gap-2 group"
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
