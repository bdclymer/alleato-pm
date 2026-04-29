/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import {
  usePathname,
  useRouter,
  useSearchParams,
  type ReadonlyURLSearchParams,
} from "next/navigation";

import { PageTabs } from "../PageTabs";

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

const mockUsePathname = usePathname as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;
const mockUseSearchParams = useSearchParams as jest.Mock;

const makeSearchParams = (value?: string): ReadonlyURLSearchParams =>
  new URLSearchParams(value) as unknown as ReadonlyURLSearchParams;

const renderTabs = () =>
  render(
    <PageTabs
      tabs={[
        { label: "All Contracts", href: "/projects" },
        { label: "Active", href: "/projects?status=active" },
      ]}
    />,
  );

describe("PageTabs", () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue("/projects");
    mockUseRouter.mockReturnValue({ push: jest.fn() });
    mockUseSearchParams.mockReturnValue(makeSearchParams());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("highlights the tab matching the current search", () => {
    mockUseSearchParams.mockReturnValue(makeSearchParams("status=active"));

    renderTabs();

    const activeTab = screen.getByRole("button", { name: "Active" });
    const allTab = screen.getByRole("button", { name: "All Contracts" });

    expect(activeTab).toHaveClass("text-primary");
    expect(allTab).not.toHaveClass("text-primary");
  });

  it("navigates to tab href on click", () => {
    const push = jest.fn();
    mockUseRouter.mockReturnValue({ push });

    renderTabs();

    fireEvent.click(screen.getByRole("button", { name: "Active" }));

    expect(push).toHaveBeenCalledWith("/projects?status=active");
  });

  it("renders count badges with pill styling", () => {
    render(
      <PageTabs
        tabs={[
          { label: "All", href: "/projects", count: 12 },
          { label: "Completed", href: "/projects?status=complete", count: 3 },
        ]}
      />,
    );

    expect(screen.getByText("12")).toHaveClass(
      "rounded-full",
      "inline-flex",
      "h-5",
    );
  });
});
