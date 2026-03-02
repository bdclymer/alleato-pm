---
title: SCHEMA DailyLogs
description: SCHEMA DailyLogs documentation
---

# Daily Logs Database Schema

## Database Tables Overview

The Daily Logs system consists of a main `daily_logs` table with 12 specialized sub-tables for different log types, providing comprehensive construction site documentation. Schema design based on analysis of Procore's Daily Log feature.

### Table Relationships

```text
daily_logs (1)
├── daily_log_weather (1:n)
├── daily_log_manpower (1:n) ✅ IMPLEMENTED
├── daily_log_equipment (1:n) ✅ IMPLEMENTED
├── daily_log_visitors (1:n)
├── daily_log_notes (1:n) ✅ IMPLEMENTED
├── daily_log_deliveries (1:n)
├── daily_log_safety (1:n)
├── daily_log_inspections (1:n)
├── daily_log_waste (1:n)
├── daily_log_productivity (1:n)
├── daily_log_delays (1:n)
└── daily_log_attachments (1:n)
```sql
## Table Definitions

### 1. daily_logs (Main Table) ✅ IMPLEMENTED

```sql
CREATE TABLE daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id BIGINT NOT NULL REFERENCES projects(id),
  log_date DATE NOT NULL,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  weather_conditions JSONB,
  general_notes TEXT,
  shift_info JSONB, -- Start time, end time, break times
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  UNIQUE(project_id, log_date), -- One log per project per date
  CHECK(log_date <= CURRENT_DATE) -- Cannot log future dates
);

-- Indexes
CREATE INDEX idx_daily_logs_project_date ON daily_logs(project_id, log_date DESC);
CREATE INDEX idx_daily_logs_created_by ON daily_logs(created_by);
CREATE INDEX idx_daily_logs_date_range ON daily_logs(log_date DESC);
```sql
### 2. daily_log_weather ⚠️ NEEDS IMPLEMENTATION
```sql
CREATE TABLE daily_log_weather (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_log_id UUID NOT NULL REFERENCES daily_logs(id) ON DELETE CASCADE,
  time_observed TIME,
  delay BOOLEAN DEFAULT false,
  sky_condition TEXT, -- Clear, Cloudy, Overcast, etc.
  temperature_high DECIMAL(5,2),
  temperature_low DECIMAL(5,2),
  temperature_unit CHAR(1) DEFAULT 'F' CHECK (temperature_unit IN ('F', 'C')),
  calamity_event TEXT, -- Severe weather events
  precipitation_type TEXT, -- Rain, Snow, Sleet, etc.
  precipitation_amount DECIMAL(5,2),
  wind_speed DECIMAL(5,2),
  wind_direction TEXT,
  ground_conditions TEXT,
  sea_conditions TEXT,
  humidity_percent INTEGER CHECK (humidity_percent BETWEEN 0 AND 100),
  comments TEXT,
  weather_delay_hours DECIMAL(4,2),
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CHECK(temperature_high >= temperature_low),
  CHECK(precipitation_amount >= 0),
  CHECK(wind_speed >= 0)
);

-- Indexes
CREATE INDEX idx_weather_daily_log ON daily_log_weather(daily_log_id);
CREATE INDEX idx_weather_delay ON daily_log_weather(delay) WHERE delay = true;
```

### 3. daily_log_manpower ✅ IMPLEMENTED

```sql
-- Current implementation (existing)
CREATE TABLE daily_log_manpower (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_log_id UUID REFERENCES daily_logs(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id),
  trade TEXT, -- Carpenter, Electrician, Plumber, etc.
  workers_count INTEGER NOT NULL CHECK (workers_count > 0),
  hours_worked DECIMAL(4,2) CHECK (hours_worked >= 0),
  location TEXT,
  comments TEXT,
  overtime_hours DECIMAL(4,2) DEFAULT 0,
  cost_code TEXT, -- Budget code reference
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enhanced version with additional fields
ALTER TABLE daily_log_manpower
ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS shift_start TIME,
ADD COLUMN IF NOT EXISTS shift_end TIME,
ADD COLUMN IF NOT EXISTS break_duration DECIMAL(3,2);

-- Indexes
CREATE INDEX idx_manpower_daily_log ON daily_log_manpower(daily_log_id);
CREATE INDEX idx_manpower_company ON daily_log_manpower(company_id);
CREATE INDEX idx_manpower_trade ON daily_log_manpower(trade);
```sql
### 4. daily_log_equipment ✅ IMPLEMENTED
```sql
-- Current implementation (existing)
CREATE TABLE daily_log_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_log_id UUID REFERENCES daily_logs(id) ON DELETE CASCADE,
  equipment_name TEXT NOT NULL,
  hours_operated DECIMAL(4,2) CHECK (hours_operated >= 0),
  hours_idle DECIMAL(4,2) CHECK (hours_idle >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enhanced version with additional fields
ALTER TABLE daily_log_equipment
ADD COLUMN IF NOT EXISTS equipment_id UUID REFERENCES equipment(id),
ADD COLUMN IF NOT EXISTS operator_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS fuel_consumed DECIMAL(6,2),
ADD COLUMN IF NOT EXISTS maintenance_performed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS equipment_condition TEXT CHECK (equipment_condition IN ('Excellent', 'Good', 'Fair', 'Poor', 'Out of Service'));

-- Indexes
CREATE INDEX idx_equipment_daily_log ON daily_log_equipment(daily_log_id);
CREATE INDEX idx_equipment_name ON daily_log_equipment(equipment_name);
```sql
### 5. daily_log_visitors ⚠️ NEEDS IMPLEMENTATION

