// Global variables
let currentData = null;

// Fill example query
function fillExampleQuery() {
    const exampleQuery = `Market Capitalization > 30000 AND 
Price to earning > 15 AND 
Return on capital employed > 22% AND
Return on equity > 20 AND 
Debt to equity < 1`;
    
    document.getElementById('sqlQuery').value = exampleQuery;
}

// Redirect to Screener.in with the current query
async function redirectToScreener() {
    const sqlQuery = document.getElementById('sqlQuery').value.trim();
    
    if (!sqlQuery) {
        showError('Please enter a SQL query before redirecting');
        return;
    }
    
    try {
        const response = await fetch('/api/screener/redirect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sqlQuery })
        });
        
        const result = await response.json();
        
        if (result.success && result.redirectUrl) {
            // Open Screener.in in a new tab
            window.open(result.redirectUrl, '_blank');
        } else {
            throw new Error(result.error || 'Failed to generate redirect URL');
        }
        
    } catch (error) {
        console.error('Redirect error:', error);
        showError(`Error generating redirect: ${error.message}`);
    }
}

// Execute the query (public access)
async function executeQuery() {
    const sqlQuery = document.getElementById('sqlQuery').value.trim();
    
    if (!sqlQuery) {
        showError('Please enter a SQL query');
        return;
    }
    
    // Update UI for loading state
    showLoading();
    hideError();
    hideResults();
    hideAuthNotice();
    
    const searchBtn = document.querySelector('.search-btn');
    const btnText = searchBtn.querySelector('.btn-text');
    const spinner = searchBtn.querySelector('.loading-spinner');
    
    // Disable button and show loading
    searchBtn.disabled = true;
    btnText.style.display = 'none';
    spinner.style.display = 'inline';
    
    try {
        const response = await fetch('/api/screener/query', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sqlQuery })
        });
        
        const result = await response.json();
        
        if (!response.ok && response.status !== 200) {
            throw new Error(result.error || `HTTP error! status: ${response.status}`);
        }
        
        if (result.success) {
            currentData = result;
            displayResults(result);
        } else if (result.error === 'Authentication required') {
            // Show authentication notice
            showAuthNotice(result);
            hideLoading();
        } else {
            throw new Error(result.error || 'Unknown error occurred');
        }
        
    } catch (error) {
        console.error('Query execution error:', error);
        showError(`Error: ${error.message}`);
        hideLoading();
    } finally {
        // Re-enable button
        searchBtn.disabled = false;
        btnText.style.display = 'inline';
        spinner.style.display = 'none';
    }
}

// Execute authenticated query
async function executeAuthenticatedQuery() {
    const sqlQuery = document.getElementById('sqlQuery').value.trim();
    const email = document.getElementById('screenerEmail').value.trim();
    const password = document.getElementById('screenerPassword').value.trim();
    
    if (!sqlQuery) {
        showError('Please enter a SQL query');
        return;
    }
    
    if (!email || !password) {
        showError('Please enter your Screener.in email and password');
        return;
    }
    
    // Update UI for loading state
    showLoading();
    hideError();
    hideResults();
    hideAuthNotice();
    
    const authSearchBtn = document.querySelector('.auth-search-btn');
    const btnText = authSearchBtn.querySelector('.btn-text');
    const spinner = authSearchBtn.querySelector('.loading-spinner');
    
    // Disable button and show loading
    authSearchBtn.disabled = true;
    btnText.style.display = 'none';
    spinner.style.display = 'inline';
    
    try {
        const response = await fetch('/api/screener/query-authenticated', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sqlQuery, email, password })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || `HTTP error! status: ${response.status}`);
        }
        
        if (result.success) {
            currentData = result;
            displayResults(result);
            // Clear password for security
            document.getElementById('screenerPassword').value = '';
        } else {
            throw new Error(result.error || 'Authentication failed');
        }
        
    } catch (error) {
        console.error('Authenticated query error:', error);
        showError(`Authentication Error: ${error.message}`);
        hideLoading();
    } finally {
        // Re-enable button
        authSearchBtn.disabled = false;
        btnText.style.display = 'inline';
        spinner.style.display = 'none';
    }
}

// Toggle authentication form
function toggleAuthForm() {
    const authForm = document.getElementById('authForm');
    if (authForm.style.display === 'none' || !authForm.style.display) {
        authForm.style.display = 'block';
    } else {
        authForm.style.display = 'none';
        // Clear form when hiding
        document.getElementById('screenerEmail').value = '';
        document.getElementById('screenerPassword').value = '';
    }
}

