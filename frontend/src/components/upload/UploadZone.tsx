import React, { useCallback, useState, useRef } from "react";
import { Upload, Music } from "lucide-react";

const ACCEPTED_FORMATS = ".wav,.mp3,.flac,.aiff,.aif,.m4a,.aac,.ogg";

interface Props {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export const UploadZone: React.FC<Props> = ({ onFileSelected, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) onFileSelected(file);
    },
    [onFileSelected, disabled],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragging(true);
    },
    [disabled],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelected(file);
    },
    [onFileSelected],
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragging(false)}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`
        border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
        transition-all duration-200
        ${isDragging ? "border-accent bg-accent/10" : "border-border hover:border-border-light"}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_FORMATS}
        onChange={handleChange}
        className="hidden"
      />
      <div className="flex flex-col items-center gap-3">
        {isDragging ? (
          <Music className="w-10 h-10 text-accent" />
        ) : (
          <Upload className="w-10 h-10 text-text-muted" />
        )}
        <div>
          <p className="text-sm text-text-primary font-medium">
            Drop audio file here
          </p>
          <p className="text-xs text-text-muted mt-1">
            WAV, MP3, FLAC, AIFF, M4A, AAC, OGG
          </p>
        </div>
      </div>
    </div>
  );
};
