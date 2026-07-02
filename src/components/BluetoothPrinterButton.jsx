import { useState } from "react";
import { Printer, Bluetooth, Loader2 } from "lucide-react";
import {
  connectPrinter,
  printReceipt as printReceiptBluetooth,
  isPrinterConnected,
  isBluetoothSupported,
} from "../utils/bluetoothPrinter";
import { printReceipt as printReceiptBrowser } from "./Receipt";

/**
 * Print button that talks to a Bluetooth thermal printer via WebBluetooth,
 * with a window.print() browser fallback that always stays available.
 *
 * Props:
 *   order      - order data passed to the printer (cart/items, total, payment...)
 *   className  - extra classes for the wrapper
 *   compact    - smaller layout for inline use (e.g. order history)
 */
function BluetoothPrinterButton({ order, className = "", compact = false }) {
  const supported = isBluetoothSupported();
  const [connected, setConnected] = useState(() => isPrinterConnected());
  // "idle" | "connecting" | "printing"
  const [busy, setBusy] = useState("idle");
  const [error, setError] = useState("");

  const handleMainClick = async () => {
    if (busy !== "idle") return;
    setError("");
    try {
      if (!isPrinterConnected()) {
        setBusy("connecting");
        await connectPrinter();
        setConnected(true);
      }
      setBusy("printing");
      await printReceiptBluetooth(order);
    } catch (err) {
      setConnected(isPrinterConnected());
      setError(err?.message || "Gagal mencetak struk.");
    } finally {
      setBusy("idle");
    }
  };

  const handleBrowserPrint = () => {
    setError("");
    printReceiptBrowser(order);
  };

  let mainLabel;
  if (busy === "connecting") mainLabel = "Menghubungkan...";
  else if (busy === "printing") mainLabel = "Mencetak...";
  else if (connected) mainLabel = "Cetak Struk";
  else mainLabel = "Konek Printer";

  return (
    <div className={`space-y-2 ${className}`}>
      {error && (
        <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {supported && (
        <button
          onClick={handleMainClick}
          disabled={busy !== "idle"}
          className={`w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-xl font-semibold transition flex items-center justify-center gap-2 shadow-sm ${
            compact ? "py-2 text-xs px-3" : "py-3 text-sm"
          }`}
        >
          {busy !== "idle" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : connected ? (
            <Printer className="w-4 h-4" />
          ) : (
            <Bluetooth className="w-4 h-4" />
          )}
          {mainLabel}
          {busy === "idle" && (
            <span
              className={`w-2 h-2 rounded-full ml-0.5 ${
                connected ? "bg-emerald-400" : "bg-rose-400"
              }`}
              title={connected ? "Printer terhubung" : "Printer belum terhubung"}
            />
          )}
        </button>
      )}

      {!supported && (
        <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          Gunakan Chrome untuk print via Bluetooth.
        </p>
      )}

      <button
        onClick={handleBrowserPrint}
        className={`w-full bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition flex items-center justify-center gap-2 ${
          compact ? "py-2 text-xs px-3" : "py-3 text-sm"
        }`}
      >
        <Printer className="w-4 h-4" />
        Cetak (Browser)
      </button>
    </div>
  );
}

export default BluetoothPrinterButton;
