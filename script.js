// Global variables to store data
let allProblems = [];
let companies = new Set();
let topics = new Set();
let timePeriods = new Set();
let completedProblems = new Set();

// Load completed problems from localStorage if available
function loadCompletedProblems() {
    const saved = localStorage.getItem('completedLeetCodeProblems');
    if (saved) {
        const savedArray = JSON.parse(saved);
        completedProblems = new Set(savedArray);
    }
}

// Save completed problems to localStorage
function saveCompletedProblems() {
    localStorage.setItem('completedLeetCodeProblems', JSON.stringify([...completedProblems]));
}

// Parse CSV content
function parseCSV(csv) {
    const lines = csv.split('\n');
    
    // Find the header line (skipping any comment lines)
    let headerIndex = 0;
    while (headerIndex < lines.length && (lines[headerIndex].trim().startsWith('//') || lines[headerIndex].trim() === '')) {
        headerIndex++;
    }
    
    if (headerIndex >= lines.length) return []; // No data found
    
    const headers = parseCSVLine(lines[headerIndex]);
    const results = [];
    
    for (let i = headerIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('//')) continue;
        
        const values = parseCSVLine(line);
        
        // Create object from headers and values
        const obj = {};
        headers.forEach((header, index) => {
            if (index < values.length) {
                obj[header.trim()] = values[index].trim();
            }
        });
        
        results.push(obj);
    }
    
    return results;
}

// Helper function to parse a single CSV line, handling quoted fields
function parseCSVLine(line) {
    const values = [];
    let currentValue = '';
    let insideQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            // If we have a double quote inside quotes (escaped quote)
            if (insideQuotes && line[i + 1] === '"') {
                currentValue += '"';
                i++; // Skip the next quote
            } else {
                // Toggle quote mode
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            // End of field
            values.push(currentValue);
            currentValue = '';
        } else {
            currentValue += char;
        }
    }
    
    // Add the last value
    values.push(currentValue);
    
    return values;
}

// Analyze file structure to determine folder depth
function analyzeFolderStructure(files) {
    let maxDepth = 0;
    let depths = {};
    
    for (const file of files) {
        if (!file.name.endsWith('.csv')) continue;
        
        const pathParts = file.webkitRelativePath.split('/');
        const depth = pathParts.length;
        
        // Count occurrences of each depth
        depths[depth] = (depths[depth] || 0) + 1;
        
        if (depth > maxDepth) {
            maxDepth = depth;
        }
    }
    
    // Determine most common depth for CSV files
    let mostCommonDepth = 0;
    let maxCount = 0;
    
    for (const depth in depths) {
        if (depths[depth] > maxCount) {
            maxCount = depths[depth];
            mostCommonDepth = parseInt(depth);
        }
    }
    
    return {
        maxDepth,
        mostCommonDepth,
        depths
    };
}

// Extract information from file path based on folder structure
function extractFileInfo(filePath, folderAnalysis) {
    const pathParts = filePath.split('/');
    
    // Default values
    let company = "Unknown";
    let timePeriod = "Unknown";
    
    // Handle different folder structures based on depth analysis
    if (folderAnalysis.mostCommonDepth >= 3) {
        // Structure is likely /root/company/timeperiod.csv
        company = pathParts.length > 1 ? pathParts[1] : "Unknown";
        timePeriod = pathParts.length > 2 ? 
            pathParts[2].replace('.csv', '') : 
            (pathParts.length > 1 ? pathParts[1].replace('.csv', '') : "Unknown");
    } else {
        // Structure is likely /root/file.csv where file name might contain company info
        // Or some other custom structure
        
        // Use filename (without extension) as time period
        const fileName = pathParts[pathParts.length - 1].replace('.csv', '');
        
        // If we have at least a subfolder, use it as company name
        if (pathParts.length > 1) {
            company = pathParts[pathParts.length - 2];
            timePeriod = fileName;
        } else {
            // If no proper structure, just use the filename and try to extract meaningful info
            const parts = fileName.split(' - ');
            if (parts.length > 1) {
                company = parts[0];
                timePeriod = parts[1];
            } else {
                company = "Unknown";
                timePeriod = fileName;
            }
        }
    }
    
    return { company, timePeriod };
}

