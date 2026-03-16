import React, { useState, useCallback } from "react";
import { Link, Loader2 } from "lucide-react";
import { Button } from "../common/Button.tsx";

interface Props {
  onUrlSubmit: (url: string) => void;
  disabled?: boolean;
}

export const UrlInput: React.FC<Props> = ({ onUrlSubmit, disabled }) => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!url.trim() || disabled) return;
    setLoading(true);
    try {
      await onUrlSubmit(url.trim());
    } finally {
      setLoading(false);
    }
  }, [url, disabled, onUrlSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleSubmit();
    },
    [handleSubmit],
  );

  return (
    <div className="flex gap-2 min-w-0">
      <div className="flex-1 min-w-0 flex items-center gap-2 bg-bg-surface rounded-lg px-3 border border-border">
        <Link className="w-4 h-4 text-text-muted shrink-0" />
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Paste audio URL..."
          disabled={disabled || loading}
          className="flex-1 min-w-0 bg-transparent text-sm py-2 outline-none
            text-text-primary placeholder:text-text-muted"
        />
      </div>
      <Button
        onClick={handleSubmit}
        disabled={!url.trim() || disabled || loading}
        size="md"
        className="shrink-0"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Fetch"}
      </Button>
    </div>
  );
};
