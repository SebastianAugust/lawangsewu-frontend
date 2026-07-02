// WebBluetooth thermal printer utility (ESC/POS) for Algoo AT-58X Pro (58mm).
// Works on Chrome (Android) over HTTPS. Desktop Chrome support is limited.

const ESC = 0x1b;
const GS = 0x1d;

// ESC/POS commands
const COMMANDS = {
  INIT: [ESC, 0x40], // Initialize printer
  ALIGN_CENTER: [ESC, 0x61, 0x01], // Center align
  ALIGN_LEFT: [ESC, 0x61, 0x00], // Left align
  BOLD_ON: [ESC, 0x45, 0x01], // Bold on
  BOLD_OFF: [ESC, 0x45, 0x00], // Bold off
  FONT_NORMAL: [ESC, 0x21, 0x00], // Normal font
  FONT_DOUBLE: [ESC, 0x21, 0x30], // Double size font
  LINE_FEED: [0x0a], // Line feed
  CUT_PAPER: [GS, 0x56, 0x41, 0x10], // Cut paper
  DIVIDER: "--------------------------------\n", // 32 char divider for 58mm
};

// Generic thermal printer BLE service/characteristic UUIDs.
const PRINTER_SERVICE_UUID = "000018f0-0000-1000-8000-00805f9b34fb";
const PRINTER_CHAR_UUID = "00002af1-0000-1000-8000-00805f9b34fb";

// Extra services declared so we can fall back to scanning if the primary
// UUID above is not exposed by this particular printer firmware.
const KNOWN_SERVICES = [
  PRINTER_SERVICE_UUID,
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "0000ff10-0000-1000-8000-00805f9b34fb",
  "0000ffe0-0000-1000-8000-00805f9b34fb", // HM-10 style modules
  "49535343-fe7d-4ae5-8fa9-9fafd205e455", // ISSC / Microchip transparent UART
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
];

const LINE_WIDTH = 32; // characters per line at normal font on 58mm paper
const CHUNK_SIZE = 100; // BLE write chunk size (bytes)
const STORAGE_KEY = "printerName";

// Module-level connection state.
let printerDevice = null;
let printerCharacteristic = null;

/** Error carrying a user-facing (Indonesian) message plus a machine code. */
export class PrinterError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "PrinterError";
    this.code = code;
  }
}

export function isBluetoothSupported() {
  return typeof navigator !== "undefined" && !!navigator.bluetooth;
}

export function isPrinterConnected() {
  return !!(
    printerDevice &&
    printerDevice.gatt &&
    printerDevice.gatt.connected &&
    printerCharacteristic
  );
}

export function getPrinterName() {
  if (printerDevice?.name) return printerDevice.name;
  return localStorage.getItem(STORAGE_KEY) || null;
}

function handleDisconnected() {
  printerCharacteristic = null;
}

/** Find a writable characteristic, preferring the known printer UUID. */
async function findWriteCharacteristic(server) {
  try {
    const service = await server.getPrimaryService(PRINTER_SERVICE_UUID);
    const ch = await service.getCharacteristic(PRINTER_CHAR_UUID);
    if (ch) return ch;
  } catch {
    // Primary UUID not present — scan every exposed service instead.
  }

  const services = await server.getPrimaryServices();
  for (const service of services) {
    let chars;
    try {
      chars = await service.getCharacteristics();
    } catch {
      continue;
    }
    for (const ch of chars) {
      if (ch.properties.write || ch.properties.writeWithoutResponse) {
        return ch;
      }
    }
  }
  return null;
}

/** Scan for + connect to a Bluetooth thermal printer. Requires a user gesture. */
export async function connectPrinter() {
  if (!isBluetoothSupported()) {
    throw new PrinterError(
      "Browser tidak mendukung Bluetooth. Gunakan Chrome untuk print via Bluetooth.",
      "unsupported",
    );
  }

  let device;
  try {
    try {
      // Prefer devices advertising the standard printer service.
      device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [PRINTER_SERVICE_UUID] }],
        optionalServices: KNOWN_SERVICES,
      });
    } catch (filterErr) {
      // Some printers don't advertise the service — let the user pick any device.
      if (filterErr?.name === "NotFoundError") {
        device = await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: KNOWN_SERVICES,
        });
      } else {
        throw filterErr;
      }
    }
  } catch (err) {
    if (err?.name === "NotFoundError") {
      throw new PrinterError(
        "Printer tidak ditemukan. Pastikan printer menyala dan Bluetooth aktif.",
        "not-found",
      );
    }
    throw new PrinterError("Gagal konek ke printer, coba lagi.", "connect-failed");
  }

  try {
    device.addEventListener("gattserverdisconnected", handleDisconnected);
    const server = await device.gatt.connect();
    const characteristic = await findWriteCharacteristic(server);
    if (!characteristic) {
      throw new PrinterError(
        "Printer tidak mendukung pencetakan (characteristic tidak ditemukan).",
        "no-characteristic",
      );
    }
    printerDevice = device;
    printerCharacteristic = characteristic;
    if (device.name) localStorage.setItem(STORAGE_KEY, device.name);
    return getPrinterName();
  } catch (err) {
    if (err instanceof PrinterError) throw err;
    throw new PrinterError("Gagal konek ke printer, coba lagi.", "connect-failed");
  }
}

