-- Create procore_tools table to track all Procore tool modules and implementation status
CREATE TABLE IF NOT EXISTS procore_tools (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  new_link TEXT,
  procore_link TEXT,
  description TEXT,
  prp_path TEXT,
  tutorials TEXT,
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Not started',
  action_buttons TEXT,
  test_results TEXT,
  procore_screenshot TEXT,
  procore_workflow TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index on category and status for common queries
CREATE INDEX idx_procore_tools_category ON procore_tools (category);
CREATE INDEX idx_procore_tools_status ON procore_tools (status);
CREATE UNIQUE INDEX idx_procore_tools_slug ON procore_tools (slug);

-- Updated_at trigger
CREATE TRIGGER set_procore_tools_updated_at
  BEFORE UPDATE ON procore_tools
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE procore_tools ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "procore_tools_select" ON procore_tools
  FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert/update (admin-level table)
CREATE POLICY "procore_tools_insert" ON procore_tools
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "procore_tools_update" ON procore_tools
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Seed data from Procore Tools CSV
INSERT INTO procore_tools (name, category, new_link, procore_link, description, prp_path, tutorials, slug, status, action_buttons, test_results, procore_screenshot, procore_workflow)
VALUES
  ('Admin', 'Admin', 'http://localhost:3000/67/admin', 'https://us02.procore.com/562949954728542/project/admin', 'Project configuration, permissions, and settings', '_bmad-output/planning-artifacts/admin', NULL, '/admin', 'Not started', NULL, NULL, NULL, NULL),
  ('Agent Builder', 'Admin', 'http://localhost:3000/67/agent-builder', 'https://us02.procore.com/webclients/host/companies/562949953443325/projects/562949954728542/tools/copilot/agent-builder', 'Build AI-powered agents within Procore', '_bmad-output/planning-artifacts/agent-builder', NULL, '/agent-builder', 'Not started', NULL, NULL, NULL, NULL),
  ('360 Reporting', 'Admin', 'http://localhost:3000/67/reporting', 'https://us02.procore.com/562949954728542/project/enhanced_reports', 'Cross-tool reporting and analytics across the project', '_bmad-output/planning-artifacts/reporting', NULL, '/reporting', 'Not started', NULL, NULL, NULL, NULL),
  ('Workflows', 'Admin', 'http://localhost:3000/67/workflows', 'https://us02.procore.com/562949953443325/company/workflows', NULL, '_bmad-output/planning-artifacts/workflows', NULL, '/workflows', 'Not started', NULL, NULL, NULL, NULL),
  ('AI Insights', 'Admin', 'http://localhost:3000/67/ai-insights', NULL, NULL, '_bmad-output/planning-artifacts/ai-insights', NULL, '/ai-insights', 'Not started', NULL, NULL, NULL, NULL),
  ('Settings', 'Admin', 'http://localhost:3000/67/settings', NULL, NULL, '_bmad-output/planning-artifacts/settings', NULL, '/settings', 'Not started', NULL, NULL, NULL, NULL),
  ('Permissions', 'Admin', 'http://localhost:3000/67/permissions', 'https://us02.procore.com/webclients/host/companies/562949953443325/tools/permissions/permission_templates', NULL, '_bmad-output/planning-artifacts/permissions', 'https://v2.support.procore.com/product-manuals/permissions-company/', '/permissions', 'Not started', NULL, NULL, NULL, NULL),
  ('Documents', 'Core Tools', 'http://localhost:3000/67/documents', 'https://us02.procore.com/webclients/host/companies/562949953443325/projects/562949954728542/tools/documents', 'Centralized document storage and file management', '_bmad-output/planning-artifacts/documents', NULL, '/documents', 'Not started', NULL, NULL, 'https://lgveqfnpkxvzbnnwuled.supabase.co/storage/v1/object/public/procore-screenshots/documents.png', NULL),
  ('Company Directory', 'Core Tools', 'http://localhost:3000/67/company-directory', 'https://us02.procore.com/562949953443325/company/directory/groups/users?page=1&per_page=150&search=&group_by=vendor.id&sort=vendor_name%2Cname', NULL, '_bmad-output/planning-artifacts/company-directory', NULL, '/company-directory', 'Not started', NULL, NULL, NULL, NULL),
  ('Equipment', 'Core Tools', 'http://localhost:3000/67/equipment', 'https://us02.procore.com/webclients/host/companies/562949953443325/tools/equipment', NULL, '_bmad-output/planning-artifacts/equipment', NULL, '/equipment', 'Not started', NULL, NULL, NULL, NULL),
  ('Project Directory', 'Core Tools', 'http://localhost:3000/67/directory', NULL, NULL, '_bmad-output/planning-artifacts/directory', 'https://v2.support.procore.com/product-manuals/directory-project/', '/directory', 'Not started', NULL, NULL, NULL, NULL),
  ('Company Portfolio', 'Core Tools', 'http://localhost:3000/67/portfolio', 'https://us02.procore.com/562949953443325/company/home/list', 'Project overview dashboard with high-level activity and shortcuts', '_bmad-output/planning-artifacts/portfolio', NULL, '/portfolio', 'Not started', NULL, NULL, NULL, NULL),
  ('Tasks', 'Core Tools', 'http://localhost:3000/67/tasks', 'https://us02.procore.com/562949954728542/project/calendar/tasks/562950015601415', 'Task assignment and tracking for project items', '_bmad-output/planning-artifacts/tasks', NULL, '/tasks', 'Not started', NULL, NULL, NULL, NULL),
  ('Estimating', 'Financial', 'http://localhost:3000/67/estimating', NULL, NULL, '_bmad-output/planning-artifacts/estimating', 'https://v2.support.procore.com/product-manuals/estimating-project/tutorials', '/estimating', 'Not started', NULL, NULL, NULL, NULL),
  ('Cost Catalog', 'Financial', 'http://localhost:3000/67/cost-codes', NULL, NULL, '_bmad-output/planning-artifacts/cost-codes', 'https://support.procore.com/products/online/user-guide/company-level/cost-catalog', '/cost-codes', 'Not started', NULL, NULL, NULL, NULL),
  ('Budget', 'Financial', 'http://localhost:3000/67/budget', 'https://us02.procore.com/webclients/host/companies/562949953443325/projects/562949954728542/tools/budgets/budget-details', 'Budget lines, modifications, and history tracking', '_bmad-output/planning-artifacts/budget', 'https://v2.support.procore.com/product-manuals/budget-project', '/budget', 'Running Tests', NULL, NULL, NULL, NULL),
  ('Prime Contracts', 'Financial', 'http://localhost:3000/67/prime-contracts', 'https://us02.procore.com/webclients/host/companies/562949953443325/projects/562949955214786/tools/contracts/prime_contracts/562949958876859/advanced_settings', 'Contract management with SOVs and change orders', '_bmad-output/planning-artifacts/prime-contracts', 'https://v2.support.procore.com/product-manuals/client-contracts-project/', '/prime-contracts', 'Testing', NULL, NULL, NULL, NULL),
  ('Commitments', 'Financial', 'http://localhost:3000/67/commitments', 'https://us02.procore.com/webclients/host/companies/562949953443325/projects/562949955214786/tools/contracts/commitments/work_order_contracts/create', 'Subcontractor commitments and changes', '_bmad-output/planning-artifacts/commitments', 'https://v2.support.procore.com/product-manuals/commitments-project/tutorials', '/commitments', 'Generating Tests', NULL, NULL, NULL, NULL),
  ('Change Events', 'Financial', 'http://localhost:3000/67/change-events', 'https://us02.procore.com/562949954728542/project/change_events/events?view=lines', 'Change event tracking with line items', '_bmad-output/planning-artifacts/change-events', 'https://v2.support.procore.com/product-manuals/change-events-project/tutorials', '/change-events', 'Generating Tests', NULL, NULL, NULL, NULL),
  ('Change Orders', 'Financial', 'http://localhost:3000/67/change-orders', 'https://us02.procore.com/562949954728542/project/change_orders/list', 'Change order workflow with approvals', '_bmad-output/planning-artifacts/change-orders', 'https://v2.support.procore.com/product-manuals/change-orders-project/', '/change-orders', 'Running Tests', NULL, NULL, NULL, NULL),
  ('Direct Costs', 'Financial', 'http://localhost:3000/67/direct-costs', 'https://us02.procore.com/562949954728542/project/direct_costs', 'Direct cost tracking and line items', '_bmad-output/planning-artifacts/direct-costs', 'https://v2.support.procore.com/product-manuals/direct-costs-project/tutorials', '/direct-costs', 'Implementation', NULL, NULL, NULL, NULL),
  ('Invoicing', 'Financial', 'http://localhost:3000/67/invoicing', 'https://us02.procore.com/webclients/host/companies/562949953443325/projects/562949954728542/tools/invoicing/', 'Invoice generation and line items', '_bmad-output/planning-artifacts/invoicing', 'https://v2.support.procore.com/product-manuals/invoicing-project/tutorials', '/invoicing', 'Generating Tests', NULL, NULL, NULL, NULL),
  ('Daily Logs', 'Project Mgmt', 'http://localhost:3000/67/daily-log', 'https://us02.procore.com/webclients/host/companies/562949953443325/projects/562949954728542/tools/dailylog', NULL, '_bmad-output/planning-artifacts/daily-log', 'https://v2.support.procore.com/product-manuals/daily-log-project/tutorials', '/daily-log', 'Implementation', NULL, NULL, NULL, NULL),
  ('Transmittals', 'Project Mgmt', 'http://localhost:3000/67/transmittals', 'https://us02.procore.com/562949954728542/project/transmittals/list?sort=number&view=list&per_page=150&page=1', 'Send and track official document transmissions', '_bmad-output/planning-artifacts/transmittals', NULL, '/transmittals', 'Review', NULL, NULL, NULL, NULL),
  ('Punch List', 'Project Mgmt', 'http://localhost:3000/67/punch-list', 'https://us02.procore.com/webclients/host/companies/562949953443325/projects/562949954728542/tools/punchlist/list', 'Create and manage punch list items', '_bmad-output/planning-artifacts/punch-list', NULL, '/punch-list', 'Review', NULL, NULL, NULL, NULL),
  ('Emails', 'Project Mgmt', 'http://localhost:3000/67/emails', 'https://us02.procore.com/562949954728542/project/communications', 'The Punch List tool is used at the end of construction/project phases to track remaining work items, assign responsibilities, set due dates, and maintain a real-time history of all actions.', '_bmad-output/planning-artifacts/emails', NULL, '/emails', 'Review', NULL, NULL, NULL, NULL),
  ('Specifications', 'Project Mgmt', 'http://localhost:3000/67/specifications', 'https://us02.procore.com/562949954728542/project/specification_sections', 'Create Division, Create Specification, Specifications, All Revisions, Trash', '_bmad-output/planning-artifacts/specifications', 'https://v2.support.procore.com/product-manuals/specifications-project/tutorials', '/specifications', 'Review', 'Create, Export, Upload', NULL, 'https://lgveqfnpkxvzbnnwuled.supabase.co/storage/v1/object/public/procore-screenshots/specifications.png', NULL),
  ('Photos', 'Project Mgmt', 'http://localhost:3000/67/photos', 'https://us02.procore.com/webclients/host/companies/562949953443325/projects/562949954728542/tools/photos', NULL, '_bmad-output/planning-artifacts/photos', NULL, '/photos', 'Review', NULL, NULL, 'https://lgveqfnpkxvzbnnwuled.supabase.co/storage/v1/object/public/procore-screenshots/photos.png', NULL),
  ('Materials', 'Project Mgmt', 'http://localhost:3000/67/materials', NULL, NULL, '_bmad-output/planning-artifacts/materials', NULL, '/materials', 'Not started', NULL, NULL, NULL, NULL),
  ('Drawings', 'Project Mgmt', 'http://localhost:3000/67/drawings', 'https://us02.procore.com/webclients/host/companies/562949953443325/projects/562949954728542/tools/drawings/areas/562949954293344/revisions?tab=revisions&filter_drawing_set=current', NULL, '_bmad-output/planning-artifacts/drawings', 'https://v2.support.procore.com/product-manuals/drawings-project/tutorials', '/drawings', 'Implementation', NULL, NULL, 'https://lgveqfnpkxvzbnnwuled.supabase.co/storage/v1/object/public/procore-screenshots/Drawings.png', 'Procore%20Tools/diagram_drawings_tool-overview.png'),
  ('Meetings', 'Project Mgmt', 'http://localhost:3000/67/meetings', 'https://us02.procore.com/webclients/host/companies/562949953443325/projects/562949954728542/tools/meetings/list', NULL, '_bmad-output/planning-artifacts/meetings', NULL, '/meetings', 'Review', NULL, NULL, NULL, NULL),
  ('RFIs', 'Project Mgmt', 'http://localhost:3000/67/rfis', 'https://us02.procore.com/webclients/host/companies/562949953443325/projects/562949954728542/tools/rfis?view=list&locale=en&page=1&per_page=150', NULL, '_bmad-output/planning-artifacts/rfis', 'https://v2.support.procore.com/product-manuals/rfi-project/tutorials', '/rfis', 'Implementation', NULL, NULL, NULL, NULL),
  ('Schedule', 'Project Mgmt', 'http://localhost:3000/67/schedule', 'https://us02.procore.com/webclients/host/companies/562949953443325/projects/562949954728542/tools/schedulemgmt', NULL, '_bmad-output/planning-artifacts/schedule', 'https://v2.support.procore.com/product-manuals/schedule-project/tutorials', '/schedule', 'Review', NULL, NULL, NULL, NULL),
  ('Submittals', 'Project Mgmt', 'http://localhost:3000/67/suubmittals', 'https://us02.procore.com/webclients/host/companies/562949953443325/projects/562949954728542/tools/submittals?view=list', NULL, '_bmad-output/planning-artifacts/suubmittals', NULL, '/suubmittals', 'Review', NULL, NULL, NULL, NULL);
