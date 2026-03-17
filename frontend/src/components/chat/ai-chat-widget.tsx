"use client";

import { useState } from "react";
import { MessageSquare, X, Shrink } from "lucide-react";
import { SimpleRagChat } from "@/components/chat/simple-rag-chat";

export function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const toggleWidget = () => {
    if (isOpen && !isMinimized) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
      setIsMinimized(false);
    }
  };

  const minimizeWidget = () => setIsMinimized(true);
  const closeWidget = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  return (
    <>
      {/* Launcher button */}
      {!isOpen && (
        <button
          onClick={toggleWidget}
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-sm transition-all duration-200 hover:scale-105"
          aria-label="Open chat"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div
          className={`fixed z-50 bg-background rounded-2xl shadow-sm transition-all duration-300 ease-in-out overflow-hidden ${
            isMinimized
              ? "bottom-6 right-6 w-80 h-14"
              : "bottom-6 right-6 w-[420px] h-[660px]"
          }`}
          style={{ maxHeight: isMinimized ? "56px" : "calc(100vh - 80px)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-primary text-primary-foreground shrink-0">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-400" />
              <span className="font-semibold text-sm">Alleato AI Assistant</span>
            </div>
            <div className="flex items-center gap-1">
              {!isMinimized && (
                <button
                  onClick={minimizeWidget}
                  className="p-1.5 hover:bg-white/15 rounded-lg transition-colors"
                  aria-label="Minimize"
                >
                  <Shrink className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={closeWidget}
                className="p-1.5 hover:bg-white/15 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat content — no borders, no Alert card */}
          {!isMinimized && (
            <div className="flex flex-col h-[calc(100%-52px)] overflow-hidden">
              <SimpleRagChat />
            </div>
          )}

          {isMinimized && (
            <button
              onClick={() => setIsMinimized(false)}
              className="absolute inset-0 w-full h-full cursor-pointer"
              aria-label="Expand chat"
            />
          )}
        </div>
      )}
    </>
  );
}
