import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";

const BRAND = "LAWANG SEWU";
const TAGLINE = "Restaurant POS — Sales Report";

// ───────────────────────── helpers ─────────────────────────

const fmtRp = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

const fmtDateLong = (d) =>
  new Date(d).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const fmtDateShort = (d) =>
  new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const fmtMonthName = (m, y) =>
  new Date(y, m - 1).toLocaleString("id-ID", { month: "long", year: "numeric" });

const nowStamp = () =>
  new Date().toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const fileSafe = (s) => s.replace(/[^\w\d-]+/g, "-").toLowerCase();

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// ───────────────────────── Excel styling ─────────────────────────

const RP_FMT = '"Rp"#,##0;[Red]-"Rp"#,##0';
const NUM_FMT = "#,##0";
const PCT_FMT = "0.0%";

const HEX = {
  brand: "FFD97706", // amber-600
  brandLight: "FFFEF3C7", // amber-100
  ink: "FF0F172A", // slate-900
  inkSoft: "FF334155", // slate-700
  muted: "FF64748B", // slate-500
  hairline: "FFE2E8F0", // slate-200
  panel: "FFFAFAF7", // stone-50
  emerald: "FF059669",
  rose: "FFE11D48",
};

const applyBorder = (cell, color = HEX.hairline, style = "thin") => {
  cell.border = {
    top: { style, color: { argb: color } },
    bottom: { style, color: { argb: color } },
    left: { style, color: { argb: color } },
    right: { style, color: { argb: color } },
  };
};

const fillCell = (cell, argb) => {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
};

const addBrandHeader = (sheet, title, period, columnSpan) => {
  // Row 1: brand strip
  sheet.mergeCells(1, 1, 1, columnSpan);
  const r1 = sheet.getCell(1, 1);
  r1.value = BRAND;
  r1.font = { name: "Calibri", bold: true, size: 18, color: { argb: "FFFFFFFF" } };
  fillCell(r1, HEX.brand);
  r1.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  sheet.getRow(1).height = 32;

  // Row 2: tagline + timestamp split
  sheet.getCell(2, 1).value = TAGLINE;
  sheet.getCell(2, 1).font = {
    name: "Calibri",
    italic: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };
  fillCell(sheet.getCell(2, 1), HEX.brand);
  sheet.getCell(2, 1).alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  if (columnSpan > 1) {
    sheet.mergeCells(2, 1, 2, Math.max(1, columnSpan - 1));
    sheet.getCell(2, columnSpan).value = `Dicetak: ${nowStamp()}`;
    sheet.getCell(2, columnSpan).font = {
      name: "Calibri",
      color: { argb: "FFFFFFFF" },
      size: 9,
    };
    fillCell(sheet.getCell(2, columnSpan), HEX.brand);
    sheet.getCell(2, columnSpan).alignment = {
      vertical: "middle",
      horizontal: "right",
      indent: 1,
    };
  }
  sheet.getRow(2).height = 18;

  // Row 3: title
  sheet.mergeCells(3, 1, 3, columnSpan);
  const r3 = sheet.getCell(3, 1);
  r3.value = title;
  r3.font = { name: "Calibri", bold: true, size: 14, color: { argb: HEX.ink } };
  fillCell(r3, HEX.brandLight);
  r3.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  sheet.getRow(3).height = 24;

  // Row 4: period
  sheet.mergeCells(4, 1, 4, columnSpan);
  const r4 = sheet.getCell(4, 1);
  r4.value = period;
  r4.font = { name: "Calibri", size: 11, color: { argb: HEX.muted } };
  fillCell(r4, HEX.brandLight);
  r4.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  sheet.getRow(4).height = 20;

  // Spacer row
  sheet.getRow(5).height = 8;

  return 6; // next available row
};

const addSectionTitle = (sheet, row, text, columnSpan) => {
  sheet.mergeCells(row, 1, row, columnSpan);
  const c = sheet.getCell(row, 1);
  c.value = text;
  c.font = { name: "Calibri", bold: true, size: 12, color: { argb: HEX.ink } };
  c.alignment = { vertical: "middle", horizontal: "left" };
  sheet.getRow(row).height = 22;
  return row + 1;
};

