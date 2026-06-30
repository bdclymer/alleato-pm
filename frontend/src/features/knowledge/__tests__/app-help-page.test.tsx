/** @jest-environment jsdom */

import { render, screen, within } from "@testing-library/react";

import { AppHelpPage } from "../app-help-page";

jest.mock("@/components/layout", () => ({
  PageShell: ({
    title,
    description,
    actions,
    children,
  }: {
    title: string;
    description?: string;
    actions?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      <div role="heading" aria-level={1}>
        {title}
      </div>
      {description ? <p>{description}</p> : null}
      {actions}
      {children}
    </div>
  ),
  SectionRuleHeading: ({
    label,
    actions,
  }: {
    label: React.ReactNode;
    actions?: React.ReactNode;
  }) => (
    <div>
      <div role="heading" aria-level={2}>
        {label}
      </div>
      {actions}
    </div>
  ),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("AppHelpPage", () => {
  it("groups app-help documents by tool", () => {
    render(<AppHelpPage />);

    expect(
      screen.getByRole("heading", { name: "How to Use the App" }),
    ).toBeInTheDocument();

    for (const groupName of [
      "Budget",
      "Prime Contracts",
      "Commitments",
      "Change Events",
      "Change Orders",
      "Schedule",
      "Meetings",
    ]) {
      expect(
        screen.getByRole("heading", { name: groupName }),
      ).toBeInTheDocument();
    }

    const budgetSection = screen.getByRole("region", { name: "Budget" });
    expect(
      within(budgetSection).getByRole("link", { name: /Budget Overview/ }),
    ).toHaveAttribute(
      "href",
      "https://alleato-os-docs.vercel.app/help/articles/budget-overview",
    );

    const meetingsSection = screen.getByRole("region", { name: "Meetings" });
    expect(
      within(meetingsSection)
        .getAllByRole("link")
        .some(
          (link) =>
            link.getAttribute("href") ===
            "https://alleato-os-docs.vercel.app/help/articles/meetings",
        ),
    ).toBe(true);
  });

  it("renders published training docs as their own category", () => {
    render(
      <AppHelpPage
        trainingDocs={[
          {
            title: "Training Docs Verification",
            slug: "training-docs-verification",
            summary: "Verifies the training docs workflow.",
            audience: "internal",
            status: "published",
            sourceRoute: "/training-docs",
            publishedDocPath:
              "project-management-tools/training-docs/training-docs-verification.mdx",
            lastPublishedAt: "2026-06-27T02:45:48.293+00:00",
          },
        ]}
      />,
    );

    const trainingSection = screen.getByRole("region", {
      name: "Training Docs",
    });
    expect(
      within(trainingSection).getByRole("heading", {
        name: "Training Docs",
      }),
    ).toBeInTheDocument();
    expect(
      within(trainingSection).getByRole("link", {
        name: /Training Docs Verification/,
      }),
    ).toHaveAttribute(
      "href",
      "https://alleato-os-docs.vercel.app/project-management-tools/training-docs/training-docs-verification",
    );
  });
});