// Process uploaded files
async function handleFileUpload(event) {
    event.preventDefault();
    const fileInput = document.getElementById('folder-upload');
    const files = fileInput.files;
    
    if (files.length === 0) {
        alert('Please select files to upload');
        return;
    }
    
    setLoading(true);
    
    // Clear previous data
    allProblems = [];
    companies.clear();
    topics.clear();
    timePeriods.clear();
    
    // Check if files follow the expected structure
    let validFiles = 0;
    let csvFiles = Array.from(files).filter(file => file.name.endsWith('.csv'));
    
    // Analyze folder structure to determine the appropriate parsing strategy
    const folderAnalysis = analyzeFolderStructure(csvFiles);
    
    // Validate folder structure
    const hasProperStructure = folderAnalysis.mostCommonDepth >= 3; // At least /root/company/file.csv
    
    // Process each file
    for (let file of csvFiles) {
        // Extract company name and time period based on folder structure analysis
        const { company, timePeriod } = extractFileInfo(file.webkitRelativePath, folderAnalysis);
        
        companies.add(company);
        timePeriods.add(timePeriod);
        
        // Read file content
        const content = await readFile(file);
        const problems = parseCSV(content);
        
        if (problems.length > 0) validFiles++;
        
        // Add company and time period to each problem
        problems.forEach(problem => {
            // Only set Company if it's not already defined in the CSV
            if (!problem.Company) {
                problem.Company = company;
            }
            
            // Only set TimePeriod if it's not already defined in the CSV
            if (!problem.TimePeriod) {
                problem.TimePeriod = timePeriod;
            }
            
            // Extract topics if available
            if (problem.Topics) {
                const problemTopics = problem.Topics.split(',').map(topic => topic.trim().replace(/"/g, ''));
                problemTopics.forEach(topic => topics.add(topic));
            }
        });
        
        // Add to all problems
        allProblems = allProblems.concat(problems);
    }
    
    // Check if we found any valid data
    if (validFiles === 0) {
        setLoading(false);
        throw new Error('No valid CSV files found. Make sure your files have .csv extension and contain valid data.');
    }
    
    // Check if the folder structure is correct
    if (!hasProperStructure) {
        console.warn('Warning: Some files may not have the proper folder structure. Expected structure is: /root/companyname/timeperiod.csv');
        updateUploadStatus('Note: Using simplified folder structure. For best results, use: /root/companyname/timeperiod.csv', true);
    }
    
    // Update filter options
    updateFilterOptions();
    
    // Display all problems initially
    filterProblems();
}

// Read file content as text
function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = event => resolve(event.target.result);
        reader.onerror = error => reject(error);
        reader.readAsText(file);
    });
}

// Update filter dropdown options
function updateFilterOptions() {
    // Update company filter
    const companyFilter = document.getElementById('company-filter');
    companyFilter.innerHTML = '<option value="">All Companies</option>';
    Array.from(companies).sort().forEach(company => {
        const option = document.createElement('option');
        option.value = company;
        option.textContent = company;
        companyFilter.appendChild(option);
    });
    
    // Update time period filter
    const timePeriodFilter = document.getElementById('time-period-filter');
    timePeriodFilter.innerHTML = '<option value="">All Time Periods</option>';
    Array.from(timePeriods).sort().forEach(timePeriod => {
        const option = document.createElement('option');
        option.value = timePeriod;
        option.textContent = timePeriod;
        timePeriodFilter.appendChild(option);
    });
    
    // Update topic filter
    const topicFilter = document.getElementById('topic-filter');
    topicFilter.innerHTML = '<option value="">All Topics</option>';
    Array.from(topics).sort().forEach(topic => {
        const option = document.createElement('option');
        option.value = topic;
        option.textContent = topic;
        topicFilter.appendChild(option);
    });
}