```sql
CREATE TABLE daily_log_visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_log_id UUID NOT NULL REFERENCES daily_logs(id) ON DELETE CASCADE,
  visitor_name TEXT NOT NULL,
  company_name TEXT,
  company_id UUID REFERENCES companies(id),
  contact_phone TEXT,
  contact_email TEXT,
  badge_number TEXT,
  purpose_of_visit TEXT,
  areas_visited TEXT,
  escort_required BOOLEAN DEFAULT false,
  escort_id UUID REFERENCES users(id),
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  safety_briefing_completed BOOLEAN DEFAULT false,
  ppe_provided BOOLEAN DEFAULT false,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CHECK(check_out_time IS NULL OR check_out_time >= check_in_time)
);

-- Indexes
CREATE INDEX idx_visitors_daily_log ON daily_log_visitors(daily_log_id);
CREATE INDEX idx_visitors_company ON daily_log_visitors(company_id);
CREATE INDEX idx_visitors_check_in ON daily_log_visitors(check_in_time);
```sql
### 6. daily_log_notes ✅ IMPLEMENTED
```sql
-- Current implementation (existing)
CREATE TABLE daily_log_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_log_id UUID REFERENCES daily_logs(id) ON DELETE CASCADE,
  category TEXT,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enhanced version with additional fields
ALTER TABLE daily_log_notes
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Normal' CHECK (priority IN ('Low', 'Normal', 'High', 'Critical')),
ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS follow_up_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed'));

-- Indexes
CREATE INDEX idx_notes_daily_log ON daily_log_notes(daily_log_id);
CREATE INDEX idx_notes_category ON daily_log_notes(category);
CREATE INDEX idx_notes_priority ON daily_log_notes(priority);
```

### 7. daily_log_deliveries ⚠️ NEEDS IMPLEMENTATION

```sql
CREATE TABLE daily_log_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_log_id UUID NOT NULL REFERENCES daily_logs(id) ON DELETE CASCADE,
  delivery_time TIMESTAMPTZ,
  delivery_company TEXT NOT NULL,
  driver_name TEXT,
  truck_info TEXT, -- License plate, truck number
  tracking_number TEXT,
  purchase_order TEXT,
  contents TEXT NOT NULL,
  quantity DECIMAL(10,2),
  units TEXT,
  delivery_location TEXT,
  received_by_id UUID REFERENCES users(id),
  condition_on_arrival TEXT,
  damages_noted BOOLEAN DEFAULT false,
  damage_description TEXT,
  delivery_confirmed BOOLEAN DEFAULT false,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CHECK(quantity > 0 OR quantity IS NULL),
  CHECK(NOT (damages_noted = true AND damage_description IS NULL))
);

-- Indexes
CREATE INDEX idx_deliveries_daily_log ON daily_log_deliveries(daily_log_id);
CREATE INDEX idx_deliveries_time ON daily_log_deliveries(delivery_time);
CREATE INDEX idx_deliveries_company ON daily_log_deliveries(delivery_company);
```sql
### 8. daily_log_safety ⚠️ NEEDS IMPLEMENTATION
```sql
CREATE TABLE daily_log_safety (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_log_id UUID NOT NULL REFERENCES daily_logs(id) ON DELETE CASCADE,
  incident_type TEXT NOT NULL, -- Near miss, Injury, Property damage, etc.
  severity_level TEXT CHECK (severity_level IN ('Low', 'Medium', 'High', 'Critical')),
  incident_time TIMESTAMPTZ,
  location TEXT,
  people_involved TEXT,
  companies_involved TEXT,
  description TEXT NOT NULL,
  immediate_actions TEXT,
  root_cause TEXT,
  corrective_actions TEXT,
  safety_notice_issued BOOLEAN DEFAULT false,
  notice_issued_to TEXT,
  compliance_due_date DATE,
  investigation_required BOOLEAN DEFAULT false,
  investigation_completed BOOLEAN DEFAULT false,
  reportable_to_authorities BOOLEAN DEFAULT false,
  reported_at TIMESTAMPTZ,
  status TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'Under Investigation', 'Resolved', 'Closed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_safety_daily_log ON daily_log_safety(daily_log_id);
CREATE INDEX idx_safety_type ON daily_log_safety(incident_type);
CREATE INDEX idx_safety_severity ON daily_log_safety(severity_level);
CREATE INDEX idx_safety_status ON daily_log_safety(status);
```sql
### 9. daily_log_inspections ⚠️ NEEDS IMPLEMENTATION

