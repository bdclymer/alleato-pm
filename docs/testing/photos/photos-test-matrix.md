# Photos — Procore Feature Test Matrix

**Generated:** 2026-04-06
**Source:** Procore documentation (Supabase RAG — 36 articles retrieved)
**Tool:** photos
**Purpose:** Comprehensive testing checklist to verify all Procore features are
             implemented and working in Alleato PM.

---

## How to Use This Document

- Work through each section systematically
- Mark each test: ✅ Pass | ❌ Fail | ⏭️ Skip (not applicable) | 🔲 Not tested
- For failures, note the issue in the "Notes" column
- Priority: HIGH items block release; MEDIUM reduce quality; LOW are polish

---

## Summary

| Category | # Tests | Priority |
|----------|---------|---------|
| Core Upload Actions | 6 | HIGH |
| Photo Editing & Metadata | 7 | HIGH |
| Album Management | 8 | HIGH |
| Photo Markup & Annotations | 3 | MEDIUM |
| Comments & Mentions | 4 | MEDIUM |
| Privacy & Permissions | 8 | HIGH |
| Download & Export | 5 | HIGH |
| Search & Filter | 5 | HIGH |
| Photo Views | 5 | HIGH |
| Cross-Tool Integrations | 8 | MEDIUM |
| Settings & Configuration | 9 | HIGH |
| Mobile Features | 4 | MEDIUM |
| Notifications & Subscriptions | 3 | MEDIUM |
| Bulk Actions | 5 | MEDIUM |
| Advanced Features | 6 | LOW |
| **TOTAL** | **93** | |

---

## 1. Core Upload Actions

### 1.1 Single Photo Upload

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.1.1 | Upload via file browser | 1. Navigate to Photos tool<br>2. Click Upload<br>3. Browse and select 1 image<br>4. Click Open<br>5. Fill metadata (optional)<br>6. Click Upload Photos | Photo appears in timeline/album with thumbnail | HIGH | 🔲 | |
| 1.1.2 | Upload via drag-and-drop | 1. Navigate to Photos tool<br>2. Drag image from desktop<br>3. Drop into Photos page<br>4. Fill metadata fields<br>5. Click Upload Photos | Photo appears in correct view; metadata is saved | HIGH | 🔲 | |
| 1.1.3 | Upload with location metadata | 1. Upload photo<br>2. Set location from dropdown<br>3. Submit | Location appears in photo info section | HIGH | 🔲 | |
| 1.1.4 | Upload with trade metadata | 1. Upload photo<br>2. Set trade from dropdown<br>3. Submit | Trade appears in photo info section | HIGH | 🔲 | |
| 1.1.5 | Upload to specific album | 1. Upload photo<br>2. Select album from dropdown<br>3. Submit | Photo appears in selected album | HIGH | 🔲 | |
| 1.1.6 | Upload with private flag | 1. Upload photo<br>2. Mark "Private" checkbox<br>3. Submit | Photo is only visible to Admin users | HIGH | 🔲 | |

### 1.2 Bulk Upload

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.2.1 | Bulk upload via file browser | 1. Click Upload<br>2. Select multiple images<br>3. Click Open<br>4. Fill common metadata<br>5. Click Upload Photos | All photos appear in view; metadata applied to all | HIGH | 🔲 | |
| 1.2.2 | Bulk upload via drag-and-drop | 1. Drag multiple images<br>2. Drop into Photos page<br>3. Fill metadata<br>4. Submit | All photos uploaded with metadata | HIGH | 🔲 | |

### 1.3 Email Upload (Inbound)

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.3.1 | Email photos to project address | 1. Get unique project email from Config<br>2. Send email with photo attachments<br>3. Check Photos tool | Photos appear in Unclassified album or configured default | MEDIUM | 🔲 | Must be Admin to test config |
| 1.3.2 | Email restriction - Admin only | 1. Set email config to "Admin only"<br>2. Non-admin sends email with photos<br>3. Check Photos tool | Email is blocked; photos do not appear | MEDIUM | 🔲 | |
| 1.3.3 | Email disabled | 1. Set email config to "Disabled"<br>2. Send email with photos<br>3. Check Photos tool | Email is rejected; no photos appear | MEDIUM | 🔲 | |

---

## 2. Photo Editing & Metadata

