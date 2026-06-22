# Photos — Guided Test Scenarios

- **Generated:** 2026-04-08
- **Tool:** photos
- **Audience:** Non-technical testers — no construction knowledge required
- **Test Runner UI:** http://localhost:3000/testing (select "Photos")
- **Test Project:** Project 767 — Alleato AI
- **Login:** test1@mail.com / test12026!!!

The **Photos** tool is where you upload, organize, and view photos taken on a construction project. Think of it like a shared photo album for the job site — team members can upload pictures, label them, sort them into albums, and find them later by searching or browsing.

---

## Scenario Summary

| # | Category | Name | Priority |
|---|----------|------|----------|
| 1.1 | Navigation | Open the Photos page | HIGH |
| 1.2 | Navigation | Switch between tabs | MEDIUM |
| 1.3 | Navigation | View empty state | MEDIUM |
| 1.4 | Navigation | View the photo grid with thumbnails | HIGH |
| 1.5 | Navigation | Open a photo in the lightbox | HIGH |
| 1.6 | Navigation | Close the photo lightbox | MEDIUM |
| 1.7 | Navigation | Use the mobile upload button | LOW |
| 2.1 | Upload | Upload a single photo | HIGH |
| 2.2 | Upload | Upload multiple photos at once | HIGH |
| 2.3 | Upload | Drag and drop onto page | HIGH |
| 2.4 | Upload | Drag and drop inside dialog | MEDIUM |
| 2.5 | Upload | Select album during upload | HIGH |
| 2.6 | Upload | Remove file from queue | MEDIUM |
| 2.7 | Upload | Cancel upload dialog | MEDIUM |
| 2.8 | Upload | Non-image file rejected | MEDIUM |
| 2.9 | Upload | File size limit | LOW |
| 2.10 | Upload | Title auto-derived from filename | MEDIUM |
| 3.1 | View & Search | Search by title | HIGH |
| 3.2 | View & Search | Clear search | MEDIUM |
| 3.3 | View & Search | Filter by album | HIGH |
| 3.4 | View & Search | Reset album filter | MEDIUM |
| 3.5 | View & Search | Search + album filter combined | MEDIUM |
| 3.6 | View & Search | No results state | MEDIUM |
| 4.1 | Edit | Add description to a photo | HIGH |
| 4.2 | Edit | Edit photo title | HIGH |
| 4.3 | Edit | Set photo location | HIGH |
| 4.4 | Edit | Set photo trade | HIGH |
| 4.5 | Edit | Change photo album after upload | HIGH |
| 4.6 | Edit | Add tags to a photo | MEDIUM |
| 4.7 | Edit | Set date taken | MEDIUM |
| 5.1 | Star | Star a photo from the grid | HIGH |
| 5.2 | Star | Unstar a photo from the grid | MEDIUM |
| 5.3 | Star | Star a photo from the lightbox | HIGH |
| 5.4 | Star | Find starred photos using the filter | MEDIUM |
| 6.1 | Delete | Delete a photo from the lightbox | HIGH |
| 6.2 | Delete | View deleted photo in Recycle Bin | HIGH |
| 6.3 | Delete | Restore a photo from the Recycle Bin | HIGH |
| 6.4 | Delete | Permanently delete from Recycle Bin | HIGH |
| 6.5 | Delete | Recycle Bin 30-day retention note | LOW |
| 7.1 | Albums | View the Albums tab | HIGH |
| 7.2 | Albums | Create a photo album | HIGH |
| 7.3 | Albums | Delete an album | HIGH |
| 7.4 | Albums | Reorder albums | LOW |
| 7.5 | Albums | Select an album cover photo | MEDIUM |
| 8.1 | Download | Download a single photo | HIGH |
| 8.2 | Download | Download multiple photos | HIGH |
| 8.3 | Export | Export photos as a PDF | MEDIUM |
| 9.1 | Email | Send photos by email (outbound) | MEDIUM |
| 9.2 | Email | Upload photos via inbound email | LOW |
| 10.1 | Comments | Add a comment to a photo | HIGH |
| 10.2 | Comments | Mention someone in a comment | MEDIUM |
| 10.3 | Comments | View comments on a photo | MEDIUM |
| 11.1 | Privacy | Mark a photo as private | HIGH |
| 11.2 | Privacy | Remove private flag from a photo | MEDIUM |
| 12.1 | Move | Move a photo to a different album | HIGH |
| 12.2 | Move | Move multiple photos at once | MEDIUM |
| 13.1 | Rotate | Rotate a photo 90 degrees | MEDIUM |
| 14.1 | Bulk Edit | Bulk edit album assignment | HIGH |
| 14.2 | Bulk Edit | Bulk edit location | MEDIUM |
| 14.3 | Bulk Edit | Bulk edit trade | MEDIUM |
| 14.4 | Bulk Edit | Bulk delete photos | HIGH |
| 14.5 | Bulk Edit | Select all photos | MEDIUM |
| 15.1 | Notifications | Subscribe to photos | MEDIUM |
| 15.2 | Notifications | Unsubscribe from photos | LOW |
| 16.1 | Map | View geotagged photos on map | MEDIUM |
| 16.2 | Map | Add a photo pin to the map | MEDIUM |
| 17.1 | Timeline | View photos chronologically | MEDIUM |
| 18.1 | Settings | Open Photos advanced settings | MEDIUM |
| 18.2 | Settings | Set the project cover photo | MEDIUM |
| 19.1 | Permissions | Read-only user cannot upload photos | HIGH |
| 19.2 | Permissions | Read-only user cannot delete photos | HIGH |
| 19.3 | Permissions | Owner can view their own private photos | MEDIUM |
| 19.4 | Permissions | Private photo hidden from other users | HIGH |
| 20.1 | Integration | Photo added in Daily Log appears in Photos | MEDIUM |
| 20.2 | Integration | Photos from Inspections appear in Photos | MEDIUM |
| 20.3 | Integration | Photos from Observations appear in Photos | MEDIUM |
| 20.4 | Integration | Photos from Punch List appear in Photos | MEDIUM |
| 20.5 | Integration | Add a photo pin to a Drawing | LOW |
| 21.1 | Edge Cases | Upload with duplicate filename | MEDIUM |
| 21.2 | Edge Cases | Photo with very long title | LOW |
| 21.3 | Edge Cases | Refresh page — photos persist | HIGH |
| 21.4 | Edge Cases | Photo metadata persists after refresh | HIGH |
| 21.5 | Edge Cases | Upload with no files selected | MEDIUM |
| 21.6 | Edge Cases | Lightbox keyboard navigation | LOW |
| 21.7 | Edge Cases | Mobile responsive layout | MEDIUM |

