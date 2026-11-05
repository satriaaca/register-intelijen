import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { RegisterDefinition, RegisterEntryRow, AppSettings, Officer, RegisterLock } from "../types.js";
import { MONTH_NAMES_ID, formatDateIndonesian, getClosingDateForPeriod } from "./date-utils.js";
import { ESIGN_DATA_URL } from "../assets/esignBase64.js";

// F4 / Folio = 215 x 330 mm (portrait). jsPDF menukar sisi otomatis untuk landscape.
const F4_FORMAT: [number, number] = [215, 330];

// ====== Pengaturan jarak (mm) - ubah di sini kalau masih kurang pas ======
const GAP_AFTER_TABLE = 4; // jarak tabel -> catatan penutupan
const GAP_AFTER_CLOSING = 3; // jarak catatan penutupan -> blok berikutnya
const SIGN_IMG_MAX_WIDTH = 34;
const SIGN_IMG_MAX_HEIGHT = 18;
const SIGN_IMG_GAP_BEFORE = 1; // jabatan -> gambar ttd
const SIGN_IMG_GAP_AFTER = 1; // gambar ttd -> nama
const TITLE_LINE_HEIGHT = 3.6; // tinggi 1 baris jabatan (font 8.5pt)
const FOOTNOTE_RESERVE = 8; // ruang cadangan di atas catatan kaki

// ====== Pengaturan lebar kolom tabel ======
const MAX_COL_SHARE = 0.3; // 1 kolom maksimal 30% lebar konten

export interface GeneratePdfOptions {
  register: RegisterDefinition;
  entries: RegisterEntryRow[];
  settings: AppSettings;
  officers: Officer[];
  tahunTakwim?: number;
  selectedMonth?: number | "all";
  customClosingDate?: string;
  orientationOverride?: "landscape" | "portrait";
  lockSnapshot?: RegisterLock | null;
  categoryFilter?: string | null;
}