### 2.1 Edit Individual Photo

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.1.1 | Add photo description | 1. Click photo<br>2. Click info icon<br>3. Click pencil under Description<br>4. Enter text<br>5. Click out of field | Description saves automatically | HIGH | 🔲 | |
| 2.1.2 | Edit photo location | 1. Click photo<br>2. Click ellipsis menu<br>3. Click "Set Location"<br>4. Select location from dropdown<br>5. Click Confirm | Location updates in info panel | HIGH | 🔲 | |
| 2.1.3 | Edit photo trade | 1. Click photo<br>2. Click ellipsis menu<br>3. Click "Set Trade"<br>4. Select trade(s)<br>5. Click Confirm | Trade updates in info panel | HIGH | 🔲 | |
| 2.1.4 | Rotate photo | 1. Click photo<br>2. Hover over image<br>3. Click rotate icon<br>4. Repeat until desired rotation | Photo rotates 90° per click; changes auto-save | HIGH | 🔲 | |

### 2.2 Bulk Edit Photos

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.2.1 | Bulk edit descriptions | 1. Select multiple photos<br>2. Click Bulk Actions > Bulk Edit<br>3. Enter description<br>4. Click Update | Description applied to all selected photos | HIGH | 🔲 | |
| 2.2.2 | Bulk edit location | 1. Select multiple photos<br>2. Click Bulk Actions > Bulk Edit<br>3. Select location<br>4. Click Update | Location applied to all selected photos | HIGH | 🔲 | |
| 2.2.3 | Bulk edit trade | 1. Select multiple photos<br>2. Click Bulk Actions > Bulk Edit<br>3. Select trade<br>4. Click Update | Trade applied to all selected photos | HIGH | 🔲 | |
| 2.2.4 | Bulk move to album | 1. Select multiple photos<br>2. Click Bulk Actions > Bulk Edit<br>3. Select destination album<br>4. Click Update | All photos moved to new album | HIGH | 🔲 | |
| 2.2.5 | Bulk set privacy | 1. Select multiple photos<br>2. Click Bulk Actions > Bulk Edit<br>3. Select Private or Public<br>4. Click Update | Privacy setting applied to all | HIGH | 🔲 | |

---

## 3. Album Management

### 3.1 Create & Delete Albums

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 3.1.1 | Create album | 1. Click Albums tab<br>2. Click "+ Create Album"<br>3. Enter album name<br>4. Click Create | Album appears in album list | HIGH | 🔲 | Standard+ permission required |
| 3.1.2 | Delete album | 1. Select album<br>2. Click delete/trash icon<br>3. Confirm deletion | Album removed; all photos moved to Recycle Bin | HIGH | 🔲 | Admin only |
| 3.1.3 | Rename album | 1. Right-click on album<br>2. Select "Rename"<br>3. Enter new name<br>4. Confirm | Album name updates in list | HIGH | 🔲 | Admin only |

### 3.2 Album Organization

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 3.2.1 | Reorder albums | 1. Go to Albums tab<br>2. Click Reorder button<br>3. Drag albums to new positions<br>4. Click Confirm | Albums reorder as specified | MEDIUM | 🔲 | Requires granular permission or Admin |
| 3.2.2 | Move photos to album | 1. Select photo<br>2. Click ellipsis > "Change Album"<br>3. Select target album<br>4. Click Confirm | Photo moves to new album | HIGH | 🔲 | Admin only |
| 3.2.3 | Select album cover | 1. Navigate to album<br>2. Click a photo<br>3. Click ellipsis > "Set as Album Cover" | Photo becomes album thumbnail | MEDIUM | 🔲 | Admin only |
| 3.2.4 | Default album behavior | 1. Upload photo without selecting album<br>2. Check where photo appears | Photo appears in "Unclassified" by default | HIGH | 🔲 | |
| 3.2.5 | Mark album private | 1. Right-click album<br>2. Select "Mark as Private"<br>3. Confirm | Only Admin users see album and its photos | MEDIUM | 🔲 | Admin only |

---

## 4. Photo Markup & Annotations

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 4.1 | Mark up photo with drawing tools | 1. Click photo<br>2. Click markup icon/button<br>3. Draw annotations<br>4. Save | Markup appears on photo; is saved | MEDIUM | 🔲 | Check tools: pen, shapes, text |
| 4.2 | Add text annotation | 1. Open markup mode<br>2. Click text tool<br>3. Place and enter text<br>4. Save | Text annotation saves with photo | MEDIUM | 🔲 | |
| 4.3 | Remove/clear markup | 1. Open photo with markup<br>2. Click clear/delete button<br>3. Confirm | Markup is removed; original photo restored | LOW | 🔲 | |

