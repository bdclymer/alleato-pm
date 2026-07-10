// Static content for the standalone Morning Brief (v2) preview page.
//
// This is a hand-authored snapshot of the July 9, 2026 executive brief, used to
// prove out the mobile-responsive, interactive layout (resolve / edit / add
// tasks) before this surface is wired to the live daily-executive-brief packet.
// Links point at real in-app records (the meeting page or the project inbox),
// never a raw transcript file or Outlook URL.

export type BriefFlag = "decision" | "risk" | "watch";
export type SourceKind = "meeting" | "inbox";

export interface BriefSourceLink {
  label: string;
  href: string;
  kind: SourceKind;
}

export interface BriefDecision {
  id: string;
  project: string;
  /** Segments; `bold` renders emphasised. */
  text: Array<{ t: string; b?: boolean }>;
}

export interface BriefPoint {
  t: string;
  /** True for the "Your call" lead bullet. */
  call?: boolean;
}

export interface BriefProject {
  id: string;
  name: string;
  flag: BriefFlag;
  flagLabel: string;
  points: BriefPoint[];
  sources: BriefSourceLink[];
}

export interface BriefMoving {
  id: string;
  name: string;
  resolved?: boolean;
  text: string;
  source: BriefSourceLink;
}

export interface BriefLooseEnd {
  id: string;
  text: string;
  source: BriefSourceLink;
}

export interface BriefTask {
  id: string;
  project: string;
  owner: string | null;
  action: string;
  due: string | null;
  group: "you" | "team";
}

export interface BriefContent {
  weekday: string;
  dateLabel: string;
  coverage: Array<{ n: string; label: string }>;
  decisions: BriefDecision[];
  attentionProjects: BriefProject[];
  moving: BriefMoving[];
  looseEnds: BriefLooseEnd[];
  tasks: BriefTask[];
}

