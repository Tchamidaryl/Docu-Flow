"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FileText, Upload, ArrowLeft, Save, Send, Loader2,
  Tag, X, Calendar, Lock, ChevronDown, AlertCircle,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import FileUploadZone from "@/components/editor/FileUploadZone";
import { cn } from "@/lib/utils/cn";

const DocumentEditor = dynamic(() => import("@/components/editor/DocumentEditor"), {
  ssr: false,
  loading: () => <div className="h-[500px] skeleton rounded-xl" />,
});

const schema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").max(200),
  description: z.string().optional(),
  templateId: z.string().optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  dueDate: z.string().optional(),
  isConfidential: z.boolean().default(false),
});

type FormData = z.infer<typeof schema>;

type Mode = "editor" | "upload";

export default function NewDocumentPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("editor");
  const [editorContent, setEditorContent] = useState({ html: "", json: null as any });
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [templates, setTemplates] = useState<any[]>([]);
  const [createdDocId, setCreatedDocId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { priority: "NORMAL", isConfidential: false } });

  useEffect(() => {
    fetch("/api/v1/templates")
      .then((r) => r.json())
      .then((d) => setTemplates(d.data ?? []));
  }, []);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  async function saveDocument(data: FormData, andSubmit = false) {
    if (mode === "editor" && !editorContent.html.replace(/<[^>]+>/g, "").trim()) {
      setError("Document content cannot be empty");
      return null;
    }

    setError(null);
    const payload = {
      title: data.title,
      description: data.description,
      content: mode === "editor" ? editorContent.html : undefined,
      contentJson: mode === "editor" ? editorContent.json : undefined,
      contentType: mode === "editor" ? "RICH_TEXT" : "UPLOADED_OTHER",
      templateId: data.templateId || undefined,
      tags,
      priority: data.priority,
      dueDate: data.dueDate || undefined,
      isConfidential: data.isConfidential,
    };

    const method = createdDocId ? "PATCH" : "POST";
    const url = createdDocId ? `/api/v1/documents/${createdDocId}` : "/api/v1/documents";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    if (!res.ok) {
      setError(result.error ?? "Failed to save document");
      return null;
    }

    const docId = result.data?.id ?? createdDocId;
    setCreatedDocId(docId);
    return docId;
  }

  const onSave = handleSubmit(async (data) => {
    setIsSaving(true);
    await saveDocument(data);
    setIsSaving(false);
  });

  const onSubmit = handleSubmit(async (data) => {
    setIsSubmitting(true);
    const docId = await saveDocument(data);
    if (docId) {
      const res = await fetch(`/api/v1/documents/${docId}/submit`, { method: "POST" });
      if (res.ok) {
        router.push(`/documents/${docId}`);
      } else {
        const d = await res.json();
        setError(d.error ?? "Failed to submit document");
      }
    }
    setIsSubmitting(false);
  });

  const templateId = watch("templateId");

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      {/* Top bar */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/documents" className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h2 className="text-2xl font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>New Document</h2>
          <p className="text-sm text-muted-foreground">Create and submit a document for approval</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-2 border border-border bg-card text-foreground text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-muted transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Draft
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting || !templateId}
            className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Submit for Approval
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 mb-6 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Title */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div>
              <label className="text-sm font-semibold text-foreground mb-2 block">
                Document Title <span className="text-destructive">*</span>
              </label>
              <input
                placeholder="Give your document a clear, descriptive title…"
                className={cn(
                  "w-full px-4 py-3 rounded-xl border bg-background text-foreground text-lg font-medium",
                  "placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all",
                  errors.title ? "border-destructive" : "border-input"
                )}
                {...register("title")}
              />
              {errors.title && <p className="text-xs text-destructive mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground mb-2 block">Description</label>
              <textarea
                rows={2}
                placeholder="Brief summary of what this document is about…"
                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
                {...register("description")}
              />
            </div>
          </div>

          {/* Content type toggle */}
          <div className="flex items-center gap-2 bg-muted/50 rounded-xl p-1 border border-border w-fit">
            <button
              type="button"
              onClick={() => setMode("editor")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                mode === "editor" ? "bg-card text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <FileText className="w-4 h-4" />
              Write in Editor
            </button>
            <button
              type="button"
              onClick={() => setMode("upload")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                mode === "upload" ? "bg-card text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Upload className="w-4 h-4" />
              Upload File
            </button>
          </div>

          {/* Content area */}
          {mode === "editor" ? (
            <DocumentEditor
              onChange={(html, json) => setEditorContent({ html, json })}
              placeholder="Start writing your document content here…"
            />
          ) : (
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="text-sm font-semibold mb-4">Upload Document File</h3>
              {createdDocId ? (
                <FileUploadZone
                  documentId={createdDocId}
                  onUploadComplete={(file) => console.log("File uploaded:", file)}
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    Save the document first, then you can upload files.
                  </p>
                  <button
                    type="button"
                    onClick={onSave}
                    className="mt-3 text-sm text-primary hover:underline"
                  >
                    Save Draft
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Workflow template */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <label className="text-sm font-semibold text-foreground mb-3 block">
              Approval Workflow <span className="text-destructive">*</span>
            </label>
            <Controller
              name="templateId"
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  className="w-full text-sm bg-background border border-input rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-foreground"
                >
                  <option value="">Select a workflow template…</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}
            />
            {!templateId && (
              <p className="text-xs text-muted-foreground mt-2">
                A workflow template is required before submission.
              </p>
            )}
            {templateId && templates.find((t) => t.id === templateId)?.steps && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Approval Steps</p>
                {templates.find((t) => t.id === templateId)?.steps.map((step: any, i: number) => (
                  <div key={step.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">
                      {i + 1}
                    </div>
                    <span>{step.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Priority */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <label className="text-sm font-semibold text-foreground mb-3 block">Priority</label>
            <Controller
              name="priority"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-2">
                  {(["LOW", "NORMAL", "HIGH", "URGENT"] as const).map((p) => {
                    const colors = {
                      LOW: "border-slate-200 text-slate-600 data-[active=true]:bg-slate-100 data-[active=true]:border-slate-400",
                      NORMAL: "border-blue-200 text-blue-600 data-[active=true]:bg-blue-100 data-[active=true]:border-blue-400",
                      HIGH: "border-orange-200 text-orange-600 data-[active=true]:bg-orange-100 data-[active=true]:border-orange-400",
                      URGENT: "border-red-200 text-red-600 data-[active=true]:bg-red-100 data-[active=true]:border-red-400",
                    };
                    return (
                      <button
                        key={p}
                        type="button"
                        data-active={field.value === p}
                        onClick={() => field.onChange(p)}
                        className={cn(
                          "text-xs font-medium py-2 rounded-lg border transition-all",
                          colors[p]
                        )}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              )}
            />
          </div>

          {/* Tags */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <label className="text-sm font-semibold text-foreground mb-3 block">Tags</label>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                placeholder="Add tag, press Enter"
                className="flex-1 text-xs px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button type="button" onClick={addTag} className="text-xs bg-muted px-2.5 py-2 rounded-lg hover:bg-muted/80 transition-colors">
                Add
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                    {tag}
                    <button type="button" onClick={() => setTags(tags.filter((t) => t !== tag))}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Due date */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <label className="text-sm font-semibold text-foreground mb-3 block">Due Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="date"
                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                {...register("dueDate")}
              />
            </div>
          </div>

          {/* Confidential */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <Controller
              name="isConfidential"
              control={control}
              render={({ field }) => (
                <button
                  type="button"
                  onClick={() => field.onChange(!field.value)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-xl transition-all",
                    field.value && "text-amber-600"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    field.value ? "bg-amber-100 dark:bg-amber-900/30" : "bg-muted"
                  )}>
                    <Lock className={cn("w-4 h-4", field.value ? "text-amber-600" : "text-muted-foreground")} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-foreground">Confidential</p>
                    <p className="text-xs text-muted-foreground">Restrict visibility to approvers only</p>
                  </div>
                  <div className={cn(
                    "w-10 h-5 rounded-full transition-colors relative",
                    field.value ? "bg-amber-400" : "bg-muted-foreground/30"
                  )}>
                    <div className={cn(
                      "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
                      field.value ? "left-5" : "left-0.5"
                    )} />
                  </div>
                </button>
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