---

## 5. Comments & Mentions

### 5.1 Add Comments

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 5.1.1 | Add comment to photo | 1. Click photo<br>2. Click info icon<br>3. Expand Comments section<br>4. Enter comment text<br>5. Click Send arrow | Comment appears in Comments section | MEDIUM | 🔲 | Standard+ permission required |
| 5.1.2 | View comment thread | 1. Click photo<br>2. Click info icon<br>3. View Comments section<br>4. Collapse and re-expand | Most recent comments load when expanded | MEDIUM | 🔲 | |
| 5.1.3 | Remove comment (Admin) | 1. Add a comment<br>2. As Admin, click x next to comment<br>3. Confirm deletion | Comment is removed | MEDIUM | 🔲 | Admin only |

### 5.2 Mentions

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 5.2.1 | Mention user in comment | 1. Click photo<br>2. Click info icon<br>3. In comment box, type @ + name<br>4. Select user from dropdown<br>5. Click Send | User is mentioned; receives notification | MEDIUM | 🔲 | Standard+ permission required |
| 5.2.2 | Mention notification | 1. Mention a user in comment<br>2. Check their email/notifications | Mentioned user receives email with photo preview and link | MEDIUM | 🔲 | Permission based on photo privacy |

---

## 6. Privacy & Permissions

### 6.1 Private vs Public Photos

| # | Test | Role | Action | Expected | Priority | Result | Notes |
|---|------|------|--------|---------|---------|--------|-------|
| 6.1.1 | Admin views all photos | Admin | Navigate to Photos | Both public and private photos visible | HIGH | 🔲 | |
| 6.1.2 | Standard user sees public only | Standard | Navigate to Photos | Only public photos visible | HIGH | 🔲 | |
| 6.1.3 | Read-Only user sees public only | Read-Only | Navigate to Photos | Only public photos visible | HIGH | 🔲 | |
| 6.1.4 | Uploader of private photo | Uploader | View own private photo | Uploader can see their own private photo | HIGH | 🔲 | |

### 6.2 Mark Photo Private

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 6.2.1 | Mark individual photo private | 1. Click photo<br>2. Click lock icon (top left)<br>3. Confirm | Photo becomes private; visible to Admin only | HIGH | 🔲 | Admin only |
| 6.2.2 | Mark multiple photos private | 1. Select photos<br>2. Click Bulk Actions > Bulk Edit<br>3. Select "Private"<br>4. Click Update | All selected photos become private | HIGH | 🔲 | Admin only |
| 6.2.3 | Uploaded to private album becomes private | 1. Upload photo to private album<br>2. Check visibility | Photo inherits album privacy setting | HIGH | 🔲 | |
| 6.2.4 | Default private setting in config | 1. Admin sets "Make photos private by default"<br>2. Upload photo<br>3. Check privacy | All uploaded photos are private | HIGH | 🔲 | Admin-only config |

### 6.3 Permission Levels

| # | Test | Permission Level | Action | Expected | Priority | Result | Notes |
|---|------|------------------|--------|---------|---------|--------|-------|
| 6.3.1 | No Access | None | Try to access Photos tool | Photos tool is hidden/inaccessible | HIGH | 🔲 | |
| 6.3.2 | Read-Only capabilities | Read-Only | Attempt to upload, edit, delete | All write actions blocked | HIGH | 🔲 | Can view, subscribe, search, filter |
| 6.3.3 | Standard capabilities | Standard | Upload, edit description, comment | All actions succeed | HIGH | 🔲 | Cannot bulk edit all fields, no admin features |
| 6.3.4 | Admin capabilities | Admin | All actions | All actions succeed including delete, configure | HIGH | 🔲 | Full access |

---

## 7. Download & Export

### 7.1 Download Photos

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 7.1.1 | Download single photo | 1. Click photo<br>2. Click download icon (top right) | Photo downloads as .jpg file | HIGH | 🔲 | Read-Only+ permission |
| 7.1.2 | Bulk download multiple photos | 1. Select multiple photos<br>2. Click Bulk Actions > Download | Photos download as .zip file | HIGH | 🔲 | |
| 7.1.3 | Download TIFF files | 1. Upload TIFF file<br>2. Download it | File downloads; cannot be viewed in Procore | HIGH | 🔲 | Limitation noted in docs |

