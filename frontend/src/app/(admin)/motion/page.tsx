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

import { TextEffect } from "@/components/motion/text-effect";
import { Button } from "@/components/ui/button";

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