---

## 1. Navigation

### 1.1 — Open the Photos page
**What this checks:** The Photos page loads without errors and shows the main photo grid or an empty state.

**Setup:** Make sure you are logged in as test1@mail.com.

**Steps:**
1. In the left sidebar, click **Photos** under the "Alleato AI" project.
2. Wait for the page to finish loading.

**Expected result:** The Photos page opens. Either a grid of photos is visible, or an empty state that says "No photos yet" appears. No error messages are shown.

---

### 1.2 — Switch between tabs
**What this checks:** All five tabs (Photos, Map, Timeline, Albums, Recycle Bin) exist and can be clicked without causing an error.

**Setup:** Be on the Photos page at `/767/photos`.

**Steps:**
1. Click the **Map** tab.
2. Click the **Timeline** tab.
3. Click the **Albums** tab.
4. Click the **Recycle Bin** tab.
5. Click the **Photos** tab to return to the main view.

**Expected result:** Each tab displays without a crash. Map, Timeline, and Albums tabs show an informational message. Recycle Bin tab opens. The Photos tab returns to the grid.

---

### 1.3 — View the empty state when no photos exist
**What this checks:** A helpful message and an Upload button appear when no photos have been added yet.

**Setup:** The project must have zero photos. If photos already exist, this test is not applicable.

**Steps:**
1. Navigate to the Photos page at `/767/photos`.
2. Confirm no photos are present.

**Expected result:** A message "No photos yet" and a prompt to upload or drag-and-drop is visible. An **Upload Photo** button appears.

---

### 1.4 — View the photo grid with thumbnails
**What this checks:** Uploaded photos appear as thumbnail cards in the grid layout.

**Setup:** At least one photo must already exist in the project.

**Steps:**
1. Navigate to `/767/photos`.
2. Look at the main Photos tab.

**Expected result:** Photos appear as thumbnail cards arranged in a grid. Each card shows an image preview, a title, and a date.

---

### 1.5 — Open a photo in the lightbox
**What this checks:** Clicking a photo opens a larger view with full details.

**Setup:** At least one photo must exist in the project.

**Steps:**
1. On the Photos page, click any photo thumbnail.
2. Wait for the detail view to open.

**Expected result:** A dialog opens showing a larger version of the photo, its title, description (if set), album badge, location, trade, file size, date, and dimensions. Action buttons (Star, Delete) are visible.

---

### 1.6 — Close the photo lightbox
**What this checks:** The lightbox can be dismissed and the grid view returns.

**Setup:** A photo lightbox must be open.

**Steps:**
1. Open a photo by clicking its thumbnail.
2. Click the X button at the top-right of the lightbox dialog.

**Expected result:** The lightbox closes and the photo grid is visible again.

---

### 1.7 — Use the mobile upload button
**What this checks:** A floating action button appears on narrow screens for quick photo upload.

**Setup:** Use a mobile-sized browser window (or resize your browser to about 375px wide).

**Steps:**
1. Resize your browser window to a narrow width (like a mobile phone).
2. Navigate to `/767/photos`.
3. Look at the bottom-right corner of the screen.

**Expected result:** A round Upload button appears at the bottom-right. Clicking it opens the Upload Photos dialog.

---

## 2. Upload

### 2.1 — Upload a single photo using the Upload Photo button
**What this checks:** A user can upload one image file and have it appear in the grid.

**Setup:** Have a small image file (JPG or PNG) ready on your computer.

**Steps:**
1. Click the **Upload Photo** button in the top-right of the page.
2. In the dialog that opens, click the drop zone area (it says "Drop photos here or browse").
3. Select one image file from your computer.
4. Click **Upload Photo**.
5. Wait for the page to stop loading.

**Expected result:** The dialog closes. The new photo appears in the grid. An upload progress indicator may briefly appear at the top of the page.

---

### 2.2 — Upload multiple photos at once
**What this checks:** More than one image can be selected and uploaded in a single batch.

**Setup:** Have two or more image files ready on your computer.

**Steps:**
1. Click **Upload Photo**.
2. In the dialog, click the drop zone and select 2–3 image files.
3. Confirm the file list shows all selected files.
4. Click **Upload X Photos**.
5. Wait for the page to finish loading.

**Expected result:** All selected photos appear in the grid. The file count on the upload button showed the correct number before submission.

---

### 2.3 — Upload photos by dragging and dropping files directly onto the page
**What this checks:** Photos can be uploaded without clicking any button — just by dragging files from your desktop.

**Setup:** Have at least one image file ready to drag. Be on the Photos tab (not Map/Timeline/Albums).

