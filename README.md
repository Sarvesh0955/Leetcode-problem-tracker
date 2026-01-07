# LeetCode Problem Tracker

A web application to track and filter LeetCode problems from different companies and time periods.

## Features

- **Upload Structured CSV Files**: Upload a folder containing company-specific LeetCode problem sets organized by time periods.
- **Comprehensive Filtering**: Filter problems by company, difficulty, time period, topic, frequency, and acceptance rate.
- **Search Functionality**: Quickly search for problems by title, company, or topics.
- **Mark Problems as Completed**: Track your progress by marking problems as completed.
- **Mark Problems for Revision**: Flag problems that you want to revisit or need more practice with.
- **Sort Problems**: Sort problems by any column (company, difficulty, frequency, etc.).
- **Export to CSV**: Export filtered problems to a CSV file for further analysis.
- **Random Problem Selection**: Get a random unsolved problem from the currently applied filters to practice with.

## How to Use

1. **Upload Your Data**:
   - Click "Choose Folder" and select the root folder containing your LeetCode problems organized in the format:
     ```
     /root/
       /CompanyName1/
         TimeFrame1.csv
         TimeFrame2.csv
       /CompanyName2/
         TimeFrame1.csv
     ```

2. **Filter and Sort**:
   - Use the filter controls to narrow down problems
   - Click on column headers to sort
   - Use the search box for quick filtering

3. **Track Progress**:
   - Check the "Done" checkbox for problems you've completed
   - Click the star button to mark problems for revision
   - Use the "Show Completed" and "Show Revision" filters to focus on specific sets of problems

4. **Export Data**:
   - Click the "Export to CSV" button to download your filtered problems

5. **Random Problem Practice**:
   - Click the "🎲 Random Problem" button to get a random unsolved problem from your current filters
   - The selected problem will be highlighted and scrolled into view automatically
   - A notification will show the selected problem's details

## CSV File Format

Each CSV file should contain columns like:
- Difficulty (EASY, MEDIUM, HARD)
- Title
- Frequency
- Acceptance Rate
- Link (to LeetCode problem)
- Topics (comma-separated)

## Data Persistence & Backup 🔒

The application uses a **dual-storage system** to protect your data:

### Primary Storage (localStorage)
- Fast and immediate access
- Stores all your problems, completed status, revision markers, and notes
- Limited to ~5-10 MB depending on browser

### Automatic Backup (IndexedDB)
- **NEW**: All data is automatically backed up to IndexedDB
- More persistent and resilient to data loss
- Automatically restores your data if localStorage is cleared
- Larger storage capacity for extensive problem sets

### What This Means For You
- **Complete Data Persistence**: All problem data is saved automatically when you upload files
- **Progress Tracking**: Your completed problems and revision marks are preserved
- **Automatic Recovery**: If browser storage is cleared, your data is automatically restored from backup
- **Quick Loading**: Data loads automatically when you revisit the site
- **Storage Management**: View your current storage usage with backup status indicator (🔒 Backup enabled)

Look for the **🔒 Backup enabled** indicator in the storage status to confirm your data is being backed up.

For more details about the backup system, see [BACKUP_INFO.md](BACKUP_INFO.md).

### Storage Limitations

Browser local storage is limited (typically 5-10MB). If you upload a very large dataset:

- The application will automatically prioritize higher frequency problems if space is limited
- Both localStorage and IndexedDB backup will be updated
- You can clear saved data (including backups) if needed
- Your completed problem markers are saved separately and always preserved
