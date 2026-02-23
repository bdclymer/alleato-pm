---
title: FORMS DailyLogs
description: FORMS DailyLogs documentation
---

# Daily Logs Forms Specification

## Form List

Based on Procore Daily Logs analysis, the following forms are needed for comprehensive daily log management:

1. **DailyLogCreateForm** - Create new daily log entry
2. **WeatherObservationForm** - Weather conditions and delays
3. **ManpowerEntryForm** - Labor tracking and hours ✅ PARTIAL
4. **EquipmentLogForm** - Equipment usage and status ✅ PARTIAL
5. **VisitorLogForm** - Site visitor registration
6. **DeliveryLogForm** - Material delivery tracking
7. **SafetyIncidentForm** - Safety incidents and notices
8. **InspectionRecordForm** - Daily inspections
9. **NotesForm** - General daily notes ✅ PARTIAL
10. **WasteTrackingForm** - Waste disposal logging
11. **ProductivityForm** - Work progress tracking
12. **DelayReportForm** - Work delay documentation
13. **PhotoUploadForm** - Photo attachment with metadata

## Form Specifications

### 1. DailyLogCreateForm

**Purpose**: Create main daily log entry for a specific date
**File Location**: `/components/daily-logs/forms/DailyLogCreateForm.tsx`

#### Form Fields

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| log_date | date | Yes | Cannot be future date | Date for the daily log |
| project_id | hidden | Yes | Valid project ID | Project reference |
| shift_start | time | No | Valid time format | Work shift start time |
| shift_end | time | No | After shift_start | Work shift end time |
| general_notes | textarea | No | Max 2000 characters | General daily observations |
| weather_summary | select | No | Predefined options | Quick weather summary |

#### Form Layout

```text
┌─────────────────────────────────────────┐
│ Create Daily Log Entry                   │
├─────────────────────────────────────────┤
│ Date: [Date Picker] *                   │
│ Shift Hours:                            │
│   Start: [Time] - End: [Time]           │
│ Weather: [Dropdown]                     │
│ General Notes:                          │
│ ┌─────────────────────────────────────┐ │
│ │ [Textarea - 5 rows]                 │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Cancel] [Create Daily Log]             │
└─────────────────────────────────────────┘
```sql
#### Validation Rules

```typescript
const dailyLogSchema = z.object({
  log_date: z.date().max(new Date(), "Cannot create future logs"),
  project_id: z.number().positive(),
  shift_start: z.string().optional(),
  shift_end: z.string().optional(),
  general_notes: z.string().max(2000).optional(),
  weather_summary: z.enum(['Clear', 'Cloudy', 'Rain', 'Snow', 'Storm']).optional()
}).refine(data => {
  if (data.shift_start && data.shift_end) {
    return data.shift_end > data.shift_start;
  }
  return true;
}, "End time must be after start time");
```markdown
### 2. WeatherObservationForm
**Purpose**: Record detailed weather conditions and delays
**File Location**: `/components/daily-logs/forms/WeatherObservationForm.tsx`

#### Form Fields
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| time_observed | time | Yes | Valid time | Observation time |
| sky_condition | select | Yes | Predefined options | Sky conditions |
| temperature_high | number | No | -50 to 150°F | High temperature |
| temperature_low | number | No | -50 to 150°F | Low temperature |
| precipitation_type | select | No | None/Rain/Snow/etc | Type of precipitation |
| precipitation_amount | number | No | 0+ inches | Precipitation amount |
| wind_speed | number | No | 0+ mph | Wind speed |
| wind_direction | select | No | N/S/E/W/NE/etc | Wind direction |
| humidity_percent | number | No | 0-100 | Humidity percentage |
| delay | checkbox | No | Boolean | Weather caused delay |
| weather_delay_hours | number | No | If delay=true | Hours of delay |
| comments | textarea | No | Max 1000 chars | Additional observations |

