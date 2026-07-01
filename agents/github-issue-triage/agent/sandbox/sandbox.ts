import { defineSandbox } from "eve/sandbox";

export default defineSandbox({
  async onSession({ use }) {
    const sandbox = await use();

    // Eve's GitHub channel checks out the repo into /workspace. Mark it safe up
    // front so hosted git operations do not fail on ownership checks.
    await sandbox.run({
      command:
        "git config --global --add safe.directory /workspace >/dev/null 2>&1 || true",
    });
  },
});