**Steps:**
1. Open a folder on your computer with an image file.
2. Drag the image file from the folder and drop it anywhere on the Photos page (the main grid area).
3. Wait for the upload to complete.

**Expected result:** While dragging, a blue overlay appears with the message "Drop images to upload". After dropping, the photo uploads and appears in the grid. An upload progress banner briefly shows "Uploading photos...".

---

### 2.4 — Upload photos by dragging into the upload dialog drop zone
**What this checks:** The dialog drop zone also accepts drag-and-drop, not just file-browser selection.

**Setup:** Have an image file ready to drag.

**Steps:**
1. Click **Upload Photo** to open the dialog.
2. Drag an image file from your desktop and drop it into the dashed drop zone in the dialog.
3. Confirm the file appears in the list below the drop zone.
4. Click **Upload Photo**.

**Expected result:** The file appears in the queue list inside the dialog. After clicking Upload, the photo appears in the grid.

---

### 2.5 — Choose a specific album when uploading a photo
**What this checks:** The album selected in the upload dialog is applied to the uploaded photo.

**Setup:** Have an image file ready.

**Steps:**
1. Click **Upload Photo**.
2. Select one image file.
3. In the **Album** dropdown inside the dialog, change the selection from "Default" to **Safety**.
4. Click **Upload Photo**.
5. After upload, filter the grid by the "Safety" album.

**Expected result:** The uploaded photo appears when the Safety album filter is active. The album badge on the photo card or lightbox shows "Safety".

---

### 2.6 — Remove a file from the upload queue before uploading
**What this checks:** A user can deselect a file they added by mistake before actually uploading.

**Steps:**
1. Click **Upload Photo**.
2. Select two image files.
3. In the file list, click the X button next to the first file.
4. Confirm only one file remains in the list.
5. Click **Upload Photo**.

**Expected result:** Only one photo uploads and appears in the grid. The removed file is not uploaded.

---

### 2.7 — Cancel the upload dialog without uploading anything
**What this checks:** Clicking Cancel closes the dialog and does not upload any files.

**Steps:**
1. Click **Upload Photo**.
2. Select one image file.
3. Click **Cancel**.

**Expected result:** The dialog closes. No new photo appears in the grid.

---

### 2.8 — Try to upload a non-image file (e.g. a PDF or Word document)
**What this checks:** Only image files are accepted and other file types are silently ignored.

**Setup:** Have a non-image file (like a .pdf or .txt) ready.

**Steps:**
1. Click **Upload Photo**.
2. Try to select a PDF or text file in the file browser (you may need to change the file type filter to "All Files").
3. Attempt to submit.

**Expected result:** The non-image file is either not accepted by the file picker, or it is ignored and not added to the queue. No PDF or document appears in the grid after upload.

---

### 2.9 — Try to upload a file larger than 20 MB
**What this checks:** Files over the 20 MB size limit are silently skipped and do not cause an error.

**Setup:** Have an image file larger than 20 MB ready, if available.

**Steps:**
1. Click **Upload Photo**.
2. Select an image file that is larger than 20 MB.
3. Click **Upload Photo**.

**Expected result:** The oversized file is skipped. No error message crashes the page. Other files in the same batch (if any) still upload successfully.

---

### 2.10 — Confirm the photo title is automatically set from the filename after upload
**What this checks:** When a photo is uploaded, its title is generated from the filename (with dashes/underscores replaced by spaces and title-cased).

**Setup:** Upload a photo with a hyphenated filename like "site-progress-01.jpg".

**Steps:**
1. Click **Upload Photo**.
2. Select an image file named something like "site-progress-01.jpg".
3. Upload it.
4. Click on the newly uploaded photo to open the lightbox.

**Expected result:** The lightbox title shows "Site Progress 01" (or similar — underscores/dashes replaced with spaces, first letters capitalized). The filename was used as the source.

---

## 3. View & Search

### 3.1 — Search for a photo by its title
**What this checks:** Typing in the search bar filters the photo grid to show only matching photos.

**Setup:** At least two photos with different titles must exist.

**Steps:**
1. On the Photos page, click in the **Search photos...** box.
2. Type part of a known photo title (e.g. "site").
3. Watch the grid update.

**Expected result:** Only photos whose title, description, or filename contains the search term are shown. Other photos disappear from the grid.

---

### 3.2 — Clear the search filter to show all photos again
**What this checks:** After searching, the X button restores the full photo list.

**Setup:** A search must be active in the search box.

**Steps:**
1. Type a search term in the **Search photos...** box.
2. Click the **X** button that appears inside the search box on the right side.

**Expected result:** The search box clears and all photos reappear in the grid.

---

### 3.3 — Filter the photo grid to show only photos from a specific album
**What this checks:** The album dropdown correctly filters the photo list.

**Setup:** Photos must exist in at least two different albums.

**Steps:**
1. Click the **All Albums** dropdown next to the search box.
2. Select **Safety** from the dropdown.
3. Observe the photo grid.

**Expected result:** Only photos assigned to the "Safety" album appear. Photos in other albums are hidden.

---

### 3.4 — Reset album filter back to All Albums
**What this checks:** Selecting "All Albums" from the dropdown removes the album filter and shows all photos.

**Setup:** An album filter must be active.

**Steps:**
1. Select a specific album from the dropdown (e.g. "Safety").
2. Open the dropdown again and select **All Albums**.

**Expected result:** All photos appear in the grid regardless of their album.

---

### 3.5 — Use search and album filter at the same time
**What this checks:** Combining a text search with an album filter narrows results correctly.

**Setup:** Photos must exist in multiple albums with varied titles.

**Steps:**
1. Select **Progress** from the album dropdown.
2. Type a keyword in the search box.
3. Observe the results.

