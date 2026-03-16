import React from "react";

interface Props {
  progress: number;
  label?: string;
  className?: string;
}

export const ProgressBar: React.FC<Props> = ({
  progress,
  label,
  className = "",
}) => (
  <div className={`w-full ${className}`}>
    {label && (
      <div className="flex justify-between mb-1 text-xs text-text-secondary">
        <span>{label}</span>
        <span>{Math.round(progress)}%</span>
      </div>
    )}
    <div className="w-full h-2 bg-bg-surface rounded-full overflow-hidden">
      <div
        className="h-full bg-accent rounded-full transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  </div>
);
