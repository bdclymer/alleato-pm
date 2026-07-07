import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
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
  docsScreenshots?: boolean;
  headed: boolean;
  outputDir: string;
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

interface CapturedVideo {
  file: string;
  mimeType: string;
}

export function defineTutorial<TData extends TutorialSeedData>(
  definition: TutorialDefinition<TData>,
): TutorialDefinition<TData> {
  return definition;
}

export class TutorialRecorder {
  private readonly baseUrl: string;
  private readonly definition: TutorialDefinition;
  private readonly docsScreenshots: boolean;
  private readonly outputDir: string;
  private readonly page: Page;
  private readonly screenshotsDir: string;
  private readonly steps: CapturedStep[] = [];

  constructor({
    definition,
    baseUrl,
    docsScreenshots = false,
    outputDir,
    page,
  }: {
    definition: TutorialDefinition;
    baseUrl: string;
    docsScreenshots?: boolean;
    outputDir: string;
    page: Page;
  }) {
    this.baseUrl = baseUrl;
    this.definition = definition;
    this.docsScreenshots = docsScreenshots;
    this.outputDir = outputDir;
    this.page = page;
    this.screenshotsDir = path.join(outputDir, "screenshots");
  }

  async init() {
    await mkdir(this.screenshotsDir, { recursive: true });
    await this.installMaskStyle();
  }

  async goto(route: string) {
    const url = route.startsWith("http")
      ? route
      : new URL(route, this.page.url() === "about:blank" ? this.baseUrl : this.page.url()).toString();
    await this.page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await this.waitForStability();
  }

  async fillByLabel(label: string | RegExp, value: string) {
    const field = this.page.getByLabel(label).first();
    if (!(await field.count())) return false;
    return field.fill(value, { timeout: 5_000 }).then(() => true).catch(() => false);
  }

  async requireFillByLabel(label: string | RegExp, value: string) {
    if (await this.fillByLabel(label, value)) return;
    throw new Error(`Required tutorial field was not found for label: ${label.toString()}`);
  }

  async clickByRole(name: string | RegExp) {
    const button = this.page.getByRole("button", { name }).first();
    if (!(await button.count())) return false;
    return button.click({ timeout: 5_000 }).then(() => true).catch(() => false);
  }

  async scrollToText(text: string | RegExp) {
    const locator = this.page.getByText(text).first();
    if (!(await locator.count())) return false;
    return locator
      .evaluate((element) => {
        element.scrollIntoView({ block: "center", inline: "nearest" });
      })
      .then(() => true)
      .catch(() => false);
  }

  async requireUrl(pattern: string | RegExp, stepTitle: string) {
    const currentUrl = this.page.url();
    const matches =
      typeof pattern === "string"
        ? currentUrl.includes(pattern)
        : pattern.test(currentUrl);

    if (!matches) {
      throw new Error(
        [
          `Tutorial step "${stepTitle}" landed on the wrong screen.`,
          `Current URL: ${currentUrl}`,
          `Expected URL pattern: ${pattern.toString()}`,
          "Cause: the workflow navigation, route guard, or seeded access data did not reach the intended screen.",
          "Detection gap: tutorial capture previously accepted screenshots from the wrong page.",
          "Prevention: each workflow step must assert the expected route before capture.",
        ].join(" "),
      );
    }
  }

  async selectFirstComboboxOption(label?: string | RegExp) {
    const trigger = label
      ? this.page.getByLabel(label).first()
      : this.page.locator('[role="combobox"], [data-slot="select-trigger"]').first();
    if (!(await trigger.count())) return false;
    const opened = await trigger.click({ timeout: 5_000 }).then(() => true).catch(() => false);
    if (!opened) return false;
    await this.page.waitForTimeout(300);
    const option = this.page.locator('[role="option"], [data-slot="select-item"]').first();
    if (!(await option.count())) {
      await this.page.keyboard.press("Escape").catch(() => undefined);
      return false;
    }
    const selected = await option.click({ timeout: 5_000 }).then(() => true).catch(() => false);
    if (!selected) return false;
    return true;
  }

