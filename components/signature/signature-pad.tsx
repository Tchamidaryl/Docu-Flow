"use client";
import { useRef, useCallback } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Pen, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onClear?: () => void;
}

export function SignaturePad({ onSave, onClear }: SignaturePadProps) {
  const t = useTranslations("approval");
  const sigRef = useRef<SignatureCanvas>(null);

  const handleClear = useCallback(() => {
    sigRef.current?.clear();
    onClear?.();
  }, [onClear]);

  const handleSave = useCallback(() => {
    if (!sigRef.current || sigRef.current.isEmpty()) return;
    const dataUrl = sigRef.current.getTrimmedCanvas().toDataURL("image/png");
    onSave(dataUrl);
  }, [onSave]);

  return (
    <div className="space-y-3">
      <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl overflow-hidden bg-white dark:bg-slate-900 relative group">
        <div className="absolute top-2 left-3 text-xs text-slate-400 flex items-center gap-1.5 pointer-events-none">
          <Pen className="w-3 h-3" />
          {t("signHere")}
        </div>
        <SignatureCanvas
          ref={sigRef}
          canvasProps={{
            className: "w-full",
            width: 520,
            height: 160,
            style: { display: "block" },
          }}
          backgroundColor="transparent"
          penColor="#0f2d4a"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleClear}>
          <Trash2 className="w-3.5 h-3.5" />
          {t("clearSignature")}
        </Button>
        <Button type="button" size="sm" onClick={handleSave}>
          <Pen className="w-3.5 h-3.5" />
          Confirm Signature
        </Button>
      </div>
    </div>
  );
}