```sql
CREATE TABLE daily_log_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_log_id UUID NOT NULL REFERENCES daily_logs(id) ON DELETE CASCADE,
  inspection_type TEXT NOT NULL, -- Quality, Safety, Environmental, etc.
  inspection_area TEXT,
  inspector_name TEXT NOT NULL,
  inspector_company TEXT,
  inspector_certification TEXT,
  inspecting_entity TEXT, -- Internal, Third party, Government
  scheduled_time TIMESTAMPTZ,
  actual_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  inspection_scope TEXT,
  results TEXT,
  passed BOOLEAN,
  deficiencies_found TEXT,
  corrective_actions TEXT,
  reinspection_required BOOLEAN DEFAULT false,
  reinspection_date DATE,
  certificate_issued BOOLEAN DEFAULT false,
  certificate_number TEXT,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_inspections_daily_log ON daily_log_inspections(daily_log_id);
CREATE INDEX idx_inspections_type ON daily_log_inspections(inspection_type);
CREATE INDEX idx_inspections_inspector ON daily_log_inspections(inspector_name);
```sql
### 10. daily_log_waste ⚠️ NEEDS IMPLEMENTATION
```sql
CREATE TABLE daily_log_waste (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_log_id UUID NOT NULL REFERENCES daily_logs(id) ON DELETE CASCADE,
  waste_type TEXT NOT NULL, -- Construction debris, Hazardous, Recycling
  material_description TEXT NOT NULL,
  estimated_quantity DECIMAL(10,2) NOT NULL,
  quantity_units TEXT DEFAULT 'cubic yards',
  disposal_method TEXT, -- Landfill, Recycling, Hazmat facility
  disposal_company TEXT,
  disposal_location TEXT,
  disposal_time TIMESTAMPTZ,
  disposed_by_name TEXT,
  truck_license TEXT,
  waste_manifest_number TEXT,
  environmental_impact TEXT,
  recycling_percentage DECIMAL(5,2),
  disposal_cost DECIMAL(10,2),
  hazardous_materials BOOLEAN DEFAULT false,
  permits_required BOOLEAN DEFAULT false,
  permit_numbers TEXT,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CHECK(estimated_quantity > 0),
  CHECK(recycling_percentage IS NULL OR recycling_percentage BETWEEN 0 AND 100)
);

-- Indexes
CREATE INDEX idx_waste_daily_log ON daily_log_waste(daily_log_id);
CREATE INDEX idx_waste_type ON daily_log_waste(waste_type);
CREATE INDEX idx_waste_hazardous ON daily_log_waste(hazardous_materials) WHERE hazardous_materials = true;
```

### 11. daily_log_productivity ⚠️ NEEDS IMPLEMENTATION

