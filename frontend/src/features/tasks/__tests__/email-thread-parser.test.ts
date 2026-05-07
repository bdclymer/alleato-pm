import {
  cleanSourceContextText,
  extractContextBody,
  parseEmailThread,
} from "../email-thread-parser";

const permitPendingThread = `
Subject: Re: Permit Pending | STR26-00599
Date: 2026-04-29T21:44:17Z
From: Brandon Clymer <bclymer@alleatogroup.com>
To: Jesse Dawson <jdawson@alleatogroup.com>, Ashley Ortiz <aortiz@alleatogroup.com>, Jazmin Gaona <jgaona@alleatogroup.com>
@Jazmin Gaona is in charge of managing licenses.

From: Jesse Dawson <jdawson@alleatogroup.com>
Sent: Wednesday, April 29, 2026 3:55 PM
To: Brandon Clymer <bclymer@alleatogroup.com>
Subject: Re: Permit Pending | STR26-00599 Who is going to manage this?

From: Ashley Ortiz <aortiz@alleatogroup.com>
Sent: Wednesday, April 29, 2026 11:26 AM
To: Jesse Dawson <jdawson@alleatogroup.com>
Subject: Re: Permit Pending | STR26-00599 Please see below.

From: Brandon Clymer <bclymer@alleatogroup.com>
Sent: Wednesday, April 29, 2026 11:09 AM
To: Ashley Ortiz <aortiz@alleatogroup.com>
Subject: Fw: Permit Pending | STR26-00599 See below.

From: Contractors <CONTRACTORS@indy.gov>
Sent: Wednesday, April 29, 2026 10:37 AM
To: Brandon Clymer <bclymer@alleatogroup.com>
Subject: Permit Pending | STR26-00599 Hello, We need license information.
`;

describe("email thread parser", () => {
  it("splits replied and forwarded Outlook-style context into separate messages", () => {
    const messages = parseEmailThread(cleanSourceContextText(permitPendingThread));

    expect(messages).toHaveLength(5);
    expect(messages.map((message) => message.subject)).toEqual([
      "Re: Permit Pending | STR26-00599",
      "Re: Permit Pending | STR26-00599",
      "Re: Permit Pending | STR26-00599",
      "Fw: Permit Pending | STR26-00599",
      "Permit Pending | STR26-00599",
    ]);
    expect(messages[0]).toMatchObject({
      date: "2026-04-29T21:44:17Z",
      from: "Brandon Clymer",
      to: "Jesse Dawson, Ashley Ortiz, Jazmin Gaona",
      body: "@Jazmin Gaona is in charge of managing licenses.",
    });
    expect(messages[4]).toMatchObject({
      date: "Wednesday, April 29, 2026 10:37 AM",
      from: "Contractors",
      body: "Hello, We need license information.",
    });
  });

  it("keeps header metadata out of the latest email body", () => {
    const [latest] = parseEmailThread(cleanSourceContextText(permitPendingThread));

    expect(latest.body).toBe("@Jazmin Gaona is in charge of managing licenses.");
    expect(latest.body).not.toContain("Subject:");
    expect(latest.body).not.toContain("Date:");
    expect(latest.body).not.toContain("From:");
    expect(latest.body).not.toContain("To:");
  });

  it("falls back to a single readable context body for non-thread text", () => {
    const body = extractContextBody(
      cleanSourceContextText(`
        Subject: Daily update
        From: Brandon Clymer <bclymer@alleatogroup.com>
        To: Megan Harrison <megan@example.com>
        Please follow up on the permit this afternoon.
      `),
    );

    expect(body).toBe("Please follow up on the permit this afternoon.");
  });

  it("removes email signatures and contact footer noise from message bodies", () => {
    const [message] = parseEmailThread(
      cleanSourceContextText(`
        Subject: Re: Permit Pending
        From: Brandon Clymer <bclymer@alleatogroup.com>
        To: Jazmin Gaona <jgaona@alleatogroup.com>
        @Jazmin Gaona is in charge of managing licenses.
        Thank You
        Brandon Clymer CEO at Alleato Group Mobile 317.760.0088 | Email bclymer@alleatogroup.com
        Web www.alleatogroup.com
      `),
    );

    expect(message.body).toBe("@Jazmin Gaona is in charge of managing licenses.");
    expect(message.body).not.toContain("bclymer@alleatogroup.com");
    expect(message.body).not.toContain("Mobile");
  });
});
