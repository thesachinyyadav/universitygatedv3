import csv
import uuid
import re
from datetime import datetime

def generate_uuid():
    return str(uuid.uuid4())

def clean_phone(phone_str):
    """Remove all non-digits, take last 10 if >10 digits, return null if <10"""
    if not phone_str:
        return None
    # Remove all non-digit characters
    digits = re.sub(r'\D', '', str(phone_str))
    if len(digits) > 10:
        digits = digits[-10:]
    if len(digits) < 10:
        return None
    return digits

def parse_accompanying_count(companion_str):
    """Count distinct people in companion field"""
    if not companion_str or not companion_str.strip():
        return '0'
    
    text = companion_str.strip().lower()
    
    # Check for explicit "no one", "none", "0", "alone", "-", "."
    if text in ['no one', 'none', '0', 'alone', '-', '.']:
        return '0'
    
    # Remove parentheses content
    text = re.sub(r'\([^)]*\)', '', text)
    
    # Split by various delimiters
    text = re.sub(r'[,;&\n]+', '|', text)
    text = re.sub(r'\s+and\s+', '|', text)
    text = re.sub(r'\s+-\s+', '|', text)
    
    parts = [p.strip() for p in text.split('|') if p.strip()]
    
    # Role words to ignore
    role_words = {'father', 'mother', 'sister', 'brother', 'friend', 'cousin', 
                  'elder sister', 'dad', 'mom', 'husband', 'wife', 'classmate',
                  'grandfather', 'grandmother'}
    
    count = 0
    for part in parts:
        part_lower = part.lower()
        # Skip if it's just a role word
        if part_lower in role_words:
            continue
        # Otherwise count it as a person
        count += 1
    
    return str(count)

def parse_area_of_interest(interest_str):
    """Parse comma-separated interests into JSON array"""
    if not interest_str or not interest_str.strip():
        return '[]'
    
    interests = [i.strip() for i in interest_str.split(',') if i.strip()]
    
    # Escape quotes and create JSON array
    escaped = ['"{}"'.format(i.replace('"', '\\"')) for i in interests]
    return '[{}]'.format(','.join(escaped))

def parse_date(date_str):
    """Parse date like 'Sunday 30th November 2025' to '2025-11-30'"""
    if not date_str:
        return None
    
    # Extract components using regex
    match = re.search(r'(\d+)(?:st|nd|rd|th)\s+(\w+)\s+(\d{4})', date_str)
    if not match:
        return None
    
    day = match.group(1)
    month_name = match.group(2)
    year = match.group(3)
    
    # Convert month name to number
    months = {
        'january': '01', 'february': '02', 'march': '03', 'april': '04',
        'may': '05', 'june': '06', 'july': '07', 'august': '08',
        'september': '09', 'october': '10', 'november': '11', 'december': '12'
    }
    
    month_num = months.get(month_name.lower())
    if not month_num:
        return None
    
    return f"{year}-{month_num}-{day.zfill(2)}"

def escape_sql_string(s):
    """Escape single quotes by doubling them"""
    if s is None:
        return None
    return str(s).replace("'", "''")

def validate_email(email):
    """Basic email validation, return None if invalid"""
    if not email or not email.strip():
        return None
    email = email.strip().lower()
    # Basic email pattern
    if re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
        return email
    return None

# Read CSV and process
csv_file = r'd:\BCA\christuniversitygated\v3\ConfirmationMail _Openday 2025_November (1).csv'

sql_statements = []

with open(csv_file, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    rows = list(reader)[:100]  # First 100 rows only
    
    for row in rows:
        # Generate UUID
        visitor_id = generate_uuid()
        
        # Extract and transform fields
        name = escape_sql_string(row['Name'].strip() if row['Name'] else '')
        email = validate_email(row['EmailID'])
        email_str = f"'{email}'" if email else 'null'
        
        phone = clean_phone(row['Mobile'])
        phone_str = f"'{phone}'" if phone else 'null'
        
        accompanying_count = parse_accompanying_count(row['Column E'])
        
        date_from = parse_date(row['Visit Date'])
        date_to = date_from  # Same date for both
        date_from_str = f"'{date_from}'" if date_from else 'null'
        date_to_str = f"'{date_to}'" if date_to else 'null'
        
        area_of_interest = escape_sql_string(parse_area_of_interest(row['Interest']))
        
        # Build SQL INSERT statement
        sql = f"""INSERT INTO "public"."visitors" ("id","name","email","phone","register_number","event_id","event_name","visitor_category","qr_color","qr_code","purpose","area_of_interest","photo_url","accompanying_count","date_of_visit_from","date_of_visit_to","status","has_arrived","arrived_at","checked_in_by","created_at","updated_at") VALUES ('{visitor_id}','{name}',{email_str},{phone_str},null,'65fe748f-4b3b-4eab-8b3f-b8215b2a6b5c','OPEN DAY 1','student','blue',null,'','{area_of_interest}',null,'{accompanying_count}',{date_from_str},{date_to_str},'approved','false',null,null,'2025-11-26 00:00:00+00','2025-11-26 00:00:00+00');"""
        
        sql_statements.append(sql)

# Write to output file
output_file = r'd:\BCA\christuniversitygated\v3\generated_sql_output.txt'
with open(output_file, 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql_statements))

print(f"Generated {len(sql_statements)} SQL INSERT statements")
print(f"Output written to: {output_file}")