**Expected result:** Only photos that match both the album "Progress" AND the keyword appear. Photos matching only one criterion are excluded.

---

### 3.6 — See the empty state when search finds no matching photos
**What this checks:** A helpful message appears when search or album filter returns zero results.

**Setup:** At least one photo must exist.

**Steps:**
1. Type a nonsense word like **zzzzzzz** in the search box.

**Expected result:** The grid clears and a message appears explaining no photos match the current filters.

---

## 4. Edit

### 4.1 — Add or edit the description on a photo
**What this checks:** The description field can be set on an existing photo and persists after saving.

**Setup:** At least one photo must exist.

**Steps:**
1. Click a photo thumbnail to open the lightbox.
2. Look for a description field or edit option.
3. Enter the text **Test description for scenario 4.1**.
4. Save the changes.

**Expected result:** The description "Test description for scenario 4.1" appears in the lightbox detail area. After refreshing the page and reopening the photo, the description is still shown.

---

### 4.2 — Change the title of an existing photo
**What this checks:** The photo title can be updated and the new title appears on the card and in the lightbox.

**Setup:** At least one photo must exist.

**Steps:**
1. Click a photo to open the lightbox.
2. Find the title field and change it to **Updated Title Scenario 4.2**.
3. Save the changes.
4. Close the lightbox.

**Expected result:** The photo card in the grid and the lightbox both show the updated title "Updated Title Scenario 4.2".

---

### 4.3 — Assign a location label to a photo
**What this checks:** A location can be added to a photo and shows in the lightbox details.

**Setup:** At least one photo must exist.

**Steps:**
1. Open a photo in the lightbox.
2. Find the **Location** field and type **Level 2 - Electrical Room**.
3. Save the changes.

**Expected result:** The location "Level 2 - Electrical Room" appears in the photo details in the lightbox. It persists after refreshing the page.

---

### 4.4 — Assign a trade category to a photo
**What this checks:** A trade label can be assigned to a photo and is visible in the lightbox.

**Setup:** At least one photo must exist.

**Steps:**
1. Open a photo in the lightbox.
2. Find the **Trade** field and enter **Electrical**.
3. Save the changes.

**Expected result:** The trade "Electrical" appears in the photo detail area of the lightbox.

---

### 4.5 — Move a photo to a different album by editing it
**What this checks:** The album assignment on an existing photo can be changed.

**Setup:** At least one photo must exist.

**Steps:**
1. Open a photo in the lightbox.
2. Find the **Album** field and change it to **Inspections**.
3. Save the changes.

**Expected result:** The album badge on the photo updates to "Inspections". When filtering by "Inspections", the photo appears.

---

### 4.6 — Add keyword tags to a photo
**What this checks:** Tags can be added to a photo and appear as badges in the lightbox view.

**Setup:** At least one photo must exist.

**Steps:**
1. Open a photo in the lightbox.
2. Find the **Tags** field and add the tags **concrete** and **foundation**.
3. Save the changes.

**Expected result:** The tags "concrete" and "foundation" appear as small badge labels inside the lightbox details section.

---

### 4.7 — Set or change the "date taken" field on a photo
**What this checks:** The capture date can be manually set and is shown in the photo metadata.

**Setup:** At least one photo must exist.

**Steps:**
1. Open a photo in the lightbox.
2. Find the **Date Taken** field and set it to today's date.
3. Save the changes.

**Expected result:** The date taken is updated and visible in the photo metadata area of the lightbox.

---

## 5. Star / Favorite

### 5.1 — Mark a photo as starred by clicking the star icon on the thumbnail
**What this checks:** Hovering over a photo card reveals a star button, and clicking it marks the photo as starred.

**Setup:** At least one photo must exist that is not yet starred.

**Steps:**
1. Hover your mouse over a photo thumbnail in the grid.
2. Click the star icon that appears in the top-right corner of the thumbnail.
3. Observe the star state.

**Expected result:** The star icon fills in (becomes solid/colored) to indicate the photo is now starred. The change is saved without needing to click a separate Save button.

---

### 5.2 — Remove the star from a previously starred photo
**What this checks:** Clicking the star icon on an already-starred photo removes the favorite status.

**Setup:** At least one starred photo must exist.

**Steps:**
1. Hover over a photo that is already starred (star icon is filled/colored).
2. Click the star icon.

**Expected result:** The star icon becomes hollow/empty, indicating the photo is no longer starred.

---

### 5.3 — Star a photo using the Star button inside the lightbox
**What this checks:** The lightbox action buttons include a Star option that works correctly.

**Setup:** At least one photo must be open in the lightbox.

**Steps:**
1. Click a photo to open the lightbox.
2. Find the **Star** button at the bottom of the dialog.
3. Click it.

**Expected result:** The button label changes to "Starred" and the star icon fills in. The photo is now marked as a favorite.

---

### 5.4 — Filter the grid to show only starred photos
**What this checks:** Starred photos can be found using a filter or dedicated view.

**Setup:** At least one starred photo must exist.

**Steps:**
1. Navigate to `/767/photos`.
2. Look for a way to filter by starred photos (e.g. a "Starred" tab, sidebar item, or filter chip).
3. Select it.

**Expected result:** Only photos that have been starred are shown in the view.

---

## 6. Delete & Recycle Bin

### 6.1 — Delete a photo using the Delete button inside the lightbox
**What this checks:** A photo can be removed from the grid and is sent to the recycle bin.

**Setup:** At least one photo must exist.

**Steps:**
1. Click a photo thumbnail to open the lightbox.
2. Click the **Delete** button (shown in red or with a trash icon).
3. Wait for the action to complete.

**Expected result:** The lightbox closes. The deleted photo no longer appears in the main photo grid.