export function disconnectPrinter() {
  try {
    if (printerDevice?.gatt?.connected) {
      printerDevice.gatt.disconnect();
    }
  } catch {
    // ignore
  }
  printerCharacteristic = null;
}

/** Write bytes to the printer in small chunks (BLE MTU is limited). */
async function writeToPrinter(bytes) {
  const useWithoutResponse =
    printerCharacteristic.properties.writeWithoutResponse &&
    typeof printerCharacteristic.writeValueWithoutResponse === "function";

  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.slice(i, i + CHUNK_SIZE);
    if (useWithoutResponse) {
      await printerCharacteristic.writeValueWithoutResponse(chunk);
    } else {
      await printerCharacteristic.writeValue(chunk);
    }
    // Small delay so the printer buffer keeps up.
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

const formatRp = (num) => `Rp ${Number(num || 0).toLocaleString("id-ID")}`;

/** Build a "left ............... right" line padded to LINE_WIDTH characters. */
function twoCols(left, right) {
  const space = LINE_WIDTH - right.length;
  let l = left;
  if (l.length > space) l = l.slice(0, Math.max(0, space));
  const gap = Math.max(1, LINE_WIDTH - l.length - right.length);
  return l + " ".repeat(gap) + right + "\n";
}

function getItemName(item) {
  if (item.name) return item.name;
  const menuName = item.menu?.name || "";
  const variantName = item.variant_name ? ` (${item.variant_name})` : "";
  return `${menuName}${variantName}`;
}

/** Assemble the ESC/POS byte payload for one order. */
function buildReceiptBytes(order) {
  const encoder = new TextEncoder();
  const parts = [];
  const push = (data) => {
    parts.push(typeof data === "string" ? encoder.encode(data) : Uint8Array.from(data));
  };

  const items = order.cart || order.items || [];
  const paymentMethod = (order.payment_method || "cash").toUpperCase();
  const total = order.total_price ?? order.total ?? 0;
  const kasir =
    order.kasir_name || order.cashier_name || localStorage.getItem("userName") || "";

  const now = new Date(order.created_at || Date.now());
  const dateStr = now.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Header
  push(COMMANDS.INIT);
  push(COMMANDS.ALIGN_CENTER);
  push(COMMANDS.FONT_DOUBLE);
  push(COMMANDS.BOLD_ON);
  push("LAWANG SEWU\n");
  push(COMMANDS.FONT_NORMAL);
  push(COMMANDS.BOLD_OFF);
  push("Restoran & Rumah Makan\n");

  // Meta
  push(COMMANDS.ALIGN_LEFT);
  push(COMMANDS.DIVIDER);
  push(`Struk #${order.daily_sequence || order.id}\n`);
  push(`${dateStr} ${timeStr}\n`);
  if (kasir) push(`Kasir: ${kasir}\n`);
  if (order.customer_name) push(`Pelanggan: ${order.customer_name}\n`);

  // Items
  push(COMMANDS.DIVIDER);
  items.forEach((item) => {
    const qty = item.quantity;
    const price =
      item.price ?? (qty ? Math.round(item.subtotal / qty) : item.subtotal);
    push(`${getItemName(item)}\n`);
    push(twoCols(`${qty} x ${formatRp(price)}`, formatRp(item.subtotal)));
  });

  // Total
  push(COMMANDS.DIVIDER);
  push(COMMANDS.BOLD_ON);
  push(twoCols("TOTAL:", formatRp(total)));
  push(COMMANDS.BOLD_OFF);

  // Payment
  push(`${paymentMethod}\n`);
  if ((order.payment_method || "").toLowerCase() === "cash") {
    if (order.cash_received != null) {
      push(twoCols("Tunai:", formatRp(order.cash_received)));
    }
    if (order.change_amount != null) {
      push(twoCols("Kembali:", formatRp(order.change_amount)));
    }
  }

  // Footer
  push(COMMANDS.DIVIDER);
  push(COMMANDS.ALIGN_CENTER);
  push("Terima kasih sudah makan\n");
  push("di Lawang Sewu! \u{1F64F}\n");
  push(COMMANDS.LINE_FEED);
  push(COMMANDS.LINE_FEED);
  push(COMMANDS.LINE_FEED);
  push(COMMANDS.CUT_PAPER);

  // Concatenate into one Uint8Array.
  const totalLen = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(totalLen);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

/** Format + send a receipt to the connected Bluetooth printer. */
export async function printReceipt(orderData) {
  if (!isPrinterConnected()) {
    throw new PrinterError(
      "Printer belum terhubung. Konek printer dulu.",
      "not-connected",
    );
  }
  try {
    const bytes = buildReceiptBytes(orderData);
    await writeToPrinter(bytes);
  } catch (err) {
    if (err instanceof PrinterError) throw err;
    // A write failure usually means the link dropped — force a reconnect.
    handleDisconnected();
    throw new PrinterError("Gagal cetak, coba konek ulang printer.", "print-failed");
  }
}
