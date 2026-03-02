// Global variables to store data
let allProblems = [];
let companies = new Set();
let topics = new Set();
let timePeriods = new Set();
let completedProblems = new Set();
let revisionProblems = new Set();
let problemNotes = new Map();

// ============================================================================
// BACKUP STORAGE SYSTEM
// ============================================================================
// This application uses a dual-storage approach for data persistence:
// 1. PRIMARY: localStorage - Fast access, ~5-10MB limit
// 2. BACKUP: IndexedDB - Automatic backup, larger capacity, more persistent
//
// How it works:
// - All data is saved to BOTH localStorage and IndexedDB simultaneously
// - If localStorage is cleared (browser settings, incognito mode, etc.),
//   the app automatically restores data from IndexedDB backup
// - IndexedDB is more resilient to accidental data loss
// - Both storages are cleared only when explicitly requested by the user
// ============================================================================

// IndexedDB for backup storage
let db = null;
const DB_NAME = 'LeetCodeTrackerDB';
const DB_VERSION = 1;
const STORE_NAME = 'backupData';

// Initialize IndexedDB
function initIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => {
            console.error('IndexedDB failed to open:', request.error);
            reject(request.error);
        };
        
        request.onsuccess = () => {
            db = request.result;
            console.log('IndexedDB initialized successfully');
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
                objectStore.createIndex('timestamp', 'timestamp', { unique: false });
                console.log('IndexedDB object store created');
            }
        };
    });
}

// Save data to IndexedDB
function saveToIndexedDB(key, value) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('IndexedDB not initialized');
            return;
        }
        
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const data = {
            key: key,
            value: value,
            timestamp: new Date().toISOString()
        };
        
        const request = store.put(data);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Load data from IndexedDB
function loadFromIndexedDB(key) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('IndexedDB not initialized');
            return;
        }
        
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);
        
        request.onsuccess = () => {
            if (request.result) {
                resolve(request.result.value);
            } else {
                resolve(null);
            }
        };
        request.onerror = () => reject(request.error);
    });
}

// Load all data from IndexedDB
function loadAllFromIndexedDB() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('IndexedDB not initialized');
            return;
        }
        
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Sync data from IndexedDB to localStorage
async function syncFromBackup() {
    try {
        const keys = [
            'completedLeetCodeProblems',
            'revisionLeetCodeProblems',
            'leetCodeProblemNotes',
            'leetCodeProblems',
            'leetCodeCompanies',
            'leetCodeTopics',
            'leetCodeTimePeriods',
            'leetCodeLastSaved',
            'leetCodeDataTruncated'
        ];
        
        let restoredCount = 0;
        for (const key of keys) {
            // Only restore if localStorage doesn't have it
            if (!localStorage.getItem(key)) {
                const backupValue = await loadFromIndexedDB(key);
                if (backupValue) {
                    localStorage.setItem(key, backupValue);
                    restoredCount++;
                }
            }
        }
        
        if (restoredCount > 0) {
            console.log(`Restored ${restoredCount} items from IndexedDB backup`);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Failed to sync from backup:', error);
        return false;
    }
}

// Backup localStorage to IndexedDB
async function backupToIndexedDB() {
    try {
        const keys = [
            'completedLeetCodeProblems',
            'revisionLeetCodeProblems',
            'leetCodeProblemNotes',
            'leetCodeProblems',
            'leetCodeCompanies',
            'leetCodeTopics',
            'leetCodeTimePeriods',
            'leetCodeLastSaved',
            'leetCodeDataTruncated'
        ];
        
        for (const key of keys) {
            const value = localStorage.getItem(key);
            if (value) {
                await saveToIndexedDB(key, value);
            }
        }
        
        console.log('Successfully backed up data to IndexedDB');
        return true;
    } catch (error) {
        console.error('Failed to backup to IndexedDB:', error);
        return false;
    }
}

// Load completed problems from localStorage if available
async function loadCompletedProblems() {
    const saved = localStorage.getItem('completedLeetCodeProblems');
    if (saved) {
        const savedArray = JSON.parse(saved);
        completedProblems = new Set(savedArray);
    } else if (db) {
        // Try to restore from IndexedDB backup
        try {
            const backupValue = await loadFromIndexedDB('completedLeetCodeProblems');
            if (backupValue) {
                const savedArray = JSON.parse(backupValue);
                completedProblems = new Set(savedArray);
                localStorage.setItem('completedLeetCodeProblems', backupValue);
                console.log('Restored completed problems from backup');
            }
        } catch (error) {
            console.error('Failed to restore from backup:', error);
        }
    }
}

// Save completed problems to localStorage
async function saveCompletedProblems() {
    const data = JSON.stringify([...completedProblems]);
    localStorage.setItem('completedLeetCodeProblems', data);
    // Also backup to IndexedDB
    if (db) {
        try {
            await saveToIndexedDB('completedLeetCodeProblems', data);
        } catch (error) {
            console.error('Failed to backup completed problems:', error);
        }
    }
    // Trigger auto-backup
    handleAutoBackup();
}

// Load revision problems from localStorage if available
async function loadRevisionProblems() {
    const saved = localStorage.getItem('revisionLeetCodeProblems');
    if (saved) {
        const savedArray = JSON.parse(saved);
        revisionProblems = new Set(savedArray);
    } else if (db) {
        // Try to restore from IndexedDB backup
        try {
            const backupValue = await loadFromIndexedDB('revisionLeetCodeProblems');
            if (backupValue) {
                const savedArray = JSON.parse(backupValue);
                revisionProblems = new Set(savedArray);
                localStorage.setItem('revisionLeetCodeProblems', backupValue);
                console.log('Restored revision problems from backup');
            }
        } catch (error) {
            console.error('Failed to restore from backup:', error);
        }
    }
}

// Save revision problems to localStorage
async function saveRevisionProblems() {
    const data = JSON.stringify([...revisionProblems]);
    localStorage.setItem('revisionLeetCodeProblems', data);
    // Also backup to IndexedDB
    if (db) {
        try {
            await saveToIndexedDB('revisionLeetCodeProblems', data);
        } catch (error) {
            console.error('Failed to backup revision problems:', error);
        }
    }
    // Trigger auto-backup
    handleAutoBackup();
}

// Load problem notes from localStorage if available
async function loadProblemNotes() {
    const saved = localStorage.getItem('leetCodeProblemNotes');
    if (saved) {
        const savedObject = JSON.parse(saved);
        problemNotes = new Map(Object.entries(savedObject));
    } else if (db) {
        // Try to restore from IndexedDB backup
        try {
            const backupValue = await loadFromIndexedDB('leetCodeProblemNotes');
            if (backupValue) {
                const savedObject = JSON.parse(backupValue);
                problemNotes = new Map(Object.entries(savedObject));
                localStorage.setItem('leetCodeProblemNotes', backupValue);
                console.log('Restored problem notes from backup');
            }
        } catch (error) {
            console.error('Failed to restore from backup:', error);
        }
    }
}

// Save problem notes to localStorage
async function saveProblemNotes() {
    const notesObject = Object.fromEntries(problemNotes);
    const data = JSON.stringify(notesObject);
    localStorage.setItem('leetCodeProblemNotes', data);
    // Also backup to IndexedDB
    if (db) {
        try {
            await saveToIndexedDB('leetCodeProblemNotes', data);
        } catch (error) {
            console.error('Failed to backup problem notes:', error);
        }
    }
    // Trigger auto-backup
    handleAutoBackup();
}

// ============================================================================
// BACKUP AND RESTORE SYSTEM
// ============================================================================
// Advanced backup and restore functionality for data portability and safety
// Features:
// - Export all app data as timestamped JSON files
// - Import and validate backup files with confirmation
// - Automatic backup system triggered by data changes
// - Cross-device data synchronization capability
// ============================================================================

// Global variables for backup system
let changeCounter = 0;
let isAutoBackupEnabled = true;
let autoBackupInterval = 5; // backup every N changes

/**
 * Collects all LeetCode tracker data from localStorage
 * @returns {Object} Complete data object with all app state
 */
const getAllAppData = () => {
    const appData = {
        metadata: {
            appName: 'LeetCode Problem Tracker',
            version: '1.0.0',
            exportDate: new Date().toISOString(),
            dataVersion: 1
        },
        problemsData: {
            allProblems: localStorage.getItem('leetCodeProblems'),
            companies: localStorage.getItem('leetCodeCompanies'),
            topics: localStorage.getItem('leetCodeTopics'),
            timePeriods: localStorage.getItem('leetCodeTimePeriods'),
            lastSaved: localStorage.getItem('leetCodeLastSaved'),
            dataTruncated: localStorage.getItem('leetCodeDataTruncated')
        },
        userProgress: {
            completedProblems: localStorage.getItem('completedLeetCodeProblems'),
            revisionProblems: localStorage.getItem('revisionLeetCodeProblems'),
            problemNotes: localStorage.getItem('leetCodeProblemNotes')
        },
        statistics: {
            totalProblems: allProblems.length,
            totalCompleted: completedProblems.size,
            totalForRevision: revisionProblems.size,
            totalNotes: problemNotes.size,
            exportTimestamp: Date.now()
        }
    };
    
    // Remove null values to keep JSON clean
    Object.keys(appData.problemsData).forEach(key => {
        if (appData.problemsData[key] === null) {
            delete appData.problemsData[key];
        }
    });
    
    Object.keys(appData.userProgress).forEach(key => {
        if (appData.userProgress[key] === null) {
            delete appData.userProgress[key];
        }
    });
    
    return appData;
};

/**
 * Generates a timestamped filename for backup files
 * @returns {string} Formatted filename with timestamp
 */
const generateBackupFilename = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `leetcode-tracker-backup-${year}${month}${day}-${hours}${minutes}${seconds}.json`;
};

