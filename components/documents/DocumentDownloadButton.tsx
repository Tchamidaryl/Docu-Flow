"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface DownloadButtonProps {
    documentId: string;
    documentTitle: string;
    documentStatus?: string;
    className?: string;
}

export default function DocumentDownloadButton({
    documentId,
    documentTitle,
    documentStatus = "DRAFT",
    className,
}: DownloadButtonProps) {
    const [loading, setLoading] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    // Only show if document is approved or rejected
    const isDownloadable = ["APPROVED", "REJECTED"].includes(documentStatus);

    const handleDownload = async (
        format: "pdf" | "docx" | "csv" | "original",
    ) => {
        try {
            setLoading(true);
            const response = await fetch(
                `/api/v1/documents/${documentId}/download?format=${format}`,
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Download failed");
            }

            // Get filename from content-disposition header
            const contentDisposition = response.headers.get(
                "content-disposition",
            );
            let filename = `${documentTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.${format}`;

            if (contentDisposition) {
                const filenameMatch =
                    contentDisposition.match(/filename="?([^"]+)"?/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }

            // Create blob and download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            setShowMenu(false);
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : "Download failed";
            alert(`Error: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    if (!isDownloadable) {
        return null;
    }

    return (
        <div className={cn("relative", className)}>
            <button
                onClick={() => setShowMenu(!showMenu)}
                disabled={loading}
                className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <Download className="w-4 h-4" />
                )}
                Download
            </button>

            {showMenu && !loading && (
                <div className="absolute top-full right-0 mt-2 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50 min-w-48">
                    <button
                        onClick={() => handleDownload("original")}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors border-b border-border/50"
                    >
                        📄 Original Document
                    </button>
                    <button
                        onClick={() => handleDownload("pdf")}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors border-b border-border/50"
                    >
                        {documentStatus === "APPROVED"
                            ? "✓ Signed PDF"
                            : "✕ PDF with Rejection"}
                    </button>
                    <button
                        onClick={() => handleDownload("docx")}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors border-b border-border/50"
                    >
                        📝 Word Document (Signatures)
                    </button>
                    <button
                        onClick={() => handleDownload("csv")}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                    >
                        📊 Approval Report (CSV)
                    </button>
                </div>
            )}
        </div>
    );
}