---

### 6.2 — Confirm that a deleted photo appears in the Recycle Bin tab
**What this checks:** Deleting a photo sends it to the recycle bin rather than permanently removing it.

**Setup:** At least one photo must have been deleted.

**Steps:**
1. After deleting a photo, click the **Recycle Bin** tab.
2. Look for the recently deleted photo.

**Expected result:** The deleted photo appears in the Recycle Bin tab. The main Photos tab no longer shows the photo.

---

### 6.3 — Restore a deleted photo back to the main photo library
**What this checks:** Photos in the recycle bin can be recovered.

**Setup:** At least one photo must be in the Recycle Bin.

**Steps:**
1. Click the **Recycle Bin** tab.
2. Find a deleted photo.
3. Click the restore/retrieve button for that photo.
4. Switch back to the **Photos** tab.

**Expected result:** The photo reappears in the main Photos grid. It no longer appears in the Recycle Bin.

---

### 6.4 — Permanently remove a photo from the Recycle Bin
**What this checks:** Permanent deletion works from the Recycle Bin and truly removes the photo.

**Setup:** At least one photo must be in the Recycle Bin.

**Steps:**
1. Click the **Recycle Bin** tab.
2. Find a photo.
3. Click the permanent delete button (usually a "Delete Permanently" or trash icon option).
4. Confirm the deletion if prompted.

**Expected result:** The photo is removed from the Recycle Bin. It does not appear in the Photos tab either. The action cannot be undone.

---

### 6.5 — Verify the Recycle Bin shows a retention policy message
**What this checks:** The Recycle Bin tab displays a message explaining that deleted photos are kept for 30 days.

**Steps:**
1. Click the **Recycle Bin** tab.

**Expected result:** A message is visible explaining that deleted photos are kept for 30 days before being permanently removed.

---

## 7. Albums

### 7.1 — Open the Albums tab and see album groupings
**What this checks:** The Albums tab exists and shows the list of available albums.

**Steps:**
1. Navigate to `/767/photos`.
2. Click the **Albums** tab.

**Expected result:** The Albums view opens. Available albums are shown (e.g. Default, Progress, Safety, Inspections, Deliveries, Deficiencies, Closeout).

---

### 7.2 — Create a new custom album
**What this checks:** A user can add a named album and that it appears in the album list and the album dropdown.

**Steps:**
1. Click the **Albums** tab.
2. Look for a **Create Album** or **New Album** button and click it.
3. Type a name like **Structural Steel**.
4. Save the album.

**Expected result:** The new album "Structural Steel" appears in the Albums list. It also becomes available in the album dropdown on the main Photos tab.

---

### 7.3 — Delete an album
**What this checks:** An album can be removed from the project.

**Setup:** A custom album must exist (do not delete built-in albums).

**Steps:**
1. Click the **Albums** tab.
2. Find a custom album.
3. Click the delete or remove option for that album.
4. Confirm if prompted.

**Expected result:** The album is removed from the list. Photos that were in it still exist in the project (they may be unassigned or moved to Default).

---

### 7.4 — Change the display order of albums by dragging them
**What this checks:** Albums can be reordered by the user and the new order persists.

**Setup:** At least two albums must exist.

**Steps:**
1. Click the **Albums** tab.
2. Find the drag handle on an album card.
3. Drag one album above another to reorder.
4. Release the mouse button.

**Expected result:** The albums appear in the new order. After refreshing the page, the custom order is preserved.

---

### 7.5 — Set a specific photo as the cover image for an album
**What this checks:** A photo can be designated as the thumbnail/cover for an album.

**Setup:** An album with at least one photo must exist.

**Steps:**
1. Click the **Albums** tab.
2. Open an album that has photos.
3. Find the option to set or change the cover photo.
4. Select a photo to use as the cover.
5. Save.

**Expected result:** The selected photo appears as the cover thumbnail for that album on the Albums tab.

---

## 8. Download & Export

### 8.1 — Download one photo to your computer
**What this checks:** A photo can be downloaded as an image file.

**Setup:** At least one photo must exist.

**Steps:**
1. Open a photo in the lightbox.
2. Find a **Download** button or link.
3. Click it.

**Expected result:** The photo file downloads to your computer. The file opens as a valid image.

---

### 8.2 — Select multiple photos and download them all at once
**What this checks:** Bulk download works for multiple selected photos.

**Setup:** At least two photos must exist.

**Steps:**
1. Select two or more photos using checkboxes (or shift-click).
2. Look for a **Download** option in the bulk action bar.
3. Click **Download**.

**Expected result:** All selected photos download, either as individual files or as a zip archive.

---

### 8.3 — Export one or more photos as a PDF document
**What this checks:** The PDF export feature creates a downloadable PDF with the selected photos.

**Setup:** At least one photo must exist.

**Steps:**
1. Select one or more photos using checkboxes.
2. Find the **Export as PDF** option in the toolbar or action menu.
3. Click it and wait for the PDF to generate.
4. Open the downloaded file.

**Expected result:** A PDF file downloads. Opening it shows the selected photos with their titles and metadata.

---

## 9. Email

### 9.1 — Email one or more photos to someone from within the Photos tool
**What this checks:** The outbound email feature lets you send photos to an email address.

**Setup:** At least one photo must exist.

**Steps:**
1. Select one or more photos using checkboxes.
2. Find the **Email** button or option in the action bar.
3. Click it.
4. In the email dialog, enter a recipient email address (use your own for testing).
5. Add a subject and message.
6. Click **Send**.

**Expected result:** A success confirmation appears. An email with the selected photos (or a link to them) is sent to the provided address.

---

