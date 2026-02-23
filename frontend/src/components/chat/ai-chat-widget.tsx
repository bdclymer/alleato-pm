"use client";

import { useState } from "react";
import { MessageSquare, X, Minimize2 } from "lucide-react";
import { SimpleRagChat } from "@/components/chat/simple-rag-chat";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

  const minimizeWidget = () => {
    setIsMinimized(true);
  };

  const closeWidget = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  return (
    <>
      {/* Chat Widget Button - Intercom style */}
      {!isOpen && (
        <button
          onClick={toggleWidget}
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out transform hover:scale-105"
          aria-label="Open chat"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}

      {/* Chat Widget Panel */}
      {isOpen && (
        <div
          className={`fixed z-50 bg-background rounded-lg shadow-2xl transition-all duration-300 ease-in-out ${
            isMinimized
              ? "bottom-6 right-6 w-80 h-16"
              : "bottom-6 right-6 w-[420px] h-[660px]"
          }`}
          style={{
            maxHeight: isMinimized ? "64px" : "calc(100vh - 80px)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="font-semibold">Alleato AI Assistant</span>
            </div>
            <div className="flex items-center gap-2">
              {!isMinimized && (
                <button
                  onClick={minimizeWidget}
                  className="p-1 hover:bg-background/20 rounded transition-colors"
                  aria-label="Minimize chat"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={closeWidget}
                className="p-1 hover:bg-background/20 rounded transition-colors"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Content */}
          {!isMinimized && (
            <div className="flex flex-col h-[calc(100%-56px)] overflow-hidden">
              <Alert className="m-3 mb-0">
                <AlertDescription className="text-xs">
                  This chat uses live backend responses. If the backend is down,
                  you will see an explicit error.
                </AlertDescription>
              </Alert>
              <div className="flex-1 overflow-hidden rounded-lg m-3 mt-2 border">
                <SimpleRagChat />
              </div>
            </div>
          )}

          {/* Minimized Click Area */}
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
