# LeetCode Problem Tracker

A web application to track and filter LeetCode problems from different companies and time periods.

## Features

- **Upload Structured CSV Files**: Upload a folder containing company-specific LeetCode problem sets organized by time periods.
- **Comprehensive Filtering**: Filter problems by company, difficulty, time period, topic, frequency, and acceptance rate.
- **Search Functionality**: Quickly search for problems by title, company, or topics.
- **Mark Problems as Completed**: Track your progress by marking problems as completed.
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
   - Use the "Show Completed" filter to view only completed or uncompleted problems

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

Your completed problems are saved in your browser's local storage, so they will persist between sessions on the same browser.