### 7.2 Export as PDF

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 7.2.1 | Export all album photos as PDF (1 per page) | 1. Navigate to album<br>2. Click Export<br>3. Choose "PDF - All Photos" > "1 per page" | PDF downloads with 1 photo per page | HIGH | 🔲 | Read-Only+ permission |
| 7.2.2 | Export selected photos as PDF | 1. Select photos<br>2. Click Export<br>3. Choose "PDF - Selected Photos" > layout | PDF downloads with selected photos in layout | HIGH | 🔲 | |

### 7.3 Email Export

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 7.3.1 | Email photos to colleague | 1. Select photos<br>2. Click Bulk Actions > Email<br>3. Fill To, CC, Subject, Message<br>4. Click Send | Email sent with photos attached as download link | MEDIUM | 🔲 | Standard+ permission |
| 7.3.2 | Email download link expiry | 1. Receive email with photo links<br>2. Wait (check FAQ for expiry duration)<br>3. Try to access link | Links expire after specified duration | LOW | 🔲 | Verify duration in documentation |

---

## 8. Search & Filter

### 8.1 Search Functionality

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 8.1.1 | Search by filename | 1. Click Search bar<br>2. Enter filename<br>3. Click Search | Photos with matching filename appear | HIGH | 🔲 | Read-Only+ permission |
| 8.1.2 | Search by description | 1. Search bar<br>2. Enter description keyword<br>3. Click Search | Photos with matching description appear | HIGH | 🔲 | |
| 8.1.3 | Search by comment | 1. Search bar<br>2. Enter word from comment<br>3. Click Search | Photos with matching comment text appear | HIGH | 🔲 | |
| 8.1.4 | Search by location | 1. Search bar<br>2. Enter location name<br>3. Click Search | Photos from that location appear | HIGH | 🔲 | |
| 8.1.5 | Search by trade | 1. Search bar<br>2. Enter trade name<br>3. Click Search | Photos with that trade appear | HIGH | 🔲 | |

### 8.2 Filter Functionality

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 8.2.1 | Filter by location | 1. Click "Add Filter"<br>2. Select "Location"<br>3. Choose location<br>4. Apply | Only photos from selected location shown | HIGH | 🔲 | |
| 8.2.2 | Filter by date taken | 1. Click "Add Filter"<br>2. Select "Date Taken"<br>3. Set date range<br>4. Apply | Only photos from date range shown | HIGH | 🔲 | |
| 8.2.3 | Filter by upload date | 1. Click "Add Filter"<br>2. Select "Uploaded Date"<br>3. Set date range<br>4. Apply | Photos filtered by upload date | HIGH | 🔲 | |
| 8.2.4 | Filter by privacy | 1. Click "Add Filter"<br>2. Select "Privacy"<br>3. Choose Private or Public<br>4. Apply | Only photos matching privacy shown | MEDIUM | 🔲 | Admin only |
| 8.2.5 | Filter by starred status | 1. Click "Add Filter"<br>2. Select "Starred"<br>3. Click "Yes"<br>4. Apply | Only starred photos shown | MEDIUM | 🔲 | Within album view only |

---

## 9. Photo Views

### 9.1 Timeline View

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.1.1 | Timeline groups by date | 1. Click Timeline tab<br>2. View photo grid | Photos grouped/sorted by date taken | HIGH | 🔲 | Default view |
| 9.1.2 | Timeline shows checkboxes on hover | 1. Timeline tab<br>2. Hover over photo | Checkbox appears for selection | HIGH | 🔲 | |

### 9.2 Album View

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.2.1 | Album view groups photos by album | 1. Click Albums tab<br>2. View album list | Each album shown as card/item | HIGH | 🔲 | |
| 9.2.2 | Album cover displays correctly | 1. View Albums tab<br>2. Examine album thumbnails | Album cover photo displays as thumbnail | HIGH | 🔲 | Most recent photo by default |

