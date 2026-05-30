'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, File, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface FileInfo {
  file: File;
  preview?: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

interface DocumentUploaderProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  maxSize?: number;
  accept?: Record<string, string[]>;
  disabled?: boolean;
}

const DEFAULT_ACCEPT = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    '.docx',
  ],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
    '.xlsx',
  ],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
};

export function DocumentUploader({
  onFilesSelected,
  maxFiles = 5,
  maxSize = 26214400, // 25MB
  accept = DEFAULT_ACCEPT,
  disabled = false,
}: DocumentUploaderProps) {
  const [files, setFiles] = useState<FileInfo[]>([]);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      if (disabled) return;

      const newFiles: FileInfo[] = acceptedFiles
        .slice(0, maxFiles - files.length)
        .map((file) => ({
          file,
          status: 'pending' as const,
        }));

      setFiles((prev) => [...prev, ...newFiles]);
      onFilesSelected(
        newFiles.map((f) => f.file)
      );

      // Handle rejected files
      if (rejectedFiles.length > 0) {
        const errorReasons = rejectedFiles
          .map((f) => {
            if (f.errors[0]?.code === 'file-too-large') {
              return `${f.file.name} is too large`;
            }
            if (f.errors[0]?.code === 'file-invalid-type') {
              return `${f.file.name} has invalid type`;
            }
            return `${f.file.name} rejected`;
          })
          .join(', ');

        console.warn('Rejected files:', errorReasons);
      }
    },
    [files.length, maxFiles, onFilesSelected, disabled]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    disabled,
    multiple: true,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file: File) => {
    const type = file.type;
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (
      type.includes('spreadsheet') ||
      type.includes('excel') ||
      type.includes('sheet')
    )
      return '📊';
    if (type.includes('image')) return '🖼️';
    return '📎';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          'relative rounded-2xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer',
          isDragActive
            ? 'border-primary bg-primary/5'
            : disabled
            ? 'border-muted bg-muted/30 cursor-not-allowed'
            : 'border-border bg-muted/20 hover:border-primary/50'
        )}
      >
        <input {...getInputProps()} />

        {isDragActive ? (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-10 h-10 text-primary animate-bounce" />
            <p className="text-sm font-semibold text-primary">
              Drop your documents here
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-10 h-10 text-muted-foreground/50" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                Drag & drop your documents
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                or click to browse (Max {maxFiles} files, {formatFileSize(maxSize)} each)
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Supported: PDF, Word, Excel, Images
            </p>
          </div>
        )}
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            {files.length} file{files.length !== 1 ? 's' : ''} selected
          </p>
          <div className="space-y-2">
            {files.map((fileInfo, index) => (
              <div
                key={index}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border',
                  fileInfo.status === 'error'
                    ? 'border-destructive bg-destructive/5'
                    : 'border-border bg-muted/30'
                )}
              >
                <span className="text-lg shrink-0">
                  {getFileIcon(fileInfo.file)}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-foreground">
                    {fileInfo.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(fileInfo.file.size)}
                  </p>
                  {fileInfo.error && (
                    <p className="text-xs text-destructive mt-1">
                      {fileInfo.error}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {fileInfo.status === 'success' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )}
                  {fileInfo.status === 'error' && (
                    <AlertCircle className="w-4 h-4 text-destructive" />
                  )}
                  <button
                    onClick={() => removeFile(index)}
                    className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
