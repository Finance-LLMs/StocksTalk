// Test the URL generation functionality
const query = `Market Capitalization > 30000 AND 
Price to earning > 15 AND 
Return on capital employed > 22% AND
Return on equity > 20 AND 
Debt to equity < 1`;

function convertSqlToScreenerUrl(sqlQuery) {
    try {
        // Encode the query for URL
        const encodedQuery = encodeURIComponent(sqlQuery.replace(/\r?\n/g, '%0D%0A'));
        
        // Use the screen/raw format as provided
        const baseUrl = `https://www.screener.in/screen/raw/`;
        return `${baseUrl}?sort=&order=&source_id=&query=${encodedQuery}`;
        
    } catch (error) {
        console.error('Error converting SQL to Screener URL:', error);
        return `https://www.screener.in/screen/raw/?query=${encodeURIComponent(sqlQuery)}`;
    }
}

const generatedUrl = convertSqlToScreenerUrl(query);
console.log('Generated URL:');
console.log(generatedUrl);

console.log('\nExpected URL format:');
console.log('https://www.screener.in/screen/raw/?sort=&order=&source_id=&query=Market+Capitalization+%3E+30000+AND+%0D%0APrice+to+earning+%3E+15+AND+%0D%0AReturn+on+capital+employed+%3E+22%25+AND%0D%0AReturn+on+equity+%3E+20+AND+%0D%0ADebt+to+equity+%3C+1');

console.log('\nDecoded query from generated URL:');
const urlObj = new URL(generatedUrl);
console.log(decodeURIComponent(urlObj.searchParams.get('query')));