### 9.3 Map View

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.3.1 | Map shows geotagged photos | 1. Set photo locations<br>2. Click Map tab<br>3. View map | Photos with location appear as pins on map | MEDIUM | 🔲 | Requires Maps tool enabled |
| 9.3.2 | Map filter "In View" | 1. Map tab<br>2. Click "Map Filter" > "In View"<br>3. Pan/zoom map | Only photos in current view shown | MEDIUM | 🔲 | |
| 9.3.3 | Map filter "In Geofence" | 1. Map tab<br>2. Click "Map Filter" > "In Geofence"<br>3. Draw boundary<br>4. Complete boundary | Only photos within geofence shown | MEDIUM | 🔲 | |

---

## 10. Cross-Tool Integrations

### 10.1 Daily Log Integration

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 10.1.1 | Photo from Daily Log → Photos tool | 1. Add photo to Daily Log entry<br>2. Check Photos tool | Photo appears in "Photos from Daily Log" album | MEDIUM | 🔲 | Requires config |
| 10.1.2 | Photo from Daily Log Photos section → Photos tool | 1. Upload to Daily Log Photos section<br>2. Check Photos tool | Photo appears in configured album (default "Photos from Daily Log") | MEDIUM | 🔲 | |
| 10.1.3 | Photos from Daily Log are private by default | 1. Add photos from Daily Log<br>2. Check privacy in Photos tool | Photos marked private by default (configurable) | MEDIUM | 🔲 | |
| 10.1.4 | Upload photo to Photos → Add to Daily Log | 1. Upload photo<br>2. Mark "Add to Daily Log" checkbox<br>3. Submit | Photo added to Daily Log for photo's date taken | MEDIUM | 🔲 | Public photos only |

### 10.2 Punch List Integration

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 10.2.1 | Attach photo to Punch List item → Photos tool | 1. Create/edit Punch List item<br>2. Attach photo<br>3. Save<br>4. Check Photos tool | Photo appears in "Photos from Punch List" album | MEDIUM | 🔲 | Requires config |
| 10.2.2 | Punch List photos are private by default | 1. Attach photo to Punch List<br>2. Check Photos tool | Photo is private (Admin only) by default | MEDIUM | 🔲 | Configurable |

### 10.3 Inspection Integration

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 10.3.1 | Attach photo to Inspection → Photos tool | 1. Create/edit Inspection<br>2. Attach photo in Attachments<br>3. Save<br>4. Check Photos tool | Photo appears in "Photos from Inspections" album | MEDIUM | 🔲 | Requires config |
| 10.3.2 | Inspection origin link visible in photo | 1. View photo from Inspection<br>2. Check for "Origin" link | "Origin" link points back to Inspection | MEDIUM | 🔲 | |

### 10.4 Observations Integration

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 10.4.1 | Attach photo to Observation → Photos tool | 1. Create/edit Observation<br>2. Attach photo<br>3. Save<br>4. Check Photos tool | Photo appears in "Photos from Observations" album | MEDIUM | 🔲 | Requires config |

---

## 11. Settings & Configuration

### 11.1 Photo Settings

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 11.1.1 | Configure default album position (beginning/end) | 1. Admin: Click Settings icon<br>2. Click Photo Settings<br>3. Select album position option<br>4. Save | New albums appear in selected position | HIGH | 🔲 | Admin only |
| 11.1.2 | Set photos private by default | 1. Settings > Photo Settings<br>2. Check "Make photos private by default"<br>3. Save<br>4. Upload test photo | Uploaded photos are private by default | HIGH | 🔲 | Admin only |
| 11.1.3 | Configure project photo subscribers | 1. Settings > Photo Settings<br>2. Select team members from dropdown<br>3. Save | Selected users receive email for new photos | MEDIUM | 🔲 | Admin only |

### 11.2 Inbound Email Settings

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 11.2.1 | Allow anyone to send inbound emails | 1. Settings > Inbound Email Options<br>2. Select "Allow anyone"<br>3. Save | Anyone knowing email can send photos | MEDIUM | 🔲 | Admin only |
| 11.2.2 | Admin-only inbound emails | 1. Settings > Inbound Email Options<br>2. Select "Admin only"<br>3. Save<br>4. Non-admin sends email | Only Admin emails are accepted | MEDIUM | 🔲 | Admin only |
| 11.2.3 | Disable all inbound emails | 1. Settings > Inbound Email Options<br>2. Select "Disable"<br>3. Save<br>4. Send email to address | All emails rejected | MEDIUM | 🔲 | Admin only |
| 11.2.4 | Configure default album for emailed photos | 1. Settings > Inbound Email Options<br>2. Select destination album<br>3. Save<br>4. Email photos | Photos go to selected album (not Unclassified) | MEDIUM | 🔲 | Admin only |

