const express = require('express');
const axios = require('axios');
const router = express.Router();

const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v0';
const SCREENER_BASE_URL = 'https://www.screener.in';

// Function to convert SQL-like query to Screener.in URL format
function convertSqlToScreenerUrl(sqlQuery) {
    try {
        // Split by AND, trim each condition
        const conditions = sqlQuery.split(/\s+AND\s+/i);
        const trimmedConditions = conditions.map(condition => condition.trim());
        
        // Build the query manually to match the expected format exactly
        let result = '';
        for (let i = 0; i < trimmedConditions.length; i++) {
            const condition = trimmedConditions[i];
            
            // Encode condition carefully - first encode %, then > and <, then spaces
            const encodedCondition = condition
                .replace(/%/g, '%25')  // Encode % first
                .replace(/>/g, '%3E')  // Then encode >
                .replace(/</g, '%3C')  // Then encode <
                .replace(/\s+/g, '+'); // Finally replace spaces with +
            
            result += encodedCondition;
            
            // Add AND with line break, except for the last condition
            if (i < trimmedConditions.length - 1) {
                // For the pattern in your URL, check specific positioning
                if (condition.toLowerCase().includes('return on capital employed')) {
                    result += '+AND%0D%0A'; // No space after %0D%0A for this specific case
                } else {
                    result += '+AND+%0D%0A';
                }
            }
        }
        
        // Use the screen/raw format as provided
        const baseUrl = `${SCREENER_BASE_URL}/screen/raw/`;
        return `${baseUrl}?sort=&order=&source_id=&query=${result}`;
        
    } catch (error) {
        console.error('Error converting SQL to Screener URL:', error);
        return `${SCREENER_BASE_URL}/screen/raw/?query=${encodeURIComponent(sqlQuery)}`;
    }
}

// Function to generate the direct redirect URL
function generateScreenerRedirectUrl(sqlQuery) {
    return convertSqlToScreenerUrl(sqlQuery);
}

// Alternative function to try multiple URL formats
function getScreenerUrlVariants(sqlQuery) {
    // First try the direct redirect URL format
    const directUrl = generateScreenerRedirectUrl(sqlQuery);
    
    // Also try the old parameter-based format as fallback
    const baseParams = convertSqlToScreenerUrlParams(sqlQuery);
    const paramString = baseParams.join('&');
    
    return [
        directUrl, // Try the new format first
        `${SCREENER_BASE_URL}/explore/?${paramString}`,
        `${SCREENER_BASE_URL}/screen/raw/?${paramString}`,
        `${SCREENER_BASE_URL}/screens/?${paramString}`
    ];
}

function convertSqlToScreenerUrlParams(sqlQuery) {
    const conditions = sqlQuery.split(' AND ');
    let urlParams = [];
    
    conditions.forEach(condition => {
        const trimmed = condition.trim();
        
        // Market Capitalization
        if (trimmed.toLowerCase().includes('market capitalization')) {
            const match = trimmed.match(/>\s*(\d+)/);
            if (match) {
                const value = parseInt(match[1]);
                if (value > 50000) {
                    urlParams.push(`market_cap_basic_filter%5B%5D=Large+Cap`);
                } else if (value > 5000) {
                    urlParams.push(`market_cap_basic_filter%5B%5D=Mid+Cap`);
                    urlParams.push(`market_cap_basic_filter%5B%5D=Large+Cap`);
                } else {
                    urlParams.push(`market_cap_basic_filter%5B%5D=Small+Cap`);
                    urlParams.push(`market_cap_basic_filter%5B%5D=Mid+Cap`);
                    urlParams.push(`market_cap_basic_filter%5B%5D=Large+Cap`);
                }
            }
        }
        
        // Price to Earnings
        if (trimmed.toLowerCase().includes('price to earning')) {
            const match = trimmed.match(/>\s*(\d+)/);
            if (match) {
                urlParams.push(`filters%5Bpe%5D%5Bmin%5D=${match[1]}`);
            }
        }
        
        // Return on Capital Employed (ROCE)
        if (trimmed.toLowerCase().includes('return on capital employed')) {
            const match = trimmed.match(/>\s*(\d+)%?/);
            if (match) {
                urlParams.push(`filters%5Broce%5D%5Bmin%5D=${match[1]}`);
            }
        }
        
        // Return on Equity (ROE)
        if (trimmed.toLowerCase().includes('return on equity')) {
            const match = trimmed.match(/>\s*(\d+)/);
            if (match) {
                urlParams.push(`filters%5Broe%5D%5Bmin%5D=${match[1]}`);
            }
        }
        
        // Debt to Equity
        if (trimmed.toLowerCase().includes('debt to equity')) {
            const match = trimmed.match(/<\s*(\d+)/);
            if (match) {
                urlParams.push(`filters%5Bdebt_to_equity%5D%5Bmax%5D=${match[1]}`);
            }
        }
    });
    
    return urlParams;
}

