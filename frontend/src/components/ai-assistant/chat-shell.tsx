"use client";

import { AnimatedOrb } from "@/components/ai-assistant/animated-orb";
import { AudioWaveform } from "@/components/ai-assistant/audio-waveform";
import { InfoAlert } from "@/components/ds/InfoAlert";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { apiFetchRaw } from "@/lib/api-client";
import { chatModels, type ChatModel, DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { cn } from "@/lib/utils";
import {
  BrainIcon,
  MessageSquareDashedIcon,
  MicIcon,
  MicOffIcon,
  PaperclipIcon,
  RefreshCwIcon,
  SquareIcon,
  UserIcon,
  XIcon,
} from "lucide-react";
import Image from "next/image";
import {
  type ChangeEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type AIModel = ChatModel["id"];
const AI_MODELS = chatModels;
const DEFAULT_AI_MODEL: AIModel = DEFAULT_CHAT_MODEL;

interface Message {
  content: string;
  createdAt: string;
  id: string;
  imageData?: string;
  role: "user" | "assistant";
}

interface SpeechRecognitionResultLike {
  0: {
    transcript: string;
  };
  isFinal: boolean;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const STORAGE_KEY = "mkh-chat-messages";
const MODEL_STORAGE_KEY = "mkh-chat-selected-model";
const CHAT_SHADOW =
  "rgba(14, 63, 126, 0.06) 0 0 0 1px, rgba(42, 51, 69, 0.06) 0 1px 1px -0.5px, rgba(42, 51, 70, 0.06) 0 3px 3px -1.5px, rgba(42, 51, 70, 0.06) 0 6px 6px -3px, rgba(14, 63, 126, 0.06) 0 12px 12px -6px, rgba(14, 63, 126, 0.06) 0 24px 24px -12px";

const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

const getSpeechRecognitionConstructor = () => {
  const speechWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
};

const MarkdownText = ({
  content,
  isStreaming,
}: {
  content: string;
  isStreaming?: boolean;
}) => {
  if (!content) {
    return (
      <span className="inline-block h-5 w-16 animate-pulse rounded bg-muted" />
    );
  }

  return (
    <div
      className={cn(
        "whitespace-pre-wrap break-words text-sm text-foreground leading-6",
        isStreaming && "chat-text-reveal"
      )}
    >
      {content}
    </div>
  );
};

const MessageBubble = ({
  message,
  isStreaming,
}: {
  message: Message;
  isStreaming?: boolean;
}) => {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex max-w-lg gap-2",
        isUser
          ? "chat-user-message-enter ml-auto flex-row-reverse"
          : "fade-in slide-in-from-bottom-2 mr-auto animate-in duration-300"
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-card" : "bg-primary/10"
        )}
        style={{ boxShadow: CHAT_SHADOW }}
      >
        {isUser ? (
          <UserIcon className="size-4 text-muted-foreground" />
        ) : (
          <AnimatedOrb size={32} />
        )}
      </div>
      <div
        className={cn("flex flex-col", isUser ? "items-end" : "items-start")}
      >
        <span className="mt-2 mb-1 hidden text-muted-foreground text-xs sm:block">
          {isUser ? "You" : "Assistant"}
        </span>
        <div
          className={cn(
            "overflow-hidden rounded-2xl border-none",
            isUser
              ? "rounded-br-md bg-card text-foreground"
              : "rounded-bl-md bg-transparent text-foreground"
          )}
          style={{ boxShadow: isUser ? CHAT_SHADOW : "none" }}
        >
          <div className={isUser ? "px-4 py-3" : "py-1"}>
            {isUser ? (
              <div className="flex flex-col gap-2">
                {message.imageData ? (
                  <div className="relative size-20 overflow-hidden rounded-lg border border-border">
                    <Image
                      alt="Uploaded"
                      className="object-cover"
                      fill
                      src={message.imageData}
                    />
                  </div>
                ) : null}
                <p className="whitespace-pre-wrap break-words text-sm">
                  {message.content}
                </p>
              </div>
            ) : (
              <MarkdownText
                content={message.content}
                isStreaming={isStreaming}
              />
            )}
          </div>
        </div>
        <span className="mt-1 text-muted-foreground text-xs">
          {formatTime(message.createdAt)}
        </span>
      </div>
    </div>
  );
};

