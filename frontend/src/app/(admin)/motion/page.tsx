"use client";

import {
  MorphingDialog,
  MorphingDialogTrigger,
  MorphingDialogContent,
  MorphingDialogTitle,
  MorphingDialogImage,
  MorphingDialogSubtitle,
  MorphingDialogClose,
  MorphingDialogContainer,
  MorphingDialogDescription,
} from "@/components/motion/morphing-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MorphingDialogBasicOne } from "@/components/motion/morphing-dialog-basic-one";
import { MorphingDialogBasicImage } from "@/components/motion/morphing-image";
import { AnimatedBackground } from "@/components/motion/animated-background";
import { AnimatedList } from "@/components/motion/animated-list";
import { Marquee } from "@/components/motion/marquee";
import { TabsTransitionPanel } from "@/components/motion/motion-tabs";
import { AdaptiveCardRenderer } from "@/components/motion/adaptive-card-renderer";
import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { TextEffect } from "@/components/motion/text-effect";
import { Button } from "@/components/ui/button";

import executiveDailyBriefCard from "@/data/adaptive-card-samples/executive-daily-brief.json";
import taskListCard from "@/data/adaptive-card-samples/task-list.json";
import meetingRecapCard from "@/data/adaptive-card-samples/meeting-recap.json";
import surveyPulseCard from "@/data/adaptive-card-samples/survey-pulse.json";

import accountCard from "@/data/adaptive-card-samples/account.json";
import authorVideoCard from "@/data/adaptive-card-samples/author-highlight-video.json";
import bookARoomCard from "@/data/adaptive-card-samples/book-a-room.json";
import cafeMenuCard from "@/data/adaptive-card-samples/cafe-menu.json";
import communicationCard from "@/data/adaptive-card-samples/communication.json";
import courseVideoCard from "@/data/adaptive-card-samples/course-video.json";
import editorialCard from "@/data/adaptive-card-samples/editorial.json";
import expenseReportCard from "@/data/adaptive-card-samples/expense-report.json";
import insightsCard from "@/data/adaptive-card-samples/insights.json";
import issueCard from "@/data/adaptive-card-samples/issue.json";
import listCard from "@/data/adaptive-card-samples/list.json";
import recipeCard from "@/data/adaptive-card-samples/recipe.json";
import simpleEventCard from "@/data/adaptive-card-samples/simple-event.json";
import simpleTimeOffCard from "@/data/adaptive-card-samples/simple-time-off-request.json";
import standardVideoCard from "@/data/adaptive-card-samples/standard-video.json";
import timeOffCard from "@/data/adaptive-card-samples/time-off-request.json";
import workItemCard from "@/data/adaptive-card-samples/work_item.json";

const ALLEATO_CARD_SAMPLES = [
  {
    name: "Executive Daily Brief",
    slug: "executive-daily-brief",
    card: executiveDailyBriefCard,
    tags: ["ToggleVisibility", "RichTextBlock", "Icon", "collapsible"],
  },
  {
    name: "Task List",
    slug: "task-list",
    card: taskListCard,
    tags: ["grouped", "priority colors", "due dates"],
  },
  {
    name: "Meeting Recap",
    slug: "meeting-recap",
    card: meetingRecapCard,
    tags: ["FactSet", "ToggleVisibility", "action items"],
  },
  {
    name: "Weekly Pulse Survey",
    slug: "survey-pulse",
    card: surveyPulseCard,
    tags: ["Input.ChoiceSet", "Input.Text", "Action.Submit"],
  },
];

