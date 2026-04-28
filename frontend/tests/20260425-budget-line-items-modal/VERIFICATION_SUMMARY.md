# Budget Line Items Modal Verification

- Target: `http://localhost:3000/983/budget`
- Flow: logged in with app test credentials, opened `Create`, selected `Budget Line Item`.
- Result: add-line-items overlay rendered as a centered dialog, not a right-side sheet.
- Evidence: `budget-line-items-modal.png`
- Dialog measurement: viewport `1280px`, dialog width `1152px`, left `64px`, right `1216px`, `nearRightEdge=false`.
