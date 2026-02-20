# LeetCode Problem Tracker - Technical Documentation

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Data Storage System](#data-storage-system)
3. [CSV File Processing](#csv-file-processing)
4. [Duplicate Problem Handling](#duplicate-problem-handling)
5. [Filtering System](#filtering-system)
6. [Sorting Logic](#sorting-logic)
7. [Display Logic](#display-logic)
8. [Notes System](#notes-system)
9. [Export Functionality](#export-functionality)
10. [Random Problem Selection](#random-problem-selection)
11. [UI Components](#ui-components)

---

## System Architecture

### Overview
The LeetCode Problem Tracker is a client-side web application built with vanilla JavaScript, HTML, and CSS. It processes CSV files containing LeetCode problems from different companies and time periods, providing comprehensive filtering, tracking, and analysis capabilities.

### Core Components
```
┌─────────────────────────────────────────────────────────┐
│                    User Interface                        │
│  (HTML + CSS - Filters, Table, Modal, Buttons)         │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  Application Logic                       │
│              (script.js - Event Handlers)               │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                   Data Management                        │
│        (Global Variables + Processing Functions)        │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              Dual Storage System                         │
│         localStorage ←→ IndexedDB (backup)              │
└─────────────────────────────────────────────────────────┘
```

### Global Data Structures

```javascript
// Core data structures
let allProblems = [];              // Array of all problem objects
let companies = new Set();         // Unique company names
let topics = new Set();            // Unique problem topics
let timePeriods = new Set();       // Unique time periods
let completedProblems = new Set(); // Links of completed problems
let revisionProblems = new Set();  // Links of problems for revision
let problemNotes = new Map();      // Map<problemLink, noteText>

// Database connection
let db = null;                     // IndexedDB connection
```

---

## Data Storage System

### Dual-Storage Architecture

The application uses a **sophisticated dual-storage system** to ensure data persistence:

#### 1. Primary Storage: localStorage
- **Purpose**: Fast access, immediate operations
- **Capacity**: ~5-10 MB (browser-dependent)
- **Data Stored**:
  - `leetCodeProblems`: All problem data
  - `leetCodeCompanies`: Company names
  - `leetCodeTopics`: Problem topics
  - `leetCodeTimePeriods`: Time periods
  - `completedLeetCodeProblems`: Completed status
  - `revisionLeetCodeProblems`: Revision markers
  - `leetCodeProblemNotes`: User notes
  - `leetCodeLastSaved`: Timestamp
  - `leetCodeDataTruncated`: Truncation flag

#### 2. Backup Storage: IndexedDB
- **Purpose**: Automatic backup, data recovery
- **Capacity**: Larger (typically 50MB+)
- **Features**:
  - More persistent than localStorage
  - Automatic restoration if localStorage is cleared
  - Timestamped backups

### Storage Flow

```
User Action (Upload/Mark Complete/Add Note)
    ↓
Update in-memory data structures
    ↓
Save to localStorage ←─────────────┐
    ↓                               │
Backup to IndexedDB ────────────────┘
    (async operation)
```

### Data Recovery Process

```javascript
// On page load
1. Check localStorage for data
2. If empty → Attempt restore from IndexedDB
3. If restored → Copy back to localStorage
4. Load into memory structures
5. Update UI
```

### Storage Quota Management

When storage quota is exceeded:

1. **Detection**: Try-catch on localStorage.setItem()
2. **Response**: 
   - Sort problems by frequency (descending)
   - Keep top 500 high-frequency problems
   - Set `leetCodeDataTruncated` flag
   - Display warning to user

```javascript
// Truncation logic
if (storage exceeds quota) {
    sortedProblems = allProblems.sort((a, b) => 
        parseFloat(b.Frequency) - parseFloat(a.Frequency)
    );
    reducedProblems = sortedProblems.slice(0, 500);
    save(reducedProblems);
}
```

---

## CSV File Processing

### File Structure Recognition

The application supports flexible folder structures:

#### Expected Structure
```
/root_folder/
    /CompanyName1/
        TimeFrame1.csv
        TimeFrame2.csv
    /CompanyName2/
        TimeFrame1.csv
```

#### Alternative Structures
- Flat structure: `/root_folder/file.csv`
- Filename-based: `CompanyName - TimeFrame.csv`

### Processing Pipeline

```
1. File Selection
   ↓
2. Structure Analysis (analyzeFolderStructure)
   - Count files at each depth level
   - Determine most common depth
   ↓
3. Path Parsing (extractFileInfo)
   - Extract company name from path
   - Extract time period from filename
   ↓
4. CSV Parsing (parseCSV)
   - Handle quoted fields
   - Handle escaped quotes
   - Skip comment lines (// prefix)
   ↓
5. Data Enrichment
   - Add Company and TimePeriod fields
   - Extract and collect topics
   - Initialize Companies and TimePeriods arrays
   ↓
6. Duplicate Handling (see next section)
   ↓
7. Storage
   - Save to localStorage + IndexedDB
   - Update filter options
   ↓
8. Display
   - Filter and display problems
```

### CSV Parsing Logic

The `parseCSV()` function handles:

**Quote Handling**:
```javascript
// Supports both quoted and unquoted fields
"Title","Topics","Link"
Two Sum,"Array, Hash Table",https://...
```

**Escaped Quotes**:
```javascript
// Double quotes inside quoted fields
"Description: ""Array"" problem"
```

**Multi-line Fields** (if quoted):
```javascript
"Title with
multiple lines"
```

**Comment Lines**:
```javascript
// This line is ignored
Title,Topics,Link
Two Sum,Array,https://...
```

---

## Duplicate Problem Handling

### Problem Identification

Problems are identified as duplicates if they share:
- Same `Link` (preferred), OR
- Same `Title` (fallback)

### Merge Strategy

When a duplicate is found, the application **merges** data instead of creating duplicates:

#### 1. Company and Time Period Aggregation
```javascript
// Original problem
{
    Title: "Two Sum",
    Company: "Google",
    Companies: ["Google"],
    TimePeriod: "6 months",
    TimePeriods: ["6 months"]
}

// Duplicate found from Amazon
{
    Title: "Two Sum",
    Company: "Amazon",
    TimePeriod: "3 months"
}

// After merge
{
    Title: "Two Sum",
    Company: "Google",  // Keeps first
    Companies: ["Google", "Amazon"],  // Merged
    TimePeriod: "6 months",  // Keeps first
    TimePeriods: ["6 months", "3 months"]  // Merged
}
```

#### 2. Frequency Handling

**Storage Structure**:
```javascript
problem.FrequencyByCompany = {
    "Google": "85.5",
    "Amazon": "90.2",
    "Microsoft": "78.3"
}
problem.Frequency = "90.2"  // Highest across all companies
```

**Update Logic**:
```javascript
// When new company data is added
if (!existingProblem.FrequencyByCompany) {
    existingProblem.FrequencyByCompany = {};
}

// Store company-specific frequency
existingProblem.FrequencyByCompany[newCompany] = newFrequency;

// Update main frequency to highest
const allFreqs = Object.values(existingProblem.FrequencyByCompany);
existingProblem.Frequency = Math.max(...allFreqs).toString();
```

#### 3. Acceptance Rate Handling

**Rule**: Use the **highest** acceptance rate across all companies

```javascript
const existingRate = parseFloat(existingProblem["Acceptance Rate"]) || 0;
const newRate = parseFloat(problem["Acceptance Rate"]) || 0;

if (newRate > existingRate) {
    existingProblem["Acceptance Rate"] = problem["Acceptance Rate"];
}
```

**Rationale**: Different companies may report slightly different acceptance rates; we assume the highest is most accurate.

#### 4. Topic Merging

**Logic**: Merge all unique topics from all companies

```javascript
// Existing topics: "Array, Hash Table"
// New topics: "Array, Two Pointers"
// Result: "Array, Hash Table, Two Pointers"

const existingTopics = new Set(existingProblem.Topics.split(','));
const newTopics = problem.Topics.split(',');

newTopics.forEach(topic => existingTopics.add(topic.trim()));
existingProblem.Topics = Array.from(existingTopics).join(', ');
```

---

## Filtering System

### Filter Types

1. **Company Filter** (Dropdown)
2. **Difficulty Filter** (Dropdown)
3. **Time Period Filter** (Dropdown)
4. **Topic Filter** (Dropdown)
5. **Minimum Frequency** (Number Input)
6. **Minimum Acceptance Rate** (Number Input)
7. **Completion Status** (Dropdown: All/Completed/Not Completed)
8. **Revision Status** (Dropdown: All/For Revision/Not For Revision)
9. **Search Query** (Text Input)

### Filter Application Logic

```javascript
function getFilteredProblems() {
    return allProblems.filter(problem => {
        // All filters must pass (AND logic)
        
        // 1. Company Filter
        if (companyFilter) {
            if (!problem.Companies.includes(companyFilter)) return false;
        }
        
        // 2. Difficulty Filter
        if (difficultyFilter && problem.Difficulty !== difficultyFilter) 
            return false;
        
        // 3. Time Period Filter
        if (timePeriodFilter) {
            if (!problem.TimePeriods.includes(timePeriodFilter)) return false;
        }
        
        // 4. Topic Filter
        if (topicFilter && !problem.Topics.includes(topicFilter)) 
            return false;
        
        // 5. Frequency Filter
        if (minFrequency > 0) {
            if (parseFloat(problem.Frequency) < minFrequency) return false;
        }
        
        // 6. Acceptance Rate Filter
        if (minAcceptance > 0) {
            const rate = parseFloat(problem["Acceptance Rate"]) * 100;
            if (rate < minAcceptance) return false;
        }
        
        // 7. Completion Status Filter
        if (showCompleted === 'completed') {
            if (!completedProblems.has(problem.Link)) return false;
        } else if (showCompleted === 'not-completed') {
            if (completedProblems.has(problem.Link)) return false;
        }
        
        // 8. Revision Status Filter
        if (showRevision === 'revision') {
            if (!revisionProblems.has(problem.Link)) return false;
        } else if (showRevision === 'not-revision') {
            if (revisionProblems.has(problem.Link)) return false;
        }
        
        // 9. Search Query (OR logic for multiple fields)
        if (searchQuery) {
            const matchTitle = problem.Title.toLowerCase().includes(searchQuery);
            const matchCompany = problem.Companies.some(c => 
                c.toLowerCase().includes(searchQuery)
            );
            const matchTimePeriod = problem.TimePeriods.some(t => 
                t.toLowerCase().includes(searchQuery)
            );
            const matchTopics = problem.Topics.toLowerCase().includes(searchQuery);
            
            if (!matchTitle && !matchCompany && !matchTimePeriod && !matchTopics) {
                return false;
            }
        }
        
        return true;  // All filters passed
    });
}
```

### Search Functionality

**Fields Searched** (case-insensitive):
- Problem Title
- Company names (all companies for the problem)
- Time periods (all time periods)
- Topics

**Search Type**: Partial match (substring search)

**Example**:
```javascript
searchQuery = "array"
// Matches:
// - Title: "Two Sum Array Problem"
// - Topics: "Array, Hash Table"
// - Company: "ArrayTech Inc."
```

---

## Sorting Logic

### Sortable Columns

1. Company
2. Time Period
3. Difficulty
4. Title
5. Frequency
6. Acceptance Rate

### Sort State Management

```javascript
let currentSortColumn = 'company';  // Default
let currentSortDirection = 'asc';   // 'asc' or 'desc'

// Toggle logic
if (clickedColumn === currentSortColumn) {
    // Same column → toggle direction
    currentSortDirection = (currentSortDirection === 'asc') ? 'desc' : 'asc';
} else {
    // New column → start with ascending
    currentSortColumn = clickedColumn;
    currentSortDirection = 'asc';
}
```

### Column-Specific Sort Logic

#### 1. Company Sort
```javascript
// For problems with multiple companies, use first company
aValue = Array.isArray(a.Companies) ? a.Companies[0] : a.Company;
bValue = Array.isArray(b.Companies) ? b.Companies[0] : b.Company;
// String comparison
```

#### 2. Time Period Sort
```javascript
// Similar to company, use first time period
aValue = Array.isArray(a.TimePeriods) ? a.TimePeriods[0] : a.TimePeriod;
bValue = Array.isArray(b.TimePeriods) ? b.TimePeriods[0] : b.TimePeriod;
// String comparison
```

#### 3. Difficulty Sort
```javascript
// Custom order: HARD > MEDIUM > EASY
const difficultyOrder = { 'HARD': 3, 'MEDIUM': 2, 'EASY': 1 };
aValue = difficultyOrder[a.Difficulty] || 0;
bValue = difficultyOrder[b.Difficulty] || 0;
// Numeric comparison
```

#### 4. Title Sort
```javascript
// Alphabetical comparison
aValue = a.Title || '';
bValue = b.Title || '';
// String comparison
```

#### 5. Frequency Sort
```javascript
// Numeric comparison
aValue = parseFloat(a.Frequency) || 0;
bValue = parseFloat(b.Frequency) || 0;
// Numeric comparison
```

#### 6. Acceptance Rate Sort
```javascript
// Numeric comparison
aValue = parseFloat(a["Acceptance Rate"]) || 0;
bValue = parseFloat(b["Acceptance Rate"]) || 0;
// Numeric comparison
```

### Sort Order

**Ascending**: a → z, 0 → 100, EASY → HARD  
**Descending**: z → a, 100 → 0, HARD → EASY

---

## Display Logic

### Table Generation

For each filtered and sorted problem:

#### 1. Done Checkbox
```javascript
const checkbox = document.createElement('input');
checkbox.type = 'checkbox';
checkbox.checked = completedProblems.has(problem.Link);

checkbox.addEventListener('change', () => {
    if (checkbox.checked) {
        completedProblems.add(problem.Link);
    } else {
        completedProblems.delete(problem.Link);
    }
    saveCompletedProblems();  // Save to storage
    updateProblemCount();      // Update statistics
});
```

#### 2. Revision Button
```javascript
const button = document.createElement('button');
button.innerHTML = revisionProblems.has(problem.Link) ? '★' : '☆';
button.classList.toggle('marked', revisionProblems.has(problem.Link));

button.addEventListener('click', () => {
    if (revisionProblems.has(problem.Link)) {
        revisionProblems.delete(problem.Link);
        button.innerHTML = '☆';
    } else {
        revisionProblems.add(problem.Link);
        button.innerHTML = '★';
    }
    saveRevisionProblems();
    updateProblemCount();
});
```

#### 3. Company Display
```javascript
// Show all companies for the problem
if (Array.isArray(problem.Companies)) {
    const uniqueCompanies = [...new Set(problem.Companies)];
    companyCell.textContent = uniqueCompanies.join(', ');
} else {
    companyCell.textContent = problem.Company || '';
}
```

#### 4. Time Period Display
```javascript
// Show all time periods
if (Array.isArray(problem.TimePeriods)) {
    const uniquePeriods = [...new Set(problem.TimePeriods)];
    timePeriodCell.textContent = uniquePeriods.join(', ');
} else {
    timePeriodCell.textContent = problem.TimePeriod || '';
}
```

#### 5. Difficulty Display
```javascript
// Add CSS class for styling
difficultyCell.textContent = problem.Difficulty;
difficultyCell.className = problem.Difficulty.toLowerCase();
// Classes: 'easy', 'medium', 'hard'
```

#### 6. Title with Link
```javascript
const link = document.createElement('a');
link.href = problem.Link;
link.textContent = problem.Title;
link.target = '_blank';  // Open in new tab
```

#### 7. Frequency Display (IMPORTANT!)

**Logic Varies Based on Company Filter**:

```javascript
const companyFilter = document.getElementById('company-filter').value;

if (companyFilter && problem.FrequencyByCompany) {
    // CASE 1: Company filter is selected
    // Show frequency specific to that company
    frequencyCell.textContent = problem.FrequencyByCompany[companyFilter];
    
} else if (problem.FrequencyByCompany) {
    // CASE 2: No company filter (viewing all companies)
    // Show AVERAGE frequency across all companies
    const frequencies = Object.values(problem.FrequencyByCompany)
        .map(f => parseFloat(f) || 0);
    const avgFrequency = frequencies.reduce((sum, f) => sum + f, 0) 
        / frequencies.length;
    
    frequencyCell.textContent = avgFrequency.toFixed(1);
    frequencyCell.title = `Average frequency across ${frequencies.length} companies`;
    
} else {
    // CASE 3: Fallback (single company data)
    frequencyCell.textContent = problem.Frequency;
}
```

**Summary**:
- **Company filter active**: Show that company's frequency
- **No company filter**: Show average frequency with tooltip
- **No multi-company data**: Show general frequency

#### 8. Acceptance Rate Display

**Always shows the highest rate** across all companies:

```javascript
const rateValue = problem["Acceptance Rate"] || problem.Acceptance_Rate;
if (rateValue) {
    const rate = parseFloat(rateValue);
    acceptanceCell.textContent = `${(rate * 100).toFixed(1)}%`;
}

// Note: rate is stored as decimal (0.75 → "75.0%")
```

#### 9. Topics Display
```javascript
const topicsList = problem.Topics.split(',');
topicsList.forEach(topic => {
    const span = document.createElement('span');
    span.className = 'topic-tag';
    span.textContent = topic.trim();
    topicsCell.appendChild(span);
});
```

#### 10. Notes Button
```javascript
const currentNote = problemNotes.get(problem.Link) || '';

const button = document.createElement('button');
button.className = currentNote ? 'notes-button has-notes' : 'notes-button';
button.innerHTML = currentNote ? 
    '📝 View Notes' : 
    '📝 Add Notes';

button.addEventListener('click', () => {
    const freshNote = problemNotes.get(problem.Link) || '';
    openNotesModal(problem, freshNote);
});
```

### Problem Count Display

```javascript
// Format: "250 problems found"
problemCount.textContent = `${problems.length} problems found`;

// Calculate statistics
const completed = problems.filter(p => completedProblems.has(p.Link)).length;
const forRevision = problems.filter(p => revisionProblems.has(p.Link)).length;

const completedPercent = Math.round(completed / problems.length * 100) || 0;
const revisionPercent = Math.round(forRevision / problems.length * 100) || 0;

// Format: "50 completed (20%), 30 for revision (12%)"
completedCount.textContent = 
    `${completed} completed (${completedPercent}%), ` +
    `${forRevision} for revision (${revisionPercent}%)`;
```

---

## Notes System

### Modal-Based Interface

**Components**:
- Modal overlay (darkens background)
- Problem information header
- Textarea for note editing
- Action buttons (Save, Clear, Cancel)

### Note Management

**Storage**:
```javascript
// In-memory
problemNotes = new Map();  // Map<problemLink, noteText>

// Persistent storage
localStorage.setItem('leetCodeProblemNotes', JSON.stringify(
    Object.fromEntries(problemNotes)
));
```

**Operations**:

1. **Open Modal**:
```javascript
function openNotesModal(problem, currentNote) {
    currentNoteProblem = problem;  // Track which problem
    textarea.value = currentNote;   // Load existing note
    modal.style.display = 'block';
    textarea.focus();
}
```

2. **Save Note**:
```javascript
function saveNotesFromModal() {
    const noteText = textarea.value.trim();
    
    if (noteText) {
        // Add or update note
        problemNotes.set(currentNoteProblem.Link, noteText);
    } else {
        // Remove empty note
        problemNotes.delete(currentNoteProblem.Link);
    }
    
    saveProblemNotes();        // Persist to storage
    updateNotesButton(problem); // Update UI
    closeNotesModal();
}
```

3. **Clear Note**:
```javascript
function clearNotesFromModal() {
    textarea.value = '';
    textarea.focus();
}
```

4. **Update Button Appearance**:
```javascript
function updateNotesButton(problem, noteText) {
    // Find the button in the table row
    const button = findButtonForProblem(problem);
    
    if (noteText) {
        button.className = 'notes-button has-notes';
        button.innerHTML = '📝 View Notes';
    } else {
        button.className = 'notes-button';
        button.innerHTML = '📝 Add Notes';
    }
}
```

### Keyboard Shortcuts

- **Ctrl+Enter**: Save notes
- **Escape**: Close modal

```javascript
textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        saveNotesFromModal();
    }
    if (e.key === 'Escape') {
        e.preventDefault();
        closeNotesModal();
    }
});
```

---

## Export Functionality

### CSV Export Process

1. **Get Filtered Problems**:
```javascript
const filteredProblems = getFilteredProblems();
```

2. **Add Status Information**:
```javascript
const problemsWithStatus = filteredProblems.map(problem => ({
    ...problem,
    Completed: completedProblems.has(problem.Link) ? 'Yes' : 'No',
    ForRevision: revisionProblems.has(problem.Link) ? 'Yes' : 'No',
    Notes: problemNotes.get(problem.Link) || '',
    // Format arrays as comma-separated strings
    Company: Array.isArray(problem.Companies) ? 
        problem.Companies.join(', ') : problem.Company,
    TimePeriod: Array.isArray(problem.TimePeriods) ? 
        problem.TimePeriods.join(', ') : problem.TimePeriod
}));
```

3. **Determine Headers**:
```javascript
// Preferred order
const orderedHeaders = [
    'Company',
    'TimePeriod',
    'Difficulty',
    'Title',
    'Frequency',
    'Acceptance Rate',
    'Link',
    'Topics',
    'Completed',
    'ForRevision',
    'Notes'
    // ... any other fields
];
```

4. **Generate CSV**:
```javascript
let csv = orderedHeaders.join(',') + '\n';

problems.forEach(problem => {
    const row = orderedHeaders.map(header => {
        let value = problem[header] || '';
        
        // Handle arrays
        if (Array.isArray(value)) {
            value = value.join(', ');
        }
        
        // Escape quotes and wrap if needed
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            value = '"' + value.replace(/"/g, '""') + '"';
        }
        
        return value;
    });
    csv += row.join(',') + '\n';
});
```

5. **Trigger Download**:
```javascript
const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.setAttribute('href', url);
link.setAttribute('download', 'leetcode_problems.csv');
link.click();
```

### What Gets Exported

- ✅ All filtered problems (respects current filters)
- ✅ Completion status (Yes/No)
- ✅ Revision status (Yes/No)
- ✅ User notes
- ✅ All companies (comma-separated)
- ✅ All time periods (comma-separated)
- ✅ All original fields from CSV

---

## Random Problem Selection

### Purpose
Helps users practice by selecting a random **unsolved** problem from the currently applied filters.

### Algorithm

```javascript
function selectRandomProblem() {
    // 1. Get currently filtered problems
    const filteredProblems = getFilteredProblems();
    
    // 2. Filter out completed problems
    const unsolvedProblems = filteredProblems.filter(problem => 
        !completedProblems.has(problem.Link)
    );
    
    // 3. Check if any unsolved problems exist
    if (unsolvedProblems.length === 0) {
        alert('No unsolved problems found with current filters!');
        return;
    }
    
    // 4. Select random problem
    const randomIndex = Math.floor(Math.random() * unsolvedProblems.length);
    const randomProblem = unsolvedProblems[randomIndex];
    
    // 5. Highlight and scroll to problem
    highlightRandomProblem(randomProblem);
    
    // 6. Show notification
    showRandomProblemNotification(randomProblem);
}
```

### Highlighting Logic

```javascript
function highlightRandomProblem(problem) {
    // 1. Remove existing highlights
    document.querySelectorAll('#problems-body tr').forEach(row => {
        row.classList.remove('highlighted-problem');
    });
    
    // 2. Find the row for this problem
    const targetRow = findRowByProblemLink(problem.Link);
    
    // 3. Add highlight class
    targetRow.classList.add('highlighted-problem');
    
    // 4. Scroll into view
    targetRow.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
    });
    
    // 5. Auto-remove highlight after 5 seconds
    setTimeout(() => {
        targetRow.classList.remove('highlighted-problem');
    }, 5000);
}
```

### Notification Display

```javascript
// Creates a temporary notification overlay
function showRandomProblemNotification(problem) {
    const notification = createNotificationElement();
    notification.innerHTML = `
        <h3>🎲 Random Problem Selected!</h3>
        <p><strong>${problem.Title}</strong></p>
        <span class="difficulty-badge ${problem.Difficulty.toLowerCase()}">
            ${problem.Difficulty}
        </span>
    `;
    
    // Auto-hide after 4 seconds
    setTimeout(() => notification.style.display = 'none', 4000);
}
```

---

## UI Components

### 1. Filters Section

**Structure**:
```html
<div class="filters">
    <div class="filters-header">
        <!-- Upload toggle button -->
        <button id="upload-toggle">📂 Upload Data</button>
        
        <!-- Collapsible upload panel -->
        <div class="upload-panel">
            <!-- File input, status, storage info -->
        </div>
    </div>
    
    <!-- Search box -->
    <div class="search-box">...</div>
    
    <!-- Filter controls (dropdowns, inputs) -->
    <div class="filter-row">...</div>
    
    <!-- Action buttons -->
    <button id="apply-filters">Apply Filters</button>
    <button id="reset-filters">Reset Filters</button>
</div>
```

**Features**:
- Collapsible upload section (toggle with button click)
- Auto-close when clicking outside
- Real-time search with debouncing (300ms delay)
- Storage status indicator with backup status

### 2. Problems Table

**Structure**:
```html
<table id="problems-table">
    <thead>
        <tr>
            <th>Done</th>
            <th>Revise</th>
            <th class="sortable" data-sort="company">
                Company <span class="sort-icon">⇅</span>
            </th>
            <!-- More sortable columns -->
        </tr>
    </thead>
    <tbody id="problems-body">
        <!-- Dynamically generated rows -->
    </tbody>
</table>
```

**Features**:
- Sortable columns (click header to sort)
- Visual sort indicators (↑↓)
- Difficulty color coding (green/yellow/red)
- Clickable problem links (open in new tab)
- Topic tags with distinct styling
- Interactive checkboxes and buttons

### 3. Notes Modal

**Structure**:
```html
<div id="notes-modal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h3>Problem Notes</h3>
            <span class="modal-close">×</span>
        </div>
        <div class="modal-body">
            <div class="notes-info">
                <!-- Problem title and link -->
            </div>
            <div class="notes-editor">
                <textarea id="notes-textarea"></textarea>
                <div class="notes-toolbar">
                    <button id="clear-notes">Clear</button>
                    <button id="cancel-notes">Cancel</button>
                    <button id="save-notes">Save Notes</button>
                </div>
            </div>
        </div>
    </div>
</div>
```

**Features**:
- Overlay modal (darkens background)
- Click outside to close
- Keyboard shortcuts (Ctrl+Enter, Escape)
- Auto-focus on textarea
- Problem context displayed

### 4. Loading Indicator

```html
<div id="loading-indicator" class="loading">
    <div class="spinner"></div>
    <span>Loading problems...</span>
</div>
```

**When Shown**:
- During file upload and parsing
- While filtering/sorting (for large datasets)

### 5. Storage Status Display

```html
<div id="storage-status">
    250 problems stored (2.5 MB) · Last saved: 5 minutes ago · 🔒 Backup enabled
</div>
```

**Information Displayed**:
- Number of problems stored
- Storage size used
- Time since last save
- Backup status indicator
- Truncation warning (if applicable)

### 6. Problem Count Display

```html
<div class="count-info">
    <span id="problem-count">250 problems found</span>
    <span id="completed-count">50 completed (20%), 30 for revision (12%)</span>
</div>
```

### 7. Action Buttons

```html
<div class="actions">
    <button id="random-problem" title="Get random unsolved problem">
        🎲 Random Problem
    </button>
    <button id="export-csv" title="Export filtered problems to CSV">
        Export to CSV
    </button>
</div>
```

---

## Event Handling

### Page Load Sequence

```javascript
1. Initialize IndexedDB connection
2. Attempt to restore from backup (if localStorage empty)
3. Load completed problems from storage
4. Load revision problems from storage
5. Load problem notes from storage
6. Update storage status display
7. Load all problem data from localStorage
8. Update filter options (populate dropdowns)
9. Display problems (with applied filters)
10. Update upload status message
```

### User Interaction Events

#### File Upload
```javascript
'folder-upload' change event
    → updateSelectedFolder()
    → Display selected folder name

'upload-btn' click event
    → Disable button
    → Update status: "Loading data..."
    → handleFileUpload()
    → Parse CSV files
    → Process and merge data
    → Save to storage
    → Update UI
    → Enable button
    → Update status: "Successfully loaded..."
```

#### Filtering
```javascript
'apply-filters' button click
    → filterProblems()
    
'reset-filters' button click
    → Reset all filter inputs to defaults
    → filterProblems()
    
'search-input' input event
    → Debounce 300ms
    → filterProblems()
    
Any filter dropdown change
    → filterProblems() (immediate)
```

#### Sorting
```javascript
Column header click
    → Determine new sort column and direction
    → filterProblems() (includes sorting)
    → updateSortHeader() (visual indicator)
```

#### Progress Tracking
```javascript
Done checkbox change
    → Add/remove from completedProblems Set
    → saveCompletedProblems() → localStorage + IndexedDB
    → updateProblemCount()
    
Revision button click
    → Add/remove from revisionProblems Set
    → Update button appearance (★/☆)
    → saveRevisionProblems() → localStorage + IndexedDB
    → updateProblemCount()
```

#### Notes
```javascript
Notes button click
    → Get current note from problemNotes Map
    → openNotesModal(problem, note)
    
Save button click (or Ctrl+Enter)
    → Get textarea value
    → Update problemNotes Map
    → saveProblemNotes() → localStorage + IndexedDB
    → updateNotesButton()
    → closeNotesModal()
```

#### Export
```javascript
'export-csv' button click
    → Get filtered problems
    → Add status information
    → Generate CSV string
    → Create Blob
    → Trigger download
```

#### Random Problem
```javascript
'random-problem' button click
    → Get filtered problems
    → Filter out completed
    → Select random
    → highlightRandomProblem()
    → showRandomProblemNotification()
```

### Page Unload

```javascript
window 'beforeunload' event
    → saveCompletedProblems()
    → saveRevisionProblems()
    → saveProblemNotes()
    // Note: Problem data already saved during upload
```

---

## Performance Optimizations

### 1. Debounced Search
```javascript
// Wait 300ms after user stops typing before filtering
clearTimeout(window.searchTimeout);
window.searchTimeout = setTimeout(() => {
    filterProblems();
}, 300);
```

### 2. Async Loading Indicator
```javascript
// Use setTimeout to allow UI update before heavy processing
setLoading(true);
setTimeout(() => {
    const filteredProblems = getFilteredProblems();
    displayProblems(filteredProblems);
    setLoading(false);
}, 0);
```

### 3. Efficient Data Structures
```javascript
// Use Sets for O(1) lookup
completedProblems = new Set();  // Instead of Array
revisionProblems = new Set();
companies = new Set();
topics = new Set();

// Use Map for notes (O(1) access)
problemNotes = new Map();  // Instead of Object
```

### 4. Storage Quota Management
```javascript
// Automatically reduce dataset if storage limit reached
if (quota exceeded) {
    keep top 500 high-frequency problems;
    show warning to user;
}
```

### 5. IndexedDB Async Operations
```javascript
// Don't block UI while backing up to IndexedDB
saveToLocalStorage();  // Synchronous
backupToIndexedDB();   // Asynchronous (doesn't block)
```

---

## Error Handling

### Storage Errors
```javascript
try {
    localStorage.setItem(key, value);
} catch (error) {
    if (error.name === 'QuotaExceededError') {
        // Handle storage quota exceeded
        truncateDataAndRetry();
    } else {
        // Handle other storage errors
        showErrorToUser(error);
    }
}
```

### File Upload Errors
```javascript
try {
    await handleFileUpload(event);
} catch (error) {
    updateUploadStatus(`Error: ${error.message}`, true);
    console.error(error);
} finally {
    enableUploadButton();
}
```

### IndexedDB Errors
```javascript
request.onerror = () => {
    console.error('IndexedDB operation failed:', request.error);
    // Graceful degradation: continue with localStorage only
};
```

### Empty Data Handling
```javascript
// Check if any valid CSV files were found
if (validFiles === 0) {
    throw new Error('No valid CSV files found');
}

// Check for empty results
if (filteredProblems.length === 0) {
    displayNoDataMessage();
}

// Check for random problem selection
if (unsolvedProblems.length === 0) {
    alert('No unsolved problems found!');
    return;
}
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        User Action                           │
│  (Upload CSV / Mark Complete / Add Note / Apply Filter)     │
└───────────────────────────┬─────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Event Handler                             │
│  (handleFileUpload / toggleComplete / saveNote / filter)    │
└───────────────────────────┬─────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Update In-Memory Data                       │
│  (allProblems / completedProblems / problemNotes)           │
└───────────────────────────┬─────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Process/Filter Data                       │
│  (getFilteredProblems / sortProblems / merge duplicates)    │
└───────────────────────────┬─────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Persist to Storage                        │
│         localStorage ─────────→ IndexedDB (backup)          │
└───────────────────────────┬─────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     Update UI                                │
│  (displayProblems / updateCount / updateFilters)            │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Takeaways

### Frequency Display Logic (Your Original Question)

**When same question appears in multiple companies**:

1. **With Company Filter Selected**:
   - Shows frequency **specific to that company**
   - Example: Google filter → shows Google's frequency for that problem

2. **Without Company Filter**:
   - Shows **average frequency** across all companies
   - Calculated as: `sum of all frequencies / number of companies`
   - Tooltip displays: "Average frequency across N companies"

3. **Acceptance Rate**:
   - Always shows the **highest** acceptance rate across all companies
   - Rationale: Use the most optimistic/accurate rate

### Duplicate Handling

- Problems identified by Link or Title
- **Merged** instead of duplicated
- Companies and TimePeriods become arrays
- Frequency stored per-company in `FrequencyByCompany` object
- Topics merged as union of all topics
- Acceptance rate uses maximum value

### Storage System

- **Dual-storage**: localStorage (fast) + IndexedDB (backup)
- **Auto-recovery**: Restores from IndexedDB if localStorage cleared
- **Quota management**: Automatically reduces dataset if needed
- **Selective persistence**: User progress always preserved

### Performance

- Debounced search (300ms)
- Async loading indicators
- Efficient data structures (Set, Map)
- Non-blocking IndexedDB operations

---

## File Structure

```
/questions/
├── index.html              # UI structure
├── script.js               # Application logic (2012 lines)
├── styles.css              # Styling
├── README.md               # User documentation
└── TECHNICAL_DOCUMENTATION.md  # This file
```

---

## Browser Compatibility

**Minimum Requirements**:
- Modern browser with ES6 support
- localStorage API
- IndexedDB API
- File API (webkitdirectory)

**Tested On**:
- Chrome/Edge (Recommended)
- Firefox
- Safari

**Note**: `webkitdirectory` attribute for folder selection is non-standard but widely supported.

---

## Future Enhancement Ideas

1. **Cloud Sync**: Sync data across devices
2. **Progress Charts**: Visualize completion over time
3. **Study Timer**: Track time spent on each problem
4. **Solution Storage**: Store solution code alongside notes
5. **AI Hints**: Generate hints for stuck problems
6. **Spaced Repetition**: Smart scheduling for revision problems
7. **Company-Specific Analytics**: Difficulty distribution per company
8. **Import from LeetCode**: Direct API integration

---

*This documentation reflects the implementation as of the current version. For usage instructions, see [README.md](README.md).*
