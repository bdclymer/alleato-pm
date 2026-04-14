## Guardrail Checklist

- [ ] Root cause is stated clearly.
- [ ] Detection gap is documented.
- [ ] Prevention step is documented.
- [ ] The fix avoids silent failures and generic errors.
- [ ] At least one recurrence guardrail was added.

## Validation

- [x] `pnpm --dir frontend run quality`
- [x] `pnpm run check:routes`
