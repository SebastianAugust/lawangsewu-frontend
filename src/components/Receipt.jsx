export function printReceipt(order) {
  const items = order.cart || order.items || [];
  const customerName = order.customer_name || null;
  const paymentMethod = order.payment_method?.toUpperCase() || "CASH";
  const cashReceived = order.cash_received;
  const changeAmount = order.change_amount;
  const totalPrice = order.total_price;
  const kasir =
    order.kasir_name ||
    order.cashier_name ||
    (typeof localStorage !== "undefined" && localStorage.getItem("userName")) ||
    "";

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

  const isCash = (order.payment_method || "").toLowerCase() === "cash";

  const receiptHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Struk #${order.daily_sequence || order.id}</title>
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
            font-size: 14px;
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
            margin: 6px 0;
        }
        .store-name {
            font-size: 20px;
            font-weight: bold;
            letter-spacing: 1px;
        }
        .store-info {
            font-size: 14px;
            font-weight: bold;
        }
        .meta {
            font-size: 14px;
        }
        /* One item block: big bold menu name, detail line below, gap after. */
        .item {
            margin-bottom: 10px;
        }
        .item-name {
            font-size: 16px;
            font-weight: bold;
            line-height: 1.2;
        }
        .item-detail {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
            font-size: 18px;
            margin: 4px 0;
        }
        .pay-row {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
        }
        .footer {
            text-align: center;
            font-size: 14px;
            margin-top: 8px;
        }
    </style>
</head>
<body>
    <div class="center">
        <div class="store-name">LAWANG SEWU</div>
        <div class="store-info">Restoran &amp; Rumah Makan</div>
    </div>

    <div class="divider"></div>

    <div class="meta">
        <div>Struk #${order.daily_sequence || order.id}</div>
        <div>${dateStr} ${timeStr}</div>
        ${kasir ? `<div>Kasir: ${kasir}</div>` : ""}
        ${customerName ? `<div>Pelanggan: ${customerName}</div>` : ""}
    </div>

    <div class="divider"></div>

    ${items
      .map((item) => {
        const name = getItemName(item);
        const qty = item.quantity;
        const price = item.price || Math.round(item.subtotal / item.quantity);
        const subtotal = item.subtotal;
        return `
        <div class="item">
            <div class="item-name">${name}</div>
            <div class="item-detail">
                <span>${qty} x ${formatRp(price)}</span>
                <span>${formatRp(subtotal)}</span>
            </div>
        </div>
        `;
      })
      .join("")}

    <div class="divider"></div>

    <div class="total-row">
        <span>TOTAL</span>
        <span>${formatRp(totalPrice)}</span>
    </div>
    <div class="center bold">${paymentMethod}</div>
    ${
      isCash && cashReceived !== null && cashReceived !== undefined
        ? `
    <div class="pay-row">
        <span>Tunai</span>
        <span>${formatRp(cashReceived)}</span>
    </div>
    `
        : ""
    }
    ${
      isCash && changeAmount !== null && changeAmount !== undefined
        ? `
    <div class="pay-row">
        <span>Kembali</span>
        <span>${formatRp(changeAmount)}</span>
    </div>
    `
        : ""
    }

    <div class="divider"></div>

    <div class="footer">
        Terima kasih sudah makan<br>
        di Lawang Sewu!
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
