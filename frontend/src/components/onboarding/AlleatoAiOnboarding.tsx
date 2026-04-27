"use client";

import * as React from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUp, ChevronDown, Plus, X } from "lucide-react";

import {
  DEFAULT_ALLEATO_AI_PROFILE_ID,
  findAlleatoAiProfile,
} from "@/config/aiPersonalization";
import {
  alleatoAiPromptChips,
  buildAlleatoAiActions,
  buildAlleatoAiScriptedResponse,
  buildAlleatoAiWelcome,
  type AlleatoAiAction,
} from "@/lib/alleato-ai-onboarding";
import { OPEN_ADMIN_FEEDBACK_COMPOSER_EVENT } from "@/lib/admin-feedback/constants";
import { useCurrentUserProfile } from "@/hooks/use-current-user-profile";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ONBOARDING_DISMISSED_KEY = "alleato-ai-onboarding-dismissed-profile";
const SELECTED_PROFILE_KEY = "alleato-ai-demo-profile";

export function AlleatoAiOnboarding() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPathname = pathname ?? "/";
  const isMobile = useIsMobile();
  const { profile: currentUserProfile } = useCurrentUserProfile({
    enabled: !currentPathname.startsWith("/auth"),
  });

  const [selectedProfileId, setSelectedProfileId] = React.useState(
    DEFAULT_ALLEATO_AI_PROFILE_ID,
  );
  const [welcomeOpen, setWelcomeOpen] = React.useState(false);
  const [assistantOpen, setAssistantOpen] = React.useState(false);
  const [assistantResponse, setAssistantResponse] = React.useState("");
  const [chatInput, setChatInput] = React.useState("");

  React.useEffect(() => {
    const queryProfile = searchParams?.get("aiProfile");
    const storedProfile =
      typeof window === "undefined"
        ? null
        : window.localStorage.getItem(SELECTED_PROFILE_KEY);
    const nextProfile =
      queryProfile ?? storedProfile ?? DEFAULT_ALLEATO_AI_PROFILE_ID;

    setSelectedProfileId(nextProfile);
    if (queryProfile) {
      window.localStorage.setItem(SELECTED_PROFILE_KEY, queryProfile);
    }
  }, [searchParams]);

  const personalizationProfile = React.useMemo(
    () =>
      findAlleatoAiProfile({
        profileId: selectedProfileId,
        email: currentUserProfile?.email,
        displayName: currentUserProfile?.fullName,
      }),
    [
      currentUserProfile?.email,
      currentUserProfile?.fullName,
      selectedProfileId,
    ],
  );

  const welcomeMessage = React.useMemo(
    () => buildAlleatoAiWelcome(personalizationProfile),
    [personalizationProfile],
  );
  const actions = React.useMemo(
    () => buildAlleatoAiActions(personalizationProfile),
    [personalizationProfile],
  );

  React.useEffect(() => {
    if (currentPathname.startsWith("/auth")) {
      return;
    }

    const dismissedForProfile = window.localStorage.getItem(
      ONBOARDING_DISMISSED_KEY,
    );
    if (dismissedForProfile !== personalizationProfile.userId) {
      setWelcomeOpen(true);
      setAssistantOpen(true);
    }
  }, [currentPathname, personalizationProfile.userId]);

  if (currentPathname.startsWith("/auth")) {
    return null;
  }

  const openAdminFeedback = () => {
    window.dispatchEvent(new CustomEvent(OPEN_ADMIN_FEEDBACK_COMPOSER_EVENT));
  };

  const dismissWelcome = () => {
    window.localStorage.setItem(
      ONBOARDING_DISMISSED_KEY,
      personalizationProfile.userId,
    );
    setWelcomeOpen(false);
    setAssistantOpen(false);
  };

  const restartWelcome = () => {
    window.localStorage.removeItem(ONBOARDING_DISMISSED_KEY);
    setWelcomeOpen(true);
    setAssistantOpen(true);
  };

  const handleAction = (action: AlleatoAiAction) => {
    if (action.id === "feedback") {
      openAdminFeedback();
      return;
    }

    if (action.id === "explore") {
      dismissWelcome();
      return;
    }

    dismissWelcome();
    if (action.href) {
      router.push(action.href);
    }
  };

  const askScriptedPrompt = (prompt: string) => {
    if (/feedback/i.test(prompt)) {
      openAdminFeedback();
      return;
    }

    setAssistantResponse(
      buildAlleatoAiScriptedResponse(
        personalizationProfile,
        prompt,
        currentPathname,
      ),
    );
    setAssistantOpen(true);
  };

  const handleComposerSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const prompt = chatInput.trim();
    if (!prompt) {
      return;
    }

    window.localStorage.setItem(
      ONBOARDING_DISMISSED_KEY,
      personalizationProfile.userId,
    );
    setWelcomeOpen(false);
    askScriptedPrompt(prompt);
    setChatInput("");
  };

  const closeAssistant = () => {
    if (welcomeOpen) {
      dismissWelcome();
      return;
    }

    setAssistantOpen(false);
  };

  const toggleAssistant = () => {
    if (assistantOpen) {
      closeAssistant();
      return;
    }

    setAssistantOpen(true);
  };

  return (
    <>
      <div className="fixed bottom-5 right-4 z-40 flex flex-col items-end gap-3 sm:right-5">
        {assistantOpen && (
          <section
            className="max-h-[calc(100svh-10rem)] w-[calc(100vw-1.5rem)] max-w-md overflow-hidden rounded-3xl bg-background shadow-md"
            aria-label="Alleato AI assistant"
          >
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <div className="alleato-ai-mark-bg flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                  <Image
                    src="/favicon-light.png"
                    alt=""
                    width={22}
                    height={22}
                    className="h-5 w-5 rounded"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">Alleato AI</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {welcomeOpen
                      ? `Welcome, ${personalizationProfile.displayName}`
                      : `Demo guidance for ${personalizationProfile.displayName}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Share feedback"
                  onClick={openAdminFeedback}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Collapse Alleato AI"
                  onClick={closeAssistant}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="max-h-[calc(100svh-15rem)] overflow-y-auto">
              {welcomeOpen ? (
                <div className="space-y-4 p-4">
                  <div className="rounded-2xl bg-muted/50 p-4 text-sm leading-6 text-foreground">
                    <p
                      role="heading"
                      aria-level={2}
                      className="mb-2 text-base font-semibold text-foreground"
                    >
                      {welcomeMessage.greeting}
                    </p>
                    <div className="space-y-3">
                      <WelcomeSection>
                        {welcomeMessage.relevance}
                      </WelcomeSection>
                      <WelcomeSection>
                        {welcomeMessage.coCreation}
                      </WelcomeSection>
                      <WelcomeSection>
                        {welcomeMessage.feedbackGuidance}
                      </WelcomeSection>
                      <WelcomeSection>
                        {welcomeMessage.suggestedNextStep}
                      </WelcomeSection>
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-1">
                    {actions
                      .filter((action) => action.id !== "explore")
                      .map((action) => (
                        <Button
                          key={action.id}
                          type="button"
                          variant="link"
                          size="sm"
                          className="h-auto justify-start p-0 text-left"
                          onClick={() => handleAction(action)}
                        >
                          {action.label}
                        </Button>
                      ))}
                  </div>

                  <div className="flex flex-col items-start gap-1 pt-1">
                    {personalizationProfile.focusAreas.map((area) => (
                      <Button
                        key={area}
                        type="button"
                        variant="link"
                        size="xs"
                        onClick={() =>
                          setAssistantResponse(
                            `I will keep ${area.toLowerCase()} in mind as you explore this page.`,
                          )
                        }
                        className="h-auto p-0 text-xs text-muted-foreground"
                      >
                        {area}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4 p-4">
                  <div className="rounded-2xl bg-muted/50 p-3 text-sm leading-6 text-foreground">
                    {assistantResponse ||
                      "I can help you choose where to start, explain the current page, or capture feedback as you explore. Responses in this testing build are scripted from your onboarding profile."}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {alleatoAiPromptChips.map((prompt) => (
                      <Button
                        key={prompt}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => askScriptedPrompt(prompt)}
                        className="h-auto min-h-9 justify-start rounded-full whitespace-normal px-3 py-1.5 text-left text-xs"
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={restartWelcome}
                    >
                      Restart welcome
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleComposerSubmit} className="p-3">
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-background p-2">
                <Input
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  placeholder="Ask a question..."
                  variant="inline"
                  className="h-10 flex-1 px-2 focus-visible:ring-0"
                  aria-label="Ask Alleato AI"
                />
                <Button
                  type="submit"
                  size="icon-sm"
                  className="rounded-full"
                  aria-label="Send message"
                  disabled={!chatInput.trim()}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </section>
        )}

        <Button
          type="button"
          className={cn(
            "h-12 w-12 rounded-full p-0 shadow-sm",
            assistantOpen &&
              "bg-foreground text-background hover:bg-foreground/90",
            !assistantOpen && "alleato-ai-mark-bg",
          )}
          onClick={toggleAssistant}
          aria-label={assistantOpen ? "Collapse Alleato AI" : "Open Alleato AI"}
        >
          {assistantOpen ? (
            <ChevronDown className="size-6" strokeWidth={2} />
          ) : (
            <Image
              src="/favicon-light.png"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 rounded"
            />
          )}
          <span className="sr-only">Alleato AI</span>
        </Button>
      </div>
    </>
  );
}

function WelcomeSection({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-6 text-foreground/85">{children}</p>;
}

export function openAlleatoAiFeedback() {
  window.dispatchEvent(new CustomEvent(OPEN_ADMIN_FEEDBACK_COMPOSER_EVENT));
}