/**
 * Creates and downloads a backup file using Blob API
 * @param {Object} data - The data to backup
 * @param {string} filename - The filename for the backup
 */
const downloadBackupFile = (data, filename) => {
    try {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = filename;
        downloadLink.style.display = 'none';
        
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        // Clean up the URL object
        URL.revokeObjectURL(url);
        
        return true;
    } catch (error) {
        console.error('Failed to create backup file:', error);
        throw new Error(`Backup file creation failed: ${error.message}`);
    }
};

/**
 * Validates the structure and content of an imported backup file
 * @param {Object} backupData - The parsed backup data
 * @returns {Object} Validation result with success flag and details
 */
const validateBackupData = (backupData) => {
    const validation = {
        isValid: true,
        warnings: [],
        errors: [],
        statistics: {}
    };
    
    // Check if it's a valid backup file structure
    if (!backupData || typeof backupData !== 'object') {
        validation.isValid = false;
        validation.errors.push('Invalid backup file format');
        return validation;
    }
    
    // Check metadata
    if (!backupData.metadata || !backupData.metadata.appName) {
        validation.warnings.push('Backup metadata missing - file may not be from LeetCode Tracker');
    }
    
    // Check essential data sections
    if (!backupData.problemsData && !backupData.userProgress) {
        validation.isValid = false;
        validation.errors.push('No valid data sections found in backup');
        return validation;
    }
    
    // Calculate what will be restored
    let problemCount = 0;
    let completedCount = 0;
    let noteCount = 0;
    let revisionCount = 0;
    
    try {
        if (backupData.problemsData?.allProblems) {
            const problems = JSON.parse(backupData.problemsData.allProblems);
            problemCount = Array.isArray(problems) ? problems.length : 0;
        }
        
        if (backupData.userProgress?.completedProblems) {
            const completed = JSON.parse(backupData.userProgress.completedProblems);
            completedCount = Array.isArray(completed) ? completed.length : 0;
        }
        
        if (backupData.userProgress?.revisionProblems) {
            const revision = JSON.parse(backupData.userProgress.revisionProblems);
            revisionCount = Array.isArray(revision) ? revision.length : 0;
        }
        
        if (backupData.userProgress?.problemNotes) {
            const notes = JSON.parse(backupData.userProgress.problemNotes);
            noteCount = Object.keys(notes || {}).length;
        }
    } catch (parseError) {
        validation.isValid = false;
        validation.errors.push(`Data parsing error: ${parseError.message}`);
        return validation;
    }
    
    validation.statistics = {
        problemCount,
        completedCount,
        revisionCount,
        noteCount
    };
    
    // Add informational messages
    if (problemCount === 0) {
        validation.warnings.push('No problem data found in backup');
    }
    
    if (completedCount === 0 && revisionCount === 0 && noteCount === 0) {
        validation.warnings.push('No progress data (completed problems, notes, etc.) found');
    }
    
    return validation;
};

/**
 * Restores data from a validated backup object
 * @param {Object} backupData - The validated backup data
 * @returns {Promise<boolean>} Success status
 */
const restoreFromBackupData = async (backupData) => {
    try {
        // Clear existing data first
        await clearSavedData();
        
        // Restore problems data
        if (backupData.problemsData) {
            const { problemsData } = backupData;
            
            if (problemsData.allProblems) {
                localStorage.setItem('leetCodeProblems', problemsData.allProblems);
            }
            if (problemsData.companies) {
                localStorage.setItem('leetCodeCompanies', problemsData.companies);
            }
            if (problemsData.topics) {
                localStorage.setItem('leetCodeTopics', problemsData.topics);
            }
            if (problemsData.timePeriods) {
                localStorage.setItem('leetCodeTimePeriods', problemsData.timePeriods);
            }
            if (problemsData.lastSaved) {
                localStorage.setItem('leetCodeLastSaved', problemsData.lastSaved);
            }
            if (problemsData.dataTruncated) {
                localStorage.setItem('leetCodeDataTruncated', problemsData.dataTruncated);
            }
        }
        
        // Restore user progress
        if (backupData.userProgress) {
            const { userProgress } = backupData;
            
            if (userProgress.completedProblems) {
                localStorage.setItem('completedLeetCodeProblems', userProgress.completedProblems);
            }
            if (userProgress.revisionProblems) {
                localStorage.setItem('revisionLeetCodeProblems', userProgress.revisionProblems);
            }
            if (userProgress.problemNotes) {
                localStorage.setItem('leetCodeProblemNotes', userProgress.problemNotes);
            }
        }
        
        // Also backup the restored data to IndexedDB
        await backupToIndexedDB();
        
        return true;
    } catch (error) {
        console.error('Failed to restore backup data:', error);
        throw new Error(`Restore failed: ${error.message}`);
    }
};

/**
 * Main export backup function
 * Collects all data and triggers download
 */
const exportBackup = async () => {
    try {
        updateBackupStatus('Preparing backup...', 'info');
        
        // Collect all app data
        const appData = getAllAppData();
        
        // Generate filename
        const filename = generateBackupFilename();
        
        // Create and download backup file
        downloadBackupFile(appData, filename);
        
        updateBackupStatus(`✅ Backup exported: ${filename}`, 'success');
        
        // Auto-clear status after 5 seconds
        setTimeout(() => {
            updateBackupStatus('', '');
        }, 5000);
        
        return true;
    } catch (error) {
        updateBackupStatus(`❌ Export failed: ${error.message}`, 'error');
        console.error('Backup export failed:', error);
        return false;
    }
};

/**
 * Main import backup function
 * Handles file selection, validation, and restoration
 */
