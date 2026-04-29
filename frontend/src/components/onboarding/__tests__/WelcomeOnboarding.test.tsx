/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import { WelcomeOnboarding } from "../WelcomeOnboarding";

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/use-current-user-profile", () => ({
  useCurrentUserProfile: () => ({
    profile: {
      email: "sub@example.com",
      fullName: "Sub Contractor",
    },
  }),
}));

describe("WelcomeOnboarding", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("suppresses automatic onboarding for project-scoped external users", async () => {
    render(
      <WelcomeOnboarding
        suppressAutoOpen
        suppressStorageValue="skipped:subcontractor"
      />,
    );

    await waitFor(() => {
      expect(window.localStorage.getItem("alleato_onboarding_completed_v3")).toBe(
        "skipped:subcontractor",
      );
    });
    expect(screen.queryByText("Welcome to Alleato AI")).not.toBeInTheDocument();
  });

  it("still opens when explicitly forced", async () => {
    render(<WelcomeOnboarding forceOpen suppressAutoOpen />);

    expect(await screen.findByText("Welcome to Alleato AI")).toBeInTheDocument();
  });
});
