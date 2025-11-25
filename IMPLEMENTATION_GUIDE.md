# Implementation Guide for Christ University Gated Access System

This guide helps you apply the new components and features to the remaining pages of the application.

## 📚 Quick Reference

### Import UI Components

```typescript
import { 
  Button, 
  Input, 
  Select, 
  Card, 
  Modal, 
  Badge, 
  Skeleton,
  useToast 
} from '@/components/ui';
```

### Import Utilities

```typescript
import { 
  validateEmail, 
  validatePhone, 
  validateName,
  formatPhoneNumber,
  formatDate,
  formatRelativeTime 
} from '@/lib/utils';
```

### Import Constants

```typescript
import { 
  QR_COLORS, 
  VISITOR_CATEGORIES, 
  USER_ROLES, 
  STATUS_TYPES,
  API_ENDPOINTS 
} from '@/lib/constants';
```

---

## 🔄 Migration Guide

### Converting Forms

**Before:**
```tsx
<input
  type="text"
  name="email"
  className="input-field"
  placeholder="Email"
/>
```

**After:**
```tsx
<Input
  label="Email Address"
  name="email"
  type="email"
  value={formData.email}
  onChange={handleChange}
  error={errors.email}
  placeholder="Enter your email"
  leftIcon={<EmailIcon />}
  required
/>
```

### Converting Buttons

**Before:**
```tsx
<button 
  className="btn-primary"
  disabled={loading}
>
  Submit
</button>
```

**After:**
```tsx
<Button
  variant="primary"
  size="lg"
  isLoading={loading}
  leftIcon={<SubmitIcon />}
>
  Submit
</Button>
```

### Adding Validation

```typescript
const [formData, setFormData] = useState({ email: '', phone: '' });
const [errors, setErrors] = useState<Record<string, string>>({});

const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const { name, value } = e.target;
  setFormData(prev => ({ ...prev, [name]: value }));
  
  // Clear error on change
  if (errors[name]) {
    setErrors(prev => ({ ...prev, [name]: '' }));
  }
};

const validateForm = (): boolean => {
  const newErrors: Record<string, string> = {};
  
  const emailValidation = validateEmail(formData.email);
  if (!emailValidation.isValid) {
    newErrors.email = emailValidation.error || '';
  }
  
  const phoneValidation = validatePhone(formData.phone);
  if (!phoneValidation.isValid) {
    newErrors.phone = phoneValidation.error || '';
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!validateForm()) {
    showToast('Please fix form errors', 'error');
    return;
  }
  
  // Submit logic...
};
```

### Adding Toast Notifications

```typescript
const { showToast } = useToast();

// Success
showToast('Registration successful!', 'success');

// Error
showToast('Something went wrong', 'error');

// Warning
showToast('Please review your information', 'warning');

// Info
showToast('Event will start in 1 hour', 'info');
```

---

## 🎯 Priority Pages to Enhance

### 1. Visitor Registration Page (`/visitor-register`)

**Current State:** Uses basic HTML inputs
**Enhancement Needed:**
- Replace inputs with `Input` component
- Add real-time validation
- Add progress indicator for multi-step form
- Add toast notifications
- Improve camera capture UI

**Example:**
```tsx
// Step 1: Event Selection
<Select
  label="Select Event"
  options={events.map(e => ({ value: e.id, label: e.name }))}
  value={selectedEvent}
  onChange={(e) => setSelectedEvent(e.target.value)}
  error={errors.event}
/>

// Step 2: Personal Info
<Input
  label="Full Name"
  name="name"
  value={formData.name}
  onChange={handleChange}
  error={errors.name}
  leftIcon={<UserIcon />}
/>

// Submit Button
<Button
  variant="primary"
  size="lg"
  fullWidth
  isLoading={isSubmitting}
  leftIcon={<QRIcon />}
>
  Generate QR Code
</Button>
```

### 2. Guard Dashboard (`/guard`)

**Current State:** Basic verification interface
**Enhancement Needed:**
- Add `QuickActionCard` for main actions
- Add `StatsCard` for daily statistics
- Enhance verification result display with `Card`
- Add loading states with `Skeleton`
- Add toast notifications for scan results

**Example:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <QuickActionCard
    icon={<ScanIcon />}
    title="Scan QR Code"
    description="Verify visitor entry"
    onClick={() => setShowScanner(true)}
  />
  
  <StatsCard
    title="Today's Scans"
    value={stats.totalScans}
    change="+12%"
    trend="up"
    icon={<TrendIcon />}
  />
  
  <StatsCard
    title="Access Granted"
    value={`${stats.granted}%`}
    icon={<CheckIcon />}
  />
