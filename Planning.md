# Technical Planning Document
## Beacon Blast - API Integration Phase

**Version**: 1.0  
**Date**: October 29, 2025  
**Phase**: Frontend-Backend Integration  
**Target Completion**: November 5, 2025

---

## 🎯 Integration Goals

### Primary Objective
Connect the fully-functional backend API with the complete frontend UI to create a working end-to-end email marketing platform.

### Key Results
1. All frontend pages successfully call backend endpoints
2. Campaign creation → sending → tracking pipeline operational
3. Dashboard displays real-time analytics
4. Authentication flow tested and secure
5. Zero critical bugs in core user workflows

---

## 🏗️ System Architecture Overview

### **Technology Stack**

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
│  React 18 + TypeScript + Vite + Tailwind + Shadcn/UI       │
│  Port: 5173 | API Client: fetch + JWT tokens                │
└─────────────────────────────────────────────────────────────┘
                              ↕ HTTP/JSON
┌─────────────────────────────────────────────────────────────┐
│                         API Layer                            │
│  Flask 2.3.3 + Flask-JWT-Extended + Flask-CORS              │
│  Port: 5001 | Base URL: http://localhost:5001/api           │
└─────────────────────────────────────────────────────────────┘
                              ↕ SQLAlchemy ORM
┌─────────────────────────────────────────────────────────────┐
│                       Database Layer                         │
│  PostgreSQL (production) | SQLite (development)             │
│  Models: User, Campaign, Contact, EmailLog, SMTPConfig      │
└─────────────────────────────────────────────────────────────┘
                              ↕ SMTP Protocol
┌─────────────────────────────────────────────────────────────┐
│                      Email Services                          │
│  Gmail, Outlook, Yahoo, Custom SMTP                         │
│  Tracking: Open pixels, Click links, Bounce detection       │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Integration Plan - Phase by Phase

### **Phase 1: Foundation Setup** ⏱️ 2 hours

#### Step 1.1: Create Planning Documents ✅
- [x] PRD.md - Product requirements
- [x] Task.md - Task breakdown
- [x] Planning.md - Technical plan

#### Step 1.2: Environment Verification
**Actions**:
```bash
# Backend setup
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py  # Should start on port 5001

# Frontend setup (separate terminal)
cd ..
npm install
npm run dev  # Should start on port 5173
```

**Verification Checklist**:
- [ ] Backend running: `http://localhost:5001/api/health`
- [ ] Frontend running: `http://localhost:5173`
- [ ] Database migrations applied
- [ ] Scheduler started (check console logs)
- [ ] CORS configured for localhost:5173

---

### **Phase 2: API Client Architecture** ⏱️ 3 hours

#### Step 2.1: Create TypeScript Interfaces
**File**: `src/lib/api.ts`

**Interfaces to Add**:
```typescript
// Campaign interfaces
export interface Campaign {
  id: number;
  name: string;
  subject: string;
  sender_name: string;
  sender_email: string;
  reply_to: string;
  html_content: string;
  text_content: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  total_recipients: number;
  emails_sent: number;
  emails_opened: number;
  emails_clicked: number;
  emails_bounced: number;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
  created_at: string;
  scheduled_at?: string;
  sent_at?: string;
}

export interface CampaignCreateData {
  name: string;
  subject: string;
  sender_name?: string;
  sender_email: string;
  reply_to?: string;
  email_content: string;  // html_content
  text_content?: string;
  recipients?: string;  // comma-separated emails
  send_immediately?: boolean;
  scheduled_at?: string;
}

export interface CampaignSendResponse {
  success: boolean;
  message: string;
  sent_count: number;
  failed_count: number;
  total_recipients: number;
}

export interface TestEmailData {
  subject: string;
  sender_name?: string;
  sender_email: string;
  test_email: string;
  email_content: string;
}
```

#### Step 2.2: Create campaignsAPI Object
**File**: `src/lib/api.ts`

