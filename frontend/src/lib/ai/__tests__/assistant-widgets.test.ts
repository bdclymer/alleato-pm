import {
  ASSISTANT_WIDGET_TYPES,
  isAssistantWidgetPayload,
} from "../assistant-widgets";

describe("assistant widget registry", () => {
  it("accepts every registered generative UI widget type", () => {
    for (const type of ASSISTANT_WIDGET_TYPES) {
      expect(isAssistantWidgetPayload({ type })).toBe(true);
    }
  });

  it("rejects malformed or unsupported widget payloads", () => {
    expect(isAssistantWidgetPayload(null)).toBe(false);
    expect(isAssistantWidgetPayload({})).toBe(false);
    expect(isAssistantWidgetPayload({ type: "openai_widget_builder_json" })).toBe(false);
  });
});