### 9.2 — Add photos to the project by emailing them to the project's unique email address
**What this checks:** The inbound email feature works — photos sent to the project email appear in the Photos tool.

**Setup:** You need the project's unique inbound email address from the Photos settings.

**Steps:**
1. Open **Configure Advanced Settings** for Photos (settings/gear icon).
2. Find the **Email to Photos** address for this project.
3. Send an email to that address with a photo attached.
4. Wait 1–2 minutes.
5. Refresh the Photos page.

**Expected result:** The photo from the email appears in the photo grid, assigned to the correct project.

---

## 10. Comments & Mentions

### 10.1 — Leave a comment on a photo
**What this checks:** Users can add text comments to individual photos.

**Setup:** At least one photo must exist.

**Steps:**
1. Open a photo in the lightbox.
2. Find the **Comments** section or input field.
3. Type **This is a test comment from scenario 10.1**.
4. Click **Post** or press Enter to submit.

**Expected result:** The comment "This is a test comment from scenario 10.1" appears in the comments section of the photo.

---

### 10.2 — Tag a team member in a photo comment using @mention
**What this checks:** Typing @ in a comment triggers a list of project members that can be mentioned.

**Setup:** At least one photo must exist. At least one other user must be a member of the project.

**Steps:**
1. Open a photo in the lightbox.
2. In the comment input, type **@** followed by the first few letters of a team member's name.
3. Select the person from the dropdown that appears.
4. Finish typing your comment and click **Post**.

**Expected result:** The comment is posted with the person's name highlighted as a mention. The mentioned person may receive a notification.

---

### 10.3 — Open a photo and see existing comments
**What this checks:** Previously posted comments are visible when a photo is opened.

**Setup:** A photo with at least one comment must exist.

**Steps:**
1. Open a photo that has comments on it.
2. Look at the comments section.

**Expected result:** All existing comments appear in the lightbox, with the commenter's name and the comment text visible.

---

## 11. Privacy

### 11.1 — Set a photo to private
**What this checks:** The private flag can be set on a photo.

**Setup:** At least one photo must exist.

**Steps:**
1. Open a photo in the lightbox.
2. Find the **Private** toggle or checkbox.
3. Turn it on.
4. Save the change.

**Expected result:** The photo is marked as private. A private indicator (lock icon or "Private" label) appears on the photo card or in the lightbox.

---

### 11.2 — Make a private photo visible to all project members again
**What this checks:** The private setting can be toggled off.

**Setup:** At least one photo marked as private must exist.

**Steps:**
1. Open a private photo in the lightbox.
2. Find the **Private** toggle and turn it off.
3. Save the change.

**Expected result:** The private indicator disappears from the photo. The photo is now visible to all project members.

---

## 12. Move

### 12.1 — Move an existing photo from one album to another
**What this checks:** The Move feature reassigns the photo to a new album.

**Setup:** At least one photo and at least two albums must exist.

**Steps:**
1. Select a photo using its checkbox.
2. Find the **Move** option in the toolbar or right-click menu.
3. Select the destination album (e.g. "Progress").
4. Confirm the move.

**Expected result:** The photo no longer appears in its original album when filtered. It appears in the destination album.

---

### 12.2 — Select multiple photos and move them all to a new album in one action
**What this checks:** The bulk move feature works for more than one photo.

**Setup:** At least two photos must exist.

**Steps:**
1. Select two or more photos using checkboxes.
2. Find the **Move** option in the bulk actions bar.
3. Select the destination album.
4. Confirm.

**Expected result:** All selected photos move to the destination album. They appear when filtering by that album.

---

## 13. Rotate

### 13.1 — Rotate a photo to correct its orientation
**What this checks:** The rotate feature changes the photo orientation and saves the result.

**Setup:** At least one photo must exist.

**Steps:**
1. Open a photo in the lightbox.
2. Find the **Rotate** button or option.
3. Click it once to rotate 90 degrees clockwise.
4. Save or confirm.

**Expected result:** The photo appears rotated 90 degrees. After closing and reopening the lightbox, the rotated orientation is preserved.

---

## 14. Bulk Edit

### 14.1 — Select multiple photos and change their album all at once
**What this checks:** The bulk edit feature can update the album field on many photos simultaneously.

**Setup:** At least two photos must exist.

**Steps:**
1. Select two or more photos by clicking their checkboxes.
2. Find the **Bulk Edit** or **Edit** option in the selection toolbar.
3. Change the **Album** field to **Safety**.
4. Apply the changes.

**Expected result:** All selected photos are now in the "Safety" album. Filtering by Safety shows all the edited photos.

---

### 14.2 — Assign a location to multiple photos at once
**What this checks:** Bulk edit can set the location field across multiple selected photos.

**Setup:** At least two photos must exist.

**Steps:**
1. Select two or more photos.
2. Open **Bulk Edit**.
3. Set the **Location** field to **Roof Level**.
4. Apply.

**Expected result:** All selected photos have their location updated to "Roof Level". Opening each in the lightbox confirms the location.

---

### 14.3 — Assign a trade to multiple photos at once
**What this checks:** The trade field can be bulk-applied across selected photos.

**Setup:** At least two photos must exist.

**Steps:**
1. Select two or more photos.
2. Open **Bulk Edit**.
3. Set the **Trade** field to **Plumbing**.
4. Apply.

**Expected result:** All selected photos show "Plumbing" as their trade in the lightbox details.

---

### 14.4 — Select multiple photos and delete them all at once
**What this checks:** The bulk delete action removes all selected photos and sends them to the recycle bin.

**Setup:** At least two photos must exist.

**Steps:**
1. Select two or more photos using checkboxes.
2. Find the **Delete** option in the bulk actions bar.
3. Confirm the deletion if prompted.