**Implementation**:
```typescript
export const campaignsAPI = {
  // Get all campaigns (filtered by user role)
  getCampaigns: () => {
    return apiRequest<{
      success: boolean;
      campaigns: Campaign[];
      total: number;
    }>('/campaigns');
  },

  // Get single campaign by ID
  getCampaign: (id: number) => {
    return apiRequest<{
      success: boolean;
      campaign: Campaign;
    }>(`/campaigns/${id}`);
  },

  // Create new campaign
  createCampaign: (data: CampaignCreateData) => {
    return apiRequest<{
      success: boolean;
      message: string;
      campaign_id: number;
    }>('/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update existing campaign
  updateCampaign: (id: number, data: Partial<CampaignCreateData>) => {
    return apiRequest<{
      success: boolean;
      message: string;
    }>(`/campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete campaign
  deleteCampaign: (id: number, force: boolean = false) => {
    return apiRequest<{
      success: boolean;
      message: string;
    }>(`/campaigns/${id}${force ? '?force=true' : ''}`, {
      method: 'DELETE',
    });
  },

  // Send campaign
  sendCampaign: (id: number, forceSend: boolean = false) => {
    return apiRequest<CampaignSendResponse>(`/campaigns/${id}/send`, {
      method: 'POST',
      body: JSON.stringify({ force_send: forceSend }),
    });
  },

  // Send test email
  sendTestEmail: (data: TestEmailData) => {
    return apiRequest<{
      success: boolean;
      message: string;
    }>('/campaigns/test-email', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
```

**Testing**:
- [ ] TypeScript compilation passes
- [ ] No type errors in VSCode
- [ ] Export statements correct

---

### **Phase 3: Dashboard Integration** ⏱️ 2 hours

#### Step 3.1: Fix Dashboard Data Structure
**File**: `src/pages/Dashboard.tsx`

**Current Issues**:
```typescript
// ❌ Frontend expects (WRONG):
dashboardData.email_trend
dashboardData.campaigns_trend
dashboardData.total_delivered
dashboardData.active_campaigns
dashboardData.delivery_rate

// ✅ Backend provides (CORRECT):
data.total_campaigns
data.total_emails_sent
data.total_emails_opened
data.total_emails_clicked
data.email_open_rate
data.email_click_rate
data.recent_campaigns
```

**Implementation Steps**:
1. Update `dashboardAPI.getStats()` TypeScript interface
2. Modify Dashboard component to use correct field names
3. Update chart data mappings
4. Remove references to non-existent fields
5. Test with live data

**Code Changes**:
```typescript
// Update API response interface
export const dashboardAPI = {
  getStats: () => {
    return apiRequest<{
      success: boolean;
      data: {
        total_users: number;
        total_contacts: number;
        active_contacts: number;
        unsubscribed_contacts: number;
        bounced_contacts: number;
        total_campaigns: number;
        total_emails_sent: number;
        total_emails_opened: number;
        total_emails_clicked: number;
        total_emails_bounced: number;
        email_open_rate: number;
        email_click_rate: number;
        email_bounce_rate: number;
        recent_campaigns: Array<{
          id: number;
          name: string;
          status: string;
          emails_sent: number;
          emails_opened: number;
          emails_clicked: number;
          open_rate: number;
          click_rate: number;
          created_at: string;
          scheduled_at?: string;
        }>;
      };
    }>('/dashboard/stats');
  },
};

// Update Dashboard.tsx usage
const totalSentEmailsData = dashboardData ? {
  title: "Total Sent Emails",
  value: dashboardData.total_emails_sent?.toLocaleString() || "0",
  icon: Mail,
  // Remove trend field (not provided by backend)
} : null;

const stats = dashboardData ? [
  {
    title: "Total Campaigns",
    value: dashboardData.total_campaigns?.toString() || "0",
    icon: Send,
  },
  {
    title: "Open Rate",
    value: `${(dashboardData.email_open_rate || 0).toFixed(1)}%`,
    icon: Eye,
  },
  {
    title: "Click Rate",
    value: `${(dashboardData.email_click_rate || 0).toFixed(1)}%`,
    icon: TrendingUp,
  },
] : [];
```

**Testing**:
- [ ] Dashboard loads without errors
- [ ] All stats display correct values
- [ ] Charts render with real data
- [ ] No "undefined" or "NaN" displayed
- [ ] Recent campaigns list populates

---

### **Phase 4: Campaign Page Refactoring** ⏱️ 3 hours

#### Step 4.1: Replace Raw Fetch Calls
**File**: `src/pages/Campaigns.tsx`

**Areas to Update**:
1. **Campaign fetch for editing** (line ~70)
2. **Campaign creation** (line ~200)
3. **Campaign update** (line ~250)
4. **Test email sending** (line ~400)

**Before** (line ~70):
```typescript
const response = await fetch(`http://localhost:5001/api/campaigns/${campaignId}`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
  }
});
```

**After**:
```typescript
const response = await campaignsAPI.getCampaign(parseInt(campaignId));
```

**Before** (line ~200):
```typescript
const response = await fetch('http://localhost:5001/api/campaigns', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
  },
  body: JSON.stringify({ ...campaignData })
});
```

**After**:
```typescript
const response = await campaignsAPI.createCampaign({
  name: formData.campaignName,
  subject: formData.subject,
  sender_name: formData.senderName,
  sender_email: formData.senderEmail,
  email_content: formData.emailBody,
  recipients: formData.recipientList,
  send_immediately: !isScheduled,
  scheduled_at: scheduledAt,
});
```

**Benefits**:
- Centralized token management
- Consistent error handling
- Type safety with TypeScript
- Easier testing and mocking
- No hardcoded URLs

**Testing**:
- [ ] Campaign creation works
- [ ] Campaign editing works
- [ ] Campaign scheduling works
- [ ] Test email sends successfully
- [ ] Error messages display properly

---

### **Phase 5: Authentication Flow Testing** ⏱️ 2 hours

#### Step 5.1: Test Login Flow

**Test Script**:
```javascript
// 1. Open login page
cy.visit('http://localhost:5173/login');