// Route for direct redirect to Screener.in
router.post('/redirect', async (req, res) => {
    try {
        const { sqlQuery } = req.body;
        
        if (!sqlQuery) {
            return res.status(400).json({ error: 'SQL query is required' });
        }
        
        const redirectUrl = generateScreenerRedirectUrl(sqlQuery);
        
        res.json({
            success: true,
            redirectUrl: redirectUrl,
            query: sqlQuery
        });
        
    } catch (error) {
        console.error('Error generating redirect URL:', error);
        res.status(500).json({
            error: 'Internal server error',
            details: error.message
        });
    }
});

// Route to query Screener.in
router.post('/query', async (req, res) => {
    try {
        const { sqlQuery } = req.body;
        
        if (!sqlQuery) {
            return res.status(400).json({ error: 'SQL query is required' });
        }
        
        // Generate the direct redirect URL
        const directRedirectUrl = generateScreenerRedirectUrl(sqlQuery);
        
        if (!process.env.FIRECRAWL_API_KEY) {
            return res.status(500).json({ 
                error: 'Firecrawl API key not configured',
                redirectUrl: directRedirectUrl,
                query: sqlQuery
            });
        }
        
        // Try multiple URL variants to find one that works
        const urlVariants = getScreenerUrlVariants(sqlQuery);
        let successfulScrape = null;
        let lastError = null;
        
        for (let i = 0; i < urlVariants.length; i++) {
            const screenerUrl = urlVariants[i];
            console.log(`Trying URL ${i + 1}/${urlVariants.length}:`, screenerUrl);
            
            try {
                // Use Firecrawl to scrape the Screener.in page
                const firecrawlResponse = await axios.post(
                    `${FIRECRAWL_API_URL}/scrape`,
                    {
                        url: screenerUrl,
                        formats: ['markdown', 'html'],
                        includeTags: ['table', 'tr', 'td', 'th', 'div', 'span', 'a'],
                        excludeTags: ['script', 'style', 'nav', 'footer'],
                        waitFor: 2000, // Wait for 2 seconds for dynamic content to load
                        // Add headers to mimic a real browser
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                        }
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                
                if (firecrawlResponse.data.success) {
                    const scrapedData = firecrawlResponse.data.data;
                    
                    // Check if we got redirected to a login/register page
                    const isLoginPage = scrapedData && scrapedData.markdown && (
                        scrapedData.markdown.includes('Get a free account') ||
                        scrapedData.markdown.includes('Login here') ||
                        scrapedData.markdown.includes('Register') ||
                        (scrapedData.url && scrapedData.url.includes('/register/')) ||
                        (scrapedData.url && scrapedData.url.includes('/login/'))
                    );
                    
                    if (scrapedData && !isLoginPage) {
                        // We found a page that's not a login page and has data
                        successfulScrape = {
                            url: screenerUrl,
                            data: scrapedData,
                            attempt: i + 1
                        };
                        break;
                    } else if (!scrapedData) {
                        console.log(`URL ${i + 1} returned no data, trying next...`);
                        lastError = 'No data returned from scraping';
                    } else {
                        console.log(`URL ${i + 1} redirected to login page, trying next...`);
                        lastError = 'Redirected to login/registration page';
                    }
                } else {
                    console.log(`URL ${i + 1} failed:`, firecrawlResponse.data.error);
                    lastError = firecrawlResponse.data.error;
                }
                
            } catch (urlError) {
                console.log(`URL ${i + 1} error:`, urlError.message);
                lastError = urlError.message;
                continue;
            }
        }
        
        if (!successfulScrape) {
            // If no URL worked, provide information about the authentication issue
            return res.json({
                success: false,
                error: 'Authentication required',
                message: 'Screener.in requires login to access screening data tables. All attempted URLs either redirected to login pages or returned no data.',
                redirectUrl: directRedirectUrl,
                explanation: 'Screener.in protects their screening results behind authentication. The table data you want is only available to logged-in users.',
                recommendations: [
                    'Use the "Open in Screener.in" button to access the data directly in your browser',
                    'Create a free Screener.in account if you don\'t have one',
                    'Use the "Use Screener.in Account" option above with your credentials',
                    'Consider using alternative stock screening APIs for programmatic access'
                ],
                attemptedUrls: urlVariants,
                lastError: lastError,
                technicalDetails: {
                    query: sqlQuery,
                    primaryUrl: directRedirectUrl,
                    issue: 'Data tables require user authentication'
                }
            });
        }
        
        // Extract and parse the table data from the scraped content
        const tableData = extractTableData(successfulScrape.data.html || successfulScrape.data.markdown);
        
        res.json({
            success: true,
            query: sqlQuery,
            screenerUrl: successfulScrape.url,
            redirectUrl: directRedirectUrl,
            attempt: successfulScrape.attempt,
            data: {
                rawHtml: successfulScrape.data.html,
                markdown: successfulScrape.data.markdown,
                tableData: tableData,
                metadata: successfulScrape.data.metadata
            }
        });
        
    } catch (error) {
        console.error('Error querying Screener:', error);
        
        if (error.response) {
            return res.status(error.response.status).json({
                error: 'Firecrawl API error',
                details: error.response.data
            });
        }
        
        res.status(500).json({
            error: 'Internal server error',
            details: error.message
        });
    }
});

// Function to extract table data from HTML
function extractTableData(html) {
    if (!html) return null;
    
    try {
        // Simple regex-based extraction for table data
        // This is a basic implementation - you might want to use a proper HTML parser
        const tableRegex = /<table[^>]*>(.*?)<\/table>/gis;
        const rowRegex = /<tr[^>]*>(.*?)<\/tr>/gis;
        const cellRegex = /<t[hd][^>]*>(.*?)<\/t[hd]>/gis;
        
        const tables = [];
        let tableMatch;
        
        while ((tableMatch = tableRegex.exec(html)) !== null) {
            const tableContent = tableMatch[1];
            const rows = [];
            let rowMatch;
            
            while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
                const rowContent = rowMatch[1];
                const cells = [];
                let cellMatch;
                
                while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
                    // Remove HTML tags and clean up the cell content
                    const cellText = cellMatch[1].replace(/<[^>]*>/g, '').trim();
                    cells.push(cellText);
                }
                
                if (cells.length > 0) {
                    rows.push(cells);
                }
            }
            
            if (rows.length > 0) {
                tables.push(rows);
            }
        }
        
        return tables;
        
    } catch (error) {
        console.error('Error extracting table data:', error);
        return null;
    }
}

