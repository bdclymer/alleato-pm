"use client";

import * as React from "react";
import { CheckCircle2, AlertCircle, Copy, ExternalLink, Loader2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";

interface LinkStatus {
  linked: boolean;
  mapping: {
    platform_user_id: string;
    display_name: string | null;
    created_at: string;
  } | null;
}

interface GeneratedCode {
  code: string;
  deepLink: string;
  expiresAt: string;
}

export function TelegramLinkPanel() {
  const [status, setStatus] = React.useState<LinkStatus | null>(null);
  const [generated, setGenerated] = React.useState<GeneratedCode | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [generating, setGenerating] = React.useState(false);
  const [unlinking, setUnlinking] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const pollRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = React.useCallback(async () => {
    try {
      const data = await apiFetch<LinkStatus>("/api/settings/telegram/link");
      setStatus(data);
      if (data.linked && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
        setGenerated(null);
      }
    } catch {
      // silent — just keep showing whatever state we have
    }
  }, []);

  React.useEffect(() => {
    fetchStatus().finally(() => setLoading(false));
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchStatus]);

  const startPolling = React.useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(fetchStatus, 3000);
  }, [fetchStatus]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const data = await apiFetch<GeneratedCode>("/api/settings/telegram/link", { method: "POST" });
      setGenerated(data);
      startPolling();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate link code.");
    } finally {
      setGenerating(false);
    }
  };

  const handleUnlink = async () => {
    setUnlinking(true);
    setError(null);
    try {
      await apiFetch("/api/settings/telegram/unlink", { method: "DELETE" });
      setStatus({ linked: false, mapping: null });
      setGenerated(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unlink account.");
    } finally {
      setUnlinking(false);
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const expiresIn = React.useMemo(() => {
    if (!generated) return null;
    const ms = new Date(generated.expiresAt).getTime() - Date.now();
    if (ms <= 0) return "Expired";
    const mins = Math.ceil(ms / 60000);
    return `Expires in ${mins} min`;
  }, [generated]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 px-5 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Checking Telegram status…</span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-4 py-4 px-5">
      {/* Logo */}
      <div className="h-10 w-10 shrink-0 rounded-md flex items-center justify-center" style={{ backgroundColor: "var(--integration-telegram)" }}>
        <span className="text-xs font-bold" style={{ color: "white" }}>TG</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">Telegram</div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
          Ask the AI assistant from your phone — no need to open the app.
        </p>

        {/* Status */}
        <div className="mt-1.5">
          {status?.linked ? (
            <div className="flex items-center gap-1.5 text-xs text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>
                Connected
                {status.mapping?.display_name ? ` as @${status.mapping.display_name}` : ""}
                {status.mapping?.created_at
                  ? ` · linked ${new Date(status.mapping.created_at).toLocaleDateString()}`
                  : ""}
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Not connected</span>
          )}
        </div>

        {/* Linking flow */}
        {!status?.linked && generated && (
          <div className="mt-3 space-y-2.5">
            <p className="text-xs text-muted-foreground">
              Tap the button to open Telegram — it will send your code automatically. Or copy the code and send{" "}
              <code className="font-mono bg-muted px-1 rounded">/start {generated.code}</code> to the bot manually.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                className="text-xs h-7 gap-1.5"
                onClick={() => window.open(generated.deepLink, "_blank")}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open in Telegram
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 gap-1.5"
                onClick={() => handleCopy(generated.code)}
              >
                <Copy className="h-3.5 w-3.5" />
                {copied ? "Copied!" : `Copy code · ${generated.code}`}
              </Button>
            </div>
            {expiresIn && (
              <p className="text-xs text-muted-foreground">{expiresIn} · Waiting for you to send the code…</p>
            )}
          </div>
        )}

        {error && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="shrink-0 flex items-center gap-2">
        {status?.linked ? (
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7 gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
            onClick={handleUnlink}
            disabled={unlinking}
          >
            {unlinking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" />}
            Unlink
          </Button>
        ) : (
          <Button
            size="sm"
            className="text-xs h-7"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
            {generated ? "Regenerate" : "Connect"}
          </Button>
        )}
      </div>
    </div>
  );
}
