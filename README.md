# Screener.in Query Interface

A web interface that uses Firecrawl to query Screener.in with SQL-like syntax and display stock screening results in a beautiful dashboard.

## Features

- 🔍 **SQL-like Query Interface**: Enter queries in natural SQL format
- 🌐 **Firecrawl Integration**: Automatically scrapes Screener.in results
- 📊 **Multiple View Modes**: Table view, raw data, and markdown
- 📱 **Responsive Design**: Works on desktop and mobile
- ⚡ **Real-time Results**: Get live data from Screener.in

## Setup Instructions

### 1. Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firecrawl API key

### 2. Get Firecrawl API Key

1. Go to [Firecrawl.dev](https://firecrawl.dev)
2. Sign up for an account
3. Get your API key from the dashboard

### 3. Installation

1. **Clone or navigate to the project directory**
   ```bash
   cd "c:\Users\Akshat\Desktop\Screener"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   copy .env.example .env
   ```
   
   Then edit the `.env` file and add your Firecrawl API key:
   ```
   FIRECRAWL_API_KEY=your_actual_firecrawl_api_key_here
   PORT=3000
   ```

4. **Start the server**
   ```bash
   npm start
   ```
   
   For development with auto-restart:
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## Usage

### Example Query Format

```sql
Market Capitalization > 30000 AND 
Price to earning > 15 AND 
Return on capital employed > 22% AND
Return on equity > 20 AND 
Debt to equity < 1
```

### Supported Query Parameters

- **Market Capitalization**: `Market Capitalization > value`
- **Price to Earning**: `Price to earning > value`
- **Return on Capital Employed**: `Return on capital employed > value%`
- **Return on Equity**: `Return on equity > value`
- **Debt to Equity**: `Debt to equity < value`

### Query Operators

- `>` (greater than)
- `<` (less than)
- `AND` (combine conditions)

## API Endpoints

### POST `/api/screener/query`
Execute a stock screening query.

**Request Body:**
```json
{
    "sqlQuery": "Market Capitalization > 30000 AND Price to earning > 15"
}
```

**Response:**
```json
{
    "success": true,
    "query": "Market Capitalization > 30000 AND Price to earning > 15",
    "screenerUrl": "https://www.screener.in/screen/raw/...",
    "data": {
        "rawHtml": "...",
        "markdown": "...",
        "tableData": [...],
        "metadata": {...}
    }
}
```

### GET `/api/screener/test`
Test Firecrawl API connection.

## Project Structure

```
screener-firecrawl-interface/
├── public/
│   ├── index.html          # Main HTML file
│   ├── styles.css          # CSS styles
│   └── script.js           # Frontend JavaScript
├── routes/
│   └── screener.js         # API routes
├── server.js               # Express server
├── package.json            # Dependencies
├── .env.example           # Environment variables template
└── README.md              # This file
```

## Important Note: Authentication Required

⚠️ **Screener.in requires login to access detailed screening results.** The interface now provides multiple options to handle this:

### Access Options

1. **🔓 Public Access**: Limited data from publicly accessible pages
2. **🔐 Authenticated Access**: Full screening results using your Screener.in credentials
3. **🔗 Manual Access**: Generated query URLs that you can open directly in Screener.in

### Getting Screener.in Account

If you don't have a Screener.in account:

1. Visit [Screener.in Registration](https://www.screener.in/register/)
2. Create a free account
3. Use your credentials in the "🔐 Use Screener.in Account" option

## Troubleshooting

### Common Issues

1. **"Authentication Required"**
   - This is expected behavior - Screener.in requires login for detailed results
   - Use the "🔐 Use Screener.in Account" button to authenticate
   - Or create a free account at Screener.in
   - You can also click the generated URL to view results manually

2. **"Firecrawl API key not configured"**
   - Make sure you've created a `.env` file
   - Verify your API key is correct
   - Restart the server after adding the API key

3. **"Authentication failed"**
   - Double-check your Screener.in email and password
   - Make sure your Screener.in account is active
   - Try logging in directly on Screener.in first

4. **"Failed to scrape Screener.in"**
   - Check your internet connection
   - Verify Firecrawl service is working with the test button
   - The Screener.in website structure might have changed

5. **No table data showing**
   - Try using authenticated access for better results
   - The website structure might have changed
   - Check the raw data tab to see what was scraped
   - Use the generated URL to check results manually

### Development Mode

For development with automatic restarts:

```bash
npm install -g nodemon
npm run dev
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

If you encounter any issues:

1. Check the troubleshooting section above
2. Verify your Firecrawl API key is working
3. Test with the example query first
4. Check browser console for errors

---

**Note**: This tool is for educational and research purposes. Please respect Screener.in's terms of service and use responsibly.