// 2. Enter credentials
cy.get('input[type="email"]').type('test@example.com');
cy.get('input[type="password"]').type('password123');

// 3. Submit form
cy.get('button[type="submit"]').click();

// 4. Verify redirect
cy.url().should('include', '/dashboard');

// 5. Verify token stored
cy.window().then((win) => {
  const token = win.localStorage.getItem('access_token');
  expect(token).to.exist;
  expect(token).to.be.a('string');
});

// 6. Verify user data stored
cy.window().then((win) => {
  const user = JSON.parse(win.localStorage.getItem('user'));
  expect(user).to.have.property('email');
  expect(user).to.have.property('id');
});
```

#### Step 5.2: Test Protected Routes

**Test Cases**:
1. Access `/dashboard` without token → redirect to `/login`
2. Access `/campaigns` without token → redirect to `/login`
3. Login → verify all protected routes accessible
4. Logout → verify tokens cleared
5. Expired token → verify auto-redirect to login

#### Step 5.3: Test API Authorization

**Test Matrix**:
| Endpoint | User Role | Expected |
|----------|-----------|----------|
| GET /api/campaigns | User | 200 (own campaigns) |
| GET /api/campaigns | Admin | 200 (all campaigns) |
| POST /api/campaigns | User | 403 (no permission) |
| POST /api/campaigns | Manager | 200 (success) |
| GET /api/dashboard/stats | User | 200 (own data) |
| GET /api/dashboard/stats | Admin | 200 (all data) |

---

### **Phase 6: End-to-End Campaign Testing** ⏱️ 3 hours

#### Step 6.1: Campaign Creation Workflow

**Test Steps**:
1. Login as manager/admin
2. Navigate to `/campaigns`
3. Fill campaign form:
   - Name: "Test Campaign"
   - Subject: "Welcome Email"
   - Sender: "noreply@test.com"
   - Recipients: "test1@example.com, test2@example.com"
   - Content: Rich text with images/links
4. Save as draft
5. Verify campaign in list (status: draft)
6. Edit campaign
7. Schedule for future (5 minutes from now)
8. Verify campaign status: scheduled
9. Wait for scheduler to process
10. Verify campaign status: sent

**Database Validation**:
```sql
-- Check campaign created
SELECT * FROM campaigns WHERE name = 'Test Campaign';

