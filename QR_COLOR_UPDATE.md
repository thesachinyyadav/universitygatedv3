# QR Code Color Update - Royal Blue for Students

## ✅ Changes Made

### 1. Database Function Updated
**File:** `DATABASE.sql` (Line 214)
- **Old Color:** `#1e40af` (Standard Blue)
- **New Color:** `#4169E1` (Royal Blue)

The database trigger function now assigns royal blue to all new student registrations.

### 2. PDF Generation Updated
**File:** `components/QRGenerator.tsx`
- Updated student badge color in PDF to Royal Blue RGB: `[65, 105, 225]`
- Updated default fallback color to match
- This ensures PDFs display the correct royal blue border and category badge

### 3. Migration Script Created
**File:** `update-student-color.sql`
- Script to update **existing** student records in the database
- Also includes verification queries

---

## 🚀 How to Apply the Changes

### Step 1: Update the Database Function
Run this SQL command in your database:

```sql
-- Update the function to use Royal Blue
CREATE OR REPLACE FUNCTION set_qr_color()
RETURNS TRIGGER AS $$
BEGIN
  CASE NEW.visitor_category
    WHEN 'student' THEN NEW.qr_color := '#4169E1';   -- Royal Blue
    WHEN 'speaker' THEN NEW.qr_color := '#d97706';   -- Amber
    WHEN 'vip' THEN NEW.qr_color := '#991b1b';       -- Maroon
    ELSE NEW.qr_color := '#4169E1';
  END CASE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Step 2: Update Existing Student Records
Run the migration script:

```bash
# Connect to your database
psql -U postgres -d christ_university_gated

# Run the update script
\i update-student-color.sql
```

Or run directly:
```sql
UPDATE visitors 
SET qr_color = '#4169E1' 
WHERE visitor_category = 'student';
```

### Step 3: Restart the Dev Server
```bash
# Stop current server (Ctrl+C)
# Start again
npm run dev
```

---

## 🎨 Color Comparison

| Category | Old Color | New Color | Hex Code |
|----------|-----------|-----------|----------|
| Student | Standard Blue | **Royal Blue** ✨ | `#4169E1` |
| Speaker | Amber | Amber | `#d97706` |
| VIP | Maroon | Maroon | `#991b1b` |

### Visual Preview:
- **Old Blue** `#1e40af`: ![#1e40af](https://via.placeholder.com/100x30/1e40af/ffffff?text=Old+Blue)
- **New Royal Blue** `#4169E1`: ![#4169E1](https://via.placeholder.com/100x30/4169E1/ffffff?text=Royal+Blue)

---

## 🧪 Testing

### Test 1: New Student Registration
1. Go to visitor registration
2. Register a new student visitor
3. Download the PDF
4. **Expected:** QR code border and badge should be royal blue

### Test 2: Existing Student Records
After running the migration script:
1. Go to retrieve QR page
2. Enter a student visitor's ID/email
3. Download the PDF
4. **Expected:** QR code should now be royal blue

### Test 3: Other Categories
- Speaker → Should still be Amber `#d97706`
- VIP → Should still be Maroon `#991b1b`

---

## 📋 Files Modified

1. ✅ `DATABASE.sql` - Database function for new records
2. ✅ `components/QRGenerator.tsx` - PDF generation colors
3. ✅ `update-student-color.sql` - Migration script (NEW)

---

## 🔄 Rollback (if needed)

If you want to revert to the old blue color:

```sql
-- Rollback to old blue
UPDATE visitors 
SET qr_color = '#1e40af' 
WHERE visitor_category = 'student';

-- Update function
CREATE OR REPLACE FUNCTION set_qr_color()
RETURNS TRIGGER AS $$
BEGIN
  CASE NEW.visitor_category
    WHEN 'student' THEN NEW.qr_color := '#1e40af';
    WHEN 'speaker' THEN NEW.qr_color := '#d97706';
    WHEN 'vip' THEN NEW.qr_color := '#991b1b';
    ELSE NEW.qr_color := '#1e40af';
  END CASE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 💡 Notes

- **New registrations** will automatically get royal blue (no action needed after database update)
- **Existing records** need the migration script
- PDF generation will use the color stored in the database
- QR code scanning is NOT affected (color is cosmetic only)
- The royal blue is more vibrant and stands out better in PDFs

---

**Royal Blue is now applied! 🎓✨**
