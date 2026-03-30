"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { AtSign, Link2, Paperclip, Send, Smile, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ComposerProps {
  onSend: (content: string) => void;
  channelName: string;
  disabled?: boolean;
  placeholder?: string;
  submitLabel?: string;
}

export function Composer({
  onSend,
  channelName,
  disabled,
  placeholder,
  submitLabel = "Send",
}: ComposerProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!message.trim() || disabled) {
      return;
    }

    onSend(message.trim());
    setMessage("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(event.target.value);
    const textarea = event.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 176)}px`;
  };

  return (
    <div className="border-t border-border bg-background px-3 py-3">
      <div className="rounded-md border border-border bg-muted/20 p-2">
        <div className="mb-2 flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            disabled={disabled}
            title="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            disabled={disabled}
            title="Mentions"
          >
            <AtSign className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            disabled={disabled}
            title="Emoji"
          >
            <Smile className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            disabled={disabled}
            title="Insert link"
          >
            <Link2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            disabled={disabled}
            title="Meet now"
          >
            <Video className="h-4 w-4" />
          </Button>
        </div>

        <Textarea
          ref={textareaRef}
          value={message}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? `Post to ${channelName}`}
          disabled={disabled}
          className="min-h-20 max-h-44 resize-none border-0 bg-transparent px-1 py-1 text-sm shadow-none focus-visible:ring-0"
          rows={2}
        />

        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Enter to send · Shift + Enter for new line
          </p>

          <Button
            onClick={handleSend}
            disabled={!message.trim() || disabled}
            className={cn("h-8 gap-1.5 px-3", !message.trim() && "opacity-60")}
          >
            <Send className="h-3.5 w-3.5" />
            <span>{submitLabel}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