#### Form Layout
```

┌─────────────────────────────────────────────────┐
│ Weather Observation Entry                       │
├─────────────────────────────────────────────────┤
│ Time Observed: [Time] *│
│ Sky Condition: [Dropdown]*                     │
│   ○ Clear ○ Partly Cloudy ○ Cloudy ○ Overcast │
│                                                 │
│ Temperature: High [##]°F  Low [##]°F           │
│ Precipitation: [Dropdown] Amount: [##] inches   │
│ Wind: Speed [##] mph  Direction [Dropdown]      │
│ Humidity: [##]%                                 │
│                                                 │
│ ☐ Weather Delay    Hours: [##.#]               │
│                                                 │
│ Comments:                                       │
│ ┌─────────────────────────────────────────────┐ │
│ │ [Textarea - 3 rows]                         │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ [Cancel] [Save Weather Entry]                   │
└─────────────────────────────────────────────────┘

```markdown
### 3. ManpowerEntryForm ✅ PARTIALLY IMPLEMENTED
**Purpose**: Track labor hours and crew information
**File Location**: `/components/daily-logs/forms/ManpowerEntryForm.tsx`

#### Form Fields
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| company_id | select | No | Valid company ID | Company/subcontractor |
| trade | select | Yes | Predefined trades | Worker trade/skill |
| workers_count | number | Yes | Positive integer | Number of workers |
| hours_worked | number | Yes | 0-24 hours | Hours worked |
| overtime_hours | number | No | 0+ hours | Overtime hours |
| supervisor_id | select | No | Valid user ID | Crew supervisor |
| location | text | No | Max 255 chars | Work location |
| cost_code | select | No | Valid cost codes | Budget/cost code |
| shift_start | time | No | Valid time | Shift start time |
| shift_end | time | No | After shift_start | Shift end time |
| comments | textarea | No | Max 500 chars | Additional notes |

#### Form Layout
```bash
┌─────────────────────────────────────────────────┐
│ Manpower Entry                                   │
├─────────────────────────────────────────────────┤
│ Company: [Company Dropdown]                     │
│ Trade: [Trade Dropdown] *│
│   Carpenter | Electrician | Plumber | Other     │
│                                                 │
│ Workers: [##]*  Hours: [##.#] *               │
│ Overtime: [##.#] hours                          │
│                                                 │
│ Supervisor: [User Dropdown]                     │
│ Location: [Text Input]                          │
│ Cost Code: [Cost Code Dropdown]                 │
│                                                 │
│ Shift Times:                                    │
│   Start: [Time] - End: [Time]                   │
│                                                 │
│ Comments:                                       │
│ ┌─────────────────────────────────────────────┐ │
│ │ [Textarea - 3 rows]                         │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ [Cancel] [Save Manpower Entry]                  │
└─────────────────────────────────────────────────┘

```bash
### 4. EquipmentLogForm ✅ PARTIALLY IMPLEMENTED
**Purpose**: Track equipment usage and status
**File Location**: `/components/daily-logs/forms/EquipmentLogForm.tsx`

#### Form Fields
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| equipment_name | text | Yes | Max 255 chars | Equipment name/ID |
| equipment_id | select | No | Valid equipment ID | Equipment reference |
| operator_id | select | No | Valid user ID | Equipment operator |
| hours_operated | number | No | 0-24 hours | Operating hours |
| hours_idle | number | No | 0-24 hours | Idle hours |
| fuel_consumed | number | No | 0+ gallons | Fuel consumption |
| location | text | No | Max 255 chars | Equipment location |
| equipment_condition | select | Yes | Condition options | Equipment condition |
| maintenance_performed | checkbox | No | Boolean | Maintenance done |
| notes | textarea | No | Max 500 chars | Additional notes |