**Expected result:** All selected photos disappear from the main grid. They appear in the Recycle Bin tab.

---

### 14.5 — Use a "Select All" action to select every photo on the page
**What this checks:** A select-all mechanism exists and selects every visible photo.

**Setup:** At least two photos must be visible.

**Steps:**
1. On the Photos page, find a **Select All** checkbox or button (usually in the toolbar).
2. Click it.

**Expected result:** All photo cards show a checkmark or highlighted border indicating selection. The bulk actions bar appears or updates with the total count.

---

## 15. Subscribe / Notifications

### 15.1 — Subscribe to receive notifications when new photos are added
**What this checks:** A user can subscribe to the Photos tool and will be notified of new activity.

**Steps:**
1. Navigate to `/767/photos`.
2. Find the **Subscribe** button or bell icon.
3. Click it to subscribe.

**Expected result:** A confirmation appears that you are now subscribed. The button may change to "Subscribed" or show an active state.

---

### 15.2 — Turn off notifications for the Photos tool
**What this checks:** A subscribed user can unsubscribe and stop receiving notifications.

**Setup:** You must already be subscribed.

**Steps:**
1. Navigate to `/767/photos`.
2. Find the **Subscribed** or active subscribe button.
3. Click it to unsubscribe.

**Expected result:** The button changes back to an inactive/unsubscribed state. You will no longer receive notifications for new photos.

---

## 16. Map View

### 16.1 — View geotagged photos plotted on the project map
**What this checks:** The Map tab shows geotagged photos as pins on a map.

**Setup:** At least one photo with a location or GPS coordinates must exist.

**Steps:**
1. Navigate to `/767/photos`.
2. Click the **Map** tab.
3. Look for photo pins on the map.

**Expected result:** Photos with location data appear as pins on the map. Clicking a pin shows a preview of the photo.

---

### 16.2 — Assign a map location to a photo so it appears as a pin
**What this checks:** A specific map location (coordinates or drawing pin) can be attached to a photo.

**Setup:** At least one photo must exist.

**Steps:**
1. Open a photo in the lightbox.
2. Find the **Set Location** or **Add to Map** option.
3. Select or enter coordinates or click on a map to place a pin.
4. Save.

**Expected result:** The photo appears as a pin on the Map tab at the specified location.

---

## 17. Timeline View

### 17.1 — Browse photos by date in the Timeline tab
**What this checks:** The Timeline tab groups photos chronologically to show project progress over time.

**Setup:** At least two photos with different dates must exist.

**Steps:**
1. Navigate to `/767/photos`.
2. Click the **Timeline** tab.

**Expected result:** Photos are organized by date, with oldest first (or newest first). The timeline clearly shows when each photo was taken.

---

## 18. Settings / Configuration

### 18.1 — Access the advanced configuration settings for the Photos tool
**What this checks:** A settings or gear icon is accessible from the Photos page and opens a configuration panel.

**Steps:**
1. Navigate to `/767/photos`.
2. Find the **Settings** or gear icon button.
3. Click it.

**Expected result:** A settings page or dialog opens showing configuration options for the Photos tool.

---

### 18.2 — Designate one photo as the project's main cover photo
**What this checks:** A photo can be set as the project cover image, which appears on the project dashboard.

**Setup:** At least one photo must exist.

**Steps:**
1. Open a photo in the lightbox.
2. Find the **Set as Project Photo** option.
3. Click it.
4. Navigate to the project home page.

**Expected result:** The selected photo appears as the project cover or hero image on the project overview page.

---

## 19. Permissions

### 19.1 — Verify that a user with read-only access cannot upload photos
**What this checks:** The Upload button is hidden or disabled for users who only have view access.

**Setup:** A second user account with read-only access to the project must be available.

**Steps:**
1. Log in as a user who only has read-only access to the project.
2. Navigate to `/767/photos`.
3. Look for the Upload Photo button.

**Expected result:** The **Upload Photo** button is either hidden or disabled. The user cannot add new photos.

---

### 19.2 — Verify that a read-only user cannot delete photos
**What this checks:** The Delete button in the lightbox is hidden or disabled for read-only users.

**Setup:** A second user account with read-only access must be available.

**Steps:**
1. Log in as a read-only user.
2. Click a photo to open the lightbox.
3. Look for a Delete button.

**Expected result:** The **Delete** button is absent or grayed out. The user cannot delete photos.

---

### 19.3 — Check that a user can see photos they marked as private
**What this checks:** Private photos are still visible to the user who created them.

**Setup:** A photo marked as private by the test user must exist.

**Steps:**
1. Log in as test1@mail.com.
2. Navigate to `/767/photos`.
3. Look for a photo you previously marked as private.

**Expected result:** The private photo is still visible to you (the owner). A lock icon or "Private" label may appear on the card.

---

### 19.4 — Confirm that a photo marked as private does not appear for other users
**What this checks:** Private photos are not visible to team members who did not upload them.

**Setup:** A photo marked as private by user A must exist. A second user B must have access to the project.

**Steps:**
1. As user A, upload and mark a photo as private.
2. Log out and log in as user B.
3. Navigate to `/767/photos`.
4. Look for the private photo.

**Expected result:** The private photo does not appear in user B's grid view.

---

## 20. Integration

### 20.1 — Photo added in Daily Log appears in Photos
**What this checks:** Photos uploaded through the Daily Log are also accessible from the Photos page.

**Setup:** The Daily Log tool must be enabled for the project.

**Steps:**
1. Navigate to the **Daily Log** for the project.
2. Create or edit a log entry.
3. Attach a photo to the log entry.
4. Save the log entry.
5. Navigate to `/767/photos`.

