
import React, { useRef, useState } from 'react';
import { Upload, FileText, AlertTriangle, Zap } from 'lucide-react';

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
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      alert("Please upload an image file (PNG, JPG, JPEG) or a PDF document.");
      return;
    }

    // Increased to 10MB as we now have client-side compression
    const MAX_SIZE_BYTES = 10 * 1024 * 1024; 
    if (file.size > MAX_SIZE_BYTES) {
      alert("File exceeds 10MB. Please upload a smaller segment of your statement.");
      return;
    }

    onFileSelect(file);
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <div
        className={`relative w-full p-10 rounded-2xl border-2 border-dashed transition-all duration-300 ease-in-out ${
          dragActive
            ? "border-blue-500 bg-blue-50 scale-[1.01]"
            : "border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50"
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
          <div className={`p-5 rounded-2xl ${dragActive ? 'bg-blue-100' : 'bg-slate-100 shadow-inner'}`}>
            <Upload className={`w-10 h-10 ${dragActive ? 'text-blue-600' : 'text-slate-500'}`} />
          </div>
          
          <div className="space-y-1">
            <p className="text-xl font-bold text-slate-900">
              Upload your statement
            </p>
            <p className="text-sm text-slate-500 font-medium">
              Images or PDFs up to 10MB
            </p>
          </div>

          <div className="flex items-center space-x-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 uppercase tracking-wider">
            <Zap size={12} />
            <span>Auto-Optimization Enabled</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-start space-x-3 p-4 bg-slate-900 rounded-xl border border-slate-800 shadow-lg">
        <div className="bg-blue-500/20 p-1.5 rounded-lg shrink-0">
          <FileText className="text-blue-400" size={16} />
        </div>
        <div className="space-y-1">
          <p className="text-[11px] text-slate-200 leading-relaxed font-semibold">
            Large File Support Active
          </p>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            High-resolution files are automatically compressed locally to ensure the AI analyzes every transaction without connection timeouts.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