#### Form Layout
```

┌─────────────────────────────────────────────────┐
│ Equipment Log Entry                              │
├─────────────────────────────────────────────────┤
│ Equipment: [Equipment Dropdown] *│
│ Operator: [User Dropdown]                       │
│ Location: [Text Input]                          │
│                                                 │
│ Hours: Operated [##.#]  Idle [##.#]            │
│ Fuel Used: [##.#] gallons                       │
│                                                 │
│ Condition: [Dropdown]*                         │
│   ○ Excellent ○ Good ○ Fair ○ Poor ○ Out       │
│                                                 │
│ ☐ Maintenance Performed                         │
│                                                 │
│ Notes:                                          │
│ ┌─────────────────────────────────────────────┐ │
│ │ [Textarea - 3 rows]                         │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ [Cancel] [Save Equipment Entry]                 │
└─────────────────────────────────────────────────┘

```bash
### 5. VisitorLogForm
**Purpose**: Register and track site visitors
**File Location**: `/components/daily-logs/forms/VisitorLogForm.tsx`

#### Form Fields
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| visitor_name | text | Yes | Max 255 chars | Visitor full name |
| company_name | text | No | Max 255 chars | Visitor's company |
| contact_phone | tel | No | Valid phone format | Contact phone |
| contact_email | email | No | Valid email format | Contact email |
| badge_number | text | No | Max 50 chars | Visitor badge number |
| purpose_of_visit | textarea | Yes | Max 500 chars | Purpose of visit |
| areas_visited | text | No | Max 500 chars | Areas accessed |
| escort_required | checkbox | No | Boolean | Escort required |
| escort_id | select | No | If escort_required | Assigned escort |
| check_in_time | datetime | Yes | Valid timestamp | Check-in time |
| check_out_time | datetime | No | After check_in | Check-out time |
| safety_briefing_completed | checkbox | No | Boolean | Safety briefing done |
| ppe_provided | checkbox | No | Boolean | PPE provided |
| comments | textarea | No | Max 1000 chars | Additional notes |

#### Form Layout
```markdown
┌─────────────────────────────────────────────────┐
│ Visitor Log Entry                                │
├─────────────────────────────────────────────────┤
│ Visitor Name: [Text Input] *│
│ Company: [Text Input]                           │
│ Phone: [Phone Input] Email: [Email Input]       │
│ Badge #: [Text Input]                           │
│                                                 │
│ Purpose of Visit:*                             │
│ ┌─────────────────────────────────────────────┐ │
│ │ [Textarea - 2 rows]                         │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Areas Visited: [Text Input]                     │
│                                                 │
│ ☐ Escort Required  Escort: [User Dropdown]     │
│                                                 │
│ Check-in: [DateTime] *                          │
│ Check-out: [DateTime]                           │
│                                                 │
│ ☐ Safety Briefing Completed                    │
│ ☐ PPE Provided                                  │
│                                                 │
│ Comments:                                       │
│ ┌─────────────────────────────────────────────┐ │
│ │ [Textarea - 3 rows]                         │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ [Cancel] [Save Visitor Entry]                   │
└─────────────────────────────────────────────────┘

```markdown
### 6. SafetyIncidentForm
**Purpose**: Document safety incidents and notices
**File Location**: `/components/daily-logs/forms/SafetyIncidentForm.tsx`

#### Form Fields
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| incident_type | select | Yes | Predefined types | Type of incident |
| severity_level | select | Yes | Low/Medium/High/Critical | Severity level |
| incident_time | datetime | Yes | Valid timestamp | When incident occurred |
| location | text | Yes | Max 255 chars | Incident location |
| people_involved | textarea | No | Max 1000 chars | People involved |
| companies_involved | text | No | Max 500 chars | Companies involved |
| description | textarea | Yes | Max 2000 chars | Incident description |
| immediate_actions | textarea | No | Max 1000 chars | Immediate actions taken |
| root_cause | textarea | No | Max 1000 chars | Root cause analysis |
| corrective_actions | textarea | No | Max 1000 chars | Corrective actions |
| safety_notice_issued | checkbox | No | Boolean | Safety notice issued |
| notice_issued_to | text | No | If notice issued | Notice recipients |
| compliance_due_date | date | No | Future date | Compliance deadline |
| investigation_required | checkbox | No | Boolean | Investigation needed |
| reportable_to_authorities | checkbox | No | Boolean | Must report to authorities |