const importBackup = async (file) => {
    try {
        updateBackupStatus('Reading backup file...', 'info');
        
        // Read file content
        const fileContent = await readFileAsText(file);
        
        updateBackupStatus('Validating backup data...', 'info');
        
        // Parse JSON
        let backupData;
        try {
            backupData = JSON.parse(fileContent);
        } catch (parseError) {
            throw new Error('Invalid JSON format in backup file');
        }
        
        // Validate backup data
        const validation = validateBackupData(backupData);
        
        if (!validation.isValid) {
            throw new Error(`Invalid backup file: ${validation.errors.join(', ')}`);
        }
        
        // Show confirmation dialog with backup statistics
        const { statistics } = validation;
        const confirmMessage = `
Import Backup Confirmation:

📊 This backup contains:
• ${statistics.problemCount} problems
• ${statistics.completedCount} completed problems  
• ${statistics.revisionCount} problems marked for revision
• ${statistics.noteCount} problem notes

⚠️ WARNING: This will replace ALL current data!

${validation.warnings.length > 0 ? '\n⚠️ Warnings:\n' + validation.warnings.map(w => `• ${w}`).join('\n') : ''}

Do you want to continue?`;
        
        if (!confirm(confirmMessage)) {
            updateBackupStatus('Import cancelled by user', 'info');
            return false;
        }
        
        updateBackupStatus('Restoring backup data...', 'info');
        
        // Restore the data
        await restoreFromBackupData(backupData);
        
        updateBackupStatus('Reloading application...', 'info');
        
        // Reload the application state
        await reloadApplicationData();
        
        updateBackupStatus(`✅ Backup restored successfully! ${statistics.problemCount} problems loaded.`, 'success');
        
        // Auto-clear status after 5 seconds
        setTimeout(() => {
            updateBackupStatus('', '');
        }, 5000);
        
        return true;
    } catch (error) {
        updateBackupStatus(`❌ Import failed: ${error.message}`, 'error');
        console.error('Backup import failed:', error);
        return false;
    }
};

/**
 * Automatic backup function
 * Triggers backup after specified number of changes
 */
const handleAutoBackup = () => {
    if (!isAutoBackupEnabled) return;
    
    changeCounter++;
    
    if (changeCounter >= autoBackupInterval) {
        performAutoBackup();
        changeCounter = 0; // Reset counter
    }
};

/**
 * Performs automatic backup with minimal UI disruption
 * Stores backup internally without triggering downloads
 */
const performAutoBackup = async () => {
    try {
        const appData = getAllAppData();
        const backupId = `auto-backup-${Date.now()}`;
        
        // Store backup in IndexedDB instead of downloading
        await storeAutoBackup(backupId, appData);
        
        // Show brief success notification
        updateBackupStatus('🔄 Auto-backup saved', 'success');
        setTimeout(() => {
            updateBackupStatus('', '');
        }, 2000);
        
        console.log('Auto-backup stored internally:', backupId);
    } catch (error) {
        console.error('Auto-backup failed:', error);
        // Don't show error to user for auto-backup failures to avoid disruption
    }
};

/**
 * Stores automatic backup in IndexedDB
 * @param {string} backupId - Unique backup identifier
 * @param {Object} backupData - The backup data to store
 */
const storeAutoBackup = async (backupId, backupData) => {
    if (!db) {
        console.warn('IndexedDB not available for auto-backup storage');
        return;
    }

    try {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const autoBackupData = {
            key: backupId,
            value: JSON.stringify(backupData),
            timestamp: new Date().toISOString(),
            isAutoBackup: true
        };
        
        await new Promise((resolve, reject) => {
            const request = store.put(autoBackupData);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
        
        // Clean up old auto-backups (keep only last 10)
        await cleanupOldAutoBackups();
        
    } catch (error) {
        console.error('Failed to store auto-backup:', error);
        throw error;
    }
};

/**
 * Removes old auto-backups, keeping only the most recent 10
 */
const cleanupOldAutoBackups = async () => {
    if (!db) return;
    
    try {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        // Get all auto-backups
        const autoBackups = await new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result.filter(item => item.isAutoBackup));
            request.onerror = () => reject(request.error);
        });
        
        // Sort by timestamp (newest first)
        autoBackups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Remove old backups (keep only 10 most recent)
        if (autoBackups.length > 10) {
            const toDelete = autoBackups.slice(10);
            
            for (const backup of toDelete) {
                await new Promise((resolve, reject) => {
                    const deleteRequest = store.delete(backup.key);
                    deleteRequest.onsuccess = () => resolve();
                    deleteRequest.onerror = () => reject(deleteRequest.error);
                });
            }
            
            console.log(`Cleaned up ${toDelete.length} old auto-backups`);
        }
        
    } catch (error) {
        console.error('Failed to cleanup old auto-backups:', error);
    }
};

/**
 * Updates backup status display
 * @param {string} message - Status message
 * @param {string} type - Status type (success, error, info)
 */
const updateBackupStatus = (message, type) => {
    const statusElement = document.getElementById('backup-status');
    if (!statusElement) return;
    
    statusElement.textContent = message;
    statusElement.className = type;
};

/**
 * Reads file as text using FileReader
 * @param {File} file - File to read
 * @returns {Promise<string>} File content as text
 */
const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = (error) => reject(new Error(`Failed to read file: ${error.message}`));
        reader.readAsText(file);
    });
};

/**
 * Reloads application data after import
 * Refreshes in-memory data structures and UI
 */
const reloadApplicationData = async () => {
    try {
        // Reload data from localStorage
        await loadAllData();
        await loadCompletedProblems();
        await loadRevisionProblems();
        await loadProblemNotes();
        
        // Update UI components
        updateFilterOptions();
        updateStorageStatus();
        
        // Apply current filters and refresh display
        setTimeout(() => {
            filterProblems();
        }, 100);
        
        return true;
    } catch (error) {
        console.error('Failed to reload application data:', error);
        throw error;
    }
};

// ============================================================================
// END BACKUP AND RESTORE SYSTEM
// ============================================================================

// Helper function to check storage quota and availability
function checkStorageQuota() {
    // For browsers that support the Storage API
    if (navigator.storage && navigator.storage.estimate) {
        return navigator.storage.estimate().then(estimate => {
            const percentUsed = (estimate.usage / estimate.quota) * 100;
            const remaining = estimate.quota - estimate.usage;
            return {
                quota: estimate.quota,
                usage: estimate.usage,
                percentUsed: percentUsed,
                remaining: remaining
            };
        });
    } else {
        // Fallback for browsers without Storage API
        // Estimate based on localStorage size
        let totalSize = 0;
        for (const key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                totalSize += (localStorage[key].length + key.length) * 2; // UTF-16 uses 2 bytes per char
            }
        }
        
        // Rough estimate - most browsers have around 5-10MB limit
        const estimatedQuota = 5 * 1024 * 1024; // 5MB
        const percentUsed = (totalSize / estimatedQuota) * 100;
        
        return Promise.resolve({
            quota: estimatedQuota, 
            usage: totalSize,
            percentUsed: percentUsed,
            remaining: estimatedQuota - totalSize
        });
    }
}

