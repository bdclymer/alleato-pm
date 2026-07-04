# Drawings QR / Markup Frontend Verification

Date: 2026-07-04
Skill: agent-browser lightweight frontend verification
Scope: Brandon feedback #574 QR/deep-link login and #575 cloud/markup contextual actions.

## Results

| Check | Result | Evidence |
| --- | --- | --- |
| Generic drawings callback `/876/drawings` after login | Pass | `login-callback-result.png` shows post-login URL at `/876/drawings`. |
| Exact viewer route loads when already authenticated | Pass | `viewer-direct-authenticated.png` shows `/876/drawings/viewer/e3d94aff-7d3c-491f-8374-fb8e5b2529fa` with drawing viewer and toolbar. |
| Exact viewer deep link survives login | Fail | `viewer-deeplink-login-after-wait.png` shows still on `/auth/login?callbackUrl=/876/drawings/viewer/...` after login, with disabled fields and `Signing in...`. |
| Cloud markup can be created and selected | Partial pass | `cloud-created.png` shows selected cloud with contextual actions: color swatches, Link, Delete markup, Dismiss. |
| Cloud contextual Link action works | Fail | `cloud-link-action.png` shows app error state after clicking contextual Link; visible error text: `Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.` |

## Classification

- #574 QR/deep link: Not fixed. The specific drawing viewer callback does not return to the drawing after login.
- #575 Cloud/markup actions: Partially present but not fixed. The selected cloud exposes Link/Delete/Dismiss actions, but clicking Link crashes the drawing viewer route.

## Recommended Fix Scope

Move from verification to a drawings fix task focused on:
1. Auth callback handling for exact drawing viewer URLs.
2. Cloud selected-markup Link action crash/recovery.
3. Regression guardrail for both flows using the viewer route above.

## Post-Fix Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Exact viewer deep link survives login | Pass | `viewer-deeplink-fixed.png` shows fresh login returning to `/876/drawings/viewer/e3d94aff-7d3c-491f-8374-fb8e5b2529fa`. |
| Cloud contextual Link action works | Pass | `cloud-link-action-fixed.png` shows the Link modal with RFI/Punch/Drawing/Photo/Coordination/Task options instead of the error boundary. |

## Fix Notes

- Login now resolves the post-login redirect with an explicit timeout and falls back to the validated callback URL if the redirect API stalls.
- Drawing HTML overlays are rendered through portal-owned DOM containers before being handed to OpenSeadragon, so React no longer unmounts a node that OpenSeadragon moved into its overlay layer.
