"use client";

import { useState } from "react";
import { Download, Printer, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface DrawingQRCodeProps {
  projectId: string;
  drawingId: string;
  drawingNumber: string;
  isOpen: boolean;
  onClose: () => void;
}

export function DrawingQRCode({
  projectId,
  drawingId,
  drawingNumber,
  isOpen,
  onClose,
}: DrawingQRCodeProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const qrUrl = `/api/projects/${projectId}/drawings/${drawingId}/qr-code`;

  const handleDownload = async () => {
    const response = await fetch(qrUrl);
    if (!response.ok) return;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${drawingNumber}-qr.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head><title>QR Code — ${drawingNumber}</title></head>
        <body style="display:flex;flex-direction:column;align-items:center;padding:40px;font-family:sans-serif;">
          <h2>${drawingNumber}</h2>
          <img src="${window.location.origin}${qrUrl}" style="width:300px;height:300px;" />
          <p style="margin-top:12px;font-size:14px;color:#666;">Scan to view drawing</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[340px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            QR Code — {drawingNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <div className="relative w-64 h-64 rounded-lg bg-muted flex items-center justify-center">
            {isLoading && !hasError && (
              <Skeleton className="absolute inset-0 rounded-lg" />
            )}
            {!hasError ? (
              <img
                src={qrUrl}
                alt={`QR code for drawing ${drawingNumber}`}
                className="w-64 h-64 rounded-lg"
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setHasError(true);
                }}
              />
            ) : (
              <div className="text-center text-muted-foreground text-sm p-4">
                <QrCode className="h-8 w-8 mx-auto mb-2 opacity-40" />
                Failed to generate QR code
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Scan to open the drawing viewer
          </p>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={hasError}>
              <Download className="h-4 w-4 mr-1.5" />
              Download PNG
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} disabled={hasError}>
              <Printer className="h-4 w-4 mr-1.5" />
              Print
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
