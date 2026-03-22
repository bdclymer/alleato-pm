import {
  ADMIN_FEEDBACK_ATTRIBUTE,
  ADMIN_FEEDBACK_FALLBACK_ATTRIBUTE,
  ADMIN_FEEDBACK_OVERLAY_ATTRIBUTE,
} from "./constants";

export type FeedbackTargetSnapshot = {
  targetId: string | null;
  selector: string;
  domPath: string;
  text: string | null;
  tagName: string;
  pageX: number;
  pageY: number;
  width: number;
  height: number;
};

const INTERACTIVE_SELECTOR = [
  `[${ADMIN_FEEDBACK_ATTRIBUTE}]`,
  `[${ADMIN_FEEDBACK_FALLBACK_ATTRIBUTE}]`,
  "[data-testid]",
  "button",
  "a",
  "input",
  "textarea",
  "select",
  "label",
  "[role='button']",
  "[role='link']",
  "[role='tab']",
  "[role='switch']",
  "[role='checkbox']",
  "th",
  "td",
  "tr",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "section",
  "article",
  "form",
].join(", ");

function cssEscape(value: string) {
  if (typeof window !== "undefined" && window.CSS?.escape) {
    return window.CSS.escape(value);
  }

  return value.replace(/["\\]/g, "\\$&");
}

function getTextSnippet(element: HTMLElement) {
  const value =
    element.getAttribute("aria-label") ||
    element.getAttribute("title") ||
    element.innerText ||
    element.textContent ||
    "";

  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, 160) : null;
}

function getElementIndex(element: HTMLElement) {
  let index = 1;
  let sibling = element.previousElementSibling;

  while (sibling) {
    if (sibling.tagName === element.tagName) {
      index += 1;
    }
    sibling = sibling.previousElementSibling;
  }

  return index;
}

function buildNthSelector(element: HTMLElement) {
  return `${element.tagName.toLowerCase()}:nth-of-type(${getElementIndex(element)})`;
}

export function getStableTargetId(element: HTMLElement) {
  return (
    element.getAttribute(ADMIN_FEEDBACK_ATTRIBUTE) ||
    element.getAttribute(ADMIN_FEEDBACK_FALLBACK_ATTRIBUTE) ||
    element.getAttribute("data-testid") ||
    null
  );
}

export function buildSelector(element: HTMLElement) {
  const stableId = element.getAttribute(ADMIN_FEEDBACK_ATTRIBUTE);
  if (stableId) {
    return `[${ADMIN_FEEDBACK_ATTRIBUTE}="${cssEscape(stableId)}"]`;
  }

  const fallbackId = element.getAttribute(ADMIN_FEEDBACK_FALLBACK_ATTRIBUTE);
  if (fallbackId) {
    return `[${ADMIN_FEEDBACK_FALLBACK_ATTRIBUTE}="${cssEscape(fallbackId)}"]`;
  }

  if (element.id) {
    return `#${cssEscape(element.id)}`;
  }

  const testId = element.getAttribute("data-testid");
  if (testId) {
    return `[data-testid="${cssEscape(testId)}"]`;
  }

  const segments: string[] = [];
  let current: HTMLElement | null = element;

  while (
    current &&
    current.tagName !== "BODY" &&
    current.tagName !== "HTML" &&
    segments.length < 6
  ) {
    const currentStableId = current.getAttribute(ADMIN_FEEDBACK_ATTRIBUTE);
    if (currentStableId) {
      segments.unshift(
        `[${ADMIN_FEEDBACK_ATTRIBUTE}="${cssEscape(currentStableId)}"]`,
      );
      break;
    }

    if (current.id) {
      segments.unshift(`#${cssEscape(current.id)}`);
      break;
    }

    segments.unshift(buildNthSelector(current));
    current = current.parentElement;
  }

  return segments.join(" > ");
}

export function buildDomPath(element: HTMLElement) {
  const segments: string[] = [];
  let current: HTMLElement | null = element;

  while (
    current &&
    current.tagName !== "BODY" &&
    current.tagName !== "HTML" &&
    segments.length < 10
  ) {
    const stableId = current.getAttribute(ADMIN_FEEDBACK_ATTRIBUTE);
    if (stableId) {
      segments.unshift(`${current.tagName.toLowerCase()}[${stableId}]`);
      break;
    }

    segments.unshift(buildNthSelector(current));
    current = current.parentElement;
  }

  return segments.join(" > ");
}

export function getSelectableElement(node: Element | null) {
  if (!(node instanceof HTMLElement)) {
    return null;
  }

  if (node.closest(`[${ADMIN_FEEDBACK_OVERLAY_ATTRIBUTE}="true"]`)) {
    return null;
  }

  const explicit = node.closest(INTERACTIVE_SELECTOR);
  if (explicit instanceof HTMLElement) {
    return explicit;
  }

  if (node.tagName === "BODY" || node.tagName === "HTML") {
    return null;
  }

  return node;
}

export function buildFeedbackTargetSnapshot(element: HTMLElement): FeedbackTargetSnapshot {
  const rect = element.getBoundingClientRect();

  return {
    targetId: getStableTargetId(element),
    selector: buildSelector(element),
    domPath: buildDomPath(element),
    text: getTextSnippet(element),
    tagName: element.tagName.toLowerCase(),
    pageX: rect.left + window.scrollX,
    pageY: rect.top + window.scrollY,
    width: rect.width,
    height: rect.height,
  };
}