```sql
CREATE TABLE daily_log_productivity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_log_id UUID NOT NULL REFERENCES daily_logs(id) ON DELETE CASCADE,
  activity_name TEXT NOT NULL,
  resource_type TEXT, -- Labor, Equipment, Material
  resource_name TEXT,
  planned_units DECIMAL(10,2),
  actual_units DECIMAL(10,2),
  unit_of_measure TEXT,
  efficiency_percentage DECIMAL(5,2),
  cost_code TEXT,
  budget_line_item TEXT,
  crew_size INTEGER,
  hours_worked DECIMAL(4,2),
  productivity_rate DECIMAL(8,4), -- Units per hour
  quality_rating TEXT CHECK (quality_rating IN ('Excellent', 'Good', 'Acceptable', 'Poor')),
  rework_required BOOLEAN DEFAULT false,
  rework_percentage DECIMAL(5,2),
  obstacles_encountered TEXT,
  weather_impact BOOLEAN DEFAULT false,
  schedule_impact TEXT,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CHECK(planned_units > 0 OR planned_units IS NULL),
  CHECK(actual_units >= 0 OR actual_units IS NULL),
  CHECK(efficiency_percentage >= 0 OR efficiency_percentage IS NULL),
  CHECK(rework_percentage IS NULL OR rework_percentage BETWEEN 0 AND 100)
);

-- Indexes
CREATE INDEX idx_productivity_daily_log ON daily_log_productivity(daily_log_id);
CREATE INDEX idx_productivity_activity ON daily_log_productivity(activity_name);
CREATE INDEX idx_productivity_resource ON daily_log_productivity(resource_type);
```sql
### 12. daily_log_delays ⚠️ NEEDS IMPLEMENTATION
```sql
CREATE TABLE daily_log_delays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_log_id UUID NOT NULL REFERENCES daily_logs(id) ON DELETE CASCADE,
  delay_type TEXT NOT NULL, -- Weather, Material, Equipment, Labor, etc.
  delay_category TEXT, -- Internal, External, Force Majeure
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_hours DECIMAL(4,2),
  affected_activities TEXT,
  affected_crews TEXT,
  root_cause TEXT NOT NULL,
  responsible_party TEXT,
  impact_description TEXT,
  cost_impact DECIMAL(10,2),
  schedule_impact_days INTEGER,
  mitigation_actions TEXT,
  prevention_measures TEXT,
  excusable BOOLEAN,
  compensable BOOLEAN,
  claim_potential BOOLEAN DEFAULT false,
  notification_sent BOOLEAN DEFAULT false,
  notification_time TIMESTAMPTZ,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CHECK(end_time IS NULL OR end_time >= start_time),
  CHECK(duration_hours > 0 OR duration_hours IS NULL),
  CHECK(schedule_impact_days >= 0 OR schedule_impact_days IS NULL)
);

-- Indexes
CREATE INDEX idx_delays_daily_log ON daily_log_delays(daily_log_id);
CREATE INDEX idx_delays_type ON daily_log_delays(delay_type);
CREATE INDEX idx_delays_start_time ON daily_log_delays(start_time);
```sql
### 13. daily_log_attachments ⚠️ NEEDS IMPLEMENTATION

```sql
CREATE TABLE daily_log_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_log_id UUID NOT NULL REFERENCES daily_logs(id) ON DELETE CASCADE,
  section_type TEXT, -- weather, manpower, equipment, etc.
  section_item_id UUID, -- Reference to specific log entry
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  mime_type TEXT,
  upload_time TIMESTAMPTZ DEFAULT now(),
  uploaded_by UUID REFERENCES users(id),
  description TEXT,
  tags TEXT[],
  is_photo BOOLEAN DEFAULT false,
  photo_location TEXT,
  photo_timestamp TIMESTAMPTZ,
  thumbnail_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CHECK(file_size > 0 OR file_size IS NULL)
);

-- Indexes
CREATE INDEX idx_attachments_daily_log ON daily_log_attachments(daily_log_id);
CREATE INDEX idx_attachments_section ON daily_log_attachments(section_type, section_item_id);
CREATE INDEX idx_attachments_photo ON daily_log_attachments(is_photo) WHERE is_photo = true;
```sql
## Data Migration Scripts

### Migration from Basic to Enhanced Schema
```sql
-- Add missing columns to existing tables
BEGIN;

-- Enhance daily_logs table
ALTER TABLE daily_logs
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS general_notes TEXT,
ADD COLUMN IF NOT EXISTS shift_info JSONB;

-- Add unique constraint for one log per project per date
ALTER TABLE daily_logs
ADD CONSTRAINT unique_project_date UNIQUE(project_id, log_date);

-- Create missing tables
-- (Use CREATE TABLE statements from above)

COMMIT;
```

### Sample Data Population

```sql
-- Sample weather conditions
INSERT INTO daily_log_weather (daily_log_id, time_observed, sky_condition, temperature_high, temperature_low, precipitation_type)
VALUES
  ((SELECT id FROM daily_logs LIMIT 1), '08:00', 'Clear', 75.0, 45.0, 'None'),
  ((SELECT id FROM daily_logs LIMIT 1), '12:00', 'Partly Cloudy', 82.0, 45.0, 'None');

-- Sample productivity tracking
INSERT INTO daily_log_productivity (daily_log_id, activity_name, planned_units, actual_units, unit_of_measure)
VALUES
  ((SELECT id FROM daily_logs LIMIT 1), 'Concrete Pour', 100.0, 95.0, 'cubic yards'),
  ((SELECT id FROM daily_logs LIMIT 1), 'Framing', 500.0, 480.0, 'linear feet');
```markdown
## Views and Helper Functions

