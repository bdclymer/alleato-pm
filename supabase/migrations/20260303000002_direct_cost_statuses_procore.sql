-- Align direct cost statuses with Procore workflow
-- Draft, Pending, Revise and Resubmit, Approved

-- Normalize legacy statuses before tightening the check constraint
UPDATE public.direct_costs
SET status = 'Revise and Resubmit'
WHERE status = 'Rejected';

UPDATE public.direct_costs
SET status = 'Approved'
WHERE status = 'Paid';

ALTER TABLE public.direct_costs
DROP CONSTRAINT IF EXISTS direct_costs_status_check;

ALTER TABLE public.direct_costs
ADD CONSTRAINT direct_costs_status_check
CHECK (
  status = ANY (
    ARRAY[
      'Draft'::text,
      'Pending'::text,
      'Revise and Resubmit'::text,
      'Approved'::text
    ]
  )
);