### 11.3 Cross-Tool Photo Aggregation

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 11.3.1 | Enable/disable Drawings photo import | 1. Settings > Photos from Other Tools<br>2. Toggle "Import from Drawings"<br>3. Save<br>4. Add photo to Drawing | Photo appears/disappears in Photos tool | MEDIUM | 🔲 | Admin + Directory access required |
| 11.3.2 | Configure default album for Drawings photos | 1. Settings > Photos from Other Tools<br>2. Set default album for Drawings<br>3. Save | Drawings photos import to selected album | MEDIUM | 🔲 | |
| 11.3.3 | Make Drawings photos private by default | 1. Settings > Photos from Other Tools<br>2. Check "Make Drawings photos private"<br>3. Save | Drawings photos are private | MEDIUM | 🔲 | |
| 11.3.4 | Import photos from Daily Log (enable/disable) | 1. Settings > Photos from Other Tools<br>2. Toggle "Import from Daily Log"<br>3. Save | Daily Log photos import/stop importing | MEDIUM | 🔲 | |
| 11.3.5 | Import from Punch List (enable/disable) | 1. Settings > Photos from Other Tools<br>2. Toggle "Import from Punch List"<br>3. Save | Punch List photos import/stop | MEDIUM | 🔲 | |
| 11.3.6 | Include private Punch List photos | 1. Settings > Photos from Other Tools<br>2. Check "Include photos from private Punch List"<br>3. Save | Private Punch List photos now visible | LOW | 🔲 | |
| 11.3.7 | Import from Observations (enable/disable) | 1. Settings > Photos from Other Tools<br>2. Toggle "Import from Observations"<br>3. Save | Observation photos import/stop | MEDIUM | 🔲 | |
| 11.3.8 | Import from Inspections (enable/disable) | 1. Settings > Photos from Other Tools<br>2. Toggle "Import from Inspections"<br>3. Save | Inspection photos import/stop | MEDIUM | 🔲 | |

### 11.4 Permissions Configuration

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 11.4.1 | Set user permission level | 1. Settings > Permissions Table<br>2. Select user<br>3. Choose permission level<br>4. Save | User's permission updated; they can/cannot perform actions | HIGH | 🔲 | Admin only |

---

## 12. Mobile Features

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 12.1 | Mention user in comment (iOS) | 1. Open Photos on iOS<br>2. Click photo > Comment<br>3. Type @ + name<br>4. Send | User mentioned; receives notification | MEDIUM | 🔲 | Requires iOS app |
| 12.2 | Mention user in comment (Android) | 1. Open Photos on Android<br>2. Click photo > Comment<br>3. Type @ + name<br>4. Send | User mentioned; receives notification | MEDIUM | 🔲 | Requires Android app |
| 12.3 | Take and upload photo from mobile | 1. Mobile app > Photos<br>2. Tap camera icon<br>3. Take photo<br>4. Upload to album | Photo captured and uploaded directly | MEDIUM | 🔲 | Granular permission: "Create Photo Album" not in mobile |
| 12.4 | Mobile view of albums | 1. Open Photos app on mobile<br>2. Navigate to Albums view | Albums display correctly on mobile screen | MEDIUM | 🔲 | |

---

## 13. Notifications & Subscriptions

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 13.1 | Subscribe to photos | 1. Click Photos tool<br>2. Check "Subscribe" checkbox<br>3. Wait for new uploads | Receive email with list of new photos hourly | MEDIUM | 🔲 | Read-Only+ permission |
| 13.2 | Subscribed user sees private photos | 1. Subscribe to photos<br>2. Admin uploads private photo<br>3. Check email notification | Private photos not listed (Read-Only users) | MEDIUM | 🔲 | Permission-dependent |
| 13.3 | Mention notification email | 1. Mention user in comment<br>2. Check their inbox | Receive email with photo preview and comment | MEDIUM | 🔲 | |

---