### Daily Log Summary View
```sql
CREATE VIEW daily_log_summary AS
SELECT
  dl.id,
  dl.project_id,
  dl.log_date,
  dl.created_by,
  p.project_name,
  u.full_name as created_by_name,
  COUNT(DISTINCT dlm.id) as manpower_entries,
  COUNT(DISTINCT dle.id) as equipment_entries,
  COUNT(DISTINCT dln.id) as notes_entries,
  COUNT(DISTINCT dlv.id) as visitor_entries,
  COUNT(DISTINCT dls.id) as safety_entries,
  CASE WHEN dlw.delay = true THEN 'Weather Delay' ELSE 'Normal' END as weather_status,
  dl.created_at,
  dl.updated_at
FROM daily_logs dl
LEFT JOIN projects p ON dl.project_id = p.id
LEFT JOIN users u ON dl.created_by = u.id
LEFT JOIN daily_log_manpower dlm ON dl.id = dlm.daily_log_id
LEFT JOIN daily_log_equipment dle ON dl.id = dle.daily_log_id
LEFT JOIN daily_log_notes dln ON dl.id = dln.daily_log_id
LEFT JOIN daily_log_visitors dlv ON dl.id = dlv.daily_log_id
LEFT JOIN daily_log_safety dls ON dl.id = dls.daily_log_id
LEFT JOIN daily_log_weather dlw ON dl.id = dlw.daily_log_id
GROUP BY dl.id, p.project_name, u.full_name, dlw.delay;
```sql
### Project Activity Dashboard View

```sql
CREATE VIEW project_daily_activity AS
SELECT
  dl.project_id,
  dl.log_date,
  SUM(dlm.workers_count) as total_workers,
  SUM(dlm.hours_worked) as total_worker_hours,
  COUNT(DISTINCT dle.equipment_name) as equipment_count,
  SUM(dle.hours_operated) as total_equipment_hours,
  COUNT(dlv.id) as visitor_count,
  COUNT(dls.id) as safety_incidents,
  BOOL_OR(dlw.delay) as weather_delays,
  COUNT(dld.id) as delay_incidents
FROM daily_logs dl
LEFT JOIN daily_log_manpower dlm ON dl.id = dlm.daily_log_id
LEFT JOIN daily_log_equipment dle ON dl.id = dle.daily_log_id
LEFT JOIN daily_log_visitors dlv ON dl.id = dlv.daily_log_id
LEFT JOIN daily_log_safety dls ON dl.id = dls.daily_log_id
LEFT JOIN daily_log_weather dlw ON dl.id = dlw.daily_log_id
LEFT JOIN daily_log_delays dld ON dl.id = dld.daily_log_id
GROUP BY dl.project_id, dl.log_date;
```sql
### Auto-create Daily Log Function
```sql
CREATE OR REPLACE FUNCTION create_daily_log_for_date(
  p_project_id BIGINT,
  p_log_date DATE,
  p_created_by UUID
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO daily_logs (project_id, log_date, created_by)
  VALUES (p_project_id, p_log_date, p_created_by)
  ON CONFLICT (project_id, log_date) DO UPDATE SET
    updated_at = now(),
    updated_by = p_created_by
  RETURNING id INTO log_id;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql;
```

## Performance Considerations

### Indexing Strategy

```sql
-- Composite indexes for common queries
CREATE INDEX idx_daily_logs_project_date_desc ON daily_logs(project_id, log_date DESC);
CREATE INDEX idx_manpower_project_date ON daily_log_manpower(daily_log_id, created_at::date);

-- Partial indexes for flagged items
CREATE INDEX idx_safety_critical ON daily_log_safety(daily_log_id) WHERE severity_level = 'Critical';
CREATE INDEX idx_weather_delays ON daily_log_weather(daily_log_id) WHERE delay = true;
```sql
### Query Optimization
- Use date range queries with proper indexes
- Implement pagination for large datasets
- Cache frequently accessed summary data
- Use partial indexes for filtered queries

### Data Retention Policy
```sql
-- Archive old daily logs (older than 7 years)
CREATE TABLE daily_logs_archive (LIKE daily_logs INCLUDING ALL);

-- Move old records
WITH archived AS (
  DELETE FROM daily_logs
  WHERE log_date < CURRENT_DATE - INTERVAL '7 years'
  RETURNING *
)
INSERT INTO daily_logs_archive SELECT * FROM archived;
```
