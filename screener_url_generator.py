import urllib.parse
import re

def convert_sql_to_screener_url(sql_query):
    """
    Convert SQL-like query to Screener.in URL format
    
    Args:
        sql_query (str): SQL-like query string (e.g., "Market Capitalization > 30000 AND Price to earning > 15")
    
    Returns:
        str: Formatted Screener.in URL
    """
    try:
        # Handle line breaks - convert to %0D%0A format for Screener.in
        query_with_breaks = sql_query.replace('\n', '\r\n')
        
        # URL encode the entire query
        encoded_query = urllib.parse.quote_plus(query_with_breaks)
        
        # Replace %0D%0A (which comes from \r\n) with the specific format Screener.in expects
        # This handles the line breaks properly
        encoded_query = encoded_query.replace('%0D%0A', '%0D%0A')
        
        # Base Screener.in URL with the screen/raw endpoint
        base_url = "https://www.screener.in/screen/raw/"
        
        # Construct the final URL with the required parameters
        final_url = f"{base_url}?sort=&order=&source_id=&query={encoded_query}"
        
        return final_url
        
    except Exception as e:
        print(f"Error converting SQL to Screener URL: {e}")
        # Fallback: simple encoding
        simple_encoded = urllib.parse.quote_plus(sql_query)
        return f"https://www.screener.in/screen/raw/?query={simple_encoded}"

def generate_screener_url_from_conditions(conditions):
    """
    Generate Screener.in URL from a dictionary of conditions
    
    Args:
        conditions (dict): Dictionary with screening conditions
                          e.g., {
                              'market_cap': {'operator': '>', 'value': 30000},
                              'pe_ratio': {'operator': '>', 'value': 15},
                              'roce': {'operator': '>', 'value': 22, 'unit': '%'},
                              'roe': {'operator': '>', 'value': 20},
                              'debt_to_equity': {'operator': '<', 'value': 1}
                          }
    
    Returns:
        str: Formatted Screener.in URL
    """
    # Mapping from condition keys to Screener.in field names
    field_mapping = {
        'market_cap': 'Market Capitalization',
        'pe_ratio': 'Price to earning',
        'roce': 'Return on capital employed',
        'roe': 'Return on equity',
        'debt_to_equity': 'Debt to equity',
        'current_ratio': 'Current ratio',
        'debt_to_assets': 'Debt to assets',
        'interest_coverage': 'Interest coverage ratio',
        'dividend_yield': 'Dividend yield',
        'book_value': 'Book value per share',
        'sales_growth': 'Sales growth',
        'profit_growth': 'Profit growth',
        'peg_ratio': 'PEG ratio'
    }
    
    query_parts = []
    
    for key, condition in conditions.items():
        if key in field_mapping:
            field_name = field_mapping[key]
            operator = condition.get('operator', '>')
            value = condition.get('value')
            unit = condition.get('unit', '')
            
            if value is not None:
                query_part = f"{field_name} {operator} {value}{unit}"
                query_parts.append(query_part)
    
    # Join conditions with " AND \n"
    sql_query = " AND \n".join(query_parts)
    
    return convert_sql_to_screener_url(sql_query)

def parse_sql_query_to_conditions(sql_query):
    """
    Parse SQL-like query string into structured conditions
    
    Args:
        sql_query (str): SQL-like query string
    
    Returns:
        list: List of parsed conditions
    """
    conditions = []
    
    # Split by AND and clean up
    parts = [part.strip() for part in sql_query.split(' AND ')]
    
    for part in parts:
        # Match pattern: "Field operator value"
        match = re.match(r'(.+?)\s*([><=]+)\s*(.+)', part, re.IGNORECASE)
        if match:
            field = match.group(1).strip()
            operator = match.group(2).strip()
            value = match.group(3).strip()
            
            conditions.append({
                'field': field,
                'operator': operator,
                'value': value,
                'raw': part
            })
    
    return conditions

# Example usage and test cases
def test_url_generation():
    """Test the URL generation with various examples"""
    
    print("=== Screener.in URL Generator Tests ===\n")
    
    # Test 1: Basic SQL query
    sql_query1 = """Market Capitalization > 30000 AND 
Price to earning > 15 AND 
Return on capital employed > 22% AND
Return on equity > 20 AND 
Debt to equity < 1"""
    
    url1 = convert_sql_to_screener_url(sql_query1)
    print("Test 1 - Multi-line SQL Query:")
    print("Input:", repr(sql_query1))
    print("Generated URL:", url1)
    print()
    
    # Test 2: Single line query
    sql_query2 = "Market Capitalization > 50000 AND Price to earning < 25 AND Return on equity > 15"
    url2 = convert_sql_to_screener_url(sql_query2)
    print("Test 2 - Single line SQL Query:")
    print("Input:", sql_query2)
    print("Generated URL:", url2)
    print()
    
    # Test 3: Using structured conditions
    conditions = {
        'market_cap': {'operator': '>', 'value': 10000},
        'pe_ratio': {'operator': '<', 'value': 30},
        'roce': {'operator': '>', 'value': 15, 'unit': '%'},
        'roe': {'operator': '>', 'value': 12},
        'debt_to_equity': {'operator': '<', 'value': 0.5}
    }
    
    url3 = generate_screener_url_from_conditions(conditions)
    print("Test 3 - Structured Conditions:")
    print("Input:", conditions)
    print("Generated URL:", url3)
    print()
    
    # Test 4: Parse existing query
    parsed = parse_sql_query_to_conditions(sql_query1)
    print("Test 4 - Parsed Conditions:")
    print("Original:", sql_query1.replace('\n', ' '))
    print("Parsed conditions:")
    for i, condition in enumerate(parsed, 1):
        print(f"  {i}. Field: '{condition['field']}', Operator: '{condition['operator']}', Value: '{condition['value']}'")
    print()

if __name__ == "__main__":
    import sys
    
    # Read SQL query from stdin when called from Node.js
    if not sys.stdin.isatty():
        sql_query = sys.stdin.read().strip()
        if sql_query:
            url = convert_sql_to_screener_url(sql_query)
            print(url)
            sys.exit(0)
    
    # Interactive mode for manual testing
    # Run tests
    test_url_generation()
    
    # Interactive example
    print("=== Interactive Example ===")
    print("You can use this function in your Python code like this:")
    print()
    print("from screener_url_generator import convert_sql_to_screener_url")
    print()
    print("query = '''Market Capitalization > 30000 AND")
    print("Price to earning > 15 AND")
    print("Return on capital employed > 22% AND")
    print("Return on equity > 20 AND")
    print("Debt to equity < 1'''")
    print()
    print("url = convert_sql_to_screener_url(query)")
    print("print(url)")