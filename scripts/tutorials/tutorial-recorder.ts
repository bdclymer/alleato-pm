import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("../../frontend/node_modules/@playwright/test");

type Browser = Awaited<ReturnType<typeof chromium.launch>>;
type BrowserContext = Awaited<ReturnType<Browser["newContext"]>>;
type Locator = ReturnType<Page["locator"]>;
type Page = Awaited<ReturnType<BrowserContext["newPage"]>>;

export type ScreenshotMode = "viewport" | "fullPage" | "element";

export interface TutorialSeedData {
  [key: string]: unknown;
}

export interface TutorialStepOptions {
  title: string;
  instruction: string;
  expected?: string;
  screenshot?: {
    mode?: ScreenshotMode;
    selector?: string;
  };
  calloutSelector?: string;
  maskSelectors?: string[];
}

export interface TutorialDefinition<TData extends TutorialSeedData = TutorialSeedData> {
  id: string;
  title: string;
  module: string;
  slug: string;
  description: string;
  dataPath?: string;
  maskSelectors?: string[];
  workflow: (context: TutorialWorkflowContext<TData>) => Promise<void>;
}

export interface TutorialWorkflowContext<TData extends TutorialSeedData = TutorialSeedData> {
  data: TData;
  page: Page;
  tutorial: TutorialRecorder;
}

export interface TutorialRunOptions {
  baseUrl: string;
  headed: boolean;
  outputDir: string;
  recordVideo: boolean;
  storageState?: string;
}

interface CapturedStep {
  calloutSelector: string | null;
  expected: string | null;
  instruction: string;
  screenshot: string;
  screenshotMode: ScreenshotMode;
  sourceUrl: string;
  title: string;
}

export function defineTutorial<TData extends TutorialSeedData>(
  definition: TutorialDefinition<TData>,
): TutorialDefinition<TData> {
  return definition;
}

export class TutorialRecorder {
  private readonly definition: TutorialDefinition;
  private readonly outputDir: string;
  private readonly page: Page;
  private readonly screenshotsDir: string;
  private readonly steps: CapturedStep[] = [];

  constructor({
    definition,
    outputDir,
    page,
  }: {
    definition: TutorialDefinition;
    outputDir: string;
    page: Page;
  }) {
    this.definition = definition;
    this.outputDir = outputDir;
    this.page = page;
    this.screenshotsDir = path.join(outputDir, "screenshots");
  }

  async init() {
    await mkdir(this.screenshotsDir, { recursive: true });
    await mkdir(path.join(this.outputDir, "videos"), { recursive: true });
    await this.installMaskStyle();
  }

  async goto(route: string) {
    const url = route.startsWith("http")
      ? route
      : new URL(route, this.page.url() === "about:blank" ? "http://localhost" : this.page.url()).toString();
    await this.page.goto(url, { waitUntil: "domcontentloaded" });
    await this.waitForStability();
  }

  async fillByLabel(label: string | RegExp, value: string) {
    const field = this.page.getByLabel(label).first();
    if (!(await field.count())) return false;
    await field.fill(value);
    return true;
  }

  async clickByRole(name: string | RegExp) {
    const button = this.page.getByRole("button", { name }).first();
    if (!(await button.count())) return false;
    await button.click();
    return true;
  }

  async selectFirstComboboxOption(label?: string | RegExp) {
    const trigger = label
      ? this.page.getByLabel(label).first()
      : this.page.locator('[role="combobox"], [data-slot="select-trigger"]').first();
    if (!(await trigger.count())) return false;
    await trigger.click();
    await this.page.waitForTimeout(300);
    const option = this.page.locator('[role="option"], [data-slot="select-item"]').first();
    if (!(await option.count())) {
      await this.page.keyboard.press("Escape").catch(() => undefined);
      return false;
    }
    await option.click();
    return true;
  }

  async uploadFirstFile(filePath: string) {
    const input = this.page.locator('input[type="file"]').first();
    if (!(await input.count())) return false;
    await input.setInputFiles(filePath);
    return true;
  }

  async step(options: TutorialStepOptions, action: () => Promise<void>) {
    await action();
    await this.waitForStability();
    const screenshotMode = options.screenshot?.mode ?? "viewport";
    const fileName = `${String(this.steps.length + 1).padStart(2, "0")}-${slugify(options.title)}.png`;
    const screenshotPath = path.join(this.screenshotsDir, fileName);
    const mask = await this.resolveMasks(options.maskSelectors);

    if (screenshotMode === "element" && options.screenshot?.selector) {
      await this.page.locator(options.screenshot.selector).first().screenshot({
        mask,
        path: screenshotPath,
      });
    } else {
      await this.page.screenshot({
        fullPage: screenshotMode === "fullPage",
        mask,
        path: screenshotPath,
      });
    }

    this.steps.push({
      calloutSelector: options.calloutSelector ?? null,
      expected: options.expected ?? null,
      instruction: options.instruction,
      screenshot: path.posix.join("screenshots", fileName),
      screenshotMode,
      sourceUrl: this.page.url(),
      title: options.title,
    });
  }