const TypingIndicator = () => (
  <div className="fade-in slide-in-from-bottom-2 mr-auto flex max-w-lg animate-in gap-3 duration-300">
    <AnimatedOrb size={32} />
    <output
      aria-label="Assistant is typing"
      className="rounded-2xl rounded-bl-md bg-muted px-4 py-3"
      style={{ boxShadow: CHAT_SHADOW }}
    >
      <div className="flex items-center gap-1">
        <span className="size-2 animate-bounce rounded-full bg-muted-foreground" />
        <span
          className="size-2 animate-bounce rounded-full bg-muted-foreground"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="size-2 animate-bounce rounded-full bg-muted-foreground"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </output>
  </div>
);

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: This component owns the migrated chat page state and UI wiring from the source folder.
export const ChatShell = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedModel, setSelectedModel] = useState<AIModel>(DEFAULT_AI_MODEL);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseTextRef = useRef("");
  const finalTranscriptsRef = useRef("");

  const currentModel =
    AI_MODELS.find((model) => model.id === selectedModel) ?? AI_MODELS[0];
  const lastMessage = messages.at(-1);
  const showTypingIndicator =
    isStreaming &&
    (!lastMessage ||
      lastMessage.role === "user" ||
      (lastMessage.role === "assistant" && lastMessage.content === ""));

  useEffect(() => {
    setHasAnimated(true);

    try {
      const storedMessages = localStorage.getItem(STORAGE_KEY);
      if (storedMessages) {
        setMessages(JSON.parse(storedMessages) as Message[]);
      }

      const storedModel = localStorage.getItem(MODEL_STORAGE_KEY);
      if (AI_MODELS.some((model) => model.id === storedModel)) {
        setSelectedModel(storedModel as AIModel);
      }
    } catch (caughtError) {
      console.error("Failed to restore chat state", caughtError);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [isLoaded, messages]);

  useEffect(() => {
    const SpeechRecognitionAPI = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionAPI) {
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      let nextFinalText = "";

      for (
        let index = event.resultIndex;
        index < event.results.length;
        index += 1
      ) {
        const result = event.results[index];
        if (result.isFinal) {
          nextFinalText += `${result[0].transcript} `;
        }
      }

      if (nextFinalText) {
        finalTranscriptsRef.current += nextFinalText;
        setValue(baseTextRef.current + finalTranscriptsRef.current);
      }
    };
    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      setIsRecording(false);
    };
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, []);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  });

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, []);

  const setModel = useCallback((model: AIModel) => {
    setSelectedModel(model);
    localStorage.setItem(MODEL_STORAGE_KEY, model);
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
    for (const track of mediaStream?.getTracks() ?? []) {
      track.stop();
    }
    setMediaStream(null);
  }, [mediaStream]);

  const toggleRecording = useCallback(() => {
    if (!recognitionRef.current) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    if (isRecording) {
      stopRecording();
      return;
    }

    baseTextRef.current = value;
    finalTranscriptsRef.current = "";
    recognitionRef.current.start();
    setIsRecording(true);

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => setMediaStream(stream))
      .catch((caughtError) => {
        console.error("Microphone permission failed", caughtError);
      });
  }, [isRecording, stopRecording, value]);

  const sendMessage = useCallback(
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Streaming, cancellation, and optimistic message updates need to stay in one async flow.
    async (content: string, imageData?: string) => {
      if (!(content.trim() || imageData) || isStreaming) {
        return;
      }

      setError(null);

      const userMessage: Message = {
        id: generateId(),
        role: "user",
        content: content.trim() || "Describe this image",
        createdAt: new Date().toISOString(),
        imageData,
      };
      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
      };

      const requestMessages = [...messages, userMessage];
      setMessages([...requestMessages, assistantMessage]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await apiFetchRaw("/api/chat", {
          method: "POST",
          body: JSON.stringify({
            messages: requestMessages.map((message) => ({
              role: message.role,
              content: message.content,
              imageData: message.imageData,
            })),
            model: selectedModel,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(
            body?.error ?? `Request failed with ${response.status}`
          );
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("The chat response did not include a stream.");
        }

        const decoder = new TextDecoder();
        let contentSoFar = "";

        for (;;) {
          const { done, value: chunk } = await reader.read();
          if (done) {
            break;
          }

          contentSoFar += decoder.decode(chunk, { stream: true });
          setMessages((currentMessages) =>
            currentMessages.map((message) =>
              message.id === assistantMessage.id
                ? { ...message, content: contentSoFar }
                : message
            )
          );
        }
      } catch (caughtError) {
        if (caughtError instanceof Error && caughtError.name === "AbortError") {
          setMessages((currentMessages) =>
            currentMessages.map((message) =>
              message.id === assistantMessage.id
                ? { ...message, content: message.content || "[Cancelled]" }
                : message
            )
          );
        } else {
          const message =
            caughtError instanceof Error
              ? caughtError.message
              : "An unexpected error occurred.";
          setError(message);
          setMessages((currentMessages) =>
            currentMessages.filter(
              (chatMessage) => chatMessage.id !== assistantMessage.id
            )
          );
        }
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [isStreaming, messages, selectedModel]
  );

  const handleSend = useCallback(() => {
    if (!(value.trim() || uploadedImage) || isStreaming) {
      return;
    }

    if (isRecording) {
      stopRecording();
    }

    sendMessage(value, uploadedImage ?? undefined);
    setValue("");
    setUploadedImage(null);
    baseTextRef.current = "";
    finalTranscriptsRef.current = "";

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [
    isRecording,
    isStreaming,
    sendMessage,
    stopRecording,
    uploadedImage,
    value,
  ]);

  const handleRetry = useCallback(() => {
    const lastUserMessage = [...messages]
      .reverse()
      .find((message: Message) => message.role === "user");
    if (!lastUserMessage) {
      return;
    }

    const lastUserIndex = messages.findIndex(
      (message) => message.id === lastUserMessage.id
    );
    setMessages(messages.slice(0, lastUserIndex));
    setError(null);
    setTimeout(
      () => sendMessage(lastUserMessage.content, lastUserMessage.imageData),
      100
    );
  }, [messages, sendMessage]);

  const handleFileSelect = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file?.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (loadEvent) => {
          setUploadedImage(loadEvent.target?.result as string);
        };
        reader.readAsDataURL(file);
      }

      event.target.value = "";
    },
    []
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return (
    <main className="relative h-dvh overflow-hidden rounded-b-[32px] bg-background">
      <Button
        aria-label="Reset chat"
        className="absolute top-4 left-4 z-20 size-10 rounded-full bg-muted text-muted-foreground hover:bg-muted/80"
        onClick={clearChat}
        size="icon"
        type="button"
        variant="ghost"
      >
        <MessageSquareDashedIcon className="size-5" />
      </Button>

      <div
        aria-label="Chat messages"
        aria-live="polite"
        className="absolute inset-0 space-y-4 overflow-y-auto px-6 pt-16 pb-36"
        ref={listRef}
        role="log"
      >
        {isLoaded ? null : (
          <div className="flex h-full items-center justify-center">
            <AnimatedOrb size={64} />
          </div>
        )}

        {isLoaded && messages.length === 0 && !(error || isStreaming) ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
            <div className={cn("mb-4", hasAnimated && "chat-orb-intro")}>
              <AnimatedOrb size={128} />
            </div>
            <p
              className={cn(
                "font-medium text-muted-foreground text-lg",
                hasAnimated && "chat-text-blur-intro"
              )}
            >
              Hi, my name is Jarvis
            </p>
            <p
              className={cn(
                "mt-1 text-muted-foreground text-sm",
                hasAnimated && "chat-text-blur-intro-delay"
              )}
            >
              Send a message to begin chatting with the AI assistant
            </p>
          </div>
        ) : null}

        {messages
          .filter(
            (message) =>
              !(
                isStreaming &&
                message.role === "assistant" &&
                message === lastMessage &&
                message.content === ""
              )
          )
          .map((message) => (
            <MessageBubble
              isStreaming={
                isStreaming &&
                message.role === "assistant" &&
                message === lastMessage
              }
              key={message.id}
              message={message}
            />
          ))}

        {showTypingIndicator ? <TypingIndicator /> : null}

        {error ? (
          <InfoAlert variant="error">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-sm">Something went wrong</p>
                <p className="mt-0.5 text-xs">{error}</p>
              </div>
              <Button
                aria-label="Retry sending message"
                onClick={handleRetry}
                size="sm"
                type="button"
                variant="ghost"
              >
                <RefreshCwIcon className="size-4" />
                Retry
              </Button>
            </div>
          </InfoAlert>
        ) : null}
      </div>

      <div
        className={cn(
          "pointer-events-none fixed right-0 bottom-4 left-0 z-10 px-4",
          hasAnimated && "chat-composer-intro"
        )}
      >
        <div className="pointer-events-auto relative mx-auto max-w-2xl">
          <div
            className="relative flex flex-col gap-3 overflow-hidden rounded-3xl bg-card p-4"
            style={{ boxShadow: CHAT_SHADOW }}
          >
            <div className="flex items-center gap-2">
              {uploadedImage ? (
                <div className="chat-image-bounce relative size-12 shrink-0 overflow-hidden rounded-lg border border-border">
                  <Image
                    alt="Uploaded"
                    className="object-cover"
                    fill
                    src={uploadedImage}
                  />
                  <Button
                    aria-label="Remove image"
                    className="absolute top-1 right-1 size-5 rounded-full bg-foreground p-0 text-background hover:bg-foreground/90"
                    onClick={() => setUploadedImage(null)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <XIcon className="size-3" />
                  </Button>
                </div>
              ) : null}

              <Textarea
                aria-label="Message input"
                className="max-h-14 min-h-0 flex-1 resize-none overflow-y-auto rounded-none border-none bg-transparent px-2 py-1.5 text-sm text-foreground shadow-none placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:border-0"
                disabled={isStreaming}
                onChange={(event) => {
                  setValue(event.target.value);
                  resizeTextarea();
                }}
                onKeyDown={handleKeyDown}
                placeholder={
                  isRecording
                    ? "Listening..."
                    : "Type a message... (Shift+Enter for new line)"
                }
                ref={textareaRef}
                rows={1}
                value={value}
              />

              {isRecording ? (
                <div className="w-24 shrink-0">
                  <AudioWaveform
                    isRecording={isRecording}
                    stream={mediaStream}
                  />
                </div>
              ) : null}

              {isStreaming ? (
                <Button
                  aria-label="Stop generating"
                  className="relative size-9 shrink-0 rounded-full p-0 transition-all hover:scale-105"
                  onClick={stopStreaming}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <AnimatedOrb size={36} variant="red" />
                  <SquareIcon
                    className="absolute size-4 text-red-700 drop-shadow-sm"
                    fill="currentColor"
                  />
                </Button>
              ) : (
                <Button
                  aria-label="Send message"
                  className={cn(
                    "relative size-9 shrink-0 rounded-full p-0 transition-all",
                    value.trim() || uploadedImage
                      ? "hover:scale-105"
                      : "cursor-not-allowed opacity-50"
                  )}
                  disabled={!(value.trim() || uploadedImage)}
                  onClick={handleSend}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <AnimatedOrb size={36} />
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                accept="image/*"
                aria-label="Upload image"
                className="hidden"
                onChange={handleFileSelect}
                ref={fileInputRef}
                type="file"
              />
              <Button
                aria-label={
                  isRecording ? "Stop recording" : "Start voice input"
                }
                className={cn(
                  "size-9 rounded-full",
                  isRecording
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
                disabled={isStreaming}
                onClick={toggleRecording}
                size="icon"
                type="button"
              >
                {isRecording ? (
                  <MicOffIcon className="size-4" />
                ) : (
                  <MicIcon className="size-4" />
                )}
              </Button>
              <Button
                aria-label="Attach image"
                className="size-9 rounded-full bg-muted text-muted-foreground hover:bg-muted/80"
                disabled={isStreaming}
                onClick={() => fileInputRef.current?.click()}
                size="icon"
                type="button"
              >
                <PaperclipIcon className="size-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    aria-label="Select AI model"
                    className="size-9 rounded-full bg-muted text-muted-foreground hover:bg-muted/80"
                    disabled={isStreaming}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <BrainIcon className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuContent
                    align="start"
                    className="z-50 w-44 rounded-2xl p-2"
                    side="top"
                    sideOffset={8}
                  >
                    {AI_MODELS.map((model) => (
                      <DropdownMenuItem
                        className={cn(
                          "cursor-pointer rounded-lg",
                          selectedModel === model.id && "bg-muted"
                        )}
                        key={model.id}
                        onClick={() => setModel(model.id)}
                      >
                        <span
                          aria-hidden="true"
                          className="size-3 rounded-full bg-primary/20"
                        />
                        <span>{model.name}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenuPortal>
              </DropdownMenu>
              <span className="text-muted-foreground text-xs">
                {currentModel.name}
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};