// Test Firecrawl connection
async function testFirecrawl() {
    const testBtn = document.querySelector('.test-btn');
    const originalText = testBtn.textContent;
    
    testBtn.disabled = true;
    testBtn.textContent = 'Testing...';
    
    try {
        const response = await fetch('/api/screener/test');
        const result = await response.json();
        
        if (response.ok && result.success) {
            showError('✅ Firecrawl connection is working!', false);
        } else {
            throw new Error(result.error || 'Connection test failed');
        }
        
    } catch (error) {
        console.error('Firecrawl test error:', error);
        showError(`❌ Firecrawl test failed: ${error.message}`);
    } finally {
        testBtn.disabled = false;
        testBtn.textContent = originalText;
    }
}

// Display results
function displayResults(data) {
    hideLoading();
    
    // Show results header
    const resultsHeader = document.querySelector('.results-header');
    resultsHeader.style.display = 'flex';
    
    // Update results info
    const resultsCount = document.getElementById('resultsCount');
    const screenerLink = document.getElementById('screenerLink');
    
    // Count results from table data
    let stockCount = 0;
    if (data.data.tableData && data.data.tableData.length > 0) {
        stockCount = Math.max(0, data.data.tableData[0].length - 1); // Subtract header row
    }
    
    resultsCount.textContent = `${stockCount} stocks found`;
    screenerLink.href = data.redirectUrl || data.screenerUrl;
    
    // Show results container
    const resultsContainer = document.getElementById('resultsContainer');
    resultsContainer.style.display = 'block';
    
    // Add redirect info if available
    if (data.redirectUrl) {
        const existingRedirectInfo = resultsContainer.querySelector('.redirect-info');
        if (existingRedirectInfo) {
            existingRedirectInfo.remove();
        }
        
        const redirectInfo = document.createElement('div');
        redirectInfo.className = 'redirect-info';
        redirectInfo.style.cssText = `
            background: linear-gradient(135deg, #e6fffa, #b2f5ea);
            border: 2px solid #4fd1c7;
            border-radius: 12px;
            padding: 15px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 15px;
        `;
        
        redirectInfo.innerHTML = `
            <div style="flex: 1; min-width: 200px;">
                <strong style="color: #234e52;">🔗 Direct Screener.in Access</strong>
                <p style="color: #2d3748; margin: 5px 0 0 0; font-size: 0.9rem;">
                    Open this query directly in Screener.in for full interactive features
                </p>
            </div>
            <button onclick="window.open('${data.redirectUrl}', '_blank')" style="
                background: linear-gradient(135deg, #4fd1c7, #38b2ac);
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
            " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                🚀 Open in Screener.in
            </button>
        `;
        
        resultsContainer.insertBefore(redirectInfo, resultsContainer.firstChild);
    }
    
    // Populate table tab
    populateTableTab(data.data.tableData);
    
    // Populate raw data tab
    document.getElementById('rawData').textContent = JSON.stringify(data.data, null, 2);
    
    // Populate markdown tab
    document.getElementById('markdownData').textContent = data.data.markdown || 'No markdown data available';
    
    // Show table tab by default
    showTab('table');
}

// Populate table tab
function populateTableTab(tableData) {
    const tableContainer = document.getElementById('tableContainer');
    
    if (!tableData || tableData.length === 0) {
        tableContainer.innerHTML = `
            <div class="no-data">
                <h3>No tabular data found</h3>
                <p>The scraped content might not contain structured table data, or the page structure might have changed.</p>
            </div>
        `;
        return;
    }
    
    // Find the largest table (most likely the results table)
    let mainTable = tableData[0];
    for (let table of tableData) {
        if (table.length > mainTable.length) {
            mainTable = table;
        }
    }
    
    if (mainTable.length === 0) {
        tableContainer.innerHTML = `
            <div class="no-data">
                <h3>No data rows found</h3>
                <p>The table was found but contains no data rows.</p>
            </div>
        `;
        return;
    }
    
    // Create HTML table
    let tableHtml = '<table class="results-table">';
    
    // Add header if available
    if (mainTable.length > 0) {
        tableHtml += '<thead><tr>';
        for (let cell of mainTable[0]) {
            tableHtml += `<th>${escapeHtml(cell)}</th>`;
        }
        tableHtml += '</tr></thead>';
    }
    
    // Add data rows
    if (mainTable.length > 1) {
        tableHtml += '<tbody>';
        for (let i = 1; i < mainTable.length; i++) {
            tableHtml += '<tr>';
            for (let cell of mainTable[i]) {
                tableHtml += `<td>${escapeHtml(cell)}</td>`;
            }
            tableHtml += '</tr>';
        }
        tableHtml += '</tbody>';
    }
    
    tableHtml += '</table>';
    
    tableContainer.innerHTML = tableHtml;
}

