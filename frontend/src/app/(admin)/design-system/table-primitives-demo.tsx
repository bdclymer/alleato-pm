"use client";

import * as React from "react";
import { FileText, ExternalLink, Download } from "lucide-react";

import {
  TableCountIndicator,
  TableDateValue,
  TableStatusDot,
  TableTagBadge,
  TableAvatarUsers,
  TableIconLinks,
  CellText,
  CellBadge,
  CellLink,
  CellEmail,
  TruncatedCell,
  CellCurrency,
  CellNumber,
  CellPercent,
  CellDate,
  CellStatus,
  TableRowActionsMenu,
  type CellColorMap,
} from "@/components/tables/unified/table-primitives";

const PRIORITY_COLORS: CellColorMap = {
  "high":   "bg-red-50 text-red-700",
  "medium": "bg-amber-50 text-amber-700",
  "low":    "bg-emerald-50 text-emerald-700",
};

const TYPE_COLORS: CellColorMap = {
  "subcontract":     "bg-violet-50 text-violet-700",
  "purchase order":  "bg-blue-50 text-blue-700",
  "master agreement":"bg-cyan-50 text-cyan-700",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-3 pr-6 w-48 align-middle">
        <code className="text-xs text-muted-foreground font-mono">{label}</code>
      </td>
      <td className="py-3 align-middle">{children}</td>
    </tr>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{title}</p>
      <table className="w-full text-sm">
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function TablePrimitivesDemo() {
  return (
    <div className="space-y-8">

      {/* ── Status ── */}
      <Section title="Status">
        <Row label="CellStatus — open">
          <CellStatus value="open" />
        </Row>
        <Row label="CellStatus — closed">
          <CellStatus value="closed" />
        </Row>
        <Row label="CellStatus — draft">
          <CellStatus value="draft" />
        </Row>
        <Row label="CellStatus — pending">
          <CellStatus value="pending" />
        </Row>
        <Row label="CellStatus — approved">
          <CellStatus value="approved" />
        </Row>
        <Row label="CellStatus — rejected">
          <CellStatus value="rejected" />
        </Row>
        <Row label="CellStatus — in_review">
          <CellStatus value="in_review" />
        </Row>
        <Row label="CellStatus — empty">
          <CellStatus value={null} />
        </Row>
        <Row label="TableStatusDot — pending">
          <TableStatusDot status="pending" />
        </Row>
        <Row label="TableStatusDot — complete">
          <TableStatusDot status="complete" />
        </Row>
        <Row label="TableStatusDot — error">
          <TableStatusDot status="error" />
        </Row>
      </Section>

      {/* ── Text ── */}
      <Section title="Text">
        <Row label="CellText">
          <CellText value="Standard text value" />
        </Row>
        <Row label="CellText — muted">
          <CellText value="Secondary information" muted />
        </Row>
        <Row label="CellText — empty">
          <CellText value={null} />
        </Row>
        <Row label="TruncatedCell — short">
          <TruncatedCell value="Short value" maxWidth={240} />
        </Row>
        <Row label="TruncatedCell — truncated">
          <TruncatedCell value="This is a very long description that will be clipped to a single line with an ellipsis and a tooltip on hover showing the full text" maxWidth={240} />
        </Row>
      </Section>

      {/* ── Numeric ── */}
      <Section title="Numeric">
        <Row label="CellCurrency">
          <CellCurrency value={1234567.89} />
        </Row>
        <Row label="CellCurrency — muted">
          <CellCurrency value={450000} muted />
        </Row>
        <Row label="CellCurrency — empty">
          <CellCurrency value={null} />
        </Row>
        <Row label="CellNumber">
          <CellNumber value={42} />
        </Row>
        <Row label="CellNumber — decimals=2">
          <CellNumber value={3.14159} decimals={2} />
        </Row>
        <Row label="CellPercent">
          <CellPercent value={73.4} />
        </Row>
        <Row label="CellPercent — 0 decimals">
          <CellPercent value={100} decimals={0} />
        </Row>
        <Row label="TableCountIndicator — 5">
          <TableCountIndicator count={5} />
        </Row>
        <Row label="TableCountIndicator — 0 (hidden)">
          <span className="text-xs text-muted-foreground italic">renders nothing</span>
        </Row>
      </Section>

      {/* ── Dates ── */}
      <Section title="Dates">
        <Row label="CellDate">
          <CellDate value="2025-11-14" />
        </Row>
        <Row label="CellDate — showTime">
          <CellDate value="2025-11-14T09:30:00" showTime />
        </Row>
        <Row label="CellDate — empty">
          <CellDate value={null} />
        </Row>
        <Row label="TableDateValue — date only">
          <TableDateValue value="2026-01-03" />
        </Row>
        <Row label="TableDateValue — with time">
          <TableDateValue value="2026-01-03T14:45:00" showTime />
        </Row>
      </Section>

      {/* ── Badges ── */}
      <Section title="Badges">
        <Row label="CellBadge — priority (colorMap)">
          <div className="flex gap-2">
            <CellBadge value="high" colorMap={PRIORITY_COLORS} />
            <CellBadge value="medium" colorMap={PRIORITY_COLORS} />
            <CellBadge value="low" colorMap={PRIORITY_COLORS} />
          </div>
        </Row>
        <Row label="CellBadge — type (colorMap)">
          <div className="flex gap-2 flex-wrap">
            <CellBadge value="subcontract" colorMap={TYPE_COLORS} />
            <CellBadge value="purchase_order" colorMap={TYPE_COLORS} />
          </div>
        </Row>
        <Row label="CellBadge — no colorMap (muted fallback)">
          <CellBadge value="unknown_type" />
        </Row>
        <Row label="CellBadge — empty">
          <CellBadge value={null} />
        </Row>
        <Row label="TableTagBadge — outline">
          <TableTagBadge label="Mechanical" />
        </Row>
        <Row label="TableTagBadge — secondary">
          <TableTagBadge label="Electrical" variant="secondary" />
        </Row>
      </Section>

      {/* ── Links ── */}
      <Section title="Links">
        <Row label="CellLink — internal">
          <CellLink value="Vermillion Rise Warehouse" href="/projects/67" />
        </Row>
        <Row label="CellLink — external">
          <CellLink value="View in Procore" href="https://procore.com" external />
        </Row>
        <Row label="CellLink — no href">
          <CellLink value="Plain text fallback" href={null} />
        </Row>
        <Row label="CellLink — empty">
          <CellLink value={null} href="/somewhere" />
        </Row>
        <Row label="CellEmail">
          <CellEmail value="john.smith@contractor.com" />
        </Row>
        <Row label="CellEmail — empty">
          <CellEmail value={null} />
        </Row>
        <Row label="TableIconLinks">
          <TableIconLinks
            items={[
              { href: "#", icon: FileText, label: "View document" },
              { href: "#", icon: Download, label: "Download" },
              { href: "#", icon: ExternalLink, label: "Open in Procore" },
            ]}
          />
        </Row>
      </Section>

      {/* ── People ── */}
      <Section title="People">
        <Row label="TableAvatarUsers — 2">
          <TableAvatarUsers users={["john.smith@co.com", "sarah.jones@co.com"]} />
        </Row>
        <Row label="TableAvatarUsers — overflow">
          <TableAvatarUsers
            users={["john.smith@co.com", "sarah.jones@co.com", "mike.taylor@co.com", "lisa.chen@co.com", "alex.wong@co.com", "dana.white@co.com"]}
            maxVisible={4}
          />
        </Row>
        <Row label="TableAvatarUsers — empty (renders nothing)">
          <TableAvatarUsers users={[]} />
        </Row>
      </Section>

      {/* ── Actions ── */}
      <Section title="Row Actions">
        <Row label="TableRowActionsMenu">
          <TableRowActionsMenu
            items={[
              { key: "view",   label: "View",   onSelect: () => {} },
              { key: "edit",   label: "Edit",   onSelect: () => {} },
              { key: "delete", label: "Delete", onSelect: () => {}, destructive: true },
            ]}
          />
        </Row>
        <Row label="TableRowActionsMenu — disabled item">
          <TableRowActionsMenu
            items={[
              { key: "approve", label: "Approve", onSelect: () => {} },
              { key: "reject",  label: "Reject",  onSelect: () => {}, disabled: true },
            ]}
          />
        </Row>
      </Section>

    </div>
  );
}
