/**
 * @jest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { Button } from "@/components/ui/button";

jest.mock("nanoid", () => ({
  nanoid: jest
    .fn()
    .mockReturnValueOnce("attachment-1")
    .mockReturnValueOnce("attachment-2"),
}));

import {
  PromptInput,
  PromptInputTextarea,
  type PromptInputMessage,
} from "../prompt-input";

describe("PromptInput attachments", () => {
  const createObjectURL = jest.fn(() => "blob:attachment-url");
  const revokeObjectURL = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });
  });

  it("submits multiple selected files as AI SDK file parts", async () => {
    const onSubmit = jest.fn<void, [PromptInputMessage]>();

    render(
      <PromptInput multiple onSubmit={(message) => onSubmit(message)}>
        <PromptInputTextarea />
        <Button type="submit">Send</Button>
      </PromptInput>,
    );

    const fileInput = screen.getByLabelText("Upload files") as HTMLInputElement;
    const spec = new File(["Spec notes"], "spec.md", { type: "text/markdown" });
    const photo = new File(["image bytes"], "site.jpg", { type: "image/jpeg" });

    fireEvent.change(fileInput, { target: { files: [spec, photo] } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].files).toEqual([
      expect.objectContaining({
        filename: "spec.md",
        mediaType: "text/markdown",
        type: "file",
      }),
      expect.objectContaining({
        filename: "site.jpg",
        mediaType: "image/jpeg",
        type: "file",
      }),
    ]);
  });
});