  async uploadFirstFile(filePath: string) {
    const input = this.page.locator('input[type="file"]').first();
    if (!(await input.count())) return false;
    return input.setInputFiles(filePath, { timeout: 5_000 }).then(() => true).catch(() => false);
  }

  async step(options: TutorialStepOptions, action: () => Promise<void>) {
    await action();
    await this.waitForStability();
    this.assertValidWorkflowPage(options.title);
    await this.prepareScreenshotTarget(options);
    const screenshotMode = options.screenshot?.mode ?? "viewport";
    const fileName = `${String(this.steps.length + 1).padStart(2, "0")}-${slugify(options.title)}.png`;
    const screenshotPath = path.join(this.screenshotsDir, fileName);
    const mask = await this.resolveMasks(options.maskSelectors);

    if (screenshotMode === "element" && options.screenshot?.selector) {
      await this.page.locator(options.screenshot.selector).first().screenshot({
        mask,
        path: screenshotPath,
      });
    } else if (this.docsScreenshots) {
      const clip = await this.getDocsScreenshotClip(screenshotMode);
      await this.withDocsScreenshotChromeHidden(async () => {
        await this.page.screenshot({
          clip,
          fullPage: false,
          mask,
          path: screenshotPath,
        });
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

  async writeArtifacts() {
    return this.writeArtifactsWithVideo(null);
  }

  async writeArtifactsWithVideo(video: CapturedVideo | null) {
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

    await writeFile(
      markdownPath,
      renderMarkdown(this.definition, this.steps, video),
      "utf8",
    );
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

  private async prepareScreenshotTarget(options: TutorialStepOptions) {
    const selector = options.screenshot?.selector ?? options.calloutSelector;
    if (!selector) return;

    const locator = this.page.locator(selector).first();
    const count = await locator.count().catch(() => 0);
    if (!count) return;

    await locator
      .evaluate((element) => {
        element.scrollIntoView({ block: "center", inline: "nearest" });
      })
      .catch(() => undefined);
    await this.page.waitForTimeout(350);
  }

  private async getDocsScreenshotClip(screenshotMode: ScreenshotMode) {
    return this.page.evaluate((mode) => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const documentHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body?.scrollHeight ?? 0,
      );
      const x = 0;
      const y = 48;
      const width = Math.max(320, Math.floor(viewportWidth - x));
      const height =
        mode === "fullPage"
          ? Math.max(320, Math.floor(documentHeight - y))
          : Math.max(320, Math.floor(viewportHeight - y));

      return { x, y, width, height };
    }, screenshotMode);
  }

  private async withDocsScreenshotChromeHidden(capture: () => Promise<void>) {
    await this.page.evaluate(() => {
      document.querySelector("[data-tutorial-docs-screenshot-style]")?.remove();
      const style = document.createElement("style");
      style.setAttribute("data-tutorial-docs-screenshot-style", "true");
      style.textContent = `
        [data-slot="sidebar-container"],
        [data-slot="sidebar-inner"],
        [data-slot="sidebar-gap"],
        [data-slot="sidebar-rail"],
        [data-slot="sidebar-content"],
        [data-slot="sidebar-header"],
        [data-slot="sidebar-footer"],
        [data-sidebar="rail"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
        [data-slot="sidebar-inset"] {
          margin-left: 0 !important;
          transform: none !important;
        }
      `;
      document.head.appendChild(style);
    });

    try {
      await capture();
    } finally {
      await this.page
        .evaluate(() => {
          document.querySelector("[data-tutorial-docs-screenshot-style]")?.remove();
        })
        .catch(() => undefined);
    }
  }

  private async waitForStability() {
    await this.page.waitForLoadState("domcontentloaded").catch(() => undefined);
    // Wait until the route has actually painted real content. In dev, Turbopack
    // compiles each route on first visit, so the page is blank-white for several
    // seconds; capturing then yields empty screenshots. Wait for substantial
    // visible text (and no skeleton/spinner) before proceeding.
    await this.page
      .waitForFunction(
        () => {
          const body = document.body;
          if (!body) return false;
          const text = (body.innerText || "").replace(/\s+/g, "");
          if (text.length < 120) return false;
          const loading = document.querySelector(
            '[data-loading="true"], [aria-busy="true"], .animate-pulse, [data-skeleton]',
          );
          return !loading;
        },
        { timeout: 30_000 },
      )
      .catch(() => undefined);
    await this.page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => undefined);
    await this.installMaskStyle();
    await this.page.evaluate(() => document.fonts?.ready).catch(() => undefined);
    await this.page.waitForTimeout(600);
  }

  private assertValidWorkflowPage(stepTitle: string) {
    const url = new URL(this.page.url());
    if (url.pathname.startsWith("/auth/login")) {
      throw new Error(
        [
          `Tutorial step "${stepTitle}" redirected to login.`,
          `Current URL: ${url.pathname}${url.search}`,
          "Cause: the provided Playwright storage state is missing, expired, or scoped to the wrong host.",
          "Detection gap: tutorial capture previously accepted login-page screenshots as successful workflow artifacts.",
          "Prevention: refresh the storage state for the same --base-url before running the tutorial.",
        ].join(" "),
      );
    }

    if (url.pathname.startsWith("/access-denied")) {
      throw new Error(
        [
          `Tutorial step "${stepTitle}" redirected to access denied.`,
          `Current URL: ${url.pathname}${url.search}`,
          "Cause: the authenticated tutorial user does not have access to the target project or tool.",
          "Detection gap: tutorial capture previously accepted access-denied screenshots as successful workflow artifacts.",
          "Prevention: seed and read back project membership for the tutorial user before running the workflow.",
        ].join(" "),
      );
    }
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
    await mkdir(options.outputDir, { recursive: true });
    browser = await chromium.launch({ headless: !options.headed });
    context = await browser.newContext({
      baseURL: options.baseUrl,
      recordVideo: {
        dir: options.outputDir,
        size: { width: 1440, height: 1000 },
      },
      storageState: options.storageState && existsSync(options.storageState) ? options.storageState : undefined,
      viewport: { width: 1440, height: 1000 },
    });
    const page = await context.newPage();
    const videoHandle = page.video();
    page.setDefaultTimeout(15_000);
    page.setDefaultNavigationTimeout(45_000);
    const recorder = new TutorialRecorder({
      definition,
      baseUrl: options.baseUrl,
      docsScreenshots: options.docsScreenshots,
      outputDir: options.outputDir,
      page,
    });
    await recorder.init();
    await definition.workflow({ data, page, tutorial: recorder });

    await page.close();
    const video = await persistRecordedVideo(options.outputDir, videoHandle);
    const artifacts = await recorder.writeArtifactsWithVideo(video);
    await context.close();
    context = null;
    return artifacts;
  } finally {
    if (context) await context.close().catch(() => undefined);
    if (browser) await browser.close().catch(() => undefined);
  }
}

function renderMarkdown(
  definition: TutorialDefinition,
  steps: CapturedStep[],
  video: CapturedVideo | null,
) {
  return [
    `# ${definition.title}`,
    "",
    definition.description,
    "",
    video ? "## Walkthrough Video" : "",
    video ? "" : "",
    video ? `[Watch the recorded workflow](${video.file})` : "",
    video ? "" : "",
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

async function persistRecordedVideo(
  outputDir: string,
  videoHandle: Awaited<ReturnType<Page["video"]>> | null,
): Promise<CapturedVideo | null> {
  if (!videoHandle) return null;

  const sourcePath = await videoHandle.path().catch(() => null);
  if (!sourcePath) return null;

  const file = "session.webm";
  const targetPath = path.join(outputDir, file);
  await copyFile(sourcePath, targetPath);
  return {
    file,
    mimeType: "video/webm",
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
