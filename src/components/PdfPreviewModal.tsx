import React, { useEffect, useState } from "react";
import jsPDF from "jspdf";
import { X, Download, Printer, ExternalLink, Loader2 } from "lucide-react";

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfDoc: jsPDF | null;
  filename: string;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  isOpen,
  onClose,
  pdfDoc,
  filename,
}) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && pdfDoc) {
      const blob = pdfDoc.output("blob");
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);

      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setPdfUrl(null);
    }
  }, [isOpen, pdfDoc]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (pdfDoc) {
      pdfDoc.save(filename);
    }
  };

  const handlePrint = () => {
    if (pdfUrl) {
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = pdfUrl;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        iframe.contentWindow?.print();
      };
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col border border-slate-300">
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-xl">
          <div>
            <h2 className="text-sm font-bold text-slate-900 font-serif">
              Pratinjau Dokumen Register Intelijen (PDF)
            </h2>
            <p className="text-[11px] text-slate-500 font-mono">{filename}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              id="btn-print-pdf"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-xs transition"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak</span>
            </button>

            <button
              onClick={handleDownload}
              id="btn-download-pdf-modal"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition"
            >
              <Download className="w-4 h-4" />
              <span>Unduh PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Viewer Body */}
        <div className="flex-1 bg-slate-200/70 p-2 sm:p-4 overflow-hidden relative flex items-center justify-center">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              title="Pratinjau PDF"
              className="w-full h-full rounded-lg bg-white shadow-md border border-slate-300"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <span className="text-xs">Menyiapkan pratinjau dokumen PDF...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
