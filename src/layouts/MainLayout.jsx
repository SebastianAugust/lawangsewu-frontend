import { useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  History,
  UtensilsCrossed,
  Ban,
  ScrollText,
  LayoutDashboard,
  LogOut,
  Users,
  HelpCircle,
} from "lucide-react";
import { useTour } from "../contexts/TourContext";

function MainLayout({ children }) {
  const role = localStorage.getItem("role");
  const userName = localStorage.getItem("userName");
  const branchName = localStorage.getItem("branch_name");
  const navigate = useNavigate();
  const location = useLocation();
  const { start: startTour } = useTour();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userName");
    localStorage.removeItem("branch_id");
    localStorage.removeItem("branch_name");
    navigate("/login");
  };

  const navLinks = [
    { to: "/", label: "Kasir", icon: ShoppingCart, roles: ["kasir", "owner"] },
    { to: "/orders", label: "Riwayat", icon: History, roles: ["kasir", "owner"] },
    { to: "/menus", label: "Menu", icon: UtensilsCrossed, roles: ["owner"] },
    { to: "/users", label: "Cabang", icon: Users, roles: ["owner"] },
    { to: "/void-requests", label: "Void", icon: Ban, roles: ["owner"] },
    { to: "/audit-log", label: "Audit", icon: ScrollText, roles: ["owner"] },
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["owner"] },
  ];

  const visibleLinks = navLinks.filter((link) => link.roles.includes(role));

  // A kasir sees two tabs and has room to spare, so they keep their labels at
  // every width. Only a longer strip (an owner's seven) has to compact.
  const compactTabs = visibleLinks.length > 3;

  const isActive = (path) => location.pathname === path;
  const initial = (userName || "U").charAt(0).toUpperCase();

  // Sliding active pill. The pill is one absolutely-positioned element that
  // moves to sit behind whichever tab is active, so switching tabs reads as
  // one continuous motion instead of two separate background swaps.
  const tabsRef = useRef(null);
  const tabRefs = useRef({});
  const [pill, setPill] = useState({ left: 0, width: 0, ready: false });

  useLayoutEffect(() => {
    const measure = () => {
      const el = tabRefs.current[location.pathname];
      if (!el || !tabsRef.current) {
        setPill((p) => ({ ...p, ready: false }));
        return;
      }
      setPill({ left: el.offsetLeft, width: el.offsetWidth, ready: true });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [location.pathname, role]);

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-[52px] flex items-center justify-between gap-3">
          <div className="flex items-center gap-6 lg:gap-10 min-w-0">
            <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
              <div
                className="flex items-center justify-center"
                style={{ width: 30, height: 30, background: "#1e3a5f", borderRadius: 8 }}
              >
                <span
                  className="text-white leading-none"
                  style={{ fontSize: 11, fontWeight: 700 }}
                >
                  LS
                </span>
              </div>
              {/* The wordmark is decorative — the LS mark already identifies the
                  app — so it yields to the tab strip on a narrow tablet. Without
                  this, a portrait 800px screen still pushed "Dashboard" out of
                  reach by ~32px. */}
              <div className="hidden lg:flex items-baseline gap-1.5">
                <p
                  className="leading-none"
                  style={{ fontSize: 15, fontWeight: 600, color: "#1e293b", letterSpacing: "-0.4px" }}
                >
                  Lawang Sewu
                </p>
                <span
                  className="leading-none"
                  style={{ fontSize: 11, fontWeight: 400, color: "#94a3b8", letterSpacing: "0.5px" }}
                >
                  POS
                </span>
              </div>
            </Link>

            <div
              ref={tabsRef}
              className="relative flex items-center gap-1 overflow-x-auto"
            >
              {/* Sliding pill — sits behind the active tab and glides between
                  tabs. aria-hidden: purely decorative, the Link carries state. */}
              <span
                aria-hidden="true"
                className="absolute pointer-events-none"
                style={{
                  left: pill.left,
                  width: pill.width,
                  top: 0,
                  bottom: 0,
                  background: "#eef2f7",
                  borderRadius: 8,
                  opacity: pill.ready ? 1 : 0,
                  transition:
                    "left 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94), width 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 150ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                }}
              />
              {visibleLinks
                .map((link) => {
                  const Icon = link.icon;
                  const active = isActive(link.to);
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      title={link.label}
                      aria-label={link.label}
                      ref={(el) => {
                        tabRefs.current[link.to] = el;
                      }}
                      data-tour={`nav-${link.to.replace("/", "") || "kasir"}`}
                      className={`relative z-10 flex items-center gap-2 whitespace-nowrap ${
                        active
                          ? "text-[#1e3a5f] font-semibold"
                          : "text-[#94a3b8] hover:text-slate-700 font-medium"
                      }`}
                      style={{
                        fontSize: 12,
                        padding: "5px 12px",
                        borderRadius: 8,
                        transition:
                          "color 150ms cubic-bezier(0.25, 0.46, 0.45, 0.94), background-color 150ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                      }}
                      onMouseEnter={(e) => {
                        if (!active) e.currentTarget.style.backgroundColor = "#f8fafc";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "";
                      }}
                    >
                      <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />
                      {/* An owner has seven tabs; with every label showing they
                          need 611px of strip, and below 1280px there is not that
                          much room — the overflow silently cut "Audit" and
                          "Dashboard" off the end, with nothing to hint they were
                          still there. So below xl only the active tab keeps its
                          label: the strip always fits, you can still read where
                          you are, and the rest carry title/aria-label. */}
                      <span
                        className={
                          !compactTabs || active ? "inline" : "hidden xl:inline"
                        }
                      >
                        {link.label}
                      </span>
                    </Link>
                  );
                })}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <div className="hidden md:flex items-center gap-2.5 pr-3 mr-1 border-r border-slate-200">
              <div className="w-7 h-7 bg-blue-900 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-xs">
                  {initial}
                </span>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-800 leading-none">
                  {userName}
                </p>
                <p className="text-[10px] text-slate-500 mt-1 font-medium uppercase tracking-wider">
                  {role}
                  {role === "kasir" && branchName ? (
                    <span className="normal-case tracking-normal text-slate-400">
                      {" · "}
                      {branchName}
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
            <button
              onClick={startTour}
              title="Mulai Tutorial"
              className="flex items-center gap-1.5 text-slate-500 hover:text-blue-900 hover:bg-slate-100 transition text-sm px-2.5 py-1.5 rounded font-medium"
            >
              <HelpCircle className="w-4 h-4" strokeWidth={2} />
              <span className="hidden sm:inline">Tutorial</span>
            </button>
            <button
              onClick={handleLogout}
              title="Logout"
              className="flex items-center gap-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 transition text-sm px-2.5 py-1.5 rounded font-medium"
            >
              <LogOut className="w-4 h-4" strokeWidth={2} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>
      {/* key on the path remounts this wrapper on every navigation, which
          re-fires the enter animation. */}
      <main
        key={location.pathname}
        className="page-enter p-4 sm:p-6 max-w-screen-2xl mx-auto"
      >
        {children}
      </main>
    </div>
  );
}

export default MainLayout;
