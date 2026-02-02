"use client";

import { Separator } from "@/components/ui/separator";
import {
  DribbbleIcon,
  GithubIcon,
  TwitchIcon,
  TwitterIcon,
} from "lucide-react";
import Link from "next/link";

const footerLinks = [
  {
    title: "Docs",
    href: "docs-ai-nine.vercel.app",
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
    title: "Careers",
    href: "#",
  },
  {
    title: "Help",
    href: "#",
  },
  {
    title: "Privacy",
    href: "#",
  },
];

const Footer = () => {
  return (
    <footer className="border-t">
        <div className="max-w-(--breakpoint-xl) mx-auto">
          <div className="py-12 px-6 xl:px-6 w-full flex flex-col items-center gap-6 md:flex-row md:items-center md:justify-between">
            <ul className="flex text-sm items-center gap-6 flex-wrap md:mt-0">
              {footerLinks.map(({ title, href }) => (
                <li key={title}>
                  <Link
                    href={href}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {title}
                  </Link>
                </li>
              ))}
            </ul>
            <span className="text-sm text-muted-foreground text-center md:text-right">
              &copy; {new Date().getFullYear()} Alleato Group. All rights
              reserved.
            </span>
          </div>
        </div>
      </footer>
  );
};

export default Footer;