// Show/hide loading indicator
function setLoading(isLoading) {
    const loadingIndicator = document.getElementById('loading-indicator');
    const table = document.getElementById('problems-table');
    const noDataMessage = document.getElementById('no-data-message');
    
    if (isLoading) {
        loadingIndicator.classList.add('visible');
        table.classList.remove('visible');
        noDataMessage.style.display = 'none';
    } else {
        loadingIndicator.classList.remove('visible');
        if (allProblems.length > 0) {
            table.classList.add('visible');
            noDataMessage.style.display = 'none';
        } else {
            table.classList.remove('visible');
            noDataMessage.style.display = 'block';
        }
    }
}

// Sort problems based on column and direction
function sortProblems(problems, sortColumn, sortDirection) {
    return [...problems].sort((a, b) => {
        let aValue, bValue;
        
        switch(sortColumn) {
            case 'company':
                aValue = a.Company || '';
                bValue = b.Company || '';
                break;
            case 'timePeriod':
                aValue = a.TimePeriod || '';
                bValue = b.TimePeriod || '';
                break;
            case 'difficulty':
                // Custom sort order for difficulty: HARD > MEDIUM > EASY
                const difficultyOrder = { 'HARD': 3, 'MEDIUM': 2, 'EASY': 1 };
                aValue = difficultyOrder[a.Difficulty] || 0;
                bValue = difficultyOrder[b.Difficulty] || 0;
                break;
            case 'title':
                aValue = a.Title || '';
                bValue = b.Title || '';
                break;
            case 'frequency':
                aValue = parseFloat(a.Frequency) || 0;
                bValue = parseFloat(b.Frequency) || 0;
                break;
            case 'acceptance':
                aValue = parseFloat(a["Acceptance Rate"] || a.Acceptance_Rate) || 0;
                bValue = parseFloat(b["Acceptance Rate"] || b.Acceptance_Rate) || 0;
                break;
            default:
                aValue = a[sortColumn] || '';
                bValue = b[sortColumn] || '';
        }
        
        // For string comparison
        if (typeof aValue === 'string' && typeof bValue === 'string') {
            return sortDirection === 'asc' ? 
                aValue.localeCompare(bValue) : 
                bValue.localeCompare(aValue);
        }
        
        // For numeric comparison
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });
}