// Route for authenticated scraping (if user has Screener.in account)
router.post('/query-authenticated', async (req, res) => {
    try {
        const { sqlQuery, email, password } = req.body;
        
        if (!sqlQuery || !email || !password) {
            return res.status(400).json({ 
                error: 'SQL query, email, and password are required for authenticated access' 
            });
        }
        
        if (!process.env.FIRECRAWL_API_KEY) {
            return res.status(500).json({ error: 'Firecrawl API key not configured' });
        }
        
        // First, login to Screener.in
        const loginUrl = 'https://www.screener.in/login/';
        
        // Use Firecrawl's crawler for authenticated sessions
        const crawlResponse = await axios.post(
            `${FIRECRAWL_API_URL}/crawl`,
            {
                url: loginUrl,
                crawlerOptions: {
                    includes: ['**screener.in**'],
                    maxDepth: 2,
                    limit: 5
                },
                pageOptions: {
                    formats: ['markdown', 'html'],
                    waitFor: 3000,
                    // Simulate login form submission
                    actions: [
                        {
                            type: 'fill',
                            selector: 'input[name="username"]',
                            value: email
                        },
                        {
                            type: 'fill', 
                            selector: 'input[name="password"]',
                            value: password
                        },
                        {
                            type: 'click',
                            selector: 'button[type="submit"]'
                        },
                        {
                            type: 'wait',
                            value: 2000
                        }
                    ]
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (!crawlResponse.data.success) {
            return res.status(500).json({
                error: 'Failed to authenticate with Screener.in',
                details: crawlResponse.data.error
            });
        }
        
        // Now try to access the screening page with authentication
        const screenerUrl = convertSqlToScreenerUrl(sqlQuery);
        
        const screenResponse = await axios.post(
            `${FIRECRAWL_API_URL}/scrape`,
            {
                url: screenerUrl,
                formats: ['markdown', 'html'],
                includeTags: ['table', 'tr', 'td', 'th', 'div'],
                excludeTags: ['script', 'style'],
                waitFor: 3000
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (!screenResponse.data.success) {
            return res.status(500).json({
                error: 'Failed to scrape authenticated page',
                details: screenResponse.data.error
            });
        }
        
        const scrapedData = screenResponse.data.data;
        const tableData = extractTableData(scrapedData.html || scrapedData.markdown);
        
        res.json({
            success: true,
            query: sqlQuery,
            screenerUrl: screenerUrl,
            authenticated: true,
            data: {
                rawHtml: scrapedData.html,
                markdown: scrapedData.markdown,
                tableData: tableData,
                metadata: scrapedData.metadata
            }
        });
        
    } catch (error) {
        console.error('Authenticated query error:', error);
        res.status(500).json({
            error: 'Authentication failed',
            details: error.response ? error.response.data : error.message
        });
    }
});

// Test route to check if Firecrawl is working
router.get('/test', async (req, res) => {
    try {
        if (!process.env.FIRECRAWL_API_KEY) {
            return res.status(500).json({ error: 'Firecrawl API key not configured' });
        }
        
        const testResponse = await axios.post(
            `${FIRECRAWL_API_URL}/scrape`,
            {
                url: 'https://www.screener.in/explore/',
                formats: ['markdown']
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        res.json({
            success: true,
            message: 'Firecrawl is working correctly',
            data: testResponse.data
        });
        
    } catch (error) {
        console.error('Firecrawl test error:', error);
        res.status(500).json({
            error: 'Firecrawl test failed',
            details: error.response ? error.response.data : error.message
        });
    }
});

// Route to get public stock data without authentication
router.post('/query-public', async (req, res) => {
    try {
        const { sqlQuery } = req.body;
        
        if (!sqlQuery) {
            return res.status(400).json({ error: 'SQL query is required' });
        }
        
        // Try to get public data from Screener.in explore page
        const publicUrls = [
            'https://www.screener.in/explore/',
            'https://www.screener.in/',
            'https://www.screener.in/company/compare/'
        ];
        
        let results = [];
        
        for (const url of publicUrls) {
            try {
                const response = await axios.post(
                    `${FIRECRAWL_API_URL}/scrape`,
                    {
                        url: url,
                        formats: ['markdown', 'html'],
                        includeTags: ['table', 'tr', 'td', 'th', 'div', 'a'],
                        excludeTags: ['script', 'style'],
                        waitFor: 2000
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                
                if (response.data.success) {
                    results.push({
                        url: url,
                        data: response.data.data,
                        tableData: extractTableData(response.data.data.html || response.data.data.markdown)
                    });
                }
            } catch (error) {
                console.log(`Failed to scrape ${url}:`, error.message);
            }
        }
        
        res.json({
            success: true,
            query: sqlQuery,
            message: 'Public pages scraped (limited data available without authentication)',
            results: results
        });
        
    } catch (error) {
        console.error('Public query error:', error);
        res.status(500).json({
            error: 'Failed to fetch public data',
            details: error.message
        });
    }
});

module.exports = router;