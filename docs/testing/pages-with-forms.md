# Pages With Forms

All pages in the application that contain a form, create/edit dialog, or inline form UI.

**Last updated:** 2026-04-10

---

## Budget
| URL | Form Type |
|-----|-----------|
| `/[projectId]/budget` | Inline create/edit dialogs |
| `/[projectId]/budget/line-item/new` | Create budget line item |

## Change Events
| URL | Form Type |
|-----|-----------|
| `/[projectId]/change-events` | Create dialog inline |
| `/[projectId]/change-events/new` | Full create form |
| `/[projectId]/change-events/[changeEventId]` | Edit form |

## Change Orders
| URL | Form Type |
|-----|-----------|
| `/[projectId]/change-orders/prime/new` | Create prime CO |
| `/[projectId]/change-orders/prime/[primeCoId]` | Edit prime CO |
| `/[projectId]/change-orders/commitment/new` | Create commitment CO |
| `/[projectId]/change-orders/commitment/[commitmentCoId]` | Edit commitment CO |

## PCOs
| URL | Form Type |
|-----|-----------|
| `/[projectId]/pcos/new` | Create PCO |
| `/[projectId]/pcos/[pcoId]` | Detail with edit |
| `/[projectId]/pcos/[pcoId]/edit` | Edit PCO |

## Prime Contracts
| URL | Form Type |
|-----|-----------|
| `/[projectId]/prime-contracts` | Create dialog inline |
| `/[projectId]/prime-contracts/new` | Full create form |
| `/[projectId]/prime-contracts/[contractId]` | Edit form |

## Commitments
| URL | Form Type |
|-----|-----------|
| `/[projectId]/commitments` | Create dialog inline |
| `/[projectId]/commitments/new` | Full create form |
| `/[projectId]/commitments/[commitmentId]` | Detail with edit |
| `/[projectId]/commitments/[commitmentId]/edit` | Edit form |

## Direct Costs
| URL | Form Type |
|-----|-----------|
| `/[projectId]/direct-costs/new` | Create form |
| `/[projectId]/direct-costs/[costId]` | Edit form |

## Invoicing
| URL | Form Type |
|-----|-----------|
| `/[projectId]/invoicing` | Create dialog inline |
| `/[projectId]/invoicing/new` | Create form |
| `/[projectId]/invoicing/[invoiceId]` | Edit form |
| `/[projectId]/invoices/new` | Create invoice |
| `/[projectId]/invoices` | Dialog inline |
| `/[projectId]/billing-periods` | Create/edit dialogs |

## RFIs
| URL | Form Type |
|-----|-----------|
| `/[projectId]/rfis/new` | Create RFI |

## Estimates
| URL | Form Type |
|-----|-----------|
| `/[projectId]/estimates/new` | Create estimate |

## Specifications
| URL | Form Type |
|-----|-----------|
| `/[projectId]/specifications` | Upload/edit dialogs |
| `/[projectId]/specifications/[sectionId]` | Edit section |

## Drawings & Photos
| URL | Form Type |
|-----|-----------|
| `/[projectId]/drawings` | Upload/create dialogs |
| `/[projectId]/drawings/[drawingId]` | Edit dialog |
| `/[projectId]/photos` | Upload/create dialogs |

## Submittals
| URL | Form Type |
|-----|-----------|
| `/[projectId]/submittals` | Create dialog inline |

## Meetings
| URL | Form Type |
|-----|-----------|
| `/[projectId]/meetings/schedule` | Schedule form |

## Directory
| URL | Form Type |
|-----|-----------|
| `/[projectId]/directory` | Create dialogs |
| `/directory/contacts` | Create dialog |
| `/directory/contacts/[contactId]` | Edit dialog |
| `/directory/companies/[companyId]` | Edit form |
| `/directory/vendors/[vendorId]` | Edit form |
| `/directory/groups` | Create/edit dialogs |

## Project & Settings
| URL | Form Type |
|-----|-----------|
| `/create-project` | Create project form |
| `/settings/users` | Invite dialog |
| `/settings/users/[userId]` | Edit user form |

## Global / Other
| URL | Form Type |
|-----|-----------|
| `/fm-global` | Form dialogs |
| `/fm-global/form` | Form |