const ADAPTIVE_CARD_SAMPLES = [
  { name: "Account / Project Summary", slug: "account", card: accountCard, tags: ["Badge", "targetWidth", "responsive"] },
  { name: "Expense Report", slug: "expense-report", card: expenseReportCard, tags: ["ToggleVisibility", "Icon", "RichTextBlock"] },
  { name: "Insights + Chart", slug: "insights", card: insightsCard, tags: ["Badge", "Chart.Donut", "ShowCard"] },
  { name: "Issue Tracker", slug: "issue", card: issueCard, tags: ["Table", "Icon", "responsive"] },
  { name: "Work Item", slug: "work-item", card: workItemCard, tags: ["Icon", "status dot", "responsive"] },
  { name: "Communication", slug: "communication", card: communicationCard, tags: ["Icon", "ToggleVisibility"] },
  { name: "Book a Room", slug: "book-a-room", card: bookARoomCard, tags: ["Input", "backgroundImage", "roundedCorners"] },
  { name: "Simple Event", slug: "simple-event", card: simpleEventCard, tags: ["backgroundImage", "hero"] },
  { name: "Time Off Request", slug: "time-off-request", card: timeOffCard, tags: ["Input.Date", "hero", "responsive"] },
  { name: "Simple Time Off", slug: "simple-time-off", card: simpleTimeOffCard, tags: ["Input.Date", "ChoiceSet"] },
  { name: "Course Video", slug: "course-video", card: courseVideoCard, tags: ["Rating", "RoundedCorners"] },
  { name: "Author Video", slug: "author-video", card: authorVideoCard, tags: ["RoundedCorners", "person avatar"] },
  { name: "Standard Video", slug: "standard-video", card: standardVideoCard, tags: ["logo", "metadata row"] },
  { name: "Editorial", slug: "editorial", card: editorialCard, tags: ["backgroundImage", "bleed"] },
  { name: "Café Menu", slug: "cafe-menu", card: cafeMenuCard, tags: ["backgroundImage", "tabs", "ShowCard"] },
  { name: "Content List", slug: "list", card: listCard, tags: ["Layout.Flow", "thumbnails", "ToggleVisibility"] },
  { name: "Recipe", slug: "recipe", card: recipeCard, tags: ["Image stretch", "FactSet"] },
];