// Show specific tab
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName + 'Tab').classList.add('active');
    document.querySelector(`.tab-btn[onclick="showTab('${tabName}')"]`).classList.add('active');
}

// Utility functions
function showLoading() {
    document.getElementById('loadingIndicator').style.display = 'block';
}

function hideLoading() {
    document.getElementById('loadingIndicator').style.display = 'none';
}

function showError(message, isError = true) {
    const errorElement = document.getElementById('errorMessage');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    
    if (!isError) {
        errorElement.style.background = '#c6f6d5';
        errorElement.style.color = '#22543d';
        errorElement.style.borderColor = '#68d391';
    } else {
        errorElement.style.background = '#fed7d7';
        errorElement.style.color = '#c53030';
        errorElement.style.borderColor = '#f56565';
    }
    
    // Auto-hide success messages
    if (!isError) {
        setTimeout(() => {
            hideError();
        }, 3000);
    }
}

function hideError() {
    document.getElementById('errorMessage').style.display = 'none';
}

function hideResults() {
    document.querySelector('.results-header').style.display = 'none';
    document.getElementById('resultsContainer').style.display = 'none';
}

function showAuthNotice(result) {
    const authNotice = document.getElementById('authNotice');
    authNotice.style.display = 'block';
    
    // Update the notice content if we have more detailed information
    if (result.explanation) {
        const noticeContent = authNotice.querySelector('.notice-content');
        const existingExplanation = noticeContent.querySelector('.detailed-explanation');
        if (existingExplanation) {
            existingExplanation.remove();
        }
        
        const explanationDiv = document.createElement('div');
        explanationDiv.className = 'detailed-explanation';
        explanationDiv.style.cssText = `
            margin: 15px 0;
            padding: 12px;
            background: rgba(254, 243, 199, 0.8);
            border-left: 4px solid #f59e0b;
            border-radius: 4px;
        `;
        explanationDiv.innerHTML = `
            <strong style="color: #92400e;">💡 Why This Happens:</strong><br>
            <span style="color: #451a03;">${result.explanation}</span>
        `;
        
        // Insert after the main message
        const mainList = noticeContent.querySelector('ul');
        if (mainList) {
            mainList.parentNode.insertBefore(explanationDiv, mainList);
        }
    }
    
    // Add the generated URL if available
    if (result.redirectUrl) {
        const existingUrl = authNotice.querySelector('.generated-url');
        if (existingUrl) {
            existingUrl.remove();
        }
        
        const urlDiv = document.createElement('div');
        urlDiv.className = 'generated-url';
        urlDiv.style.marginTop = '15px';
        urlDiv.style.padding = '15px';
        urlDiv.style.background = 'linear-gradient(135deg, #dbeafe, #bfdbfe)';
        urlDiv.style.borderRadius = '8px';
        urlDiv.style.border = '2px solid #3b82f6';
        urlDiv.innerHTML = `
            <strong style="color: #1e40af;">🎯 Best Solution - Open Directly:</strong><br>
            <p style="color: #1e40af; margin: 8px 0; font-size: 0.9rem;">
                Click below to access your query results with full Screener.in features
            </p>
            <button onclick="window.open('${result.redirectUrl}', '_blank')" style="
                background: linear-gradient(135deg, #3b82f6, #2563eb);
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 1rem;
            " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                🚀 Open Screening Results
            </button>
            <br><br>
            <details style="margin-top: 10px;">
                <summary style="cursor: pointer; color: #374151; font-size: 0.9rem;">📋 View URL</summary>
                <div style="margin-top: 8px; padding: 8px; background: rgba(255, 255, 255, 0.7); border-radius: 4px; font-family: monospace; font-size: 0.8rem; word-break: break-all;">
                    ${result.redirectUrl}
                </div>
            </details>
        `;
        
        authNotice.querySelector('.notice-content').appendChild(urlDiv);
    }
}

function hideAuthNotice() {
    document.getElementById('authNotice').style.display = 'none';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Add enter key support for textarea (Ctrl+Enter to submit)
    document.getElementById('sqlQuery').addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'Enter') {
            executeQuery();
        }
    });
    
    console.log('Screener.in Query Interface loaded successfully!');
});