## 14. Bulk Actions

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 14.1 | Bulk select photos (checkbox) | 1. Hover over photo in timeline<br>2. Click checkbox<br>3. Select multiple photos | Photos marked; Bulk Actions button appears | MEDIUM | 🔲 | |
| 14.2 | Select all on page | 1. Check main checkbox if available<br>2. Or manually select all visible | All visible photos selected | MEDIUM | 🔲 | |
| 14.3 | Bulk recycle (soft delete) | 1. Select photos<br>2. Click Bulk Actions > Recycle | Photos moved to Recycle Bin | HIGH | 🔲 | |
| 14.4 | Bulk recover from Recycle Bin | 1. Navigate to Recycle Bin view<br>2. Select deleted photos<br>3. Click Restore | Photos restored to original album (or Unclassified) | HIGH | 🔲 | Admin only |
| 14.5 | Permanent delete from Recycle Bin | 1. Recycle Bin view<br>2. Select photos<br>3. Click Delete button | Photos permanently deleted; still available in other locations | HIGH | 🔲 | Admin only |

---

## 15. Advanced Features

| # | Feature | Test | Steps | Expected | Priority | Result | Notes |
|---|---------|------|-------|----------|---------|--------|-------|
| 15.1 | Star/Favorite photos | 1. Click photo<br>2. Click star icon (top left)<br>3. Save | Photo marked as favorite; saves automatically | MEDIUM | 🔲 | Admin only |
| 15.2 | Find starred photos | 1. Click Add Filter > Starred<br>2. Click "Yes" | Only starred photos displayed | MEDIUM | 🔲 | Album view only |
| 15.3 | 360° photo viewing | 1. Upload panoramic/360° photo<br>2. Click photo<br>3. Hover and click "View 360°" | Ability to pan through 360° photo | LOW | 🔲 | Browser support dependent |
| 15.4 | Set project photo | 1. Click photo > ellipsis > "Set as Project Photo"<br>2. Confirm | Photo appears on project Home page | MEDIUM | 🔲 | Admin only; 1:1 ratio recommended |
| 15.5 | Create items from photos | 1. Select photo<br>2. Use granular permission action | Create new item (RFI, etc.) from photo | LOW | 🔲 | Requires granular permission + tool access |
| 15.6 | Analyze photos with Assist (AI) | 1. Click photo<br>2. Look for "Analyze with Assist" option | AI analysis of photo content | LOW | 🔲 | Procore Assist feature; may not be standard |

---

## Sources