-- Check recipients created
SELECT * FROM campaign_recipients WHERE campaign_id = ?;

-- Check email logs
SELECT * FROM email_logs WHERE campaign_id = ?;
```

#### Step 6.2: Email Sending Workflow

**Test Steps**:
1. Configure SMTP settings (use test SMTP server)
2. Create campaign with valid recipients
3. Send campaign
4. Monitor console for sending progress
5. Verify EmailLog records created
6. Check test email inbox
7. Open email
8. Verify tracking pixel loads
9. Click link in email
10. Verify click tracked

**Validation Queries**:
```sql
-- Check emails sent
SELECT status, COUNT(*) FROM email_logs 
WHERE campaign_id = ? 
GROUP BY status;

-- Check opens
SELECT COUNT(*) FROM email_logs 
WHERE campaign_id = ? AND status IN ('opened', 'clicked');

-- Check clicks
SELECT * FROM link_clicks WHERE email_log_id IN (
  SELECT id FROM email_logs WHERE campaign_id = ?
);
```

#### Step 6.3: Analytics Workflow

**Test Steps**:
1. Send campaign with tracking
2. Navigate to `/dashboard`
3. Verify campaign appears in recent campaigns
4. Verify stats updated:
   - Total emails sent incremented
   - Open rate calculated
   - Click rate calculated
5. Check campaign list
6. Verify campaign metrics displayed
7. Export campaign report (if feature exists)

---

## 🔧 Technical Implementation Details

### **API Request Flow**

```
User Action (Frontend)
  ↓
React Component Event Handler
  ↓
API Client Function (campaignsAPI.xxx)
  ↓
Generic apiRequest() function
  ├── Add JWT token from localStorage
  ├── Set Content-Type: application/json
  └── Set Authorization: Bearer <token>
  ↓
HTTP Request to Backend
  ↓
Flask CORS Middleware
  ↓
Flask Route Handler
  ↓
JWT Authentication Middleware (@authenticated_required)
  ├── Verify token
  ├── Load user from database
  └── Attach to g.current_user
  ↓
Authorization Check (@can_create_campaigns)
  ↓
Business Logic (Service Layer)
  ↓
Database Query (SQLAlchemy)
  ↓
JSON Response
  ↓
apiRequest() receives response
  ├── Check response.ok
  ├── Parse JSON
  └── Handle errors (401 → logout, other → throw)
  ↓
React Component receives data
  ↓
Update UI State
  ↓
Re-render with new data
```

### **Error Handling Strategy**

**Backend**:
```python
try:
    # Business logic
    campaign = Campaign.query.get_or_404(id)
    return jsonify({'success': True, 'data': campaign.to_dict()})
except SQLAlchemyError as e:
    db.session.rollback()
    logger.error(f"Database error: {e}")
    return jsonify({'success': False, 'error': 'Database error'}), 500
except Exception as e:
    logger.error(f"Unexpected error: {e}")
    return jsonify({'success': False, 'error': str(e)}), 500
