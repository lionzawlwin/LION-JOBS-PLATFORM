'use client';

import { useCallback, useRef, useState } from 'react';
import { Upload, X, FileText, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CVUploadProps {
  onChange: (base64: string, fileName: string) => void;
  onClear: () => void;
  fileName?: string;
  error?: string;
}

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
]);

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function CVUpload({ onChange, onClear, fileName, error }: CVUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setLocalError(null);
      if (!ALLOWED_TYPES.has(file.type)) {
        setLocalError('Only PDF, Word (.doc/.docx), or image files (JPG, PNG) are accepted.');
        return;
      }
      if (file.size > MAX_BYTES) {
        setLocalError('File must be under 5 MB.');
        return;
      }
      try {
        const base64 = await fileToBase64(file);
        onChange(base64, file.name);
      } catch {
        setLocalError('Could not read the file. Please try again.');
      }
    },
    [onChange],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const displayError = localError ?? error;

  if (fileName) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-bg-subtle px-4 py-3">
        <FileText size={20} className="shrink-0 text-brand-600" />
        <span className="flex-1 truncate text-sm font-medium text-foreground">{fileName}</span>
        <button
          type="button"
          onClick={() => { setLocalError(null); onClear(); }}
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Remove file"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        onChange={handleInputChange}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors',
          dragging
            ? 'border-brand-500 bg-brand-50 dark:bg-brand-600/10'
            : 'border-border hover:border-brand-400 hover:bg-bg-subtle',
          displayError && 'border-danger/50',
        )}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-600/15">
          <Upload size={20} />
        </span>
        <span className="text-sm text-muted-foreground">
          <span className="font-medium text-brand-600">Click to upload</span> or drag &amp; drop
          <br />
          <span className="text-xs">PDF, Word, or Photo · max 5 MB</span>
        </span>
      </button>

      {displayError && (
        <p className="flex items-center gap-1.5 text-xs text-danger">
          <AlertCircle size={12} /> {displayError}
        </p>
      )}
    </div>
  );
}