// Adds a table starting at `startRow`. headers = [{title, key, width, numFmt?, align?}]
// rows = array of objects keyed by header.key
// total = optional [{key, value, isCurrency}] for total row
const addTable = (sheet, startRow, headers, rows, total) => {
  // Header
  headers.forEach((h, i) => {
    const cell = sheet.getCell(startRow, i + 1);
    cell.value = h.title;
    cell.font = { name: "Calibri", bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    fillCell(cell, HEX.ink);
    cell.alignment = {
      vertical: "middle",
      horizontal: h.align || "left",
      indent: h.align === "right" ? 0 : 1,
    };
    applyBorder(cell, HEX.ink);
  });
  sheet.getRow(startRow).height = 22;

  // Data rows
  rows.forEach((rowData, rowIndex) => {
    const r = startRow + 1 + rowIndex;
    const isAlt = rowIndex % 2 === 1;
    headers.forEach((h, i) => {
      const cell = sheet.getCell(r, i + 1);
      cell.value = rowData[h.key];
      cell.font = { name: "Calibri", size: 10, color: { argb: HEX.inkSoft } };
      cell.alignment = {
        vertical: "middle",
        horizontal: h.align || "left",
        indent: h.align === "right" ? 0 : 1,
      };
      if (h.numFmt) cell.numFmt = h.numFmt;
      if (isAlt) fillCell(cell, HEX.panel);
      applyBorder(cell, HEX.hairline);
    });
    sheet.getRow(r).height = 18;
  });

  let lastRow = startRow + rows.length;

  // Total row
  if (total) {
    lastRow += 1;
    headers.forEach((h, i) => {
      const cell = sheet.getCell(lastRow, i + 1);
      const t = total.find((x) => x.key === h.key);
      if (t) {
        cell.value = t.value;
        if (h.numFmt) cell.numFmt = h.numFmt;
      } else if (i === 0) {
        cell.value = "TOTAL";
      }
      cell.font = { name: "Calibri", bold: true, size: 11, color: { argb: HEX.ink } };
      fillCell(cell, HEX.brandLight);
      cell.alignment = {
        vertical: "middle",
        horizontal: h.align || "left",
        indent: h.align === "right" ? 0 : 1,
      };
      applyBorder(cell, HEX.brand);
    });
    sheet.getRow(lastRow).height = 22;
  }

  // Set column widths
  headers.forEach((h, i) => {
    sheet.getColumn(i + 1).width = h.width || 16;
  });

  return lastRow + 2;
};

// Two-column key/value summary
const addSummary = (sheet, startRow, items) => {
  items.forEach((item, i) => {
    const r = startRow + i;
    const labelCell = sheet.getCell(r, 1);
    labelCell.value = item.label;
    labelCell.font = { name: "Calibri", size: 11, color: { argb: HEX.muted } };
    labelCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    fillCell(labelCell, HEX.panel);
    applyBorder(labelCell, HEX.hairline);

    const valueCell = sheet.getCell(r, 2);
    valueCell.value = item.value;
    if (item.numFmt) valueCell.numFmt = item.numFmt;
    valueCell.font = {
      name: "Calibri",
      bold: true,
      size: 12,
      color: { argb: item.color || HEX.ink },
    };
    valueCell.alignment = { vertical: "middle", horizontal: "right", indent: 1 };
    applyBorder(valueCell, HEX.hairline);

    sheet.getRow(r).height = 22;
  });
  sheet.getColumn(1).width = 32;
  sheet.getColumn(2).width = 24;
  return startRow + items.length + 2;
};

const finalizeSheet = (sheet) => {
  sheet.views = [{ state: "frozen", ySplit: 4 }];
};

const saveWorkbook = async (wb, filename) => {
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, filename);
};

// ───────────────────────── PDF helpers ─────────────────────────

const COL = {
  brand: [217, 119, 6],
  ink: [15, 23, 42],
  muted: [100, 116, 139],
  hairline: [226, 232, 240],
  emerald: [5, 150, 105],
  rose: [244, 63, 94],
  panel: [250, 250, 247],
};

const drawPdfHeader = (doc, title, period) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(...COL.brand);
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(BRAND, 14, 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(TAGLINE, 14, 19);

  doc.setFontSize(8);
  doc.text(`Dicetak: ${nowStamp()}`, pageWidth - 14, 13, { align: "right" });

  doc.setTextColor(...COL.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(title, 14, 42);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COL.muted);
  doc.text(period, 14, 49);

  doc.setDrawColor(...COL.hairline);
  doc.setLineWidth(0.3);
  doc.line(14, 53, pageWidth - 14, 53);
  return 60;
};

const drawSummaryCards = (doc, y, items) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const gap = 4;
  const cols = items.length;
  const cardW = (pageWidth - margin * 2 - gap * (cols - 1)) / cols;
  const cardH = 24;

  items.forEach((item, i) => {
    const x = margin + i * (cardW + gap);
    doc.setFillColor(...COL.panel);
    doc.setDrawColor(...COL.hairline);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COL.muted);
    doc.text(item.label.toUpperCase(), x + 4, y + 7);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...(item.color || COL.ink));
    doc.text(String(item.value), x + 4, y + 16);

    if (item.sub) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...COL.muted);
      doc.text(item.sub, x + 4, y + 21);
    }
  });

  return y + cardH + 8;
};

const drawSectionTitle = (doc, y, text) => {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COL.ink);
  doc.text(text, 14, y);
  return y + 4;
};

const tableTheme = {
  styles: {
    font: "helvetica",
    fontSize: 9,
    cellPadding: 2.5,
    lineColor: COL.hairline,
    lineWidth: 0.2,
  },
  headStyles: {
    fillColor: COL.ink,
    textColor: 255,
    fontStyle: "bold",
    fontSize: 8,
    halign: "left",
  },
  alternateRowStyles: { fillColor: COL.panel },
  margin: { left: 14, right: 14 },
};

const drawPdfFooter = (doc) => {
  const pageCount = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...COL.hairline);
    doc.setLineWidth(0.3);
    doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COL.muted);
    doc.text(`${BRAND} · ${TAGLINE}`, 14, pageHeight - 8);
    doc.text(`Halaman ${i} dari ${pageCount}`, pageWidth - 14, pageHeight - 8, {
      align: "right",
    });
  }
};

