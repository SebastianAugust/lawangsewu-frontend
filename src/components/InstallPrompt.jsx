import { useState, useEffect } from "react";

function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show prompt after 30 seconds
      setTimeout(() => setShowPrompt(true), 30000);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 animate-[fadeIn_0.3s_ease-out]">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
          <span className="text-lg">📲</span>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-slate-800 text-sm">
            Install Lawang Sewu
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Akses lebih cepat langsung dari home screen
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleInstall}
              className="bg-amber-500 text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-amber-600 transition"
            >
              Install
            </button>
            <button
              onClick={handleDismiss}
              className="bg-slate-100 text-slate-500 px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-200 transition"
            >
              Nanti
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InstallPrompt;
