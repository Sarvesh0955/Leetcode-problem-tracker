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

## CSV File Format

Each CSV file should contain columns like:
- Difficulty (EASY, MEDIUM, HARD)
- Title
- Frequency
- Acceptance Rate
- Link (to LeetCode problem)
- Topics (comma-separated)

## Data Persistence

The application automatically stores your data in your browser's local storage, enabling:

- **Complete Data Persistence**: All problem data is saved automatically when you upload files.
- **Progress Tracking**: Your completed problems and revision marks are preserved.
- **Quick Loading**: Data loads automatically when you revisit the site, no need to re-upload files.
- **Storage Management**: View your current storage usage and clear saved data if needed.

### Storage Limitations

Browser local storage is limited (typically 5-10MB). If you upload a very large dataset:

- The application will automatically prioritize higher frequency problems if space is limited
- You can always clear the saved data and start fresh
- Your completed problem markers will be saved separately from the main dataset