// ───────────────────────── DAILY ─────────────────────────

export const exportDailyPdf = (date, report) => {
  if (!report) {
    alert("Data laporan belum dimuat");
    return;
  }
  const doc = new jsPDF("p", "mm", "a4");
  let y = drawPdfHeader(doc, "Laporan Harian", fmtDateLong(date));

  const avgPerOrder =
    report.total_orders > 0
      ? Math.round(report.total_revenue / report.total_orders)
      : 0;

  y = drawSummaryCards(doc, y, [
    { label: "Pendapatan", value: fmtRp(report.total_revenue), color: COL.emerald },
    { label: "Total Pesanan", value: report.total_orders },
    { label: "Rata-rata/Pesanan", value: fmtRp(avgPerOrder) },
    { label: "Void", value: report.total_voided, color: COL.rose },
  ]);

  y = drawSectionTitle(doc, y, "Menu Terjual");
  autoTable(doc, {
    ...tableTheme,
    startY: y,
    head: [["#", "Menu", "Kategori", "Terjual", "Pendapatan"]],
    body: (report.menu_sales || []).map((m, i) => [
      i + 1,
      m.menu?.name || "-",
      m.menu?.category?.name || "-",
      m.total_sold,
      fmtRp(m.total_revenue),
    ]),
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      3: { halign: "right", cellWidth: 22 },
      4: { halign: "right", cellWidth: 36 },
    },
  });
  y = doc.lastAutoTable.finalY + 8;

  if (report.category_sales?.length > 0) {
    y = drawSectionTitle(doc, y, "Pendapatan per Kategori");
    const totalCat = report.category_sales.reduce(
      (s, c) => s + Number(c.total_revenue || 0),
      0,
    );
    autoTable(doc, {
      ...tableTheme,
      startY: y,
      head: [["Kategori", "Pendapatan", "Persentase"]],
      body: [...report.category_sales]
        .sort((a, b) => Number(b.total_revenue) - Number(a.total_revenue))
        .map((c) => [
          c.category,
          fmtRp(c.total_revenue),
          totalCat > 0
            ? `${((Number(c.total_revenue) / totalCat) * 100).toFixed(1)}%`
            : "-",
        ]),
      columnStyles: {
        1: { halign: "right", cellWidth: 40 },
        2: { halign: "right", cellWidth: 30 },
      },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  if (report.payment_breakdown?.length > 0) {
    y = drawSectionTitle(doc, y, "Metode Pembayaran");
    autoTable(doc, {
      ...tableTheme,
      startY: y,
      head: [["Metode", "Jumlah Pesanan", "Total"]],
      body: report.payment_breakdown.map((p) => [
        String(p.payment_method).toUpperCase(),
        p.count,
        fmtRp(p.total),
      ]),
      columnStyles: {
        1: { halign: "right", cellWidth: 40 },
        2: { halign: "right", cellWidth: 50 },
      },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  if (report.hourly_sales?.length > 0) {
    y = drawSectionTitle(doc, y, "Pesanan per Jam");
    autoTable(doc, {
      ...tableTheme,
      startY: y,
      head: [["Jam", "Pesanan", "Pendapatan"]],
      body: report.hourly_sales
        .filter((h) => h.orders > 0)
        .map((h) => [
          `${String(h.hour).padStart(2, "0")}:00`,
          h.orders,
          fmtRp(h.revenue),
        ]),
      columnStyles: {
        0: { cellWidth: 25 },
        1: { halign: "right", cellWidth: 40 },
        2: { halign: "right", cellWidth: 50 },
      },
    });
  }

  drawPdfFooter(doc);
  doc.save(`laporan-harian-${fileSafe(date)}.pdf`);
};

export const exportDailyXlsx = async (date, report) => {
  if (!report) {
    alert("Data laporan belum dimuat");
    return;
  }
  const wb = new ExcelJS.Workbook();
  wb.creator = BRAND;
  wb.created = new Date();

  const avgPerOrder =
    report.total_orders > 0
      ? Math.round(report.total_revenue / report.total_orders)
      : 0;
  const totalCat = (report.category_sales || []).reduce(
    (s, c) => s + Number(c.total_revenue || 0),
    0,
  );

  // ── Sheet 1: Ringkasan ──
  const s1 = wb.addWorksheet("Ringkasan", {
    properties: { tabColor: { argb: HEX.brand } },
  });
  let row = addBrandHeader(s1, "Laporan Harian", fmtDateLong(date), 2);
  row = addSectionTitle(s1, row, "Ringkasan", 2);
  addSummary(s1, row, [
    {
      label: "Total Pendapatan",
      value: Number(report.total_revenue),
      numFmt: RP_FMT,
      color: HEX.emerald,
    },
    { label: "Total Pesanan", value: report.total_orders, numFmt: NUM_FMT },
    { label: "Rata-rata per Pesanan", value: avgPerOrder, numFmt: RP_FMT },
    {
      label: "Total Void",
      value: report.total_voided,
      numFmt: NUM_FMT,
      color: HEX.rose,
    },
  ]);
  finalizeSheet(s1);

  // ── Sheet 2: Menu Terjual ──
  const s2 = wb.addWorksheet("Menu Terjual");
  row = addBrandHeader(s2, "Menu Terjual", fmtDateLong(date), 5);
  addTable(
    s2,
    row,
    [
      { title: "#", key: "no", width: 6, align: "center" },
      { title: "Menu", key: "menu", width: 32 },
      { title: "Kategori", key: "category", width: 18 },
      { title: "Terjual", key: "sold", width: 12, align: "right", numFmt: NUM_FMT },
      {
        title: "Pendapatan",
        key: "revenue",
        width: 18,
        align: "right",
        numFmt: RP_FMT,
      },
    ],
    (report.menu_sales || []).map((m, i) => ({
      no: i + 1,
      menu: m.menu?.name || "-",
      category: m.menu?.category?.name || "-",
      sold: Number(m.total_sold || 0),
      revenue: Number(m.total_revenue || 0),
    })),
    [
      { key: "sold", value: (report.menu_sales || []).reduce((s, m) => s + Number(m.total_sold || 0), 0) },
      { key: "revenue", value: Number(report.total_revenue) },
    ],
  );
  finalizeSheet(s2);

  // ── Sheet 3: Kategori ──
  if (report.category_sales?.length > 0) {
    const s3 = wb.addWorksheet("Kategori");
    row = addBrandHeader(s3, "Pendapatan per Kategori", fmtDateLong(date), 3);
    addTable(
      s3,
      row,
      [
        { title: "Kategori", key: "category", width: 28 },
        {
          title: "Pendapatan",
          key: "revenue",
          width: 20,
          align: "right",
          numFmt: RP_FMT,
        },
        {
          title: "Persentase",
          key: "pct",
          width: 14,
          align: "right",
          numFmt: PCT_FMT,
        },
      ],
      [...report.category_sales]
        .sort((a, b) => Number(b.total_revenue) - Number(a.total_revenue))
        .map((c) => ({
          category: c.category,
          revenue: Number(c.total_revenue),
          pct: totalCat > 0 ? Number(c.total_revenue) / totalCat : 0,
        })),
      [{ key: "revenue", value: totalCat }, { key: "pct", value: 1 }],
    );
    finalizeSheet(s3);
  }

  // ── Sheet 4: Pembayaran ──
  if (report.payment_breakdown?.length > 0) {
    const s4 = wb.addWorksheet("Pembayaran");
    row = addBrandHeader(s4, "Metode Pembayaran", fmtDateLong(date), 3);
    addTable(
      s4,
      row,
      [
        { title: "Metode", key: "method", width: 20 },
        {
          title: "Jumlah Pesanan",
          key: "count",
          width: 18,
          align: "right",
          numFmt: NUM_FMT,
        },
        { title: "Total", key: "total", width: 20, align: "right", numFmt: RP_FMT },
      ],
      report.payment_breakdown.map((p) => ({
        method: String(p.payment_method).toUpperCase(),
        count: Number(p.count),
        total: Number(p.total),
      })),
      [
        {
          key: "count",
          value: report.payment_breakdown.reduce((s, p) => s + Number(p.count), 0),
        },
        { key: "total", value: Number(report.total_revenue) },
      ],
    );
    finalizeSheet(s4);
  }

  // ── Sheet 5: Per Jam ──
  if (report.hourly_sales?.length > 0) {
    const s5 = wb.addWorksheet("Per Jam");
    row = addBrandHeader(s5, "Pesanan per Jam", fmtDateLong(date), 3);
    addTable(
      s5,
      row,
      [
        { title: "Jam", key: "hour", width: 12 },
        {
          title: "Pesanan",
          key: "orders",
          width: 14,
          align: "right",
          numFmt: NUM_FMT,
        },
        {
          title: "Pendapatan",
          key: "revenue",
          width: 18,
          align: "right",
          numFmt: RP_FMT,
        },
      ],
      report.hourly_sales
        .filter((h) => h.orders > 0)
        .map((h) => ({
          hour: `${String(h.hour).padStart(2, "0")}:00`,
          orders: Number(h.orders),
          revenue: Number(h.revenue),
        })),
    );
    finalizeSheet(s5);
  }

  await saveWorkbook(wb, `laporan-harian-${fileSafe(date)}.xlsx`);
};

// ───────────────────────── WEEKLY ─────────────────────────

export const exportWeeklyPdf = (report) => {
  if (!report) {
    alert("Data laporan belum dimuat");
    return;
  }
  const doc = new jsPDF("p", "mm", "a4");
  const period = `${fmtDateShort(report.week_start)} – ${fmtDateShort(report.week_end)}`;
  let y = drawPdfHeader(doc, "Laporan Mingguan", period);

  y = drawSummaryCards(doc, y, [
    { label: "Total Pendapatan", value: fmtRp(report.total_revenue), color: COL.emerald },
    { label: "Total Pesanan", value: report.total_orders },
    { label: "Rata-rata/Hari", value: fmtRp(report.avg_daily) },
    { label: "Void", value: report.total_voided, color: COL.rose },
  ]);

  y = drawSectionTitle(doc, y, "Rincian Harian");
  autoTable(doc, {
    ...tableTheme,
    startY: y,
    head: [["Tanggal", "Pesanan", "Pendapatan"]],
    body: (report.daily_revenue || []).map((d) => [
      fmtDateLong(d.date),
      d.orders,
      fmtRp(d.revenue),
    ]),
    foot: [
      [
        { content: "TOTAL", styles: { fontStyle: "bold" } },
        { content: report.total_orders, styles: { halign: "right", fontStyle: "bold" } },
        {
          content: fmtRp(report.total_revenue),
          styles: { halign: "right", fontStyle: "bold" },
        },
      ],
    ],
    footStyles: { fillColor: COL.panel, textColor: COL.ink },
    columnStyles: {
      1: { halign: "right", cellWidth: 35 },
      2: { halign: "right", cellWidth: 50 },
    },
  });
  y = doc.lastAutoTable.finalY + 8;

  y = drawSectionTitle(doc, y, "Top Menu Mingguan");
  autoTable(doc, {
    ...tableTheme,
    startY: y,
    head: [["#", "Menu", "Kategori", "Terjual", "Pendapatan"]],
    body: (report.top_menus || []).map((m, i) => [
      i + 1,
      m.menu?.name || "-",
      m.menu?.category?.name || "-",
      m.total_sold,
      fmtRp(m.total_revenue),
    ]),
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      3: { halign: "right", cellWidth: 22 },
      4: { halign: "right", cellWidth: 36 },
    },
  });
  y = doc.lastAutoTable.finalY + 8;

  if (report.category_sales?.length > 0) {
    const totalCat = report.category_sales.reduce(
      (s, c) => s + Number(c.total_revenue || 0),
      0,
    );
    y = drawSectionTitle(doc, y, "Pendapatan per Kategori");
    autoTable(doc, {
      ...tableTheme,
      startY: y,
      head: [["Kategori", "Pendapatan", "Persentase"]],
      body: [...report.category_sales]
        .sort((a, b) => Number(b.total_revenue) - Number(a.total_revenue))
        .map((c) => [
          c.category,
          fmtRp(c.total_revenue),
          totalCat > 0
            ? `${((Number(c.total_revenue) / totalCat) * 100).toFixed(1)}%`
            : "-",
        ]),
      columnStyles: {
        1: { halign: "right", cellWidth: 40 },
        2: { halign: "right", cellWidth: 30 },
      },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  if (report.payment_breakdown?.length > 0) {
    y = drawSectionTitle(doc, y, "Metode Pembayaran");
    autoTable(doc, {
      ...tableTheme,
      startY: y,
      head: [["Metode", "Jumlah Pesanan", "Total"]],
      body: report.payment_breakdown.map((p) => [
        String(p.payment_method).toUpperCase(),
        p.count,
        fmtRp(p.total),
      ]),
      columnStyles: {
        1: { halign: "right", cellWidth: 40 },
        2: { halign: "right", cellWidth: 50 },
      },
    });
  }

  drawPdfFooter(doc);
  doc.save(`laporan-mingguan-${report.week_start}-${report.week_end}.pdf`);
};

export const exportWeeklyXlsx = async (report) => {
  if (!report) {
    alert("Data laporan belum dimuat");
    return;
  }
  const wb = new ExcelJS.Workbook();
  wb.creator = BRAND;
  wb.created = new Date();
  const period = `${fmtDateShort(report.week_start)} – ${fmtDateShort(report.week_end)}`;
  const totalCat = (report.category_sales || []).reduce(
    (s, c) => s + Number(c.total_revenue || 0),
    0,
  );

  // ── Sheet 1: Ringkasan ──
  const s1 = wb.addWorksheet("Ringkasan", {
    properties: { tabColor: { argb: HEX.brand } },
  });
  let row = addBrandHeader(s1, "Laporan Mingguan", period, 2);
  row = addSectionTitle(s1, row, "Ringkasan", 2);
  row = addSummary(s1, row, [
    {
      label: "Total Pendapatan",
      value: Number(report.total_revenue),
      numFmt: RP_FMT,
      color: HEX.emerald,
    },
    { label: "Total Pesanan", value: report.total_orders, numFmt: NUM_FMT },
    {
      label: "Rata-rata per Hari",
      value: Number(report.avg_daily),
      numFmt: RP_FMT,
    },
    {
      label: "Total Void",
      value: report.total_voided,
      numFmt: NUM_FMT,
      color: HEX.rose,
    },
    {
      label: "Hari Terbaik",
      value: report.best_day ? fmtDateLong(report.best_day.date) : "-",
    },
    {
      label: "Pendapatan Hari Terbaik",
      value: report.best_day?.revenue || 0,
      numFmt: RP_FMT,
      color: HEX.emerald,
    },
  ]);
  if (report.last_week_revenue !== undefined) {
    addSummary(s1, row, [
      {
        label: "Minggu Lalu (Pendapatan)",
        value: Number(report.last_week_revenue || 0),
        numFmt: RP_FMT,
      },
      {
        label: "Minggu Lalu (Pesanan)",
        value: Number(report.last_week_orders || 0),
        numFmt: NUM_FMT,
      },
    ]);
  }
  finalizeSheet(s1);

  // ── Sheet 2: Rincian Harian ──
  const s2 = wb.addWorksheet("Rincian Harian");
  row = addBrandHeader(s2, "Rincian Harian", period, 3);
  addTable(
    s2,
    row,
    [
      { title: "Tanggal", key: "date", width: 28 },
      {
        title: "Pesanan",
        key: "orders",
        width: 14,
        align: "right",
        numFmt: NUM_FMT,
      },
      {
        title: "Pendapatan",
        key: "revenue",
        width: 20,
        align: "right",
        numFmt: RP_FMT,
      },
    ],
    (report.daily_revenue || []).map((d) => ({
      date: fmtDateLong(d.date),
      orders: Number(d.orders),
      revenue: Number(d.revenue),
    })),
    [
      { key: "orders", value: report.total_orders },
      { key: "revenue", value: Number(report.total_revenue) },
    ],
  );
  finalizeSheet(s2);

  // ── Sheet 3: Top Menu ──
  const s3 = wb.addWorksheet("Top Menu");
  row = addBrandHeader(s3, "Top Menu Mingguan", period, 5);
  addTable(
    s3,
    row,
    [
      { title: "#", key: "no", width: 6, align: "center" },
      { title: "Menu", key: "menu", width: 32 },
      { title: "Kategori", key: "category", width: 18 },
      { title: "Terjual", key: "sold", width: 12, align: "right", numFmt: NUM_FMT },
      {
        title: "Pendapatan",
        key: "revenue",
        width: 18,
        align: "right",
        numFmt: RP_FMT,
      },
    ],
    (report.top_menus || []).map((m, i) => ({
      no: i + 1,
      menu: m.menu?.name || "-",
      category: m.menu?.category?.name || "-",
      sold: Number(m.total_sold || 0),
      revenue: Number(m.total_revenue || 0),
    })),
  );
  finalizeSheet(s3);

  // ── Sheet 4: Kategori ──
  if (report.category_sales?.length > 0) {
    const s4 = wb.addWorksheet("Kategori");
    row = addBrandHeader(s4, "Pendapatan per Kategori", period, 3);
    addTable(
      s4,
      row,
      [
        { title: "Kategori", key: "category", width: 28 },
        {
          title: "Pendapatan",
          key: "revenue",
          width: 20,
          align: "right",
          numFmt: RP_FMT,
        },
        {
          title: "Persentase",
          key: "pct",
          width: 14,
          align: "right",
          numFmt: PCT_FMT,
        },
      ],
      [...report.category_sales]
        .sort((a, b) => Number(b.total_revenue) - Number(a.total_revenue))
        .map((c) => ({
          category: c.category,
          revenue: Number(c.total_revenue),
          pct: totalCat > 0 ? Number(c.total_revenue) / totalCat : 0,
        })),
      [{ key: "revenue", value: totalCat }, { key: "pct", value: 1 }],
    );
    finalizeSheet(s4);
  }

  // ── Sheet 5: Pembayaran ──
  if (report.payment_breakdown?.length > 0) {
    const s5 = wb.addWorksheet("Pembayaran");
    row = addBrandHeader(s5, "Metode Pembayaran", period, 3);
    addTable(
      s5,
      row,
      [
        { title: "Metode", key: "method", width: 20 },
        {
          title: "Jumlah Pesanan",
          key: "count",
          width: 18,
          align: "right",
          numFmt: NUM_FMT,
        },
        { title: "Total", key: "total", width: 20, align: "right", numFmt: RP_FMT },
      ],
      report.payment_breakdown.map((p) => ({
        method: String(p.payment_method).toUpperCase(),
        count: Number(p.count),
        total: Number(p.total),
      })),
      [
        {
          key: "count",
          value: report.payment_breakdown.reduce((s, p) => s + Number(p.count), 0),
        },
        { key: "total", value: Number(report.total_revenue) },
      ],
    );
    finalizeSheet(s5);
  }

  await saveWorkbook(
    wb,
    `laporan-mingguan-${report.week_start}-${report.week_end}.xlsx`,
  );
};

// ───────────────────────── MONTHLY ─────────────────────────

export const exportMonthlyPdf = (month, year, report) => {
  if (!report) {
    alert("Data laporan belum dimuat");
    return;
  }
  const doc = new jsPDF("p", "mm", "a4");
  let y = drawPdfHeader(doc, "Laporan Bulanan", fmtMonthName(month, year));

  y = drawSummaryCards(doc, y, [
    { label: "Total Pendapatan", value: fmtRp(report.total_revenue), color: COL.emerald },
    { label: "Total Pesanan", value: report.total_orders },
    { label: "Rata-rata/Hari", value: fmtRp(report.avg_daily) },
    {
      label: "Hari Terbaik",
      value: report.best_day ? fmtRp(report.best_day.revenue) : "-",
      sub: report.best_day
        ? new Date(report.best_day.date).toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "short",
          })
        : null,
    },
  ]);

  y = drawSectionTitle(doc, y, "Top Menu Bulan Ini");
  autoTable(doc, {
    ...tableTheme,
    startY: y,
    head: [["#", "Menu", "Kategori", "Terjual", "Pendapatan"]],
    body: (report.top_menus || []).map((m, i) => [
      i + 1,
      m.menu?.name || "-",
      m.menu?.category?.name || "-",
      m.total_sold,
      fmtRp(m.total_revenue),
    ]),
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      3: { halign: "right", cellWidth: 22 },
      4: { halign: "right", cellWidth: 36 },
    },
  });
  y = doc.lastAutoTable.finalY + 8;

  y = drawSectionTitle(doc, y, "Pendapatan Harian");
  autoTable(doc, {
    ...tableTheme,
    startY: y,
    head: [["Tanggal", "Pesanan", "Pendapatan"]],
    body: (report.daily_revenue || []).map((d) => [
      new Date(d.date).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      d.orders,
      fmtRp(d.revenue),
    ]),
    foot: [
      [
        { content: "TOTAL", styles: { fontStyle: "bold" } },
        { content: report.total_orders, styles: { halign: "right", fontStyle: "bold" } },
        {
          content: fmtRp(report.total_revenue),
          styles: { halign: "right", fontStyle: "bold" },
        },
      ],
    ],
    footStyles: { fillColor: COL.panel, textColor: COL.ink },
    columnStyles: {
      1: { halign: "right", cellWidth: 35 },
      2: { halign: "right", cellWidth: 50 },
    },
  });
  y = doc.lastAutoTable.finalY + 8;

  if (report.category_sales?.length > 0) {
    const totalCat = report.category_sales.reduce(
      (s, c) => s + Number(c.total_revenue || 0),
      0,
    );
    y = drawSectionTitle(doc, y, "Pendapatan per Kategori");
    autoTable(doc, {
      ...tableTheme,
      startY: y,
      head: [["Kategori", "Pendapatan", "Persentase"]],
      body: [...report.category_sales]
        .sort((a, b) => Number(b.total_revenue) - Number(a.total_revenue))
        .map((c) => [
          c.category,
          fmtRp(c.total_revenue),
          totalCat > 0
            ? `${((Number(c.total_revenue) / totalCat) * 100).toFixed(1)}%`
            : "-",
        ]),
      columnStyles: {
        1: { halign: "right", cellWidth: 40 },
        2: { halign: "right", cellWidth: 30 },
      },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  if (report.payment_breakdown?.length > 0) {
    y = drawSectionTitle(doc, y, "Metode Pembayaran");
    autoTable(doc, {
      ...tableTheme,
      startY: y,
      head: [["Metode", "Jumlah Pesanan", "Total"]],
      body: report.payment_breakdown.map((p) => [
        String(p.payment_method).toUpperCase(),
        p.count,
        fmtRp(p.total),
      ]),
      columnStyles: {
        1: { halign: "right", cellWidth: 40 },
        2: { halign: "right", cellWidth: 50 },
      },
    });
  }

  drawPdfFooter(doc);
  doc.save(`laporan-bulanan-${year}-${String(month).padStart(2, "0")}.pdf`);
};

export const exportMonthlyXlsx = async (month, year, report) => {
  if (!report) {
    alert("Data laporan belum dimuat");
    return;
  }
  const wb = new ExcelJS.Workbook();
  wb.creator = BRAND;
  wb.created = new Date();
  const period = fmtMonthName(month, year);

  // ── Sheet 1: Ringkasan ──
  const s1 = wb.addWorksheet("Ringkasan", {
    properties: { tabColor: { argb: HEX.brand } },
  });
  let row = addBrandHeader(s1, "Laporan Bulanan", period, 2);
  row = addSectionTitle(s1, row, "Ringkasan", 2);
  row = addSummary(s1, row, [
    {
      label: "Total Pendapatan",
      value: Number(report.total_revenue),
      numFmt: RP_FMT,
      color: HEX.emerald,
    },
    { label: "Total Pesanan", value: report.total_orders, numFmt: NUM_FMT },
    {
      label: "Rata-rata per Hari",
      value: Number(report.avg_daily),
      numFmt: RP_FMT,
    },
    {
      label: "Hari Terbaik",
      value: report.best_day ? fmtDateLong(report.best_day.date) : "-",
    },
    {
      label: "Pendapatan Hari Terbaik",
      value: report.best_day?.revenue || 0,
      numFmt: RP_FMT,
      color: HEX.emerald,
    },
  ]);
  if (report.last_month_revenue) {
    addSummary(s1, row, [
      {
        label: "Bulan Lalu (Pendapatan)",
        value: Number(report.last_month_revenue),
        numFmt: RP_FMT,
      },
    ]);
  }
  finalizeSheet(s1);

  // ── Sheet 2: Top Menu ──
  const s2 = wb.addWorksheet("Top Menu");
  row = addBrandHeader(s2, "Top Menu Bulan Ini", period, 5);
  addTable(
    s2,
    row,
    [
      { title: "#", key: "no", width: 6, align: "center" },
      { title: "Menu", key: "menu", width: 32 },
      { title: "Kategori", key: "category", width: 18 },
      { title: "Terjual", key: "sold", width: 12, align: "right", numFmt: NUM_FMT },
      {
        title: "Pendapatan",
        key: "revenue",
        width: 18,
        align: "right",
        numFmt: RP_FMT,
      },
    ],
    (report.top_menus || []).map((m, i) => ({
      no: i + 1,
      menu: m.menu?.name || "-",
      category: m.menu?.category?.name || "-",
      sold: Number(m.total_sold || 0),
      revenue: Number(m.total_revenue || 0),
    })),
  );
  finalizeSheet(s2);

  // ── Sheet 3: Pendapatan Harian ──
  const s3 = wb.addWorksheet("Pendapatan Harian");
  row = addBrandHeader(s3, "Pendapatan Harian", period, 3);
  addTable(
    s3,
    row,
    [
      { title: "Tanggal", key: "date", width: 18 },
      {
        title: "Pesanan",
        key: "orders",
        width: 14,
        align: "right",
        numFmt: NUM_FMT,
      },
      {
        title: "Pendapatan",
        key: "revenue",
        width: 20,
        align: "right",
        numFmt: RP_FMT,
      },
    ],
    (report.daily_revenue || []).map((d) => ({
      date: new Date(d.date).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      orders: Number(d.orders),
      revenue: Number(d.revenue),
    })),
    [
      { key: "orders", value: report.total_orders },
      { key: "revenue", value: Number(report.total_revenue) },
    ],
  );
  finalizeSheet(s3);

  // ── Sheet 4: Kategori ──
  if (report.category_sales?.length > 0) {
    const totalCat = report.category_sales.reduce(
      (s, c) => s + Number(c.total_revenue || 0),
      0,
    );
    const s4 = wb.addWorksheet("Kategori");
    row = addBrandHeader(s4, "Pendapatan per Kategori", period, 3);
    addTable(
      s4,
      row,
      [
        { title: "Kategori", key: "category", width: 28 },
        {
          title: "Pendapatan",
          key: "revenue",
          width: 20,
          align: "right",
          numFmt: RP_FMT,
        },
        {
          title: "Persentase",
          key: "pct",
          width: 14,
          align: "right",
          numFmt: PCT_FMT,
        },
      ],
      [...report.category_sales]
        .sort((a, b) => Number(b.total_revenue) - Number(a.total_revenue))
        .map((c) => ({
          category: c.category,
          revenue: Number(c.total_revenue),
          pct: totalCat > 0 ? Number(c.total_revenue) / totalCat : 0,
        })),
      [{ key: "revenue", value: totalCat }, { key: "pct", value: 1 }],
    );
    finalizeSheet(s4);
  }

  // ── Sheet 5: Pembayaran ──
  if (report.payment_breakdown?.length > 0) {
    const s5 = wb.addWorksheet("Pembayaran");
    row = addBrandHeader(s5, "Metode Pembayaran", period, 3);
    addTable(
      s5,
      row,
      [
        { title: "Metode", key: "method", width: 20 },
        {
          title: "Jumlah Pesanan",
          key: "count",
          width: 18,
          align: "right",
          numFmt: NUM_FMT,
        },
        { title: "Total", key: "total", width: 20, align: "right", numFmt: RP_FMT },
      ],
      report.payment_breakdown.map((p) => ({
        method: String(p.payment_method).toUpperCase(),
        count: Number(p.count),
        total: Number(p.total),
      })),
      [
        {
          key: "count",
          value: report.payment_breakdown.reduce((s, p) => s + Number(p.count), 0),
        },
        { key: "total", value: Number(report.total_revenue) },
      ],
    );
    finalizeSheet(s5);
  }

  // ── Sheet 6: Per Jam ──
  if (report.hourly_sales?.length > 0) {
    const s6 = wb.addWorksheet("Per Jam");
    row = addBrandHeader(s6, "Pola Jam Sibuk", period, 3);
    addTable(
      s6,
      row,
      [
        { title: "Jam", key: "hour", width: 12 },
        {
          title: "Pesanan",
          key: "orders",
          width: 14,
          align: "right",
          numFmt: NUM_FMT,
        },
        {
          title: "Pendapatan",
          key: "revenue",
          width: 18,
          align: "right",
          numFmt: RP_FMT,
        },
      ],
      report.hourly_sales
        .filter((h) => h.orders > 0)
        .map((h) => ({
          hour: `${String(h.hour).padStart(2, "0")}:00`,
          orders: Number(h.orders),
          revenue: Number(h.revenue),
        })),
    );
    finalizeSheet(s6);
  }

  await saveWorkbook(
    wb,
    `laporan-bulanan-${year}-${String(month).padStart(2, "0")}.xlsx`,
  );
};

// ───────────────────────── legacy aliases ─────────────────────────
export const downloadDailyPdf = exportDailyPdf;
export const downloadDailyCsv = exportDailyXlsx;
export const downloadMonthlyPdf = exportMonthlyPdf;
export const downloadMonthlyCsv = exportMonthlyXlsx;
export const exportDailyCsv = exportDailyXlsx;
export const exportWeeklyCsv = exportWeeklyXlsx;
export const exportMonthlyCsv = exportMonthlyXlsx;