```

**Frontend**:
```typescript
try {
  setIsLoading(true);
  const response = await campaignsAPI.getCampaign(id);
  setCampaign(response.campaign);
  toast({ title: "Success", description: "Campaign loaded" });
} catch (error) {
  console.error('Failed to load campaign:', error);
  toast({
    title: "Error",
    description: error instanceof Error ? error.message : 'Failed to load',
    variant: "destructive",
  });
} finally {
  setIsLoading(false);
}
```

### **State Management Pattern**

```typescript
// Component state
const [data, setData] = useState(null);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

// Fetch pattern
useEffect(() => {
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await someAPI.getData();
      setData(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };
  fetchData();
}, [/* dependencies */]);

// Render based on state
if (error) return <ErrorDisplay error={error} />;
if (isLoading) return <LoadingSpinner />;
if (!data) return <EmptyState />;
return <DataDisplay data={data} />;
```

---

## 🚨 Risk Management

### **Risk 1: CORS Issues**
**Probability**: Medium  
**Impact**: High  
**Mitigation**:
- CORS already configured in backend
- Test with browser dev tools
- Verify OPTIONS preflight requests succeed
- Check Access-Control-Allow-Origin header

### **Risk 2: Token Expiration During Work**
**Probability**: Low  
**Impact**: Medium  
**Mitigation**:
- 24-hour token expiry is generous
- Frontend handles 401 with auto-redirect
- Consider refresh token for future

### **Risk 3: Scheduler Not Starting**
**Probability**: Low  
**Impact**: Medium  
**Mitigation**:
- Check console output on startup
- Add scheduler health check endpoint
- Manual sending still works

### **Risk 4: SMTP Authentication Failures**
**Probability**: Medium  
**Impact**: High  
**Mitigation**:
- Use app passwords for Gmail
- Test SMTP before sending campaigns
- Provide clear error messages
- Support multiple SMTP configs

---

## ✅ Definition of Done - Integration Phase

### **Phase Complete When**:
1. ✅ Planning documents created (PRD, Task, Planning)
2. ⬜ campaignsAPI implemented and tested
3. ⬜ Dashboard displays live data correctly
4. ⬜ Campaigns.tsx uses API client (no raw fetch)
5. ⬜ Authentication flow tested end-to-end
6. ⬜ Campaign creation → sending → tracking works
7. ⬜ Both servers run without errors
8. ⬜ No critical bugs in core workflows
9. ⬜ Code reviewed and committed
10. ⬜ Basic documentation updated

---

## 📅 Timeline & Milestones

**Day 1** (Oct 29): Planning & API Client
- [x] Create planning docs
- [ ] Implement campaignsAPI
- [ ] Fix Dashboard integration

**Day 2** (Oct 30): Campaign Page Refactoring
- [ ] Refactor Campaigns.tsx
- [ ] Test campaign creation
- [ ] Test campaign editing

**Day 3** (Oct 31): Testing & Authentication
- [ ] Test auth flow
- [ ] End-to-end campaign test
- [ ] Analytics verification

**Day 4** (Nov 1): Bug Fixes & Polish
- [ ] Fix issues found in testing
- [ ] Improve error handling
- [ ] Update documentation

**Day 5** (Nov 2): Final Validation
- [ ] Full regression testing
- [ ] User acceptance testing
- [ ] Deployment preparation

---

## 📞 Support & Resources

**Documentation**:
- Flask Docs: https://flask.palletsprojects.com/
- React Docs: https://react.dev/
- SQLAlchemy: https://www.sqlalchemy.org/
- TipTap: https://tiptap.dev/

**Debugging Tools**:
- Browser DevTools (Network tab for API calls)
- React DevTools
- Postman/Thunder Client (API testing)
- PostgreSQL pgAdmin

**Key Files Reference**:
- Backend entry: `backend/app.py`
- Frontend entry: `src/main.tsx`
- API client: `src/lib/api.ts`
- Auth routes: `backend/app/routes/auth.py`
- Campaign routes: `backend/app/routes/campaigns.py`

---

**Document Status**: ✅ APPROVED  
**Next Review**: After Phase 1 completion  
**Owner**: Development Team
