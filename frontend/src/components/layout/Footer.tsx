"use client";

import Link from "next/link";

const footerLinks = [
  {
    title: "Docs",
    href: "https://docs-ai-nine.vercel.app",
  },
  {
    title: "Tables",
    href: "/tables-directory",
  },
  {
    title: "Playwright Crawl",
    href: "/crawled-pages",
  },
  {
    title: "Procore Tools",
    href: "/procore-tools",
  },
];

const Footer = () => {
  return (
    <footer className="contents">
      <div className="mx-auto max-w-(--breakpoint-xl)">
        <div className="flex w-full flex-col items-center gap-4 bg-transparent px-4 py-1 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm sm:justify-start sm:gap-6">
              {footerLinks.map(({ title, href }) => (
                <li
                  key={title}
                  className={
                    title === "Playwright Crawl"
                      ? "hidden sm:list-item"
                      : ""
                  }
                >
                  <Link
                    href={href}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {title}
                  </Link>
                </li>
              ))}
            </ul>
          <span className="text-center text-xs text-muted-foreground sm:text-right sm:text-sm">
            &copy; {new Date().getFullYear()} Alleato Group. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