// Save all problem data to localStorage with compression if needed
async function saveAllData() {
    try {
        // First attempt - save without compression
        const problemsData = JSON.stringify(allProblems);
        const companiesData = JSON.stringify([...companies]);
        const topicsData = JSON.stringify([...topics]);
        const timePeriodsData = JSON.stringify([...timePeriods]);
        const lastSavedData = new Date().toISOString();
        
        localStorage.setItem('leetCodeProblems', problemsData);
        localStorage.setItem('leetCodeCompanies', companiesData);
        localStorage.setItem('leetCodeTopics', topicsData);
        localStorage.setItem('leetCodeTimePeriods', timePeriodsData);
        localStorage.setItem('leetCodeLastSaved', lastSavedData);
        
        // Backup to IndexedDB
        if (db) {
            try {
                await saveToIndexedDB('leetCodeProblems', problemsData);
                await saveToIndexedDB('leetCodeCompanies', companiesData);
                await saveToIndexedDB('leetCodeTopics', topicsData);
                await saveToIndexedDB('leetCodeTimePeriods', timePeriodsData);
                await saveToIndexedDB('leetCodeLastSaved', lastSavedData);
                console.log('Data backed up to IndexedDB');
            } catch (error) {
                console.error('Failed to backup to IndexedDB:', error);
            }
        }
        
        console.log(`Saved ${allProblems.length} problems to localStorage`);
        
        // Trigger auto-backup for new problem data
        handleAutoBackup();
        
        return true;
    } catch (error) {
        // If storage quota exceeded, try with fewer problems
        console.warn('Storage quota exceeded, trying with fewer problems');
        
        if (allProblems.length > 500) {
            try {
                // Try saving just 500 problems with highest frequency
                const sortedProblems = [...allProblems].sort((a, b) => {
                    const freqA = parseFloat(a.Frequency) || 0;
                    const freqB = parseFloat(b.Frequency) || 0;
                    return freqB - freqA; // Descending order
                });
                
                const reducedProblems = sortedProblems.slice(0, 500);
                const reducedProblemsData = JSON.stringify(reducedProblems);
                const companiesData = JSON.stringify([...companies]);
                const topicsData = JSON.stringify([...topics]);
                const timePeriodsData = JSON.stringify([...timePeriods]);
                const lastSavedData = new Date().toISOString();
                
                localStorage.setItem('leetCodeProblems', reducedProblemsData);
                localStorage.setItem('leetCodeCompanies', companiesData);
                localStorage.setItem('leetCodeTopics', topicsData);
                localStorage.setItem('leetCodeTimePeriods', timePeriodsData);
                localStorage.setItem('leetCodeLastSaved', lastSavedData);
                localStorage.setItem('leetCodeDataTruncated', 'true');
                
                // Backup to IndexedDB
                if (db) {
                    try {
                        await saveToIndexedDB('leetCodeProblems', reducedProblemsData);
                        await saveToIndexedDB('leetCodeCompanies', companiesData);
                        await saveToIndexedDB('leetCodeTopics', topicsData);
                        await saveToIndexedDB('leetCodeTimePeriods', timePeriodsData);
                        await saveToIndexedDB('leetCodeLastSaved', lastSavedData);
                        await saveToIndexedDB('leetCodeDataTruncated', 'true');
                    } catch (error) {
                        console.error('Failed to backup truncated data:', error);
                    }
                }
                
                console.warn(`Saved ${reducedProblems.length} out of ${allProblems.length} problems (data truncated)`);
                return true;
            } catch (error) {
                console.error('Failed to save reduced data set:', error);
                return false;
            }
        }
        
        console.error('Failed to save data to localStorage:', error);
        return false;
    }
}

