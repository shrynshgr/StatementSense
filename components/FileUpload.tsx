import React, { useRef, useState } from 'react';
import { Upload, FileText } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isDisabled?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isDisabled }) => {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndPassFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndPassFile(e.target.files[0]);
    }
  };

  const validateAndPassFile = (file: File) => {
    // 1. Check File Type
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      alert("Please upload an image file (PNG, JPG, JPEG) or a PDF document.");
      return;
    }

    // 2. Check File Size (10MB limit)
    const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE_BYTES) {
      alert("File is too large. Please upload a file smaller than 10MB.");
      return;
    }

    onFileSelect(file);
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  return (
    <div
      className={`relative w-full p-8 rounded-xl border-2 border-dashed transition-all duration-300 ease-in-out ${
        dragActive
          ? "border-blue-500 bg-blue-50"
          : "border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50"
      } ${isDisabled ? "opacity-50 cursor-not-allowed pointer-events-none" : "cursor-pointer"}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={onButtonClick}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleChange}
        accept="image/*,application/pdf"
        disabled={isDisabled}
      />

      <div className="flex flex-col items-center justify-center space-y-4 text-center">
        <div className={`p-4 rounded-full ${dragActive ? 'bg-blue-100' : 'bg-slate-100'}`}>
          <Upload className={`w-8 h-8 ${dragActive ? 'text-blue-600' : 'text-slate-500'}`} />
        </div>
        
        <div className="space-y-1">
          <p className="text-lg font-medium text-slate-900">
            Click or drag & drop to upload
          </p>
          <p className="text-sm text-slate-500">
            Supports Images (JPG, PNG) and PDF Statements
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
          <FileText size={14} />
          <span>Max file size: 10MB</span>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;