#### Form Layout
```

┌───────────────────────────────────────────────────┐
│ Safety Incident Report                             │
├───────────────────────────────────────────────────┤
│ Incident Type: [Dropdown] *│
│   Near Miss | Injury | Property Damage | Other    │
│ Severity: [Dropdown]*                            │
│   ○ Low ○ Medium ○ High ○ Critical               │
│                                                   │
│ Time: [DateTime] *Location: [Text]*            │
│                                                   │
│ People Involved:                                   │
│ ┌─────────────────────────────────────────────────┐ │
│ │ [Textarea - 3 rows]                             │ │
│ └─────────────────────────────────────────────────┘ │
│                                                   │
│ Companies Involved: [Text Input]                   │
│                                                   │
│ Description: *                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ [Textarea - 5 rows]                             │ │
│ └─────────────────────────────────────────────────┘ │
│                                                   │
│ Immediate Actions:                                 │
│ ┌─────────────────────────────────────────────────┐ │
│ │ [Textarea - 3 rows]                             │ │
│ └─────────────────────────────────────────────────┘ │
│                                                   │
│ ☐ Safety Notice Issued  To: [Text Input]         │
│ Compliance Due: [Date Input]                       │
│ ☐ Investigation Required                          │
│ ☐ Reportable to Authorities                       │
│                                                   │
│ [Cancel] [Save Incident Report]                    │
└───────────────────────────────────────────────────┘

```markdown
### 7. ProductivityForm
**Purpose**: Track work progress and productivity metrics
**File Location**: `/components/daily-logs/forms/ProductivityForm.tsx`

#### Form Fields
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| activity_name | text | Yes | Max 255 chars | Activity/task name |
| resource_type | select | Yes | Labor/Equipment/Material | Resource type |
| resource_name | text | Yes | Max 255 chars | Specific resource |
| planned_units | number | No | Positive number | Planned quantity |
| actual_units | number | No | Zero or positive | Actual quantity |
| unit_of_measure | text | Yes | Max 50 chars | Unit (sq ft, cu yd, etc) |
| crew_size | number | No | Positive integer | Crew size |
| hours_worked | number | No | 0-24 hours | Hours worked |
| quality_rating | select | No | Quality options | Work quality rating |
| rework_required | checkbox | No | Boolean | Rework needed |
| rework_percentage | number | No | 0-100% | Percentage rework |
| obstacles_encountered | textarea | No | Max 1000 chars | Issues encountered |
| weather_impact | checkbox | No | Boolean | Weather impact |
| comments | textarea | No | Max 1000 chars | Additional notes |

#### Form Layout
```markdown
┌─────────────────────────────────────────────────┐
│ Productivity Entry                               │
├─────────────────────────────────────────────────┤
│ Activity: [Text Input] *│
│ Resource Type: [Dropdown]*                     │
│   ○ Labor ○ Equipment ○ Material                │
│ Resource: [Text Input] *│
│                                                 │
│ Planned: [##.##] [Unit]*                      │
│ Actual: [##.##] [Unit]                         │
│                                                 │
│ Crew Size: [##]  Hours: [##.#]                │
│                                                 │
│ Quality: [Dropdown]                             │
│   ○ Excellent ○ Good ○ Acceptable ○ Poor       │
│                                                 │
│ ☐ Rework Required  [##]%                       │
│ ☐ Weather Impact                                │
│                                                 │
│ Obstacles Encountered:                          │
│ ┌─────────────────────────────────────────────┐ │
│ │ [Textarea - 3 rows]                         │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Comments:                                       │
│ ┌─────────────────────────────────────────────┐ │
│ │ [Textarea - 2 rows]                         │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ [Cancel] [Save Productivity Entry]              │
└─────────────────────────────────────────────────┘

```markdown
### 8. PhotoUploadForm
**Purpose**: Upload and categorize photos with metadata
**File Location**: `/components/daily-logs/forms/PhotoUploadForm.tsx`