// Load all problem data from localStorage
async function loadAllData() {
    try {
        let savedProblems = localStorage.getItem('leetCodeProblems');
        let savedCompanies = localStorage.getItem('leetCodeCompanies');
        let savedTopics = localStorage.getItem('leetCodeTopics');
        let savedTimePeriods = localStorage.getItem('leetCodeTimePeriods');
        let lastSaved = localStorage.getItem('leetCodeLastSaved');
        let dataTruncated = localStorage.getItem('leetCodeDataTruncated') === 'true';
        
        // If localStorage is empty, try to restore from IndexedDB
        if (!savedProblems && db) {
            console.log('localStorage is empty, attempting to restore from IndexedDB backup...');
            try {
                savedProblems = await loadFromIndexedDB('leetCodeProblems');
                savedCompanies = await loadFromIndexedDB('leetCodeCompanies');
                savedTopics = await loadFromIndexedDB('leetCodeTopics');
                savedTimePeriods = await loadFromIndexedDB('leetCodeTimePeriods');
                lastSaved = await loadFromIndexedDB('leetCodeLastSaved');
                const dataTruncatedBackup = await loadFromIndexedDB('leetCodeDataTruncated');
                dataTruncated = dataTruncatedBackup === 'true';
                
                // Restore to localStorage
                if (savedProblems) localStorage.setItem('leetCodeProblems', savedProblems);
                if (savedCompanies) localStorage.setItem('leetCodeCompanies', savedCompanies);
                if (savedTopics) localStorage.setItem('leetCodeTopics', savedTopics);
                if (savedTimePeriods) localStorage.setItem('leetCodeTimePeriods', savedTimePeriods);
                if (lastSaved) localStorage.setItem('leetCodeLastSaved', lastSaved);
                if (dataTruncatedBackup) localStorage.setItem('leetCodeDataTruncated', dataTruncatedBackup);
                
                if (savedProblems) {
                    console.log('Successfully restored data from IndexedDB backup');
                }
            } catch (error) {
                console.error('Failed to restore from IndexedDB backup:', error);
            }
        }
        
        if (savedProblems && savedCompanies && savedTopics && savedTimePeriods) {
            // Restore problems array
            allProblems = JSON.parse(savedProblems);
            
            // Restore sets
            companies = new Set(JSON.parse(savedCompanies));
            topics = new Set(JSON.parse(savedTopics));
            timePeriods = new Set(JSON.parse(savedTimePeriods));
            
            console.log(`Loaded ${allProblems.length} problems from localStorage`);
            
            // Show warning if data was truncated
            if (dataTruncated) {
                console.warn('Note: Only a subset of problems was saved due to storage limitations');
                updateUploadStatus('Note: Only high-frequency problems are saved due to storage limitations', true);
            }
            
            // Show when data was last saved
            if (lastSaved) {
                const savedDate = new Date(lastSaved);
                const now = new Date();
                const timeDiff = Math.round((now - savedDate) / (1000 * 60)); // minutes
                
                if (timeDiff < 60) {
                    console.log(`Data was saved ${timeDiff} minutes ago`);
                } else if (timeDiff < 24 * 60) {
                    console.log(`Data was saved ${Math.round(timeDiff / 60)} hours ago`);
                } else {
                    console.log(`Data was saved ${Math.round(timeDiff / (60 * 24))} days ago`);
                }
            }
            
            return true;
        }
        return false;
    } catch (error) {
        console.error('Failed to load data from localStorage:', error);
        return false;
    }
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
            
            // Store companies and time periods as arrays for each problem
            if (!Array.isArray(problem.Companies)) {
                problem.Companies = [problem.Company];
            } else if (!problem.Companies.includes(problem.Company)) {
                problem.Companies.push(problem.Company);
            }
            
            if (!Array.isArray(problem.TimePeriods)) {
                problem.TimePeriods = [problem.TimePeriod];
            } else if (!problem.TimePeriods.includes(problem.TimePeriod)) {
                problem.TimePeriods.push(problem.TimePeriod);
            }
        });
        
        // Check for duplicates and merge them instead of adding new entries
        problems.forEach(problem => {
            // Use Link or Title as unique identifier
            const uniqueId = problem.Link || problem.Title;
            if (!uniqueId) return; // Skip if no unique identifier
            
            // Check if this problem already exists
            const existingIndex = allProblems.findIndex(p => 
                (p.Link && p.Link === problem.Link) || 
                (p.Title && p.Title === problem.Title)
            );
            
            if (existingIndex >= 0) {
                // Merge with existing problem
                const existingProblem = allProblems[existingIndex];
                
                // Add company if not already in the list
                if (!existingProblem.Companies.includes(problem.Company)) {
                    existingProblem.Companies.push(problem.Company);
                }
                
                // Add time period if not already in the list
                if (!existingProblem.TimePeriods.includes(problem.TimePeriod)) {
                    existingProblem.TimePeriods.push(problem.TimePeriod);
                }
                
                // Store company-specific frequency
                if (!existingProblem.FrequencyByCompany) {
                    existingProblem.FrequencyByCompany = {};
                    // Initialize with existing frequency if it exists
                    if (existingProblem.Frequency) {
                        existingProblem.FrequencyByCompany[existingProblem.Company] = existingProblem.Frequency;
                    }
                }
                existingProblem.FrequencyByCompany[problem.Company] = problem.Frequency;
                
                // Update main frequency to be the highest across all companies
                const allFreqs = Object.values(existingProblem.FrequencyByCompany).map(f => parseFloat(f) || 0);
                existingProblem.Frequency = Math.max(...allFreqs).toString();
                
                // Merge topics if new ones are present
                if (problem.Topics && existingProblem.Topics) {
                    const existingTopics = new Set(existingProblem.Topics.split(',').map(t => t.trim()));
                    const newTopics = problem.Topics.split(',').map(t => t.trim());
                    
                    newTopics.forEach(topic => existingTopics.add(topic));
                    existingProblem.Topics = Array.from(existingTopics).join(', ');
                } else if (problem.Topics) {
                    existingProblem.Topics = problem.Topics;
                }
                
                // Use the highest acceptance rate
                const existingRate = parseFloat(existingProblem["Acceptance Rate"] || existingProblem.Acceptance_Rate || 0);
                const newRate = parseFloat(problem["Acceptance Rate"] || problem.Acceptance_Rate || 0);
                if (newRate > existingRate) {
                    existingProblem["Acceptance Rate"] = problem["Acceptance Rate"];
                    existingProblem.Acceptance_Rate = problem.Acceptance_Rate;
                }
            } else {
                // Initialize FrequencyByCompany for new problem
                if (problem.Frequency) {
                    problem.FrequencyByCompany = {};
                    problem.FrequencyByCompany[problem.Company] = problem.Frequency;
                }
                // Add new problem to the list
                allProblems.push(problem);
            }
        });
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
    
    // Save all data to localStorage
    const saveResult = saveAllData();
    if (!saveResult) {
        console.warn('Warning: Failed to save data to localStorage. Data will not persist after page refresh.');
        updateUploadStatus('Warning: Data too large to save in browser storage. Data will not persist after page refresh.', true);
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

// Save all problem data to localStorage
function saveAllData() {
    try {
        // First attempt - save without compression
        localStorage.setItem('leetCodeProblems', JSON.stringify(allProblems));
        localStorage.setItem('leetCodeCompanies', JSON.stringify([...companies]));
        localStorage.setItem('leetCodeTopics', JSON.stringify([...topics]));
        localStorage.setItem('leetCodeTimePeriods', JSON.stringify([...timePeriods]));
        localStorage.setItem('leetCodeLastSaved', new Date().toISOString());
        
        console.log(`Saved ${allProblems.length} problems to localStorage`);
        return true;
    } catch (error) {
        // If storage quota exceeded, try with fewer problems
        console.warn('Storage quota exceeded, trying with fewer problems');
        
        if (allProblems.length > 500) {
            try {
                // Try saving just 500 problems with highest frequency
                const sortedProblems = [...allProblems].sort((a, b) => {
                    const freqA = parseFloat(a.Frequency) || 0;
                    const freqB = parseFloat(b.Frequency) || 0;
                    return freqB - freqA; // Descending order
                });
                
                const reducedProblems = sortedProblems.slice(0, 500);
                localStorage.setItem('leetCodeProblems', JSON.stringify(reducedProblems));
                localStorage.setItem('leetCodeCompanies', JSON.stringify([...companies]));
                localStorage.setItem('leetCodeTopics', JSON.stringify([...topics]));
                localStorage.setItem('leetCodeTimePeriods', JSON.stringify([...timePeriods]));
                localStorage.setItem('leetCodeLastSaved', new Date().toISOString());
                localStorage.setItem('leetCodeDataTruncated', 'true');
                
                console.warn(`Saved ${reducedProblems.length} out of ${allProblems.length} problems (data truncated)`);
                return true;
            } catch (error) {
                console.error('Failed to save reduced data set:', error);
                return false;
            }
        }
        
        console.error('Failed to save data to localStorage:', error);
        return false;
    }
}

// Load all problem data from localStorage
function loadAllData() {
    try {
        const savedProblems = localStorage.getItem('leetCodeProblems');
        const savedCompanies = localStorage.getItem('leetCodeCompanies');
        const savedTopics = localStorage.getItem('leetCodeTopics');
        const savedTimePeriods = localStorage.getItem('leetCodeTimePeriods');
        const lastSaved = localStorage.getItem('leetCodeLastSaved');
        const dataTruncated = localStorage.getItem('leetCodeDataTruncated') === 'true';
        
        if (savedProblems && savedCompanies && savedTopics && savedTimePeriods) {
            // Restore problems array
            allProblems = JSON.parse(savedProblems);
            
            // Restore sets
            companies = new Set(JSON.parse(savedCompanies));
            topics = new Set(JSON.parse(savedTopics));
            timePeriods = new Set(JSON.parse(savedTimePeriods));
            
            console.log(`Loaded ${allProblems.length} problems from localStorage`);
            
            // Show warning if data was truncated
            if (dataTruncated) {
                console.warn('Note: Only a subset of problems was saved due to storage limitations');
                updateUploadStatus('Note: Only high-frequency problems are saved due to storage limitations', true);
            }
            
            // Show when data was last saved
            if (lastSaved) {
                const savedDate = new Date(lastSaved);
                const now = new Date();
                const timeDiff = Math.round((now - savedDate) / (1000 * 60)); // minutes
                
                if (timeDiff < 60) {
                    console.log(`Data was saved ${timeDiff} minutes ago`);
                } else if (timeDiff < 24 * 60) {
                    console.log(`Data was saved ${Math.round(timeDiff / 60)} hours ago`);
                } else {
                    console.log(`Data was saved ${Math.round(timeDiff / (60 * 24))} days ago`);
                }
            }
            
            return true;
        }
        return false;
    } catch (error) {
        console.error('Failed to load data from localStorage:', error);
        return false;
    }
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
function sortProblems(problems, sortColumn, sortDirection, companyFilter = null) {
    return [...problems].sort((a, b) => {
        let aValue, bValue;
        
        switch(sortColumn) {
            case 'company':
                aValue = (Array.isArray(a.Companies) ? a.Companies[0] : a.Company) || '';
                bValue = (Array.isArray(b.Companies) ? b.Companies[0] : b.Company) || '';
                break;
            case 'timePeriod':
                aValue = (Array.isArray(a.TimePeriods) ? a.TimePeriods[0] : a.TimePeriod) || '';
                bValue = (Array.isArray(b.TimePeriods) ? b.TimePeriods[0] : b.TimePeriod) || '';
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
                // Use company-specific frequency if a company filter is applied
                if (companyFilter) {
                    aValue = (a.FrequencyByCompany && a.FrequencyByCompany[companyFilter]) ? parseFloat(a.FrequencyByCompany[companyFilter]) : parseFloat(a.Frequency) || 0;
                    bValue = (b.FrequencyByCompany && b.FrequencyByCompany[companyFilter]) ? parseFloat(b.FrequencyByCompany[companyFilter]) : parseFloat(b.Frequency) || 0;
                } else {
                    aValue = parseFloat(a.Frequency) || 0;
                    bValue = parseFloat(b.Frequency) || 0;
                }
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

// Helper function to get filtered problems based on current filter criteria
function getFilteredProblems() {
    const companyFilter = document.getElementById('company-filter').value;
    const difficultyFilter = document.getElementById('difficulty-filter').value;
    const timePeriodFilter = document.getElementById('time-period-filter').value;
    const topicFilter = document.getElementById('topic-filter').value;
    const minFrequency = parseFloat(document.getElementById('min-frequency').value) || 0;
    const minAcceptance = parseFloat(document.getElementById('min-acceptance').value) || 0;
    const showCompletedFilter = document.getElementById('show-completed').value;
    const showRevisionFilter = document.getElementById('show-revision') ? document.getElementById('show-revision').value : 'all';
    const searchQuery = document.getElementById('search-input').value.toLowerCase();
    
    return allProblems.filter(problem => {
        // Check company filter
        if (companyFilter) {
            if (Array.isArray(problem.Companies)) {
                if (!problem.Companies.includes(companyFilter)) return false;
            } else if (problem.Company !== companyFilter) {
                return false;
            }
        }
        
        // Check difficulty filter
        if (difficultyFilter && problem.Difficulty !== difficultyFilter) return false;
        
        // Check time period filter
        if (timePeriodFilter) {
            if (Array.isArray(problem.TimePeriods)) {
                if (!problem.TimePeriods.includes(timePeriodFilter)) return false;
            } else if (problem.TimePeriod !== timePeriodFilter) {
                return false;
            }
        }
        
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
        
        // Check revision filter
        if (showRevisionFilter === 'revision' && !revisionProblems.has(problem.Link)) return false;
        if (showRevisionFilter === 'not-revision' && revisionProblems.has(problem.Link)) return false;
        
        // Check search query
        if (searchQuery) {
            const title = problem.Title?.toLowerCase() || '';
            
            // Handle company search in either Company string or Companies array
            let companyMatch = false;
            if (Array.isArray(problem.Companies)) {
                companyMatch = problem.Companies.some(c => c.toLowerCase().includes(searchQuery));
            } else {
                companyMatch = (problem.Company?.toLowerCase() || '').includes(searchQuery);
            }
            
            // Handle time period search
            let timeMatch = false;
            if (Array.isArray(problem.TimePeriods)) {
                timeMatch = problem.TimePeriods.some(t => t.toLowerCase().includes(searchQuery));
            } else {
                timeMatch = (problem.TimePeriod?.toLowerCase() || '').includes(searchQuery);
            }
            
            const topics = problem.Topics?.toLowerCase() || '';
            
            if (!title.includes(searchQuery) && 
                !companyMatch && 
                !timeMatch &&
                !topics.includes(searchQuery)) {
                return false;
            }
        }
        
        return true;
    });
}

// Filter problems based on selected criteria
function filterProblems() {
    setLoading(true);
    
    // Use setTimeout to allow UI to update before heavy processing
    setTimeout(() => {
        const filteredProblems = getFilteredProblems();
        const companyFilter = document.getElementById('company-filter').value;
        
        // Sort the filtered problems
        const sortedProblems = sortProblems(filteredProblems, currentSortColumn, currentSortDirection, companyFilter);
        
        // Display problems with fresh notes data
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
            
            // No need to save all data since only completed status changed
            // and that's already being saved by saveCompletedProblems()
            
            updateProblemCount(problems);
        });
        doneCell.appendChild(doneCheckbox);
        row.appendChild(doneCell);
        
        // Button for revision problems
        const reviseCell = document.createElement('td');
        const reviseButton = document.createElement('button');
        reviseButton.className = 'revise-button';
        reviseButton.classList.toggle('marked', revisionProblems.has(problem.Link));
        reviseButton.innerHTML = reviseButton.classList.contains('marked') ? '★' : '☆';
        reviseButton.title = reviseButton.classList.contains('marked') ? 'Remove from revision' : 'Mark for revision';
        reviseButton.addEventListener('click', () => {
            if (revisionProblems.has(problem.Link)) {
                revisionProblems.delete(problem.Link);
                reviseButton.innerHTML = '☆';
                reviseButton.title = 'Mark for revision';
                reviseButton.classList.remove('marked');
            } else {
                revisionProblems.add(problem.Link);
                reviseButton.innerHTML = '★';
                reviseButton.title = 'Remove from revision';
                reviseButton.classList.add('marked');
            }
            saveRevisionProblems();
            updateProblemCount(problems);
        });
        reviseCell.appendChild(reviseButton);
        row.appendChild(reviseCell);
        
        // Company - show all companies that have this problem
        const companyCell = document.createElement('td');
        if (Array.isArray(problem.Companies)) {
            const companies = [...new Set(problem.Companies)]; // Remove duplicates
            companyCell.textContent = companies.join(', ');
        } else {
            companyCell.textContent = problem.Company || '';
        }
        row.appendChild(companyCell);
        
        // Time Period - show all time periods for this problem
        const timePeriodCell = document.createElement('td');
        if (Array.isArray(problem.TimePeriods)) {
            const timePeriods = [...new Set(problem.TimePeriods)]; // Remove duplicates
            timePeriodCell.textContent = timePeriods.join(', ');
        } else {
            timePeriodCell.textContent = problem.TimePeriod || '';
        }
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
        
        // Frequency - show company-specific frequency if company filter is selected
        const frequencyCell = document.createElement('td');
        const companyFilter = document.getElementById('company-filter').value;
        
        if (companyFilter && problem.FrequencyByCompany && problem.FrequencyByCompany[companyFilter]) {
            // Show frequency specific to the selected company
            frequencyCell.textContent = problem.FrequencyByCompany[companyFilter];
        } else if (problem.FrequencyByCompany && Object.keys(problem.FrequencyByCompany).length > 0) {
            // Show average frequency when no specific company is selected
            const frequencies = Object.values(problem.FrequencyByCompany).map(f => parseFloat(f) || 0);
            const avgFrequency = frequencies.reduce((sum, freq) => sum + freq, 0) / frequencies.length;
            frequencyCell.textContent = avgFrequency.toFixed(1);
            frequencyCell.title = `Average frequency across ${frequencies.length} companies`;
        } else {
            // Fallback to the general frequency
            frequencyCell.textContent = problem.Frequency;
        }
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
        
        // Notes
        const notesCell = document.createElement('td');
        const notesContainer = document.createElement('div');
        notesContainer.className = 'notes-container';
        
        // Get current note from the problemNotes Map
        const currentNote = problemNotes.get(problem.Link) || '';
        
        // Notes button
        const notesButton = document.createElement('button');
        notesButton.className = currentNote ? 'notes-button has-notes' : 'notes-button';
        notesButton.innerHTML = currentNote ? 
            '<span class="notes-icon">📝</span> View Notes' : 
            '<span class="notes-icon">📝</span> Add Notes';
        
        // Click to open notes modal - get fresh note data when clicked
        notesButton.addEventListener('click', () => {
            const freshNote = problemNotes.get(problem.Link) || '';
            openNotesModal(problem, freshNote);
        });
        
        notesContainer.appendChild(notesButton);
        notesCell.appendChild(notesContainer);
        row.appendChild(notesCell);
        
        tableBody.appendChild(row);
    });
}

// Update problem count information
function updateProblemCount(problems) {
    const problemCount = document.getElementById('problem-count');
    const completedCount = document.getElementById('completed-count');
    
    problemCount.textContent = `${problems.length} problems found`;
    
    const completed = problems.filter(p => completedProblems.has(p.Link)).length;
    const forRevision = problems.filter(p => revisionProblems.has(p.Link)).length;
    
    const completedPercent = Math.round(completed / problems.length * 100) || 0;
    const revisionPercent = Math.round(forRevision / problems.length * 100) || 0;
    
    completedCount.textContent = `${completed} completed (${completedPercent}%), ${forRevision} for revision (${revisionPercent}%)`;
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

    // Add Notes column (not part of problem object, comes from problemNotes map)
    orderedHeaders.push('Notes');
    
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
            let value = '';
            if (header === 'Notes') {
                value = problemNotes.get(problem.Link) || '';
            } else {
                value = problem[header] || '';
            }
            
            // Handle arrays (Companies, TimePeriods)
            if (Array.isArray(value)) {
                value = value.join(', ');
            }
            
            // Escape quotes and wrap in quotes if needed
            if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
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

// Update storage status display
function updateStorageStatus() {
    const statusElement = document.getElementById('storage-status');
    if (!statusElement) return;
    
    // Check if we have saved data
    const hasProblems = localStorage.getItem('leetCodeProblems') !== null;
    const hasCompletedProblems = localStorage.getItem('completedLeetCodeProblems') !== null;
    const dataTruncated = localStorage.getItem('leetCodeDataTruncated') === 'true';
    const lastSaved = localStorage.getItem('leetCodeLastSaved');
    
    // Get approximate storage size
    let totalSize = 0;
    for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key) && key.startsWith('leetCode')) {
            totalSize += localStorage.getItem(key).length;
        }
    }
    
    // Convert to KB or MB
    let sizeText = '';
    if (totalSize > 1024 * 1024) {
        sizeText = `${(totalSize / (1024 * 1024)).toFixed(2)} MB`;
    } else if (totalSize > 0) {
        sizeText = `${(totalSize / 1024).toFixed(2)} KB`;
    }
    
    // Last saved date
    let lastSavedText = '';
    if (lastSaved) {
        const savedDate = new Date(lastSaved);
        const now = new Date();
        const timeDiff = Math.round((now - savedDate) / (1000 * 60)); // minutes
        
        if (timeDiff < 1) {
            lastSavedText = 'just now';
        } else if (timeDiff < 60) {
            lastSavedText = `${timeDiff} minute${timeDiff !== 1 ? 's' : ''} ago`;
        } else if (timeDiff < 24 * 60) {
            const hours = Math.floor(timeDiff / 60);
            lastSavedText = `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        } else {
            const days = Math.floor(timeDiff / (60 * 24));
            lastSavedText = `${days} day${days !== 1 ? 's' : ''} ago`;
        }
    }
    
    // Update the status text based on what we have
    if (hasProblems) {
        const problemsCount = JSON.parse(localStorage.getItem('leetCodeProblems')).length;
        let statusText = `${problemsCount} problems stored (${sizeText})`;
        
        if (lastSavedText) {
            statusText += ` · Last saved: ${lastSavedText}`;
        }
        
        // Add backup indicator
        if (db) {
            statusText += ' · 🔒 Backup enabled';
        }
        
        if (dataTruncated) {
            statusText += ' · Note: Data was truncated due to storage limits';
            statusElement.className = 'status-warning';
        } else {
            statusElement.className = 'status-success';
        }
        
        statusElement.textContent = statusText;
    } else if (hasCompletedProblems) {
        statusElement.textContent = `Only completed problem status is stored (${sizeText})`;
        statusElement.className = 'status-warning';
    } else {
        statusElement.textContent = 'No data stored in browser';
        statusElement.className = 'status-neutral';
    }
    
    // Check storage quota if browser supports it
    checkStorageQuota().then(quotaInfo => {
        if (quotaInfo.percentUsed > 80) {
            // Add warning if close to quota
            const warning = document.createElement('div');
            warning.className = 'storage-warning';
            warning.textContent = `⚠️ Browser storage is ${Math.round(quotaInfo.percentUsed)}% full. You may need to clear some data.`;
            statusElement.appendChild(warning);
        }
    }).catch(err => {
        console.log('Could not check storage quota', err);
    });
}

// Clear all saved data
async function clearSavedData() {
    // Only clear leetcode related items from localStorage
    for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key) && key.startsWith('leetCode')) {
            localStorage.removeItem(key);
        }
    }
    
    // Also clear from IndexedDB backup
    if (db) {
        try {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const clearRequest = store.clear();
            
            await new Promise((resolve, reject) => {
                clearRequest.onsuccess = () => {
                    console.log('IndexedDB backup cleared');
                    resolve();
                };
                clearRequest.onerror = () => reject(clearRequest.error);
            });
        } catch (error) {
            console.error('Failed to clear IndexedDB backup:', error);
        }
    }
    
    // Reset global variables if we're not reloading the page
    allProblems = [];
    companies.clear();
    topics.clear();
    timePeriods.clear();
    completedProblems.clear();
    revisionProblems.clear();
    
    // Update UI
    updateStorageStatus();
    
    // Clear the table
    document.getElementById('problems-body').innerHTML = '';
    document.getElementById('problem-count').textContent = '0 problems found';
    document.getElementById('completed-count').textContent = '0 completed (0%)';
    
    // Clear filters
    document.getElementById('company-filter').innerHTML = '<option value="">All Companies</option>';
    document.getElementById('time-period-filter').innerHTML = '<option value="">All Time Periods</option>';
    document.getElementById('topic-filter').innerHTML = '<option value="">All Topics</option>';
    
    // Show no data message
    document.getElementById('no-data-message').style.display = 'block';
    document.getElementById('problems-table').classList.remove('visible');
    
    return true;
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

// Toggle upload panel
function toggleUploadPanel() {
    const uploadSection = document.querySelector('.upload-section');
    uploadSection.classList.toggle('active');
    
    // Close panel when clicking outside
    if (uploadSection.classList.contains('active')) {
        setTimeout(() => {
            document.addEventListener('click', closeUploadPanelOnClickOutside);
        }, 100);
    } else {
        document.removeEventListener('click', closeUploadPanelOnClickOutside);
    }
}

// Close upload panel when clicking outside
function closeUploadPanelOnClickOutside(event) {
    const uploadSection = document.querySelector('.upload-section');
    if (!uploadSection.contains(event.target)) {
        uploadSection.classList.remove('active');
        document.removeEventListener('click', closeUploadPanelOnClickOutside);
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize IndexedDB for backup storage
    try {
        await initIndexedDB();
        console.log('Backup storage system initialized');
        
        // Check if localStorage is empty and try to restore from backup
        const hasLocalStorage = localStorage.getItem('leetCodeProblems') !== null;
        if (!hasLocalStorage) {
            await syncFromBackup();
        }
    } catch (error) {
        console.error('Failed to initialize backup storage:', error);
    }
    
    // Load completed problems
    await loadCompletedProblems();
    
    // Load revision problems
    await loadRevisionProblems();
    
    // Load problem notes
    await loadProblemNotes();
    
    // Update storage status display
    updateStorageStatus();
    
    // Try to load saved data from localStorage
    if (await loadAllData()) {
        // If data loaded successfully, update UI
        updateFilterOptions();
        
        // Make sure to refresh the display after all data (including notes) is loaded
        setTimeout(() => {
            filterProblems();
        }, 100);
        
        updateUploadStatus('Loaded saved data from previous session');
        
        // Update count of loaded companies in status
        if (companies.size > 0) {
            updateUploadStatus(`Loaded ${allProblems.length} problems from ${companies.size} companies.`);
        }
    }
    
    // Set up upload toggle button
    const uploadToggleBtn = document.getElementById('upload-toggle');
    if (uploadToggleBtn) {
        uploadToggleBtn.addEventListener('click', function(event) {
            event.stopPropagation();
            toggleUploadPanel();
        });
    }
    
    // Set up Clear Data button
    const clearDataBtn = document.getElementById('clear-data');
    if (clearDataBtn) {
        clearDataBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to clear all saved data including backups? This cannot be undone.')) {
                if (await clearSavedData()) {
                    updateUploadStatus('All saved data and backups have been cleared');
                }
            }
        });
    }
    
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
            updateStorageStatus();
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
    
    // Add event listener for show revision filter
    if (document.getElementById('show-revision')) {
        document.getElementById('show-revision').addEventListener('change', filterProblems);
    }
    
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
        if (document.getElementById('show-revision')) {
            document.getElementById('show-revision').value = 'all';
        }
        filterProblems();
    });
    
    // Set up export to CSV functionality
    document.getElementById('export-csv').addEventListener('click', () => {
        // Get currently filtered problems
        const filteredProblems = getFilteredProblems();
        
        // Add completed status to the problems and format arrays for CSV
        const problemsWithStatus = filteredProblems.map(problem => {
            // Create copy to avoid modifying original
            const formattedProblem = { ...problem };
            
            // Add completed status
            formattedProblem.Completed = completedProblems.has(problem.Link) ? 'Yes' : 'No';
            
            // Add revision status
            formattedProblem.ForRevision = revisionProblems.has(problem.Link) ? 'Yes' : 'No';
            
            // Format Company information
            if (Array.isArray(formattedProblem.Companies)) {
                formattedProblem.Company = formattedProblem.Companies.join(', ');
            }
            
            // Format TimePeriod information
            if (Array.isArray(formattedProblem.TimePeriods)) {
                formattedProblem.TimePeriod = formattedProblem.TimePeriods.join(', ');
            }
            
            return formattedProblem;
        });
        
        // Export filtered problems
        exportToCSV(problemsWithStatus);
    });
    
    // Set up random problem functionality
    document.getElementById('random-problem').addEventListener('click', () => {
        // Get currently filtered problems
        const filteredProblems = getFilteredProblems();
        
        // Filter out completed problems to get only unsolved ones
        const unsolvedProblems = filteredProblems.filter(problem => !completedProblems.has(problem.Link));
        
        if (unsolvedProblems.length === 0) {
            alert('No unsolved problems found with the current filters!');
            return;
        }
        
        // Get a random unsolved problem
        const randomIndex = Math.floor(Math.random() * unsolvedProblems.length);
        const randomProblem = unsolvedProblems[randomIndex];
        
        // Clear the table and show all filtered problems (so we can highlight the selected one)
        filterProblems();
        
        // Wait for the table to be updated, then highlight the random problem
        setTimeout(() => {
            highlightRandomProblem(randomProblem);
        }, 100);
    });
    
    // Notes Modal Event Listeners
    const modal = document.getElementById('notes-modal');
    const closeBtn = document.querySelector('.modal-close');
    const saveBtn = document.getElementById('save-notes');
    const cancelBtn = document.getElementById('cancel-notes');
    const clearBtn = document.getElementById('clear-notes');
    const textarea = document.getElementById('notes-textarea');
    
    // Close modal events
    closeBtn.addEventListener('click', closeNotesModal);
    cancelBtn.addEventListener('click', closeNotesModal);
    
    // Save notes
    saveBtn.addEventListener('click', saveNotesFromModal);
    
    // Clear notes
    clearBtn.addEventListener('click', clearNotesFromModal);
    
    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeNotesModal();
        }
    });
    
    // Keyboard shortcuts
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
    
    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'block') {
            closeNotesModal();
        }
    });

    // ============================================================================
    // BACKUP SYSTEM EVENT LISTENERS
    // ============================================================================
    
    // Export backup button
    const exportBackupBtn = document.getElementById('export-backup');
    if (exportBackupBtn) {
        exportBackupBtn.addEventListener('click', async () => {
            exportBackupBtn.disabled = true;
            exportBackupBtn.textContent = '📥 Exporting...';
            
            try {
                await exportBackup();
            } catch (error) {
                console.error('Export backup failed:', error);
            } finally {
                exportBackupBtn.disabled = false;
                exportBackupBtn.textContent = '📥 Export Backup';
            }
        });
    }
    
    // Import backup file input
    const importBackupInput = document.getElementById('import-backup');
    if (importBackupInput) {
        importBackupInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;
            
            // Disable the label temporarily
            const label = document.querySelector('label[for="import-backup"]');
            const originalText = label.textContent;
            label.textContent = '📤 Importing...';
            
            try {
                await importBackup(file);
            } catch (error) {
                console.error('Import backup failed:', error);
            } finally {
                // Reset the file input and label
                event.target.value = '';
                label.textContent = originalText;
            }
        });
    }
    
    // Auto-backup toggle
    const autoBackupToggle = document.getElementById('auto-backup-toggle');
    if (autoBackupToggle) {
        // Load saved preference
        const savedAutoBackupPreference = localStorage.getItem('autoBackupEnabled');
        if (savedAutoBackupPreference !== null) {
            isAutoBackupEnabled = savedAutoBackupPreference === 'true';
            autoBackupToggle.checked = isAutoBackupEnabled;
        }
        
        autoBackupToggle.addEventListener('change', () => {
            isAutoBackupEnabled = autoBackupToggle.checked;
            localStorage.setItem('autoBackupEnabled', isAutoBackupEnabled.toString());
            
            if (isAutoBackupEnabled) {
        updateBackupStatus('✅ Auto-backup enabled (saves internally)', 'success');
            } else {
                updateBackupStatus('⏸️ Auto-backup disabled', 'info');
            }
            
            setTimeout(() => {
                updateBackupStatus('', '');
            }, 2000);
        });
    }
    
    // Auto-backup interval input
    const autoBackupIntervalInput = document.getElementById('auto-backup-interval');
    if (autoBackupIntervalInput) {
        // Load saved interval preference
        const savedInterval = localStorage.getItem('autoBackupInterval');
        if (savedInterval) {
            autoBackupInterval = parseInt(savedInterval, 10);
            autoBackupIntervalInput.value = autoBackupInterval;
        }
        
        autoBackupIntervalInput.addEventListener('change', () => {
            const newInterval = parseInt(autoBackupIntervalInput.value, 10);
            if (newInterval >= 1 && newInterval <= 50) {
                autoBackupInterval = newInterval;
                localStorage.setItem('autoBackupInterval', autoBackupInterval.toString());
                changeCounter = 0; // Reset counter when interval changes
                
                updateBackupStatus(`Auto-save interval updated to ${autoBackupInterval} changes`, 'info');
                setTimeout(() => {
                    updateBackupStatus('', '');
                }, 2000);
            }
        });
    }
});

// Function to highlight and scroll to a specific problem in the table
function highlightRandomProblem(problem) {
    // Find all table rows
    const tableRows = document.querySelectorAll('#problems-body tr');
    
    // Remove any existing highlights
    tableRows.forEach(row => {
        row.classList.remove('highlighted-problem');
    });
    
    // Find the row with the matching problem link
    let targetRow = null;
    tableRows.forEach(row => {
        const linkCell = row.querySelector('td a[href="' + problem.Link + '"]');
        if (linkCell) {
            targetRow = row;
        }
    });
    
    if (targetRow) {
        // Add highlight class
        targetRow.classList.add('highlighted-problem');
        
        // Scroll to the highlighted row
        targetRow.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
        
        // Show notification
        showRandomProblemNotification(problem);
        
        // Remove highlight after 5 seconds
        setTimeout(() => {
            targetRow.classList.remove('highlighted-problem');
        }, 5000);
    }
}

// Function to show a notification for the selected random problem
function showRandomProblemNotification(problem) {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('random-problem-notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'random-problem-notification';
        notification.className = 'random-notification';
        document.body.appendChild(notification);
    }
    
    // Set notification content
    const difficulty = problem.Difficulty || 'Unknown';
    const title = problem.Title || 'Unknown Problem';
    notification.innerHTML = `
        <div class="notification-content">
            <h3>🎲 Random Problem Selected!</h3>
            <p><strong>${title}</strong></p>
            <span class="difficulty-badge ${difficulty.toLowerCase()}">${difficulty}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.style.display='none'">×</button>
    `;
    
    // Show notification
    notification.style.display = 'block';
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
        if (notification.style.display !== 'none') {
            notification.style.display = 'none';
        }
    }, 4000);
}

// Add event listener for page unload to ensure data is saved
window.addEventListener('beforeunload', () => {
    // Save completed problems
    saveCompletedProblems();
    
    // Save revision problems
    saveRevisionProblems();
    
    // No need to save all problems as they are already saved when uploaded/modified
    // and this could cause performance issues during page unload
    
    return undefined; // Allow normal page unload
});

// Notes Modal Functionality
let currentNoteProblem = null;

function openNotesModal(problem, currentNote) {
    currentNoteProblem = problem;
    
    const modal = document.getElementById('notes-modal');
    const problemTitle = document.getElementById('notes-problem-title');
    const problemLink = document.getElementById('notes-problem-link');
    const textarea = document.getElementById('notes-textarea');
    
    // Set problem information
    problemTitle.textContent = problem.Title;
    problemLink.innerHTML = `<a href="${problem.Link}" target="_blank" rel="noopener noreferrer">${problem.Link}</a>`;
    
    // Set current notes
    textarea.value = currentNote;
    
    // Show modal
    modal.style.display = 'block';
    
    // Focus on textarea
    setTimeout(() => textarea.focus(), 100);
}

function closeNotesModal() {
    const modal = document.getElementById('notes-modal');
    modal.style.display = 'none';
    currentNoteProblem = null;
}

function saveNotesFromModal() {
    if (!currentNoteProblem) return;
    
    const textarea = document.getElementById('notes-textarea');
    const noteText = textarea.value.trim();
    
    if (noteText) {
        problemNotes.set(currentNoteProblem.Link, noteText);
    } else {
        problemNotes.delete(currentNoteProblem.Link);
    }
    
    saveProblemNotes();
    
    // Update the button in the table
    updateNotesButton(currentNoteProblem, noteText);
    
    closeNotesModal();
}

function updateNotesButton(problem, noteText) {
    // Find the button for this problem and update it
    const tableBody = document.getElementById('problems-body');
    const rows = tableBody.querySelectorAll('tr');
    
    rows.forEach(row => {
        // Look for the problem link in the title column (which should be the 6th column)
        const linkCell = row.querySelector('a.problem-link');
        if (linkCell && linkCell.href === problem.Link) {
            const button = row.querySelector('.notes-button');
            if (button) {
                if (noteText) {
                    button.className = 'notes-button has-notes';
                    button.innerHTML = '<span class="notes-icon">📝</span> View Notes';
                } else {
                    button.className = 'notes-button';
                    button.innerHTML = '<span class="notes-icon">📝</span> Add Notes';
                }
            }
        }
    });
}

function clearNotesFromModal() {
    const textarea = document.getElementById('notes-textarea');
    textarea.value = '';
    textarea.focus();
}