export function generateRegisterPdf(options: GeneratePdfOptions): jsPDF {
  const {
    register,
    entries,
    settings,
    officers,
    tahunTakwim = 2026,
    selectedMonth = "all",
    customClosingDate,
    orientationOverride,
    lockSnapshot,
    categoryFilter,
  } = options;
  const isLandscape = (orientationOverride || register.orientation) === "landscape";

  // Data Penandatangan: Gunakan Snapshot jika Terkunci, atau Pengaturan Global jika belum terkunci
  const effectiveLeftSignerTitle =
    lockSnapshot?.isLocked && lockSnapshot.leftSignerTitle
      ? lockSnapshot.leftSignerTitle
      : settings?.leftSignerTitle || "KEPALA KEJAKSAAN NEGERI TABANAN";

  const effectiveLeftSignerName =
    lockSnapshot?.isLocked && lockSnapshot.leftSignerName
      ? lockSnapshot.leftSignerName
      : settings?.leftSignerName || "";

  const effectiveLeftSignerPangkatNip =
    lockSnapshot?.isLocked && lockSnapshot.leftSignerPangkatNip
      ? lockSnapshot.leftSignerPangkatNip
      : settings?.leftSignerPangkatNip || "";

  const effectiveRightSignerTitle =
    lockSnapshot?.isLocked && lockSnapshot.rightSignerTitle
      ? lockSnapshot.rightSignerTitle
      : settings?.rightSignerTitle || "KEPALA SEKSI INTELIJEN";

  const effectiveRightSignerName =
    lockSnapshot?.isLocked && lockSnapshot.rightSignerName
      ? lockSnapshot.rightSignerName
      : settings?.rightSignerName || "";

  const effectiveRightSignerPangkatNip =
    lockSnapshot?.isLocked && lockSnapshot.rightSignerPangkatNip
      ? lockSnapshot.rightSignerPangkatNip
      : settings?.rightSignerPangkatNip || "";

  const effectiveSignatureAlignment =
    lockSnapshot?.isLocked && lockSnapshot.signatureAlignment
      ? lockSnapshot.signatureAlignment
      : settings?.signatureAlignment || "split";

  const effectiveTempatDokumen =
    lockSnapshot?.isLocked && lockSnapshot.tempatDokumen
      ? lockSnapshot.tempatDokumen
      : settings?.tempatDokumen || "Tabanan";

  // Tentukan tanggal penutupan register aktif
  const rawClosingDate =
    (lockSnapshot?.isLocked && lockSnapshot.closingDate) ||
    customClosingDate ||
    (typeof selectedMonth === "number"
      ? getClosingDateForPeriod(settings, tahunTakwim, selectedMonth)
      : settings?.tanggalDokumen || new Date().toISOString().split("T")[0]);

  const closingDateFormatted = formatDateIndonesian(rawClosingDate, false);
  const closingDateWithDay = formatDateIndonesian(rawClosingDate, true);

  const monthLabel =
    typeof selectedMonth === "number"
      ? `${MONTH_NAMES_ID[selectedMonth - 1]} ${tahunTakwim}`
      : `Tahun ${tahunTakwim}`;

  // Inisialisasi dokumen jsPDF (F4) dengan kompresi aktif
  const doc = new jsPDF({
    orientation: isLandscape ? "landscape" : "portrait",
    unit: "mm",
    format: F4_FORMAT,
    compress: true,
    putOnlyUsedFonts: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const marginTop = 14;
  const marginBottom = 14;
  const contentWidth = pageWidth - marginX * 2;
  const pageBottomLimit = pageHeight - marginBottom - FOOTNOTE_RESERVE;

  // Map helper untuk lookup petugas
  const officerMap = new Map<number, Officer>();
  officers.forEach((o) => officerMap.set(o.id, o));

  const formatOfficerNames = (ids: any): string => {
    if (!ids) return "-";
    if (Array.isArray(ids)) {
      const names = ids
        .map((id) => {
          const off = officerMap.get(Number(id));
          return off ? `${off.nama} (${off.pangkat} / NIP. ${off.nip})` : null;
        })
        .filter(Boolean);
      if (names.length === 0) return "-";
      if (names.length === 1) return names[0];
      return names.map((name, idx) => `${idx + 1}. ${name}`).join("\n");
    }
    if (typeof ids === "number") {
      const off = officerMap.get(ids);
      return off ? `${off.nama} (${off.pangkat} / NIP. ${off.nip})` : String(ids);
    }
    return String(ids);
  };

  // Susun header tabel (1-level atau 2-level jika ada subColumns)
  const headRows: any[] = [];
  const hasSubCols = register.columns.some((c) => c.subColumns && c.subColumns.length > 0);

  if (!hasSubCols) {
    const topRow = register.columns.map((c) => ({
      content: c.label,
      styles: { halign: "center", valign: "middle", fontStyle: "bold" },
    }));
    headRows.push(topRow);

    const numRow = register.columns.map((c) => ({
      content: String(c.colNumber),
      styles: { halign: "center", valign: "middle", fontStyle: "bold", fillColor: [245, 245, 245] },
    }));
    headRows.push(numRow);
  } else {
    const row1: any[] = [];
    const row2: any[] = [];
    const numRow: any[] = [];

    register.columns.forEach((c) => {
      if (c.subColumns && c.subColumns.length > 0) {
        row1.push({
          content: c.label,
          colSpan: c.subColumns.length,
          styles: { halign: "center", valign: "middle", fontStyle: "bold" },
        });
        c.subColumns.forEach((sc) => {
          row2.push({
            content: sc.label,
            styles: { halign: "center", valign: "middle", fontStyle: "bold" },
          });
          numRow.push({
            content: String(sc.colNumber),
            styles: { halign: "center", valign: "middle", fontStyle: "bold", fillColor: [245, 245, 245] },
          });
        });
      } else {
        row1.push({
          content: c.label,
          rowSpan: 2,
          styles: { halign: "center", valign: "middle", fontStyle: "bold" },
        });
        numRow.push({
          content: String(c.colNumber),
          styles: { halign: "center", valign: "middle", fontStyle: "bold", fillColor: [245, 245, 245] },
        });
      }
    });

    headRows.push(row1);
    headRows.push(row2);
    headRows.push(numRow);
  }

  // Daftar kolom "daun" (urutannya sama dengan isi tiap baris body)
  const leafCols: any[] = register.columns.flatMap((c: any) =>
    c.subColumns && c.subColumns.length > 0 ? c.subColumns : [c]
  );

  // Susun baris data tabel
  const bodyRows: any[] = [];
  const isDataEmpty = entries.length === 0;

  if (isDataEmpty) {
    // 5 baris kosong bergaris untuk format register NIHIL
    const totalCols = leafCols.length;
    for (let i = 0; i < 5; i++) {
      const emptyRow = new Array(totalCols).fill("");
      bodyRows.push(emptyRow);
    }
  } else {
    entries.forEach((entry, index) => {
      const rowValues: any[] = [];
      const rowData = entry.data || {};

      register.columns.forEach((col) => {
        if (col.subColumns && col.subColumns.length > 0) {
          col.subColumns.forEach((subCol) => {
            let val = rowData[subCol.key] ?? "";
            if (subCol.type === "officer_multi" || subCol.type === "officer_single") {
              val = formatOfficerNames(val);
            }
            rowValues.push(val || "-");
          });
        } else {
          let val = "";
          if (col.key === "no") {
            val = String(entry.nomorUrut || index + 1);
          } else if (col.type === "officer_multi" || col.type === "officer_single") {
            val = formatOfficerNames(rowData[col.key]);
          } else {
            val = rowData[col.key] ?? "";
          }
          rowValues.push(val || "-");
        }
      });

      bodyRows.push(rowValues);
    });
  }

  // Fungsi menggambar judul dan kop register
  const drawPageHeader = (docInstance: jsPDF, _pageNum: number) => {
    docInstance.setDrawColor(40, 40, 40);
    docInstance.setLineWidth(0.3);

    // Kode Register di Kanan Atas
    docInstance.setFont("helvetica", "bold");
    docInstance.setFontSize(10);
    docInstance.text(String(register.code || ""), pageWidth - marginX, marginTop + 4, { align: "right" });

    // Satker di Kiri Atas
    docInstance.setFont("helvetica", "bold");
    docInstance.setFontSize(9.5);
    const kejaksaanText = `${String(settings.kejaksaanName || "").toUpperCase()}*)`;
    docInstance.text(kejaksaanText, marginX, marginTop + 4);

    // Judul Register di Tengah
    let currentY = marginTop + 10;
    docInstance.setFont("helvetica", "bold");
    docInstance.setFontSize(11);

    const titleLines = docInstance.splitTextToSize(String(register.title || ""), contentWidth - 40);
    docInstance.text(titleLines, pageWidth / 2, currentY, { align: "center" });
    currentY += titleLines.length * 4.5;

    if (register.subtitle) {
      docInstance.setFont("helvetica", "bold");
      docInstance.setFontSize(8.5);
      const subLines = docInstance.splitTextToSize(String(register.subtitle || ""), contentWidth - 20);
      docInstance.text(subLines, pageWidth / 2, currentY, { align: "center" });
      currentY += subLines.length * 3.8;
    }

    if (categoryFilter && categoryFilter !== "all" && register.code === "R.IN.3") {
      docInstance.setFont("helvetica", "bold");
      docInstance.setFontSize(8.5);
      docInstance.setTextColor(15, 23, 42);
      const catText = `BIDANG: ${categoryFilter.toUpperCase()}`;
      docInstance.text(catText, pageWidth / 2, currentY, { align: "center" });
      currentY += 4;
      docInstance.setTextColor(0, 0, 0);
    }

    // Periode Register
    docInstance.setFont("helvetica", "bold");
    docInstance.setFontSize(8);
    const periodText = `PERIODE: ${typeof selectedMonth === "number" ? `BULAN ${MONTH_NAMES_ID[selectedMonth - 1].toUpperCase()}` : "SEMUA BULAN"} - TAHUN ${tahunTakwim}`;
    docInstance.text(periodText, pageWidth / 2, currentY, { align: "center" });
    currentY += 3.5;

    return currentY + 2;
  };

  const startY = drawPageHeader(doc, 1);

  // ===== [FIX TEKS TERTUMPUK] Hitung lebar kolom & bungkus teks sendiri =====
  const tableFontSize = isLandscape ? 7.5 : 8;
  const cellPad = isDataEmpty ? 4 : 2;
  const colExtra = cellPad * 2 + 1; // padding kiri-kanan + toleransi garis

  const colCount = leafCols.length;
  const minW: number[] = new Array(colCount).fill(0);
  const wantW: number[] = new Array(colCount).fill(0);

  doc.setFontSize(tableFontSize);
  leafCols.forEach((col, i) => {
    // Lebar minimum = kata terpanjang di header (huruf tebal) atau nomor kolom
    doc.setFont("helvetica", "bold");
    const headerWords = String(col.label ?? "").split(/\s+/).filter(Boolean);
    const headerMin = Math.max(
      ...headerWords.map((w) => doc.getTextWidth(w)),
      doc.getTextWidth(String(col.colNumber ?? "")),
      4
    );

    // Lebar yang diinginkan = baris isi terpanjang (satu baris), dibatasi MAX_COL_SHARE
    doc.setFont("helvetica", "normal");
    let maxLine = 0;
    if (!isDataEmpty) {
      bodyRows.forEach((r) => {
        String(r[i] ?? "")
          .split("\n")
          .forEach((line) => {
            const w = doc.getTextWidth(line);
            if (w > maxLine) maxLine = w;
          });
      });
    }
    const want = Math.max(Math.min(maxLine, contentWidth * MAX_COL_SHARE), headerMin);

    minW[i] = headerMin + colExtra;
    wantW[i] = want + colExtra;
  });

  const sumMin = minW.reduce((a, b) => a + b, 0);
  const sumWant = wantW.reduce((a, b) => a + b, 0);
  let colWidths: number[];

  if (sumMin >= contentWidth) {
    // Kolom sangat banyak: skala proporsional (kata header terpanjang mungkin terpecah)
    colWidths = minW.map((m) => (m / sumMin) * contentWidth);
  } else if (sumWant <= contentWidth) {
    // Ada sisa ruang: bagikan sesuai porsi isi
    const spare = contentWidth - sumWant;
    colWidths = wantW.map((w) => w + (w / sumWant) * spare);
  } else {
    // Ruang kurang: mulai dari minimum, tambahkan sesuai kelebihan keinginan
    const available = contentWidth - sumMin;
    const sumExcess = wantW.reduce((a, w, i) => a + (w - minW[i]), 0);
    const scale = sumExcess > 0 ? available / sumExcess : 0;
    colWidths = minW.map((m, i) => m + (wantW[i] - m) * scale);
  }

  // Bungkus isi sel supaya kata panjang tanpa spasi tidak melewati batas kolom
  if (!isDataEmpty) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(tableFontSize);
    for (let r = 0; r < bodyRows.length; r++) {
      for (let i = 0; i < colCount; i++) {
        const maxTextWidth = Math.max(colWidths[i] - colExtra, 3);
        bodyRows[r][i] = String(bodyRows[r][i] ?? "")
          .split("\n")
          .map((line) => (doc.splitTextToSize(line, maxTextWidth) as string[]).join("\n"))
          .join("\n");
      }
    }
  }

  const columnStyles: Record<number, any> = {};
  colWidths.forEach((w, i) => {
    columnStyles[i] = { cellWidth: w };
  });

  // Render tabel menggunakan autoTable
  (autoTable as any)(doc, {
    head: headRows,
    body: bodyRows,
    startY: startY,
    margin: { left: marginX, right: marginX, top: startY, bottom: marginBottom + 6 },
    tableWidth: contentWidth,
    columnStyles,
    rowPageBreak: "avoid", // jangan potong satu baris di antara dua halaman
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: tableFontSize,
      cellPadding: cellPad, // Padding 4mm agar 5 baris NIHIL proporsional
      lineColor: [40, 40, 40],
      lineWidth: 0.25,
      textColor: [20, 20, 20],
      overflow: "linebreak",
      valign: "top",
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
      lineWidth: 0.25,
      lineColor: [40, 40, 40],
    },
    didDrawPage: (data: any) => {
      if (data.pageNumber > 1) {
        drawPageHeader(doc, data.pageNumber);
      }

      // Border luar halaman (Bingkai Register Resmi)
      doc.setDrawColor(60, 60, 60);
      doc.setLineWidth(0.4);
      doc.rect(marginX - 4, marginTop - 4, contentWidth + 8, pageHeight - (marginTop + marginBottom) + 8);
    },
  });

  const lastTable = (doc as any).lastAutoTable;
  const tableFinalY = lastTable ? Number(lastTable.finalY) : startY + 45;

  // Render Watermark "N I H I L" 60pt tepat di tengah 5 baris pada halaman 1
  if (isDataEmpty) {
    doc.setPage(1);
    const headerHeightEstimate = hasSubCols ? 18 : 12;
    const tableBodyStartY = startY + headerHeightEstimate;
    const centerY = (tableBodyStartY + tableFinalY) / 2;

    doc.saveGraphicsState();
    doc.setFont("times", "bold");
    doc.setFontSize(60);
    doc.setTextColor(175, 180, 190);
    doc.text("N  I  H  I  L", pageWidth / 2, centerY + 6, {
      align: "center",
    });
    doc.restoreGraphicsState();
  }

  // Pindah ke halaman terakhir untuk catatan & tanda tangan
  const totalPages = (doc as any).internal.getNumberOfPages();
  doc.setPage(totalPages);

  let finalY = tableFinalY + GAP_AFTER_TABLE;

  // ===== Catatan Penutupan Register =====
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  const closingClause = `Catatan Penutupan: Pada hari ini ${closingDateWithDay || closingDateFormatted}, Buku Register ${register.code} periode ${monthLabel} ini ditutup dengan ${entries.length} baris data register.`;
  const splitClosing = doc.splitTextToSize(closingClause, contentWidth - 8);
  const closingHeight = splitClosing.length * 4;

  if (finalY + closingHeight > pageBottomLimit) {
    doc.addPage();
    drawPageHeader(doc, (doc as any).internal.getNumberOfPages());
    finalY = marginTop + 25;
  }

  doc.setTextColor(50, 50, 50);
  doc.text(splitClosing, marginX, finalY);
  finalY += closingHeight + GAP_AFTER_CLOSING;
  doc.setTextColor(0, 0, 0);

  // ===== Rekapitulasi jika ada =====
  if (register.hasRekapitulasi && register.rekapitulasiFields) {
    const rekapHeight = 4.5 + register.rekapitulasiFields.length * 4 + 4;
    if (finalY + rekapHeight > pageBottomLimit) {
      doc.addPage();
      drawPageHeader(doc, (doc as any).internal.getNumberOfPages());
      finalY = marginTop + 25;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("Rekapitulasi :", marginX, finalY);
    finalY += 4.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    register.rekapitulasiFields.forEach((rf, idx) => {
      const count = entries.filter((e) => {
        const val = e.data?.[rf.key] || e.data?.jenis_produk;
        return val !== undefined && val !== "" && val !== null;
      }).length;

      doc.text(`${idx + 1}. ${rf.label}`, marginX + 4, finalY);
      doc.text(`:  ${count > 0 ? count : ".........."} ${rf.suffix || ""}`, marginX + 80, finalY);
      finalY += 4;
    });
    finalY += 4;
  }

  // ===== Ukuran gambar tanda tangan elektronik (proporsional) =====
  let signImgWidth = 0;
  let signImgHeight = 0;
  try {
    const imgProps = doc.getImageProperties(ESIGN_DATA_URL);
    const ratio = imgProps.width / imgProps.height;
    signImgWidth = SIGN_IMG_MAX_WIDTH;
    signImgHeight = signImgWidth / ratio;
    if (signImgHeight > SIGN_IMG_MAX_HEIGHT) {
      signImgHeight = SIGN_IMG_MAX_HEIGHT;
      signImgWidth = signImgHeight * ratio;
    }
  } catch (e) {
    signImgWidth = 30;
    signImgHeight = 15;
  }

  // ===== Hitung tinggi blok tanda tangan dari konten sebenarnya =====
  const isCenter = effectiveSignatureAlignment === "center";
  const titleWrapWidth = isCenter ? 75 : 80;
  const leftTitleClean = effectiveLeftSignerTitle
    .replace("Mengetahui:\n", "")
    .replace("Mengetahui:", "")
    .trim();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  const leftTitleLines: string[] = doc.splitTextToSize(leftTitleClean, titleWrapWidth);
  const rightTitleLines: string[] = doc.splitTextToSize(effectiveRightSignerTitle, titleWrapWidth);
  const titleBlockHeight = Math.max(leftTitleLines.length, rightTitleLines.length) * TITLE_LINE_HEIGHT;

  const signatureHeight =
    5 + // tanggal
    4 + // "Mengetahui:"
    titleBlockHeight +
    SIGN_IMG_GAP_BEFORE +
    signImgHeight +
    SIGN_IMG_GAP_AFTER +
    6; // nama + pangkat/NIP

  if (finalY + signatureHeight > pageBottomLimit) {
    doc.addPage();
    drawPageHeader(doc, (doc as any).internal.getNumberOfPages());
    finalY = marginTop + 25;
  }

  // ===== Tanda Tangan =====
  const tglText = `${effectiveTempatDokumen}, ${closingDateFormatted}`;

  if (isCenter) {
    const leftCenterX = marginX + contentWidth * 0.25;
    const rightCenterX = marginX + contentWidth * 0.75;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(tglText, rightCenterX, finalY, { align: "center" });
    finalY += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text("Mengetahui:", leftCenterX, finalY, { align: "center" });
    finalY += 4;

    // Jabatan kiri & kanan
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(leftTitleLines, leftCenterX, finalY, { align: "center" });
    doc.text(rightTitleLines, rightCenterX, finalY, { align: "center" });

    // Gambar ttd tepat di bawah baris jabatan terakhir
    const imageYCenter = finalY + titleBlockHeight + SIGN_IMG_GAP_BEFORE;
    if (signImgWidth > 0 && signImgHeight > 0) {
      try {
        doc.addImage(ESIGN_DATA_URL, "PNG", leftCenterX - signImgWidth / 2, imageYCenter, signImgWidth, signImgHeight, "ESIGN_STAMP_LEFT", "FAST");
        doc.addImage(ESIGN_DATA_URL, "PNG", rightCenterX - signImgWidth / 2, imageYCenter, signImgWidth, signImgHeight, "ESIGN_STAMP_RIGHT", "FAST");
      } catch (err) {
        console.warn("Failed to add esign image to PDF:", err);
      }
    }
    finalY = imageYCenter + signImgHeight + SIGN_IMG_GAP_AFTER;

    // Nama Pejabat Kiri
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(effectiveLeftSignerName, leftCenterX, finalY, { align: "center" });
    doc.setLineWidth(0.2);
    const leftNameWidth = doc.getTextWidth(effectiveLeftSignerName);
    doc.line(leftCenterX - leftNameWidth / 2, finalY + 0.8, leftCenterX + leftNameWidth / 2, finalY + 0.8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(effectiveLeftSignerPangkatNip, leftCenterX, finalY + 4.5, { align: "center" });

    // Nama Pejabat Kanan
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(effectiveRightSignerName, rightCenterX, finalY, { align: "center" });
    const rightNameWidth = doc.getTextWidth(effectiveRightSignerName);
    doc.line(rightCenterX - rightNameWidth / 2, finalY + 0.8, rightCenterX + rightNameWidth / 2, finalY + 0.8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(effectiveRightSignerPangkatNip, rightCenterX, finalY + 4.5, { align: "center" });
  } else {
    const leftX = marginX + (isLandscape ? 20 : 10);
    const rightX = pageWidth - marginX - (isLandscape ? 80 : 70);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(tglText, rightX, finalY);
    finalY += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text("Mengetahui:", leftX, finalY);
    finalY += 4;

    // Jabatan kiri & kanan
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(leftTitleLines, leftX, finalY);
    doc.text(rightTitleLines, rightX, finalY);

    // Gambar ttd tepat di bawah baris jabatan terakhir
    const imageYLeft = finalY + titleBlockHeight + SIGN_IMG_GAP_BEFORE;
    if (signImgWidth > 0 && signImgHeight > 0) {
      try {
        doc.addImage(ESIGN_DATA_URL, "PNG", leftX + 20 - signImgWidth / 2, imageYLeft, signImgWidth, signImgHeight, "ESIGN_STAMP_LEFT", "FAST");
        doc.addImage(ESIGN_DATA_URL, "PNG", rightX + 20 - signImgWidth / 2, imageYLeft, signImgWidth, signImgHeight, "ESIGN_STAMP_RIGHT", "FAST");
      } catch (err) {
        console.warn("Failed to add esign image to PDF:", err);
      }
    }
    finalY = imageYLeft + signImgHeight + SIGN_IMG_GAP_AFTER;

    // Nama Pejabat Kiri
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(effectiveLeftSignerName, leftX, finalY);
    doc.setLineWidth(0.2);
    const leftNameWidth = doc.getTextWidth(effectiveLeftSignerName);
    doc.line(leftX, finalY + 0.8, leftX + Math.max(leftNameWidth, 50), finalY + 0.8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(effectiveLeftSignerPangkatNip, leftX, finalY + 4.5);

    // Nama Pejabat Kanan
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(effectiveRightSignerName, rightX, finalY);
    const rightNameWidth = doc.getTextWidth(effectiveRightSignerName);
    doc.line(rightX, finalY + 0.8, rightX + Math.max(rightNameWidth, 50), finalY + 0.8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(effectiveRightSignerPangkatNip, rightX, finalY + 4.5);
  }

  // Catatan Kaki
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  const footnoteY = pageHeight - marginBottom;
  doc.text(register.notes || "*) Kejaksaan ditulis hanya di sampul depan.", marginX, footnoteY);

  doc.setTextColor(0, 0, 0);

  return doc;
}