export function printReceipt(order) {
  const items = order.cart || order.items || [];
  const customerName = order.customer_name || null;
  const paymentMethod = order.payment_method?.toUpperCase() || "CASH";
  const cashReceived = order.cash_received;
  const changeAmount = order.change_amount;
  const totalPrice = order.total_price;

  const formatRp = (num) => `Rp ${Number(num).toLocaleString("id-ID")}`;

  const getItemName = (item) => {
    if (item.name) return item.name;
    const menuName = item.menu?.name || "";
    const variantName = item.variant_name ? ` (${item.variant_name})` : "";
    return `${menuName}${variantName}`;
  };

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

  const receiptHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Struk #${order.id}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        @page {
            margin: 0;
            size: 58mm auto;
        }
        body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            width: 58mm;
            padding: 4mm;
            color: #000;
            line-height: 1.4;
        }
        .center {
            text-align: center;
        }
        .bold {
            font-weight: bold;
        }
        .divider {
            border-top: 1px dashed #000;
            margin: 4px 0;
        }
        .double-divider {
            border-top: 2px solid #000;
            margin: 4px 0;
        }
        .row {
            display: flex;
            justify-content: space-between;
        }
        .item-name {
            font-size: 11px;
        }
        .item-detail {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            padding-left: 8px;
            color: #333;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
            font-size: 14px;
            margin: 4px 0;
        }
        .footer {
            text-align: center;
            font-size: 10px;
            margin-top: 8px;
            color: #555;
        }
        .store-name {
            font-size: 16px;
            font-weight: bold;
            letter-spacing: 1px;
        }
        .store-info {
            font-size: 10px;
            color: #555;
        }
        .customer {
            font-size: 11px;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="center">
        <div class="store-name">LAWANG SEWU</div>
        <div class="store-info">Jl. Puri Indah Jatinangor No.9 Blok B4, Cikeruh, Jatinangor, Sumedang, Jawa Barat</div>
        <div class="store-info">Telp: 0822 8133 6269</div>
    </div>

    <div class="divider"></div>

    <div class="row" style="font-size: 10px;">
        <span>${dateStr} ${timeStr}</span>
        <span class="bold">#${order.daily_sequence || order.id}</span>
    </div>
    ${customerName ? `<div class="customer">${customerName}</div>` : ""}

    <div class="double-divider"></div>

    ${items
      .map((item) => {
        const name = getItemName(item);
        const qty = item.quantity;
        const price = item.price || Math.round(item.subtotal / item.quantity);
        const subtotal = item.subtotal;
        return `
        <div class="item-name">${name}</div>
        <div class="item-detail">
            <span>${qty} x ${formatRp(price)}</span>
            <span>${formatRp(subtotal)}</span>
        </div>
        `;
      })
      .join("")}

    <div class="double-divider"></div>

    <div class="total-row">
        <span>TOTAL</span>
        <span>${formatRp(totalPrice)}</span>
    </div>

    <div class="divider"></div>

    <div class="row" style="font-size: 11px;">
        <span>Bayar (${paymentMethod})</span>
        <span>${cashReceived ? formatRp(cashReceived) : formatRp(totalPrice)}</span>
    </div>
    ${
      changeAmount !== null && changeAmount !== undefined
        ? `
    <div class="row" style="font-size: 11px;">
        <span>Kembalian</span>
        <span>${formatRp(changeAmount)}</span>
    </div>
    `
        : ""
    }

    <div class="divider"></div>

    <div class="footer">
        Terima kasih atas kunjungan Anda!<br>
        Simpan struk ini sebagai bukti pembayaran
    </div>

    <script>
        window.onload = function() {
            window.print();
            window.onafterprint = function() {
                window.close();
            };
        };
    </script>
</body>
</html>`;

  const printWindow = window.open("", "_blank", "width=300,height=600");
  printWindow.document.write(receiptHTML);
  printWindow.document.close();
}