export const BRIEF_CONTENT: BriefContent = {
  weekday: "Thursday",
  dateLabel: "July 9, 2026",
  coverage: [
    { n: "5", label: "decisions" },
    { n: "9", label: "active projects" },
    { n: "4", label: "meetings" },
    { n: "~180", label: "emails" },
    { n: "16", label: "projects covered" },
  ],
  decisions: [
    {
      id: "d-union",
      project: "Union Collective",
      text: [
        { t: "Lock the solar basis at " },
        { t: "45 kW now", b: true },
        {
          t: ", with the roof sized for a future 250 kW, and decide whether to push the landscape and fence reductions before the planning package is submitted.",
        },
      ],
    },
    {
      id: "d-uniqlo",
      project: "Uniqlo Phillipsburg",
      text: [
        { t: "Decide whether you personally take Yusuke's approval on the " },
        { t: "$35,100", b: true },
        {
          t: " fire-alarm panel, and set the Skypod rule: no disruption at all, or the one-day reconnection after install.",
        },
      ],
    },
    {
      id: "d-exol",
      project: "Exol Morrisville",
      text: [
        {
          t: "Decide whether to keep supporting the January narrative or issue a credible schedule now, even though it likely shows completion slipping into ",
        },
        { t: "March", b: true },
        { t: "." },
      ],
    },
    {
      id: "d-playmakers",
      project: "Playmakers",
      text: [
        {
          t: "Decide whether to let Dale self-perform the added FRP at the bar wall, or keep that finish scope inside Alleato's work.",
        },
      ],
    },
    {
      id: "d-finance",
      project: "Alleato Finance",
      text: [
        { t: "Decide whether to take the Wealth Insight Associates call about a possible " },
        { t: "$2M–$35M", b: true },
        { t: " family-office raise." },
      ],
    },
  ],
  attentionProjects: [
    {
      id: "union",
      name: "Union Collective",
      flag: "decision",
      flagLabel: "Decision",
      points: [
        {
          call: true,
          t: "Your call: proceed with a 45 kW system now, but size the roof structure for a future 250 kW so the engineers don't have to redo it later. The BIPV option is lower-risk because it installs like metal roofing with no roof penetrations.",
        },
        {
          t: "The planning package has to go to Union City complete, not piecemeal, and it's blocked until VIOX field-verifies the water and sewer locations — which Andrew is trying to schedule before Patrick's July 16 trip.",
        },
        {
          t: "The landscape plan carries about 3,000 SF of planting above what's required, so Douglas asked VIOX to trim it toward the required 5,209 SF; a front-yard fence waiver looks unlikely.",
        },
      ],
      sources: [
        { label: "Meeting: Union Collective OAC", href: "/1009/meetings/01KWH7GA0WM1056H4PSJ7B5PQ0", kind: "meeting" },
        { label: "Project inbox", href: "/1009/emails", kind: "inbox" },
      ],
    },
    {
      id: "uniqlo",
      name: "Uniqlo Phillipsburg",
      flag: "decision",
      flagLabel: "Decision",
      points: [
        {
          call: true,
          t: "Your call: take or assign ownership of the $35,100 panel change order ($10.5K materials, $18.6K labor, $6K design), and set the Skypod rule.",
        },
        {
          t: "Yusuke says disrupting Skypod is unacceptable and asked for an “option-B.” Kebba's plan installs without disruption but still needs one extra day afterward to move Skypod onto the new subpanel.",
        },
        {
          t: "No other consultant owns this — TPG, HNY, and AUE aren't contracted to coordinate the new panel, so it stays Alleato's responsibility until UQ approves. TPG is also still waiting on the MEP punch-list closeout responses with photos.",
        },
      ],
      sources: [{ label: "Project inbox", href: "/31/emails", kind: "inbox" }],
    },
    {
      id: "exol",
      name: "Exol Morrisville",
      flag: "risk",
      flagLabel: "At risk",
      points: [
        {
          call: true,
          t: "Your call: a credible schedule is due Wednesday to support contract signing, and it will likely show completion slipping from January into March.",
        },
        {
          t: "It's a $25M job with only 14 submittals logged, and Steve has flagged that questions are going out late and under-referenced — a real credibility risk. Permit submittal is still blocked by ongoing owner design changes.",
        },
        {
          t: "Charging-station power is now routed as overhead drops, avoiding slab trenching. Separately, Wargo has exceeded its credit limit with Kamco, so Alleato needs a joint-check setup — Bob has to sign the paperwork once Misty resends it.",
        },
      ],
      sources: [
        { label: "Meeting: Exol Morrisville Issues", href: "/876/meetings/01KX3ZNYZTSVYN1DXMCSC88RY6", kind: "meeting" },
        { label: "Project inbox", href: "/876/emails", kind: "inbox" },
      ],
    },
    {
      id: "playmakers",
      name: "Playmakers",
      flag: "decision",
      flagLabel: "Decision",
      points: [
        {
          call: true,
          t: "Your call: decide whether Alleato lets Dale self-perform the added FRP at the bar wall, and set the scope and warranty boundary before he buys anything.",
        },
        {
          t: "The permit is expected this week, and Orion Electric has the subcontract out for signature (Alleato still needs its COI and W-9). Largo confirmed mechanical and plumbing aren't in the remodel permit scope.",
        },
      ],
      sources: [{ label: "Project inbox", href: "/1067/emails", kind: "inbox" }],
    },
    {
      id: "finance",
      name: "Alleato Finance",
      flag: "decision",
      flagLabel: "Your call only",
      points: [
        {
          call: true,
          t: "Your call: decide whether to take the Wealth Insight Associates call about a possible $2M–$35M family-office raise, which they'd work to align over the next 60 days.",
        },
      ],
      sources: [{ label: "Project inbox", href: "/60/emails", kind: "inbox" }],
    },
    {
      id: "superior",
      name: "Superior Beverage",
      flag: "watch",
      flagLabel: "Watch",
      points: [
        {
          t: "The sprinkler permit fee ($9,620.20) is paid, but the permit is held until Mack Plumbing's registration package is in — specifically the COI naming the Village and a copy of the state license.",
        },
        {
          t: "Exotec's sprinkler comments still need resolution: whether to revise to one vertical pipe per bay, the final pipe and head sizes, and the Phase 1 rack sequencing.",
        },
      ],
      sources: [{ label: "Project inbox", href: "/178/emails", kind: "inbox" }],
    },
    {
      id: "allisonville",
      name: "Goodwill Allisonville Rd, IN",
      flag: "watch",
      flagLabel: "Closeout",
      points: [
        {
          t: "Substantial completion is set for August 7, and Performance Mechanical still owes its missed submittals, a one-year warranty, and O&M data by July 24 before retainage releases.",
        },
        {
          t: "Two blockers remain open: RFI #16 on the loading-dock joists needs a fast turnaround, and Kimley-Horn's corrected curb-geometry CAD file is being tested with Forefront.",
        },
      ],
      sources: [{ label: "Project inbox", href: "/754/emails", kind: "inbox" }],
    },
    {
      id: "brookville",
      name: "Goodwill Brookville Road",
      flag: "watch",
      flagLabel: "Watch",
      points: [
        {
          t: "The excavation subcontract went to JT P with a start date on or before August 1, and Alleato is waiting on the signed agreement, W-9, COI, and billing contact.",
        },
        {
          t: "Merritt has only sent part of its submittals, and City/Accela permit access is still being moved firmly under Alleato's control.",
        },
      ],
      sources: [{ label: "Project inbox", href: "/877/emails", kind: "inbox" }],
    },
    {
      id: "champaign",
      name: "Champaign Ace Addition",
      flag: "watch",
      flagLabel: "Watch",
      points: [
        {
          t: "The city requires a blank 2-1/2″ review-stamp box in the top-right corner of every sheet, uploaded as one file, or it holds the review; Jerome is reissuing the set today.",
        },
        {
          t: "The Illinois design-firm and CR-number validation is still pending with uncertain state timing, and construction is targeted to start around August 1–3.",
        },
      ],
      sources: [
        { label: "Meeting: Weekly Ace Hardware Champaign", href: "/1008/meetings/01KWWC06P2CQZRMFT70YVHYHK4", kind: "meeting" },
        { label: "Project inbox", href: "/1008/emails", kind: "inbox" },
      ],
    },
  ],
  moving: [
    {
      id: "mclane",
      name: "McLane Jazz, UT",
      resolved: true,
      text: "Exotec and Alleato agreed the vertical sprinkler support mounts to the rear rack uprights, not the front, which were ruled out by robot clearance and the 9 mm holes.",
      source: { label: "Inbox", href: "/879/emails", kind: "inbox" },
    },
    {
      id: "ulta",
      name: "Ulta Greenwood",
      text: "The special inspection is confirmed to be for the column support anchors only, and Andrew is uploading the roof-reinforcement inspection to the portal.",
      source: { label: "Inbox", href: "/1031/emails", kind: "inbox" },
    },
    {
      id: "canton",
      name: "Goodwill Canton, IL",
      text: "GW Washington finishes its original scope by July 21 and Colin starts July 27, while Peru, Morris, and Perkins are being re-budgeted.",
      source: { label: "Inbox", href: "/865/emails", kind: "inbox" },
    },
    {
      id: "niemann",
      name: "Niemann Foods TI",
      text: "The owner call was replaced by an onsite meeting at 1:00 PM CT, and Glendon and Ross both confirmed.",
      source: { label: "Inbox", href: "/38/emails", kind: "inbox" },
    },
  ],
  looseEnds: [
    {
      id: "checks",
      text: "Check batch — the July 9 check batch totals $287,799.13 for printing and mailing from the Indy office and still needs your signature.",
      source: { label: "Email", href: "/emails", kind: "inbox" },
    },
    {
      id: "port",
      text: "Port Collective — the township planning comments were forwarded but aren't in the record, and no owner is attached to the response yet.",
      source: { label: "Inbox", href: "/34/emails", kind: "inbox" },
    },
    {
      id: "pensacola",
      text: "Pensacola sprinkler RFQ — the quotes aren't comparable: Core & Main is $30,690.71 without painting, and Winsupply still owes its painting and sprinkler-head lines.",
      source: { label: "Email", href: "/emails", kind: "inbox" },
    },
    {
      id: "shelter",
      text: "Volunteer shelter build — it's blocked on Jesse finishing the shelter drawings and defining the post requirements.",
      source: { label: "Email", href: "/emails", kind: "inbox" },
    },
    {
      id: "bluebeam",
      text: "Bluebeam Max — the order is stuck in a fulfillment error; Bluebeam opened ticket SOP-12556 and sent a new $0 quote for 5 seats, and Maria has followed up.",
      source: { label: "Email", href: "/emails", kind: "inbox" },
    },
    {
      id: "comunale",
      text: "Comunale Manheim — the fire-alarm estimate is waiting on site-visit dates for 403 S Chiques Rd in Manheim, PA.",
      source: { label: "Email", href: "/emails", kind: "inbox" },
    },
    {
      id: "bluegrass",
      text: "Bluegrass Building Systems — it's still unclear whether their proposal was ever received.",
      source: { label: "Email", href: "/emails", kind: "inbox" },
    },
  ],
  tasks: [
    // Your tasks (Brandon)
    { id: "b1", group: "you", project: "Union Collective", owner: null, action: "Lock solar/roof basis: 45 kW now, sized for 250 kW.", due: null },
    { id: "b2", group: "you", project: "Union Collective", owner: null, action: "Decide VUA landscaping cut toward 5,209 SF and whether to chase the fence waiver.", due: null },
    { id: "b3", group: "you", project: "Uniqlo Phillipsburg", owner: null, action: "Own/assign the $35,100 FA-panel approval; set the Skypod rule.", due: null },
    { id: "b4", group: "you", project: "Exol Morrisville", owner: null, action: "Set the schedule posture — January vs. credible March-risk schedule.", due: null },
    { id: "b5", group: "you", project: "Playmakers", owner: null, action: "Decide on Dale's self-performed FRP + scope/warranty boundary.", due: null },
    { id: "b6", group: "you", project: "Alleato Finance", owner: null, action: "Decide on the $2M–$35M Wealth Insight call.", due: null },
    { id: "b7", group: "you", project: "Check batch", owner: null, action: "Sign the $287,799.13 July 9 batch.", due: null },
    { id: "b8", group: "you", project: "Port Collective", owner: null, action: "Assign an owner for the township planning response.", due: null },
    // Team tasks
    { id: "t1", group: "team", project: "Union Collective", owner: "Douglas Franklin", action: "Send the landscape plan to bidders after cost/code cleanup.", due: "Today" },
    { id: "t2", group: "team", project: "Union Collective", owner: "VIOX", action: "Cut ~3,000 SF excess VUA toward the required 5,209 SF.", due: "Pre-submit" },
    { id: "t3", group: "team", project: "Union Collective", owner: "Elias (VIOX) / Andrew", action: "Field-verify the water & sewer locations.", due: "Before Jul 16" },
    { id: "t4", group: "team", project: "Union Collective", owner: "Elec. + structural eng.", action: "Review the BIPV guides before the solar meeting.", due: "Before call" },
    { id: "t5", group: "team", project: "Union Collective", owner: "Green Valley", action: "Price studs, drywall, ACT, paint, insulation.", due: "Jul 10" },
    { id: "t6", group: "team", project: "Uniqlo Phillipsburg", owner: "Kebba Mass", action: "Give UQ the drop-dead date and build the “option-B” sequence.", due: "Today" },
    { id: "t7", group: "team", project: "Uniqlo Phillipsburg", owner: "Kebba Mass", action: "Issue MEP/architectural punch-list closeout with photos.", due: "ASAP" },
    { id: "t8", group: "team", project: "Exol Morrisville", owner: "Parker Hollingsworth", action: "Build the detailed schedule with realistic durations.", due: "Wed" },
    { id: "t9", group: "team", project: "Exol Morrisville", owner: "Jesse Dawson", action: "Supply trade durations to Parker.", due: "Wed" },
    { id: "t10", group: "team", project: "Exol Morrisville", owner: "Bob Wright / Scott Thomas", action: "Use marked-up drawings + tracking before more client questions.", due: "Next log" },
    { id: "t11", group: "team", project: "Exol Morrisville", owner: "Misty → Bob Wright", action: "Resend the Kamco/Wargo joint-check attachment; Bob signs.", due: "Today" },
    { id: "t12", group: "team", project: "Superior Beverage", owner: "Alec Wehner", action: "Get Mack's COI (Village additional insured) + state license.", due: "ASAP" },
    { id: "t13", group: "team", project: "Superior Beverage", owner: "Design team", action: "Resolve one-pipe-per-bay + Phase 1 rack sequencing.", due: "Pre-permit" },
    { id: "t14", group: "team", project: "Goodwill Allisonville", owner: "CIH", action: "Price the two-door exit-only Detex scope.", due: "ASAP" },
    { id: "t15", group: "team", project: "Goodwill Allisonville", owner: "Design / engineering", action: "Respond to RFI #16 (loading-dock joists).", due: "ASAP" },
    { id: "t16", group: "team", project: "Goodwill Allisonville", owner: "Forefront", action: "Test Kimley-Horn CAD, add control points, send a crew.", due: "ASAP" },
    { id: "t17", group: "team", project: "Goodwill Allisonville", owner: "Performance Mech.", action: "Submit missed submittals, warranty, O&M.", due: "Jul 24" },
    { id: "t18", group: "team", project: "Goodwill Brookville", owner: "Tony Courtney", action: "Collect JT P signed sub, W-9, COI, billing contact.", due: "ASAP" },
    { id: "t19", group: "team", project: "Goodwill Brookville", owner: "Patrick Antone", action: "Upload remaining Merritt docs on receipt.", due: "On receipt" },
    { id: "t20", group: "team", project: "Champaign Ace", owner: "Jerome", action: "Add the 2-1/2″ stamp box to every sheet, reissue.", due: "Today" },
    { id: "t21", group: "team", project: "Champaign Ace", owner: "Douglas Franklin", action: "Upload the full set as one file; track CR-number validation.", due: "On revise" },
    { id: "t22", group: "team", project: "Playmakers", owner: "Orion Electric", action: "Return signed sub, COI (Alleato LLC), W-9.", due: "This week" },
    { id: "t23", group: "team", project: "Playmakers", owner: "Nick Jepson", action: "Confirm City of Largo needs nothing else for permit.", due: "ASAP" },
    { id: "t24", group: "team", project: "McLane Jazz", owner: "Install team", action: "Mount the sprinkler support to rear uprights only.", due: "Pre-install" },
  ],
};
