'use client';

import { useRef, useState } from 'react';

interface FileDropzoneProps {
  label: string;
  accept?: string;
  helperText?: string;
  file: File | null;
  onChange: (file: File | null) => void;
}

export default function FileDropzone({ label, accept = '*', helperText, file, onChange }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const pickFile = () => inputRef.current?.click();

  const onFiles = (files: FileList | null) => {
    if (files && files[0]) onChange(files[0]);
  };

  return (
    <div>
      <label className="block mb-1 text-gray-700 dark:text-gray-300">{label}</label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onFiles(e.dataTransfer.files);
        }}
        className={`rounded-lg border-2 border-dashed p-5 text-center transition-colors ${
          dragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
        }`}
      >
        <p className="text-sm text-gray-700 dark:text-gray-200">
          Drag and drop a file here, or{' '}
          <button type="button" onClick={pickFile} className="text-blue-600 hover:underline dark:text-blue-400">
            browse
          </button>
        </p>
        {helperText && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{helperText}</p>}
        {file && <p className="mt-2 text-sm text-green-600 dark:text-green-400">Selected: {file.name}</p>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
    </div>
  );
}