  async writeArtifacts(video: { mp4Path: string | null; webmPath: string | null }) {
    const markdownPath = path.join(this.outputDir, `${this.definition.slug}.md`);
    const manifestPath = path.join(this.outputDir, "manifest.json");
    const manifest = {
      id: this.definition.id,
      title: this.definition.title,
      module: this.definition.module,
      slug: this.definition.slug,
      description: this.definition.description,
      generatedAt: new Date().toISOString(),
      video,
      steps: this.steps,
    };

    await writeFile(markdownPath, renderMarkdown(this.definition, this.steps, video), "utf8");
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

    return { manifestPath, markdownPath };
  }

  private async installMaskStyle() {
    await this.page.addStyleTag({
      content: `
        [data-tutorial-mask],
        [data-sensitive],
        input[type="password"],
        [autocomplete="current-password"],
        [autocomplete="new-password"] {
          color: transparent !important;
          text-shadow: 0 0 0.5rem currentColor !important;
        }
        [data-sonner-toaster],
        [data-radix-toast-viewport],
        [data-admin-feedback-root],
        [data-velt-root],
        .global-ai-widget-launcher,
        nextjs-portal,
        .__nextjs-toast,
        .__nextjs-error-overlay {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
      `,
    }).catch(() => undefined);
  }

  private async resolveMasks(stepSelectors: string[] | undefined): Promise<Locator[]> {
    const selectors = [
      ...(this.definition.maskSelectors ?? []),
      ...(stepSelectors ?? []),
      "[data-tutorial-mask]",
      "[data-sensitive]",
      'input[type="password"]',
    ];

    return selectors.map((selector) => this.page.locator(selector));
  }

  private async waitForStability() {
    await this.page.waitForLoadState("domcontentloaded").catch(() => undefined);
    await this.page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => undefined);
    await this.installMaskStyle();
    await this.page.evaluate(() => document.fonts?.ready).catch(() => undefined);
    await this.page.waitForTimeout(300);
  }
}

export async function runTutorial(
  definition: TutorialDefinition,
  options: TutorialRunOptions,
) {
  const data = definition.dataPath
    ? JSON.parse(await readFile(definition.dataPath, "utf8"))
    : {};
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;

  try {
    browser = await chromium.launch({ headless: !options.headed });
    context = await browser.newContext({
      baseURL: options.baseUrl,
      recordVideo: options.recordVideo
        ? { dir: path.join(options.outputDir, "videos"), size: { width: 1440, height: 1000 } }
        : undefined,
      storageState: options.storageState && existsSync(options.storageState) ? options.storageState : undefined,
      viewport: { width: 1440, height: 1000 },
    });
    const page = await context.newPage();
    const video = page.video();
    const recorder = new TutorialRecorder({ definition, outputDir: options.outputDir, page });
    await recorder.init();
    await definition.workflow({ data, page, tutorial: recorder });

    await context.close();
    context = null;
    const webmPath = video ? await video.path() : null;

    const finalVideo = webmPath
      ? await finalizeVideo(webmPath, path.join(options.outputDir, "videos", `${definition.slug}.webm`))
      : { mp4Path: null, webmPath: null };
    const artifacts = await recorder.writeArtifacts(finalVideo);
    return { ...artifacts, video: finalVideo };
  } finally {
    if (context) await context.close().catch(() => undefined);
    if (browser) await browser.close().catch(() => undefined);
  }
}

async function finalizeVideo(tempWebmPath: string, finalWebmPath: string) {
  await mkdir(path.dirname(finalWebmPath), { recursive: true });
  await rename(tempWebmPath, finalWebmPath).catch(async () => {
    const bytes = await readFile(tempWebmPath);
    await writeFile(finalWebmPath, bytes);
  });

  const finalMp4Path = finalWebmPath.replace(/\.webm$/i, ".mp4");
  const ffmpeg = spawnSync("ffmpeg", [
    "-y",
    "-i",
    finalWebmPath,
    "-movflags",
    "faststart",
    "-pix_fmt",
    "yuv420p",
    finalMp4Path,
  ], { encoding: "utf8" });

  return {
    mp4Path: ffmpeg.status === 0 ? path.relative(path.dirname(path.dirname(finalWebmPath)), finalMp4Path) : null,
    webmPath: path.relative(path.dirname(path.dirname(finalWebmPath)), finalWebmPath),
  };
}

function renderMarkdown(
  definition: TutorialDefinition,
  steps: CapturedStep[],
  video: { mp4Path: string | null; webmPath: string | null },
) {
  const videoLine = video.mp4Path
    ? `Video: [${path.basename(video.mp4Path)}](${video.mp4Path})`
    : video.webmPath
      ? `Video: [${path.basename(video.webmPath)}](${video.webmPath})`
      : "Video: not recorded";

  return [
    `# ${definition.title}`,
    "",
    definition.description,
    "",
    videoLine,
    "",
    ...steps.flatMap((step, index) => [
      `## ${index + 1}. ${step.title}`,
      "",
      `![${step.title}](${step.screenshot})`,
      "",
      step.instruction,
      "",
      step.expected ? `Expected result: ${step.expected}` : "",
      step.calloutSelector ? `Callout selector: \`${step.calloutSelector}\`` : "",
      `Source screen: \`${step.sourceUrl}\``,
      "",
    ]),
  ].filter(Boolean).join("\n");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