</div>
```

### 3. Organiser Dashboard (`/organiser`)

**Current State:** Event management interface
**Enhancement Needed:**
- Add `QuickActionCard` for common actions
- Improve event request form with new components
- Add `Modal` for bulk QR generation
- Add `Badge` for event status
- Add loading states

**Example:**
```tsx
// Event Status Badge
<Badge variant="success" dot>
  Approved
</Badge>

// Event Request Form in Modal
<Modal
  isOpen={showRequestModal}
  onClose={() => setShowRequestModal(false)}
  title="Request New Event"
>
  <form onSubmit={handleSubmit}>
    <Input
      label="Event Name"
      name="eventName"
      value={formData.eventName}
      onChange={handleChange}
      error={errors.eventName}
    />
    
    <Input
      label="Expected Attendees"
      name="capacity"
      type="number"
      value={formData.capacity}
      onChange={handleChange}
      error={errors.capacity}
    />
    
    <Button variant="primary" type="submit" fullWidth>
      Submit Request
    </Button>
  </form>
</Modal>
```

### 4. CSO Dashboard (`/cso`)

**Current State:** Admin oversight interface
**Enhancement Needed:**
- Add `StatsCard` for system overview
- Improve event approval UI with `Card` and `Modal`
- Add `ConfirmModal` for approve/reject actions
- Add filtering and search
- Add toast notifications

**Example:**
```tsx
// Stats Overview
<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
  <StatsCard
    title="Total Events"
    value={stats.totalEvents}
    icon={<EventIcon />}
  />
  
  <StatsCard
    title="Pending Approvals"
    value={stats.pendingApprovals}
    change="3 new"
    icon={<ClockIcon />}
  />
</div>

// Approve/Reject Confirmation
<ConfirmModal
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  onConfirm={handleApprove}
  title="Approve Event?"
  message={`Are you sure you want to approve "${selectedEvent?.name}"?`}
  confirmText="Approve"
  type="info"
/>
```

---

## 🎨 Design Patterns

### Page Layout Pattern

```tsx
export default function PageName() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Page Title
          </h1>
          <p className="text-gray-600">
            Page description
          </p>
        </div>
        
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <QuickActionCard {...} />
        </div>
        
        {/* Main Content */}
        {loading ? (
          <Skeleton count={3} />
        ) : (
          <Card>
            {/* Content */}
          </Card>
        )}
      </div>
    </div>
  );
}
```

### Form Pattern

```tsx
function FormComponent() {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  const validateForm = (): boolean => {
    // Validation logic
    return true;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showToast('Please fix form errors', 'error');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // API call
      showToast('Success!', 'success');
    } catch (error) {
      showToast('Error occurred', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input {...} />
      <Button type="submit" isLoading={isSubmitting}>
        Submit
      </Button>
    </form>
  );
}
```

---

## 🔍 Testing Checklist

When implementing changes:

- [ ] Component renders correctly on mobile
- [ ] Form validation works as expected
- [ ] Toast notifications appear and dismiss
- [ ] Loading states display properly
- [ ] Keyboard navigation works
- [ ] Focus indicators are visible
- [ ] Error messages are helpful
- [ ] Success feedback is clear
- [ ] Accessibility labels are present

---

## 📝 Code Style Guidelines

1. **Component Structure:**
   - Props at top
   - State declarations
   - Effects
   - Handlers
   - Render

2. **Naming Conventions:**
   - Components: PascalCase
   - Functions: camelCase
   - Constants: UPPER_SNAKE_CASE
   - Files: kebab-case or PascalCase

3. **TypeScript:**
   - Always type props
   - Use interfaces for complex types
   - Avoid `any` when possible

4. **Accessibility:**
   - Always include labels
   - Add ARIA labels when needed
   - Ensure keyboard navigation
   - Test with screen readers

---

## 🚀 Quick Wins

Start with these easy improvements:

1. **Replace all buttons** with the `Button` component
2. **Add toast notifications** to all form submissions
3. **Use `Badge`** for all status displays
4. **Add loading states** with `Skeleton` or `isLoading`
5. **Use `formatDate`** for all date displays
6. **Use `formatPhoneNumber`** for phone displays

---

## 💡 Tips

- Import from `@/components/ui` for all UI components
- Use `showToast` for user feedback instead of alerts
- Always validate forms before submission
- Use constants instead of hardcoded values
- Add loading states for all async operations
- Test on mobile devices regularly
- Keep components small and focused
- Document complex logic with comments

---

## 📞 Need Help?

Refer to:
- `README-ENHANCED.md` for full documentation
- Component files for usage examples
- `lib/utils` for available utilities
- `lib/constants.ts` for configuration values

---

**Happy Coding! Let's make this app production-ready!** 🎉
