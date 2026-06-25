/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { WelcomeScreen } from "../welcome-screen";

jest.mock("@/hooks/use-current-user-name", () => ({
  useCurrentUserName: () => "Test User",
}));

jest.mock("../animated-orb", () => ({
  AnimatedOrb: () => <div data-testid="animated-orb" />,
}));

describe("WelcomeScreen", () => {
  it("renders opt-in content before the composer", () => {
    render(
      <WelcomeScreen
        hideOrb
        beforeComposer={<Button type="button">Create a change request</Button>}
        composer={<Textarea aria-label="Ask anything" />}
      />,
    );

    const action = screen.getByRole("button", {
      name: "Create a change request",
    });
    const composer = screen.getByRole("textbox", { name: "Ask anything" });

    expect(screen.getByText("Hello, Test")).toBeInTheDocument();
    expect(action.compareDocumentPosition(composer)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(screen.queryByTestId("animated-orb")).not.toBeInTheDocument();
  });
});