#### Form Fields
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| files | file | Yes | Image types only | Photo files |
| section_type | select | Yes | Section types | Log section category |
| description | textarea | No | Max 500 chars | Photo description |
| location | text | No | Max 255 chars | Photo location |
| tags | text | No | Comma separated | Photo tags |
| photo_timestamp | datetime | No | Valid timestamp | When photo was taken |

#### Form Layout
```

┌─────────────────────────────────────────────────┐
│ Upload Photos                                    │
├─────────────────────────────────────────────────┤
│ Drop photos here or [Browse Files]              │
│ ┌─────────────────────────────────────────────┐ │
│ │         [Drag & Drop Area]                  │ │
│ │     Supports JPG, PNG, HEIC, WebP          │ │
│ │         Max 10MB per file                   │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Category: [Dropdown] *                          │
│   General | Weather | Equipment | Safety etc.   │
│                                                 │
│ Location: [Text Input]                          │
│ Timestamp: [DateTime]                           │
│                                                 │
│ Description:                                    │
│ ┌─────────────────────────────────────────────┐ │
│ │ [Textarea - 3 rows]                         │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Tags: [Text Input] (comma separated)            │
│                                                 │
│ [Cancel] [Upload Photos]                        │
└─────────────────────────────────────────────────┘

```markdown
## Conditional Logic

### Weather Form Logic
```typescript
// Show delay fields only when delay is checked
if (watch('delay')) {
  showField('weather_delay_hours');
}

// Validate temperature range
if (temperature_low > temperature_high) {
  setError('temperature_low', 'Low temp cannot exceed high temp');
}
```markdown
### Visitor Form Logic

```typescript
// Show escort dropdown only when escort required
if (watch('escort_required')) {
  showField('escort_id');
  makeRequired('escort_id');
}

// Auto-populate check-in time to current time
useEffect(() => {
  setValue('check_in_time', new Date());
}, []);
```markdown
### Safety Form Logic
```typescript
// Show notice fields only when safety notice issued
if (watch('safety_notice_issued')) {
  showFields(['notice_issued_to', 'compliance_due_date']);
  makeRequired('notice_issued_to');
}

// Critical incidents auto-check investigation required
if (watch('severity_level') === 'Critical') {
  setValue('investigation_required', true);
}
```

## Error Handling Patterns

### Validation Error Display

```typescript
interface FieldErrorProps {
  error?: string;
  touched?: boolean;
}

const FieldError: React.FC<FieldErrorProps> = ({ error, touched }) => {
  if (!error || !touched) return null;

  return (
    <div className="text-red-600 text-sm mt-1 flex items-center">
      <AlertCircle className="w-4 h-4 mr-1" />
      {error}
    </div>
  );
};
```javascript
### Form Submission Error Handling
```typescript
const handleSubmit = async (data: FormData) => {
  try {
    setIsSubmitting(true);
    const result = await submitForm(data);

    if (result.error) {
      setFormError(result.error);
      return;
    }

    toast.success('Entry saved successfully');
    onSuccess?.(result.data);
  } catch (error) {
    setFormError('Failed to save entry. Please try again.');
  } finally {
    setIsSubmitting(false);
  }
};
```

## Accessibility Requirements

### Form Navigation

- All forms must support keyboard navigation
- Tab order follows logical flow
- Skip links for screen readers
- Focus management on form submission

### Screen Reader Support

- Proper ARIA labels and descriptions
- Form field associations with labels
- Error message announcements
- Required field indicators

### Visual Indicators

- Clear visual focus states
- High contrast error messages
- Consistent button styling
- Loading state indicators

### Mobile Accessibility

- Touch-friendly form controls
- Adequate touch target sizes (44px min)
- Zoom support without horizontal scroll
- Voice input compatibility

## Performance Considerations

### Form Optimization

- Lazy load form components
- Debounce auto-save functionality
- Optimize re-renders with React.memo
- Use useCallback for form handlers

### File Upload Optimization

- Client-side image compression
- Progress indicators for uploads
- Chunk large files
- Background upload with retry logic

### Data Caching

- Cache dropdown options (companies, users, trades)
- Local storage for draft forms
- Optimistic updates for better UX
- Background sync for offline support