export default function ComponentsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="mx-auto max-w-7xl space-y-12">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground">
            Motion Components
          </h1>
          <p className="mt-2 text-lg text-foreground">
            Interactive showcase of all motion components
          </p>
        </div>

        {/* Text Effects */}
        <ComponentSection
          title="Text Effects"
          description="Animated text with various presets"
        >
          <div className="grid gap-6">
            <div className="rounded-lg bg-background p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-medium text-muted-foreground">
                Blur Effect
              </h3>
              <TextEffect
                preset="blur"
                per="word"
                className="text-2xl font-bold"
              >
                Welcome to Motion Components
              </TextEffect>
            </div>
            <div className="rounded-lg bg-background p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-medium text-muted-foreground">
                Fade In Blur
              </h3>
              <TextEffect
                preset="fade-in-blur"
                per="char"
                className="text-2xl font-bold"
              >
                Smooth Animations
              </TextEffect>
            </div>
            <div className="rounded-lg bg-background p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-medium text-muted-foreground">
                Scale Effect
              </h3>
              <TextEffect
                preset="scale"
                per="word"
                className="text-2xl font-bold"
              >
                Beautiful Design
              </TextEffect>
            </div>
            <div className="rounded-lg bg-background p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-medium text-muted-foreground">
                Slide Effect
              </h3>
              <TextEffect
                preset="slide"
                per="word"
                className="text-2xl font-bold"
              >
                Interactive Experience
              </TextEffect>
            </div>
          </div>
        </ComponentSection>

        {/* Animated Background */}
        <ComponentSection
          title="Animated Background"
          description="Interactive buttons with animated backgrounds"
        >
          <div className="rounded-lg bg-background p-8 shadow-sm">
            <AnimatedBackground
              defaultValue="1"
              className="rounded-lg bg-blue-500"
              transition={{
                type: "spring",
                bounce: 0.2,
                duration: 0.3,
              }}
            >
              <Button
                variant="ghost"
                data-id="1"
                className="px-6 py-4 text-foreground transition-colors hover:text-white"
              >
                Features
              </Button>
              <Button
                variant="ghost"
                data-id="2"
                className="px-6 py-4 text-foreground transition-colors hover:text-white"
              >
                Pricing
              </Button>
              <Button
                variant="ghost"
                data-id="3"
                className="px-6 py-4 text-foreground transition-colors hover:text-white"
              >
                About
              </Button>
              <Button
                variant="ghost"
                data-id="4"
                className="px-6 py-4 text-foreground transition-colors hover:text-white"
              >
                Contact
              </Button>
            </AnimatedBackground>
          </div>
        </ComponentSection>

        {/* Marquee */}
        <ComponentSection
          title="Marquee"
          description="Scrolling content animation"
        >
          <div className="rounded-lg bg-background p-6 shadow-sm">
            <Marquee pauseOnHover className="[--duration:20s]">
              {["comp-1", "comp-2", "comp-3", "comp-4", "comp-5"].map(
                (id, i) => (
                  <div
                    key={id}
                    className="flex h-24 w-64 items-center justify-center rounded-lg border border-border bg-gradient-to-br from-blue-50 to-blue-100 px-6"
                  >
                    <span className="text-lg font-semibold text-blue-600">
                      Component {i + 1}
                    </span>
                  </div>
                ),
              )}
            </Marquee>
          </div>
        </ComponentSection>

        {/* Animated List */}
        <ComponentSection
          title="Animated List"
          description="Items appear with spring animations"
        >
          <div className="rounded-lg bg-background p-6 shadow-sm">
            <AnimatedList delay={800}>
              {[
                { id: "item-1", label: "First Item", number: 1 },
                { id: "item-2", label: "Second Item", number: 2 },
                { id: "item-3", label: "Third Item", number: 3 },
                { id: "item-4", label: "Fourth Item", number: 4 },
                { id: "item-5", label: "Fifth Item", number: 5 },
              ].map((item) => (
                <div
                  key={item.id}
                  className="flex h-16 w-full items-center justify-between rounded-lg border border-border bg-gradient-to-r from-purple-50 to-pink-50 px-6"
                >
                  <span className="font-medium text-foreground">
                    {item.label}
                  </span>
                  <span className="text-sm text-muted-foreground">#{item.number}</span>
                </div>
              ))}
            </AnimatedList>
          </div>
        </ComponentSection>

        {/* Motion Tabs */}
        <ComponentSection
          title="Motion Tabs"
          description="Tabs with smooth transitions"
        >
          <div className="rounded-lg bg-background p-6 shadow-sm">
            <TabsTransitionPanel />
          </div>
        </ComponentSection>

        {/* Morphing Dialogs */}
        <ComponentSection
          title="Morphing Dialogs"
          description="Click cards to see morphing animations"
        >
          <div className="flex flex-wrap items-center justify-center gap-8 rounded-lg bg-background p-12 shadow-sm">
            <MorphingDialogBasicOne />
            <MorphingDialogBasicTwo />
            <MorphingDialogBasicThree />
            <MorphingDialogBasicImage />
          </div>
        </ComponentSection>

        {/* Apple Style Dock */}

        {/* Alleato Cards */}
        <ComponentSection
          title="Alleato Cards"
          description="Teams + AI chat cards for the daily brief, task list, meeting recap, and weekly pulse survey."
        >
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {ALLEATO_CARD_SAMPLES.map((sample) => (
              <AdaptiveCardSample key={sample.slug} sample={sample} />
            ))}
          </div>
        </ComponentSection>

        {/* Adaptive Card Samples */}
        <ComponentSection
          title="Adaptive Card Samples"
          description="Official Microsoft Teams card samples — 17 production-quality cards from OfficeDev/Microsoft-Teams-Adaptive-Card-Samples"
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {ADAPTIVE_CARD_SAMPLES.map((sample) => (
              <AdaptiveCardSample key={sample.slug} sample={sample} />
            ))}
          </div>
        </ComponentSection>
      </div>
    </div>
  );
}

function ComponentSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        <p className="text-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

interface AdaptiveCardSampleEntry {
  name: string;
  slug: string;
  card: object;
  tags: string[];
}

function AdaptiveCardSample({ sample }: { sample: AdaptiveCardSampleEntry }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(JSON.stringify(sample.card, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const designerUrl = `https://adaptivecards.io/designer/`;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl bg-background shadow-sm ring-1 ring-border">
      {/* Label bar */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {sample.name}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {sample.tags.map((tag) => (
              <span
                key={tag}
                className="inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-foreground"
            onClick={handleCopy}
            title="Copy JSON"
          >
            {copied ? (
              <Check className="size-3.5 text-green-600" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-foreground"
            onClick={() => window.open(designerUrl, "_blank")}
            title="Open in Designer"
          >
            <ExternalLink className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Teams-style chat message wrapper */}
      <div className="border-t border-border bg-muted px-4 py-5">
        {/* Teams message bubble */}
        <div className="mx-auto max-w-md">
          {/* Sender row */}
          <div className="mb-2 flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
              A
            </div>
            <span className="text-xs font-semibold text-foreground">Alleato</span>
            <span className="text-[11px] text-muted-foreground">9:00 AM</span>
          </div>
          {/* Card surface */}
          <div className="ml-9 overflow-hidden rounded border border-border bg-background shadow-sm">
            <AdaptiveCardRenderer card={sample.card} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MorphingDialogBasicTwo() {
  return (
    <MorphingDialog
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 24,
      }}
    >
      <MorphingDialogTrigger
        style={{
          borderRadius: "4px",
        }}
        className="border border-border/60 bg-background"
      >
        <div className="flex items-center space-x-4 p-4">
          <MorphingDialogImage
            src="https://m.media-amazon.com/images/I/71skAxiMC2L._AC_UF1000,1000_QL80_.jpg"
            alt="What I Talk About When I Talk About Running - book cover"
            className="h-8 w-8 object-cover object-top"
            style={{
              borderRadius: "4px",
            }}
          />
          <div className="flex flex-col items-start justify-center space-y-0">
            <MorphingDialogTitle className="text-2xs font-medium text-black sm:text-xs">
              What I Talk About When I Talk About Running
            </MorphingDialogTitle>
            <MorphingDialogSubtitle className="text-2xs text-foreground sm:text-xs">
              Haruki Murakami
            </MorphingDialogSubtitle>
          </div>
        </div>
      </MorphingDialogTrigger>
      <MorphingDialogContainer>
        <MorphingDialogContent
          style={{
            borderRadius: "12px",
          }}
          className="relative h-auto w-[500px] border border-border bg-background"
        >
          <ScrollArea className="h-[90vh]" type="scroll">
            <div className="relative p-6">
              <div className="flex justify-center py-10">
                <MorphingDialogImage
                  src="https://m.media-amazon.com/images/I/71skAxiMC2L._AC_UF1000,1000_QL80_.jpg"
                  alt="What I Talk About When I Talk About Running - book cover"
                  className="h-auto w-[200px]"
                />
              </div>
              <div className="">
                <MorphingDialogTitle className="text-black">
                  What I Talk About When I Talk About Running
                </MorphingDialogTitle>
                <MorphingDialogSubtitle className="font-light text-muted-foreground">
                  Haruki Murakami
                </MorphingDialogSubtitle>
                <div className="mt-4 text-sm text-foreground">
                  <p>
                    In 1982, having sold his jazz bar to devote himself to
                    writing, Murakami began running to keep fit. A year later,
                    he'd completed a solo course from Athens to Marathon, and
                    now, after dozens of such races, not to mention triathlons
                    and a dozen critically acclaimed books, he reflects upon the
                    influence the sport has had on his life and—even more
                    important—on his writing.
                  </p>
                  <p className="mt-4">
                    Equal parts training log, travelogue, and reminiscence, this
                    revealing memoir covers his four-month preparation for the
                    2005 New York City Marathon and takes us to places ranging
                    from Tokyo's Jingu Gaien gardens, where he once shared the
                    course with an Olympian, to the Charles River in Boston
                    among young women who outpace him. Through this marvelous
                    lens of sport emerges a panorama of memories and insights:
                    the eureka moment when he decided to become a writer, his
                    greatest triumphs and disappointments, his passion for
                    vintage LPs, and the experience, after fifty, of seeing his
                    race times improve and then fall back.
                  </p>
                  <p className="mt-4">
                    By turns funny and sobering, playful and philosophical, What
                    I Talk About When I Talk About Running is rich and
                    revelatory, both for fans of this masterful yet guardedly
                    private writer and for the exploding population of athletes
                    who find similar satisfaction in running.
                  </p>
                </div>
              </div>
            </div>
          </ScrollArea>
          <MorphingDialogClose className="text-zinc-500" />
        </MorphingDialogContent>
      </MorphingDialogContainer>
    </MorphingDialog>
  );
}

function MorphingDialogBasicThree() {
  return (
    <MorphingDialog
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 24,
      }}
    >
      <MorphingDialogTrigger
        style={{
          borderRadius: "12px",
        }}
        className="border border-border/60 bg-background shadow-sm"
      >
        <div className="flex flex-col items-center space-y-4 p-4">
          <MorphingDialogImage
            src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&auto=format&fit=crop"
            alt="Mountain landscape"
            className="h-24 w-32 object-cover"
            style={{
              borderRadius: "8px",
            }}
          />
          <div className="flex flex-col items-center justify-center space-y-1">
            <MorphingDialogTitle className="text-sm font-semibold text-black">
              Mountain Adventures
            </MorphingDialogTitle>
            <MorphingDialogSubtitle className="text-xs text-foreground">
              Explore the peaks
            </MorphingDialogSubtitle>
          </div>
        </div>
      </MorphingDialogTrigger>
      <MorphingDialogContainer>
        <MorphingDialogContent
          style={{
            borderRadius: "24px",
          }}
          className="relative h-auto w-[600px] border border-border bg-background shadow-sm"
        >
          <div className="relative p-8">
            <div className="mb-6">
              <MorphingDialogImage
                src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&auto=format&fit=crop"
                alt="Mountain landscape"
                className="h-64 w-full object-cover"
                style={{
                  borderRadius: "16px",
                }}
              />
            </div>
            <div className="space-y-4">
              <MorphingDialogTitle className="text-3xl font-bold text-black">
                Mountain Adventures
              </MorphingDialogTitle>
              <MorphingDialogSubtitle className="text-lg font-medium text-muted-foreground">
                Explore the peaks
              </MorphingDialogSubtitle>
              <MorphingDialogDescription
                className="text-foreground"
                variants={{
                  initial: { opacity: 0, y: 20 },
                  animate: { opacity: 1, y: 0 },
                  exit: { opacity: 0, y: 20 },
                }}
              >
                <p className="mb-4">
                  Discover breathtaking mountain landscapes and embark on
                  unforgettable adventures. From towering peaks to serene
                  valleys, experience nature at its finest.
                </p>
                <p className="mb-4">
                  Our guided tours take you through some of the most spectacular
                  mountain ranges in the world, offering both challenging climbs
                  and peaceful hikes for all skill levels.
                </p>
                <div className="mt-6 flex gap-4">
                  <Button
                    className="rounded-lg px-6 py-2 text-sm font-medium"
                  >
                    Book Now
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-lg px-6 py-2 text-sm font-medium"
                  >
                    Learn More
                  </Button>
                </div>
              </MorphingDialogDescription>
            </div>
          </div>
          <MorphingDialogClose
            className="text-muted-foreground hover:text-foreground"
            variants={{
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              exit: { opacity: 0 },
            }}
          />
        </MorphingDialogContent>
      </MorphingDialogContainer>
    </MorphingDialog>
  );
}
