"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { Paperclip, Smile, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ComposerProps {
  onSend: (content: string) => void;
  channelName: string;
  disabled?: boolean;
}

export function Composer({ onSend, channelName, disabled }: ComposerProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message);
      setMessage("");
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = "auto";
    const newHeight = Math.min(textarea.scrollHeight, 150); // Max 6 lines
    textarea.style.height = `${newHeight}px`;
  };

  return (
    <div className="border-t border-[hsl(var(--chat-border))] bg-[hsl(var(--chat-panel))] px-4 py-4">
      <div className="flex items-end gap-2">
        {/* Attachment Button */}
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 text-[hsl(var(--chat-muted))] hover:text-[hsl(var(--chat-text))] hover:bg-[hsl(var(--chat-hover))]"
          disabled={disabled}
          title="Attach file"
        >
          <Paperclip className="h-5 w-5" />
        </Button>

        {/* Message Input */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={`Message #${channelName}`}
            disabled={disabled}
            className="min-h-[40px] max-h-[150px] resize-none bg-[hsl(var(--chat-bg))] border-[hsl(var(--chat-border))] text-[hsl(var(--chat-text))] placeholder:text-[hsl(var(--chat-muted))] pr-10"
            rows={1}
          />

          {/* Emoji Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 bottom-1 h-8 w-8 text-[hsl(var(--chat-muted))] hover:text-[hsl(var(--chat-text))] hover:bg-[hsl(var(--chat-hover))]"
            disabled={disabled}
            title="Add emoji"
          >
            <Smile className="h-4 w-4" />
          </Button>
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={!message.trim() || disabled}
          className="shrink-0 bg-[hsl(var(--chat-accent))] text-white hover:bg-[hsl(var(--chat-accent))]/90"
          size="icon"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Helper Text */}
      <div className="mt-2 text-xs text-[hsl(var(--chat-muted))]">
        <span className="hidden sm:inline">
          <kbd className="px-1.5 py-0.5 bg-[hsl(var(--chat-bg))] border border-[hsl(var(--chat-border))] rounded text-xs">
            Enter
          </kbd>{" "}
          to send,{" "}
          <kbd className="px-1.5 py-0.5 bg-[hsl(var(--chat-bg))] border border-[hsl(var(--chat-border))] rounded text-xs">
            Shift + Enter
          </kbd>{" "}
          for new line
        </span>
      </div>
    </div>
  );
}