| # | Title | URL | Category |
|---|-------|-----|---------|
| 1 | Add a Comment to a Photo | https://v2.support.procore.com/product-manuals/photos-project/tutorials/add-a-comment-to-a-photo | General |
| 2 | Add a Description to a Photo | https://v2.support.procore.com/product-manuals/photos-project/tutorials/add-a-description-to-a-photo | General |
| 3 | Bulk Edit Photos | https://v2.support.procore.com/product-manuals/photos-project/tutorials/bulk-edit-photos | General |
| 4 | Configure Advanced Settings: Photos | https://v2.support.procore.com/product-manuals/photos-project/tutorials/configure-advanced-settings-photos | General |
| 5 | Create a Photo Album | https://v2.support.procore.com/product-manuals/photos-project/tutorials/create-a-photo-album | General |
| 6 | Delete a Photo Album | https://v2.support.procore.com/product-manuals/photos-project/tutorials/delete-a-photo-album | General |
| 7 | Delete Photos | https://v2.support.procore.com/product-manuals/photos-project/tutorials/delete-photos | General |
| 8 | Delete a Photo from the Recycle Bin | https://v2.support.procore.com/product-manuals/photos-project/tutorials/delete-a-photo-from-the-recycle-bin | General |
| 9 | Download Photos | https://v2.support.procore.com/product-manuals/photos-project/tutorials/download-photos | General |
| 10 | Email Photos (Inbound) | https://v2.support.procore.com/product-manuals/photos-project/tutorials/email-photos-inbound | General |
| 11 | Email Photos (Outbound) | https://v2.support.procore.com/product-manuals/photos-project/tutorials/email-photos-outbound | General |
| 12 | Find Starred (Favorited) Photos | https://v2.support.procore.com/product-manuals/photos-project/tutorials/find-starred-photos | General |
| 13 | Export Photos as a PDF | https://v2.support.procore.com/product-manuals/photos-project/tutorials/export-photos-as-a-pdf | General |
| 14 | Mark a Photo as Private | https://v2.support.procore.com/product-manuals/photos-project/tutorials/mark-a-photo-as-private | General |
| 15 | Mention Someone in a Photo Comment | https://v2.support.procore.com/product-manuals/photos-project/tutorials/mention-someone-in-a-photo-comment | General |
| 16 | Move Photos | https://v2.support.procore.com/product-manuals/photos-project/tutorials/move-photos | General |
| 17 | Permissions Matrix - Photos | https://v2.support.procore.com/process-guides/permissions-matrix/project-level-photos-permissions | General |
| 18 | Retrieve a Photo from the Recycle Bin | https://v2.support.procore.com/product-manuals/photos-project/tutorials/retrieve-a-photo-from-the-recycle-bin | General |
| 19 | Reorder Photo Albums | https://v2.support.procore.com/product-manuals/photos-project/tutorials/reorder-photo-albums | General |
| 20 | Rotate Photos | https://v2.support.procore.com/product-manuals/photos-project/tutorials/rotate-photos | General |
| 21 | Select an Album Cover Photo | https://v2.support.procore.com/product-manuals/photos-project/tutorials/select-an-album-cover-photo | General |
| 22 | Search for and Filter Photos | https://v2.support.procore.com/product-manuals/photos-project/tutorials/search-for-and-filter-photos | General |
| 23 | Set a Project Photo | https://v2.support.procore.com/product-manuals/photos-project/tutorials/set-a-project-photo | General |
| 24 | Set Photo Location | https://v2.support.procore.com/product-manuals/photos-project/tutorials/set-photo-location | General |
| 25 | Set Photo Trade | https://v2.support.procore.com/product-manuals/photos-project/tutorials/set-photo-trade | General |
| 26 | Star a Photo | https://v2.support.procore.com/product-manuals/photos-project/tutorials/star-a-photo | General |
| 27 | Subscribe to Photos | https://v2.support.procore.com/product-manuals/photos-project/tutorials/subscribe-to-photos | General |
| 28 | Upload Photos | https://v2.support.procore.com/product-manuals/photos-project/tutorials/upload-photos | General |
| 29 | View Photos | https://v2.support.procore.com/product-manuals/photos-project/tutorials/view-photos | General |
| 30 | Add a Photo to a Daily Log Entry | https://v2.support.procore.com/product-manuals/daily-log-project/tutorials/add-a-photo-to-a-daily-log-entry | Integrations |
| 31 | Upload Photos to the Daily Log | https://v2.support.procore.com/product-manuals/daily-log-project/tutorials/upload-photos-to-the-daily-log | Integrations |
| 32 | Upload Photos to Daily Log from Photos Tool | https://v2.support.procore.com/product-manuals/daily-log-project/tutorials/upload-photos-to-the-daily-log-from-the-photos-tool | Integrations |
| 33 | Add a Photo to an Inspection | https://v2.support.procore.com/product-manuals/inspections-project/tutorials/add-a-photo-to-an-inspection-so-that-it-populates-in-the-photos-tool | Integrations |
| 34 | Add a Photo to an Observation | https://v2.support.procore.com/product-manuals/observations-project/tutorials/add-a-photo-to-an-observation-so-that-it-populates-in-the-photos-tool | Integrations |
| 35 | Add a Photo to a Punch List item | https://v2.support.procore.com/product-manuals/punch-list-project/tutorials/add-photos-to-a-punch-list-item-so-that-it-populates-in-the-photos-tool | Integrations |
| 36 | Procore Maps User Guide - Add Photo Pin | https://v2.support.procore.com/process-guides/procore-maps-user-guide/add-photo-pin-to-map | Integrations |

---

## Testing Session Log

| Date | Tester | Environment | Pass | Fail | Skip | Notes |
|------|--------|-------------|------|------|------|-------|
| | | localhost:3000 | | | | |
| | | Staging | | | | |
| | | Production | | | | |

---

## Notes for Testers

- **File type restrictions**: Only .jpg, .jpeg, .tif, .tiff, .gif, .png, .x-png, .bmp allowed
- **Max file size**: 2 MB (larger files may timeout)
- **TIFF files**: Can be uploaded but cannot be viewed in Procore
- **Mobile limitations**: "Create Photo Album" granular permission not available on mobile
- **Email expiry**: Check documentation for download link expiration times
- **Cross-tool photo privacy**: Respects source tool privacy settings (e.g., private Punch List items)
- **Map requirement**: Map view requires Maps tool to be enabled on project
- **Recycle Bin note**: Deleted photos stay in Recycle Bin; permanently deleted photos still exist in original locations (Daily Log, Inspections, etc.)
