# 🎓 Christ University Gated Access Management System

A modern, secure web-based access management system for Christ University campus and events. Features QR code-based visitor registration, real-time verification, role-based dashboards, and event approval workflows.

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [User Roles](#user-roles--permissions)
- [API Endpoints](#api-endpoints)
- [Security](#security-features)
- [Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

---

## ✨ Features

- ✅ **Color-Coded QR System** - Blue (Students), Amber (Speakers), Maroon (VIPs)
- ✅ **Event Approval Workflow** - Organizers request → CSO approves
- ✅ **Bulk QR Generation** - Register multiple speakers/VIPs at once
- ✅ **Real-time Verification** - Instant QR code scanning at gates
- ✅ **PDF Access Passes** - Downloadable branded passes
- ✅ **Mobile Responsive** - Optimized for all devices
- ✅ **Capacity Management** - Automatic tracking
- ✅ **Role-Based Access Control** - 4 user roles with specific permissions

---

## 🛠 Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Next.js API Routes, Supabase (PostgreSQL)
- **Libraries**: jsPDF, qrcode, Next/Image

---

## 📦 Installation

### Prerequisites
- Node.js 18.x or higher
- Supabase account (free tier works)

### Steps

```bash
# 1. Clone repository
git clone <repository-url>
cd christuniversitygated/v1

# 2. Install dependencies
npm install

# 3. Setup environment variables
# Create .env.local file with:
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
NEXT_PUBLIC_APP_URL=http://localhost:3000

# 4. Run development server
npm run dev
```

Access at: `http://localhost:3000`

---

## ⚙️ Configuration

### Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Get credentials from Supabase Dashboard → Project Settings → API

---

## 🗄 Database Setup

1. Create Supabase project at [supabase.com](https://supabase.com)
2. Open SQL Editor in Supabase Dashboard
3. Copy and run SQL from `DATABASE.sql`
4. Verify tables created: `users`, `event_requests`, `events`, `visitors`

### Create Admin Users

```sql
INSERT INTO users (username, password, role, full_name) VALUES
('cso_admin', 'your_secure_password', 'cso', 'CSO Admin'),
('guard1', 'your_secure_password', 'guard', 'Guard 1'),
('organiser1', 'your_secure_password', 'organiser', 'Organiser 1');
```

⚠️ **Important**: Change passwords in production!

---

## 🚀 Running the Application

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

### Access Points
- Homepage: `http://localhost:3000`
- Visitor Registration: `/visitor-register`
- Guard Login: `/login?role=guard`
- Organiser Login: `/login?role=organiser`
- CSO Login: `/login?role=cso`

---

## 👥 User Roles & Permissions

### 1. Visitor (Public - No Login)
- Register for approved events
- Download blue QR code (student category)
- View event details

### 2. Security Guard (`/guard`)
- Scan visitor QR codes
- Verify visitor details
- View scan history
- Real-time verification status

### 3. Event Organiser (`/organiser`)
- Request new events
- View request status (pending/approved/rejected)
- **Bulk QR Generator** for speakers/VIPs
- Generate colored QR codes (Amber: Speaker, Maroon: VIP)
- Download multiple PDF passes

### 4. Chief Security Officer (`/cso`)
- View all event requests
- Approve or reject events
- View all visitors and statistics
- System-wide oversight

---

## 🔌 API Endpoints

### Public

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/registerVisitor` | POST | Register new visitor |
| `/api/verifyVisitor` | GET | Verify visitor by ID |
| `/api/approved-events` | GET | Get approved events list |

### Protected

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/login` | POST | User authentication |
| `/api/event-requests` | GET/POST | Event request management |
| `/api/cso/approve-event` | POST | Approve/reject events |
| `/api/visitors` | GET | Get all visitors |
| `/api/updateStatus` | POST | Update visitor status |

---

## 🔒 Security Features

- ✅ Role-based access control (RBAC)
- ✅ Session management
- ✅ Protected API routes
- ✅ Supabase Row Level Security
- ✅ Input validation
- ✅ SQL injection prevention
- ✅ XSS protection
- ✅ UUID-based unique IDs
- ✅ HTTPS in production

---

## 🚢 Production Deployment

### Vercel (Recommended)

1. Push to GitHub:
```bash
git push origin main
```

2. Import to Vercel:
   - Go to [vercel.com](https://vercel.com)
   - Import repository
   - Add environment variables
   - Deploy

3. Set Environment Variables in Vercel:
```
NEXT_PUBLIC_SUPABASE_URL=your_production_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_key
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

### Pre-Deployment Checklist

- [ ] Change all default passwords
- [ ] Update environment variables
- [ ] Test all user flows
- [ ] Enable Supabase RLS policies
- [ ] Test QR code generation
- [ ] Verify PDF downloads
- [ ] Test mobile responsiveness

---

## 📖 Feature Documentation

### QR Code System

**Color Coding**:
- 🔵 Blue (#1e40af) - Students
- 🟠 Amber (#d97706) - Speakers  
- 🔴 Maroon (#991b1b) - VIPs

**PDF Access Pass Includes**:
- Visitor name and category
- Event details and dates
- Colored QR code (86x86mm)
- University branding

### Event Workflow

```
Organiser → Submit Event Request
    ↓
CSO → Review and Approve/Reject
    ↓
Approved Event → Appears in Public Portal
    ↓
Visitors Register (Public) OR Organiser Bulk Registers (Speakers/VIPs)
    ↓
QR Codes Generated
    ↓
Guards Verify at Gate
```

### Bulk QR Generation

For event speakers and VIPs:
1. Select approved event
2. Add multiple visitors (name, email, category)
3. Generate all QR codes
4. Navigate carousel and download each PDF

---

## 🐛 Troubleshooting

### QR Code Not Generating
- Check `NEXT_PUBLIC_APP_URL` is correct
- Verify visitor exists in database
- Install jsPDF: `npm install jspdf`

### Database Connection Failed
- Verify Supabase credentials
- Check Supabase project is active
- Run `DATABASE.sql` schema

### Bulk QR Fails
- Ensure event is approved by CSO
- Check event exists in database
- View console logs with `[BULK QR]` prefix

### PDF Download Not Working
- Check browser pop-up blocker
- Wait for QR to fully load
- Check console for `[PDF_DOWNLOAD]` logs

### Login Fails
- Verify user exists in `users` table
- Check role matches login page
- Passwords are case-sensitive

---

## 📱 Mobile Optimization

- ✅ Touch-friendly buttons (44x44px)
- ✅ Responsive typography
- ✅ Stack layouts on small screens
- ✅ Compact padding
- ✅ Mobile-optimized scanner

**Breakpoints**:
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

---

## 🎨 Customization

### Branding
- Replace `/public/christunilogo.png`
- Replace `/public/christunifavcion.png`
- Update colors in `tailwind.config.ts`

### Features
- Modify PDF layout in `QRGenerator.tsx`
- Customize event workflow in `cso.tsx`
- Add fields to registration form

---

## 📊 Database Schema

See `DATABASE.sql` for complete schema

**Tables**:
- `users` - System users
- `event_requests` - Event requests from organisers
- `events` - Approved events
- `visitors` - Registered visitors

**Triggers**:
- `set_qr_color_on_insert` - Auto-assigns QR color
- `increment_event_registrations` - Updates capacity

---

## 🎯 Quick Start

```bash
# Install
npm install

# Setup .env.local with Supabase credentials

# Run DATABASE.sql in Supabase

# Start development
npm run dev

# Test at http://localhost:3000
```

---

## 📄 License

Copyright © 2025 Christ University. All rights reserved.

---

## 🤝 Support

- Documentation: This README
- SQL Reference: DATABASE.sql
- Email: security@christuniversity.in

---

**Version 1.0.0 - Production Ready**  
**Last Updated**: October 9, 2025  
**Built for Christ University** ❤️
# universitygated