// Update table header to show current sort
function updateSortHeader() {
    // Remove sort classes from all headers
    document.querySelectorAll('th.sortable').forEach(th => {
        th.classList.remove('sorted-asc', 'sorted-desc');
    });
    
    // Add appropriate sort class to current sort header
    const currentHeader = document.querySelector(`th.sortable[data-sort="${currentSortColumn}"]`);
    if (currentHeader) {
        currentHeader.classList.add(currentSortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');
    }
}

// Global variables for sorting
let currentSortColumn = 'company';
let currentSortDirection = 'asc';

// Filter problems based on selected criteria
function filterProblems() {
    setLoading(true);
    
    // Use setTimeout to allow UI to update before heavy processing
    setTimeout(() => {
        const companyFilter = document.getElementById('company-filter').value;
        const difficultyFilter = document.getElementById('difficulty-filter').value;
        const timePeriodFilter = document.getElementById('time-period-filter').value;
        const topicFilter = document.getElementById('topic-filter').value;
        const minFrequency = parseFloat(document.getElementById('min-frequency').value) || 0;
        const minAcceptance = parseFloat(document.getElementById('min-acceptance').value) || 0;
        const showCompletedFilter = document.getElementById('show-completed').value;
        const searchQuery = document.getElementById('search-input').value.toLowerCase();
        
        const filteredProblems = allProblems.filter(problem => {
            // Check company filter
            if (companyFilter && problem.Company !== companyFilter) return false;
            
            // Check difficulty filter
            if (difficultyFilter && problem.Difficulty !== difficultyFilter) return false;
            
            // Check time period filter
            if (timePeriodFilter && problem.TimePeriod !== timePeriodFilter) return false;
            
            // Check topic filter
            if (topicFilter && (!problem.Topics || !problem.Topics.includes(topicFilter))) return false;
            
            // Check frequency filter
            if (minFrequency > 0) {
                const frequency = parseFloat(problem.Frequency);
                if (isNaN(frequency) || frequency < minFrequency) return false;
            }
            
            // Check acceptance rate filter
            if (minAcceptance > 0) {
                // Handle both "Acceptance Rate" and "Acceptance_Rate" field names
                const rateValue = problem["Acceptance Rate"] || problem.Acceptance_Rate;
                const acceptanceRate = parseFloat(rateValue) * 100;
                if (isNaN(acceptanceRate) || acceptanceRate < minAcceptance) return false;
            }
            
            // Check completed filter
            if (showCompletedFilter === 'completed' && !completedProblems.has(problem.Link)) return false;
            if (showCompletedFilter === 'not-completed' && completedProblems.has(problem.Link)) return false;
            
            // Check search query
            if (searchQuery) {
                const title = problem.Title?.toLowerCase() || '';
                const company = problem.Company?.toLowerCase() || '';
                const topics = problem.Topics?.toLowerCase() || '';
                
                if (!title.includes(searchQuery) && 
                    !company.includes(searchQuery) && 
                    !topics.includes(searchQuery)) {
                    return false;
                }
            }
            
            return true;
        });
        
        // Sort the filtered problems
        const sortedProblems = sortProblems(filteredProblems, currentSortColumn, currentSortDirection);
        
        displayProblems(sortedProblems);
        updateProblemCount(sortedProblems);
        updateSortHeader();
        setLoading(false);
    }, 0);
}

// Display filtered problems in the table
function displayProblems(problems) {
    const tableBody = document.getElementById('problems-body');
    tableBody.innerHTML = '';
    
    problems.forEach(problem => {
        const row = document.createElement('tr');
        
        // Checkbox for completed problems
        const doneCell = document.createElement('td');
        const doneCheckbox = document.createElement('input');
        doneCheckbox.type = 'checkbox';
        doneCheckbox.className = 'done-checkbox';
        doneCheckbox.checked = completedProblems.has(problem.Link);
        doneCheckbox.addEventListener('change', () => {
            if (doneCheckbox.checked) {
                completedProblems.add(problem.Link);
            } else {
                completedProblems.delete(problem.Link);
            }
            saveCompletedProblems();
            updateProblemCount(problems);
        });
        doneCell.appendChild(doneCheckbox);
        row.appendChild(doneCell);
        
        // Company
        const companyCell = document.createElement('td');
        companyCell.textContent = problem.Company;
        row.appendChild(companyCell);
        
        // Time Period
        const timePeriodCell = document.createElement('td');
        timePeriodCell.textContent = problem.TimePeriod;
        row.appendChild(timePeriodCell);
        
        // Difficulty
        const difficultyCell = document.createElement('td');
        difficultyCell.textContent = problem.Difficulty;
        difficultyCell.className = problem.Difficulty ? problem.Difficulty.toLowerCase() : '';
        row.appendChild(difficultyCell);
        
        // Title with link
        const titleCell = document.createElement('td');
        const titleLink = document.createElement('a');
        titleLink.href = problem.Link;
        titleLink.textContent = problem.Title;
        titleLink.className = 'problem-link';
        titleLink.target = '_blank';
        titleCell.appendChild(titleLink);
        row.appendChild(titleCell);
        
        // Frequency
        const frequencyCell = document.createElement('td');
        frequencyCell.textContent = problem.Frequency;
        row.appendChild(frequencyCell);
        
        // Acceptance Rate
        const acceptanceCell = document.createElement('td');
        const rateValue = problem["Acceptance Rate"] || problem.Acceptance_Rate;
        if (rateValue) {
            const rate = parseFloat(rateValue);
            acceptanceCell.textContent = rate ? `${(rate * 100).toFixed(1)}%` : '';
        }
        row.appendChild(acceptanceCell);
        
        // Topics
        const topicsCell = document.createElement('td');
        if (problem.Topics) {
            const topicsList = problem.Topics.split(',').map(topic => topic.trim());
            topicsList.forEach(topic => {
                const topicSpan = document.createElement('span');
                topicSpan.className = 'topic-tag';
                topicSpan.textContent = topic;
                topicsCell.appendChild(topicSpan);
            });
        }
        row.appendChild(topicsCell);
        
        tableBody.appendChild(row);
    });
}

// Update problem count information
function updateProblemCount(problems) {
    const problemCount = document.getElementById('problem-count');
    const completedCount = document.getElementById('completed-count');
    
    problemCount.textContent = `${problems.length} problems found`;
    
    const completed = problems.filter(p => completedProblems.has(p.Link)).length;
    completedCount.textContent = `${completed} completed (${Math.round(completed / problems.length * 100) || 0}%)`;
}

// Export problems to CSV
function exportToCSV(problems) {
    if (problems.length === 0) {
        alert('No problems to export');
        return;
    }
    
    // Determine all possible headers from all problems
    const headers = new Set();
    problems.forEach(problem => {
        Object.keys(problem).forEach(key => headers.add(key));
    });
    
    // Always include these columns first if they exist
    const orderedHeaders = [
        'Company', 
        'TimePeriod', 
        'Difficulty', 
        'Title', 
        'Frequency', 
        'Acceptance Rate', 
        'Acceptance_Rate', 
        'Link', 
        'Topics'
    ].filter(h => headers.has(h));
    
    // Add any remaining headers
    headers.forEach(header => {
        if (!orderedHeaders.includes(header)) {
            orderedHeaders.push(header);
        }
    });
    
    // Create CSV content
    let csv = orderedHeaders.join(',') + '\n';
    
    problems.forEach(problem => {
        const row = orderedHeaders.map(header => {
            let value = problem[header] || '';
            
            // Escape quotes and wrap in quotes if needed
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                value = '"' + value.replace(/"/g, '""') + '"';
            }
            
            return value;
        });
        
        csv += row.join(',') + '\n';
    });
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'leetcode_problems.csv');
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Show upload status
function updateUploadStatus(message, isError = false) {
    const status = document.getElementById('upload-status');
    status.textContent = message;
    status.className = isError ? 'status-error' : 'status-success';
}

// Update selected folder display
function updateSelectedFolder(files) {
    const selectedFolder = document.getElementById('selected-folder');
    if (files && files.length > 0) {
        // Get the root folder name
        const path = files[0].webkitRelativePath;
        const rootFolder = path.split('/')[0];
        selectedFolder.textContent = rootFolder;
    } else {
        selectedFolder.textContent = 'No folder selected';
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Load completed problems
    loadCompletedProblems();
    
    // Set up file input change event
    const fileInput = document.getElementById('folder-upload');
    fileInput.addEventListener('change', () => {
        updateSelectedFolder(fileInput.files);
    });
    
    // Set up other event listeners
    document.getElementById('upload-btn').addEventListener('click', async (event) => {
        try {
            document.getElementById('upload-btn').disabled = true;
            updateUploadStatus('Loading data...');
            await handleFileUpload(event);
            updateUploadStatus(`Successfully loaded ${allProblems.length} problems from ${companies.size} companies.`);
        } catch (error) {
            updateUploadStatus(`Error loading data: ${error.message}`, true);
            console.error(error);
        } finally {
            document.getElementById('upload-btn').disabled = false;
        }
    });
    
    // Add event listener for search input
    document.getElementById('search-input').addEventListener('input', () => {
        // Debounce search to avoid excessive filtering
        clearTimeout(window.searchTimeout);
        window.searchTimeout = setTimeout(() => {
            filterProblems();
        }, 300);
    });
    
    // Add event listener for show completed filter
    document.getElementById('show-completed').addEventListener('change', filterProblems);
    
    // Add event listeners for sortable column headers
    document.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const sortColumn = th.getAttribute('data-sort');
            
            // If clicking the same column, toggle direction
            if (sortColumn === currentSortColumn) {
                currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                currentSortColumn = sortColumn;
                currentSortDirection = 'asc';
            }
            
            filterProblems();
        });
    });
    
    document.getElementById('apply-filters').addEventListener('click', filterProblems);
    
    document.getElementById('reset-filters').addEventListener('click', () => {
        document.getElementById('company-filter').value = '';
        document.getElementById('difficulty-filter').value = '';
        document.getElementById('time-period-filter').value = '';
        document.getElementById('topic-filter').value = '';
        document.getElementById('min-frequency').value = 0;
        document.getElementById('min-acceptance').value = 0;
        document.getElementById('search-input').value = '';
        document.getElementById('show-completed').value = 'all';
        filterProblems();
    });
    
    // Set up export to CSV functionality
    document.getElementById('export-csv').addEventListener('click', () => {
        // Get currently filtered problems
        const companyFilter = document.getElementById('company-filter').value;
        const difficultyFilter = document.getElementById('difficulty-filter').value;
        const timePeriodFilter = document.getElementById('time-period-filter').value;
        const topicFilter = document.getElementById('topic-filter').value;
        const minFrequency = parseFloat(document.getElementById('min-frequency').value) || 0;
        const minAcceptance = parseFloat(document.getElementById('min-acceptance').value) || 0;
        const showCompletedFilter = document.getElementById('show-completed').value;
        const searchQuery = document.getElementById('search-input').value.toLowerCase();
        
        const filteredProblems = allProblems.filter(problem => {
            // Check company filter
            if (companyFilter && problem.Company !== companyFilter) return false;
            
            // Check difficulty filter
            if (difficultyFilter && problem.Difficulty !== difficultyFilter) return false;
            
            // Check time period filter
            if (timePeriodFilter && problem.TimePeriod !== timePeriodFilter) return false;
            
            // Check topic filter
            if (topicFilter && (!problem.Topics || !problem.Topics.includes(topicFilter))) return false;
            
            // Check frequency filter
            if (minFrequency > 0) {
                const frequency = parseFloat(problem.Frequency);
                if (isNaN(frequency) || frequency < minFrequency) return false;
            }
            
            // Check acceptance rate filter
            if (minAcceptance > 0) {
                const rateValue = problem["Acceptance Rate"] || problem.Acceptance_Rate;
                const acceptanceRate = parseFloat(rateValue) * 100;
                if (isNaN(acceptanceRate) || acceptanceRate < minAcceptance) return false;
            }
            
            // Check completed filter
            if (showCompletedFilter === 'completed' && !completedProblems.has(problem.Link)) return false;
            if (showCompletedFilter === 'not-completed' && completedProblems.has(problem.Link)) return false;
            
            // Check search query
            if (searchQuery) {
                const title = problem.Title?.toLowerCase() || '';
                const company = problem.Company?.toLowerCase() || '';
                const topics = problem.Topics?.toLowerCase() || '';
                
                if (!title.includes(searchQuery) && 
                    !company.includes(searchQuery) && 
                    !topics.includes(searchQuery)) {
                    return false;
                }
            }
            
            return true;
        });
        
        // Add completed status to the problems
        const problemsWithStatus = filteredProblems.map(problem => {
            return {
                ...problem,
                Completed: completedProblems.has(problem.Link) ? 'Yes' : 'No'
            };
        });
        
        // Export filtered problems
        exportToCSV(problemsWithStatus);
    });
});
