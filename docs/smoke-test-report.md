# Smoke Test Report

**Sprint:** Launch Readiness
**Date:** 2026-06-13
**Status:** All tests PENDING — document defines test plan and expected results for every critical flow.

---

## 1. Founder Authentication

| Field | Detail |
|---|---|
| **Test ID** | FOUNDER-001 |
| **Test Name** | Founder login to ops dashboard |
| **Precondition** | Founder credentials known; ops dashboard deployed at `https://nevuraos.app/ops` (or internal URL) |
| **Steps** | 1. Navigate to ops dashboard login page<br>2. Enter founder email + password<br>3. Submit form<br>4. Observe redirect to ops dashboard home |
| **Expected Result** | Dashboard loads with business list, analytics summary, and management controls. No 401/403 errors. |
| **Actual Result** | PENDING |
| **Status** | PENDING |

---

## 2. Business Creation

| Field | Detail |
|---|---|
| **Test ID** | BUSINESS-001 |
| **Test Name** | Create new business via wizard |
| **Precondition** | Founder logged into ops dashboard |
| **Steps** | 1. Click "Add Business"<br>2. Enter business name, slug, industry vertical<br>3. Configure AI greeting message<br>4. Set business hours<br>5. Submit form |
| **Expected Result** | Business appears in the businesses list. API confirms row inserted in `businesses` table. Slug is URL-friendly. |
| **Actual Result** | PENDING |
| **Status** | PENDING |

---

## 3. Owner Assignment

| Field | Detail |
|---|---|
| **Test ID** | OWNER-001 |
| **Test Name** | Assign owner to business |
| **Precondition** | Business exists from BUSINESS-001; owner email known |
| **Steps** | 1. Navigate to business detail page<br>2. Click "Assign Owner"<br>3. Enter owner email address<br>4. Submit<br>5. Check `business_owners` table for new row |
| **Expected Result** | Owner record created. Owner receives invitation email (if email service configured) or is notified via support. |
| **Actual Result** | PENDING |
| **Status** | PENDING |

---

## 4. Owner Dashboard Access

| Field | Detail |
|---|---|
| **Test ID** | OWNER-002 |
| **Test Name** | Owner login to admin dashboard |
| **Precondition** | Owner assigned to a business (OWNER-001 completed) |
| **Steps** | 1. Navigate to `/{slug}/admin`<br>2. Enter owner credentials<br>3. Submit login form<br>4. Observe dashboard |
| **Expected Result** | Owner sees dashboard scoped to their business only. No "Add Business" or cross-business data visible. |
| **Actual Result** | PENDING |
| **Status** | PENDING |

---

## 5. Staff Invitation

| Field | Detail |
|---|---|
| **Test ID** | STAFF-001 |
| **Test Name** | Invite staff member |
| **Precondition** | Owner logged into admin dashboard |
| **Steps** | 1. Navigate to Staff/Team section<br>2. Click "Invite Staff"<br>3. Enter staff name + email<br>4. Select role (admin/staff)<br>5. Send invitation |
| **Expected Result** | Invitation record created. Staff member appears in staff list with "Invited" status. Email sent (if configured). |
| **Actual Result** | PENDING |
| **Status** | PENDING |

---

## 6. Lead Capture via Chat

| Field | Detail |
|---|---|
| **Test ID** | LEAD-001 |
| **Test Name** | Customer sends chat message — lead captured |
| **Precondition** | Business page loaded at `/{slug}`; chat widget visible |
| **Steps** | 1. Click "Chat With Us"<br>2. Type "Hi, how much for whitening?"<br>3. Send message<br>4. Check `leads` table and admin dashboard |
| **Expected Result** | AI replies with pricing. A new lead record appears in `leads` table with the customer's session. Lead shows in admin dashboard. |
| **Actual Result** | PENDING |
| **Status** | PENDING |

---

## 7. AI Appointment Booking

| Field | Detail |
|---|---|
| **Test ID** | APPT-001 |
| **Test Name** | Customer books appointment via AI |
| **Precondition** | Chat session active (LEAD-001 context) |
| **Steps** | 1. In chat, type "I'd like to book a cleaning"<br>2. AI presents available slots<br>3. Customer selects date and time<br>4. Customer enters name, email, phone<br>5. Customer confirms booking |
| **Expected Result** | Booking confirmation shown in chat. Appointment record created in `appointments` table with status `confirmed`. |
| **Actual Result** | PENDING |
| **Status** | PENDING |

---

## 8. Appointment Confirmation

| Field | Detail |
|---|---|
| **Test ID** | APPT-002 |
| **Test Name** | Appointment confirmation received |
| **Precondition** | APPT-001 completed |
| **Steps** | 1. Check customer's chat for confirmation message<br>2. Check `/{slug}/admin` appointments list<br>3. Verify `appointments` table has the row<br>4. Check for notification creation |
| **Expected Result** | Customer sees confirmation with date/time/service. Admin dashboard shows new appointment. Notification record exists in `notifications` table. |
| **Actual Result** | PENDING |
| **Status** | PENDING |

---

## 9. Dashboard Analytics

| Field | Detail |
|---|---|
| **Test ID** | ANALYTICS-001 |
| **Test Name** | Dashboard analytics load |
| **Precondition** | Owner logged into admin dashboard; at least one lead + one appointment exist |
| **Steps** | 1. Navigate to dashboard home<br>2. Observe analytics widgets/summary cards<br>3. Check API response for analytics endpoint |
| **Expected Result** | Dashboard shows: total leads, total appointments, booking rate, recent activity. All charts/render correctly. No loading spinners stuck. |
| **Actual Result** | PENDING |
| **Status** | PENDING |

---

## 10. Booking Notification

| Field | Detail |
|---|---|
| **Test ID** | NOTIFY-001 |
| **Test Name** | Notification appears for booking |
| **Precondition** | Owner logged into admin dashboard |
| **Steps** | 1. While owner is on dashboard, trigger a new booking (APPT-001)<br>2. Observe notification badge or toast<br>3. Open notification center |
| **Expected Result** | Notification appears (badge count increments, or toast shows). Notification contains business name, customer name, and appointment time. |
| **Actual Result** | PENDING |
| **Status** | PENDING |

---

## 11. Business Suspension

| Field | Detail |
|---|---|
| **Test ID** | SUSPEND-001 |
| **Test Name** | Suspended business shows inactive state |
| **Precondition** | Founder logged into ops dashboard; a business exists with active flag = true |
| **Steps** | 1. Set business `is_active = false` in database or via ops dashboard<br>2. Navigate to `/{slug}` (public page)<br>3. Navigate to `/{slug}/book`<br>4. Check admin API responses |
| **Expected Result** | Public page shows "This business is currently unavailable" or similar. Booking page rejects with 404 or inactive notice. Admin endpoints return 403 for that business. Chat widget does not load. |
| **Actual Result** | PENDING |
| **Status** | PENDING |

---

## Summary

| Status | Count |
|---|---|
| PENDING | 11 |
| PASS | 0 |
| FAIL | 0 |
| **Total** | **11** |
