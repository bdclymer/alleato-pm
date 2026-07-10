"""Parity tests for the canonical Acumatica gross-extended resolver.

Slice 1 of the cost-line deepening is a *behavior-preserving* structural
extract: ``resolve_gross_extended`` must reproduce, byte-for-byte, the three
inline ladders it replaces in ``acumatica_sync.py``. These tests pin that by
replicating each writer's OLD expression (using the real ``_unwrap`` / ``_num``
helpers) and asserting the resolver matches it across a battery of inputs —
including the edge cases the four-axis divergence turns on: wrapped envelopes,
the ``ExtCost`` alias, zero values, and non-numeric junk.

The isolated money fix (dropping the AP legacy flags) lands in a follow-up with
its own reconciliation, so here the AP config is expected to keep matching the
OLD AP behavior, divergences included.
"""

import pytest

from services.acumatica_sync import _num, _unwrap
from services.acumatica_cost_line import resolve_gross_extended


# --- OLD reference ladders (verbatim reproductions of the pre-extract code) ---

def _old_ap_ext(detail):
    # _ap_bill_detail_amounts: ExtendedCost -> Amount, no unwrap, no ExtCost.
    line_total = _num(detail.get("ExtendedCost"))
    if line_total is None:
        line_total = _num(detail.get("Amount"))
    return line_total


def _old_subcontract(detail):
    # _project_subcontracts: first present raw (unwrapped) across the alias
    # ladder, coerced once.
    raw = _unwrap(detail.get("ExtendedCost"))
    if raw is None:
        raw = _unwrap(detail.get("ExtCost"))
    if raw is None:
        raw = _unwrap(detail.get("Amount"))
    return _num(raw)


def _old_purchase_order(detail):
    # _project_purchase_orders: truthiness chain, then `or 0` at the call site.
    return (
        _num(_unwrap(detail.get("ExtendedCost")))
        or _num(_unwrap(detail.get("ExtCost")))
        or _num(_unwrap(detail.get("Amount")))
        or 0
    )


# --- Input battery: exercises every divergence axis ---

BATTERY = [
    {"ExtendedCost": "9947.78", "UnitCost": "8953.00", "Qty": "1"},
    {"ExtendedCost": "55663.55", "UnitCost": "52880.37"},
    {"Amount": "1200.00"},                              # Amount-only
    {"ExtCost": "500.00"},                              # ExtCost alias only
    {"ExtendedCost": {"value": "777.70"}},              # wrapped envelope
    {"ExtCost": {"value": "42.00"}, "Amount": "9"},     # wrapped alias
    {"ExtendedCost": "0", "Amount": "500.00"},          # zero extended, real Amount
    {"ExtendedCost": "0", "ExtCost": "0", "Amount": "0"},  # all zero
    {"ExtendedCost": "", "Amount": "12.34"},            # empty-string extended
    {"ExtendedCost": "not-a-number", "Amount": "3"},    # non-numeric junk
    {"ExtendedCost": "-250.00"},                        # negative adjustment line
    {"UnitCost": "5.00", "Qty": "2"},                   # no extended value at all
    {},                                                 # empty
]


@pytest.mark.parametrize("detail", BATTERY)
def test_ap_config_matches_old_ap_ladder(detail):
    new = resolve_gross_extended(detail, unwrap=False, include_ext_cost=False)
    assert new == _old_ap_ext(detail)


@pytest.mark.parametrize("detail", BATTERY)
def test_subcontract_config_matches_old_subcontract_ladder(detail):
    new = resolve_gross_extended(detail, use_first_present_raw=True)
    assert new == _old_subcontract(detail)


@pytest.mark.parametrize("detail", BATTERY)
def test_purchase_order_config_matches_old_po_ladder(detail):
    # PO applies `or 0` at the call site, which collapses the resolver's
    # None-on-all-zero to 0.0 exactly as the old chain returned 0.
    new = resolve_gross_extended(detail, treat_zero_as_missing=True) or 0
    assert new == _old_purchase_order(detail)


def test_ap_legacy_path_is_the_bug_ext_cost_falls_through_to_net():
    # Documents the divergence the follow-up fixes: an AP detail with only
    # ExtCost + a net Amount silently uses the NET Amount under the legacy flags.
    detail = {"ExtCost": "1000.00", "Amount": "950.00"}
    legacy = resolve_gross_extended(detail, unwrap=False, include_ext_cost=False)
    canonical = resolve_gross_extended(detail)  # defaults = unwrap + ExtCost alias
    assert legacy == 950.00   # net — the bug
    assert canonical == 1000.00  # gross — the fix (applied in the follow-up slice)