**Expected result:** The photo attached to the Daily Log entry appears in the Photos tool grid.

---

### 20.2 — Photos added from Inspections appear in Photos
**What this checks:** Cross-tool photo sharing — photos from Inspections flow into the Photos library.

**Setup:** The Inspections tool must be enabled.

**Steps:**
1. Navigate to the **Inspections** tool.
2. Open or create an inspection item.
3. Attach a photo.
4. Save.
5. Navigate to `/767/photos`.

**Expected result:** The photo attached in Inspections now appears in the Photos grid.

---

### 20.3 — Photos added from Observations appear in Photos
**What this checks:** Observations photos cross-populate into the Photos library.

**Setup:** The Observations tool must be enabled.

**Steps:**
1. Navigate to the **Observations** tool.
2. Open or create an observation.
3. Attach a photo.
4. Save.
5. Navigate to `/767/photos`.

**Expected result:** The photo from the Observation appears in the Photos grid.

---

### 20.4 — Photos added from Punch List appear in Photos
**What this checks:** Cross-tool photo integration between Punch List and Photos.

**Setup:** The Punch List tool must be enabled.

**Steps:**
1. Navigate to the **Punch List** tool.
2. Open a punch list item.
3. Attach a photo.
4. Save.
5. Navigate to `/767/photos`.

**Expected result:** The photo from the punch list item appears in the Photos grid.

---

### 20.5 — Link a photo to a specific spot on a project drawing
**What this checks:** Photos can be pinned to drawing sheets, and the pin is visible on the drawing.

**Setup:** The Drawings tool must have at least one drawing sheet uploaded.

**Steps:**
1. Navigate to the **Drawings** tool.
2. Open a drawing sheet.
3. Find the option to add a photo pin to the drawing.
4. Click a location on the drawing and select a photo from the Photos library.
5. Save.

**Expected result:** A photo pin marker appears at the selected spot on the drawing. Clicking the pin shows the linked photo.

---

## 21. Edge Cases

### 21.1 — Upload a photo with the same filename as an existing photo
**What this checks:** Duplicate filenames do not overwrite existing photos — each upload creates a separate record.

**Setup:** Upload a photo, note its filename, then upload another photo with the exact same filename.

**Steps:**
1. Upload a photo named **test.jpg**.
2. Upload another photo also named **test.jpg**.
3. Look at the photo grid.

**Expected result:** Both photos appear as separate items in the grid. The second upload does not overwrite the first.

---

### 21.2 — Upload a photo and set an extremely long title
**What this checks:** The UI handles long titles gracefully — truncating on the card without breaking the layout.

**Setup:** At least one photo must exist.

**Steps:**
1. Open a photo in the lightbox.
2. Edit the title to be 200+ characters long.
3. Save.
4. Close the lightbox and look at the grid.

**Expected result:** The photo card truncates the long title with an ellipsis (...). The card layout does not break or overflow.

---

### 21.3 — Confirm that photos are still visible after refreshing the browser
**What this checks:** The photo data is properly saved to the database and not lost on page reload.

**Setup:** At least one photo must have been uploaded.

**Steps:**
1. Upload a photo.
2. Confirm it appears in the grid.
3. Press **Ctrl+R** (or Cmd+R on Mac) to refresh the page.

**Expected result:** After refreshing, the same photo is still visible in the grid. No data was lost.

---

### 21.4 — Confirm that edited photo metadata survives a page refresh
**What this checks:** The PUT/update API correctly saves all metadata fields and they are not reverted on reload.

**Setup:** A photo must have been edited with a title, description, location, and trade set.

**Steps:**
1. Open a photo and set title, description, location, and trade.
2. Save.
3. Press **Ctrl+R** to refresh.
4. Open the same photo again.

**Expected result:** All previously set fields (title, description, location, trade) are still showing the saved values. Nothing was reverted.

---

### 21.5 — Try to submit the upload dialog without selecting any files
**What this checks:** The Upload button is disabled or shows an error when no files are in the queue.

**Steps:**
1. Click **Upload Photo** to open the dialog.
2. Do not select any files.
3. Observe the state of the **Upload Photo** button.

**Expected result:** The **Upload Photo** button is disabled (grayed out) and cannot be clicked. No upload is attempted.

---

### 21.6 — Close the lightbox using the keyboard (Escape key)
**What this checks:** Standard keyboard shortcuts work in the lightbox for accessibility.

**Setup:** A photo must be open in the lightbox.

**Steps:**
1. Click a photo to open the lightbox.
2. Press the **Escape** key on your keyboard.

**Expected result:** The lightbox closes and the photo grid is shown again.

---

### 21.7 — Verify the Photos page looks correct on a mobile-sized screen
**What this checks:** The photo grid and toolbar adapt to narrow screens without horizontal scrolling or overlapping elements.

**Steps:**
1. Resize your browser to a mobile width (about 375px wide) or use browser DevTools mobile simulation.
2. Navigate to `/767/photos`.

**Expected result:** The photo grid switches to 1–2 columns. The toolbar wraps or stacks vertically. The tabs scroll horizontally if needed. No content is cut off or overlapping.

---

## Known Gaps (not yet tested)

| Feature | Reason |
|---------|--------|
| Map view with real GPS coordinates | Requires photos with actual EXIF GPS data — hard to simulate manually |
| Inbound email-to-photos | Depends on external email infrastructure being wired up |
| Drawing photo pin integration | Requires Drawings tool to have sheets uploaded |
| Export to PDF | Multi-step generation — needs verification of PDF contents |
| Mention notifications delivered | Cannot verify notification delivery without a second active email account |
| Permissions for roles other than read-only | Requires additional test accounts with specific permission levels |
