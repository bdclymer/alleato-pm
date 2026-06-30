import { defineSchedule } from "eve/schedules";

export default defineSchedule({
  cron: "0 13 * * 1-5",
  async run({ waitUntil }) {
    waitUntil(
      Promise.resolve().then(() => {
        console.info(
          "Project Intelligence maintainer schedule fired. Delivery is intentionally report-only in v1; use the eve channel or wire Slack/Linear delivery before enabling notifications.",
        );
      }),
    );
  },
});
