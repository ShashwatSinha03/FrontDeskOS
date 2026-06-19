# Onboarding Friction Audit

**Auditor:** Non-technical clinic owner simulation
**Date:** 2026-06-18
**Starting Point:** Blank account (no business, no user)
**Target:** Operational business with AI receptionist + booking + WhatsApp
**Verdict:** **FOUNDERS REQUIRED**

---

## Walkthrough

### Attempt 1: Self-serve (clinic owner signs up themselves)

| Step | Action | Result | Clicks |
|------|--------|--------|--------|
| 1 | Visit `nuvoraos.vercel.app` | Marketing page loads. CTAs: "Book a Demo" (Calendly) and "See It Live". No "Get Started" or "Sign Up". | 1 |
| 2 | Click "See It Live" | Demo chat opens. No way to create an account. | 1 |
| 3 | Navigate to `/login` | Login form — email + password. No "Create account" link. | 2 |
| 4 | Try `/signup` | 404 Not Found | 1 |
| 5 | Try `/register` | 404 Not Found | 1 |
| 6 | Click "Book a Demo" | Calendly opens to book time with founder. | 1 |

**Result: Dead end. Owner cannot sign up.** Must contact founder.

**Clicks so far: 7**

---

### Attempt 2: Founder-assisted (founder runs wizard for owner)

This path works, but the process is:

#### Phase A: Founder Creates Tenant (7 screens, ~15–20 min)

| Step | Screen | Inputs Required | Friction |
|------|--------|-----------------|----------|
| 0 | Industry selection | Choose from 5 templates (gym, salon, spa, dental, professional services) | No "clinic" option. Dental is closest but a general clinic is not dental. |
| 1 | Business info | Name, slug, tagline, description, email, phone, address | Slug auto-generated from name (good). Phone field uses placeholder `+91 98765 43210` — Indian bias. **No business type/niche field.** |
| 2 | Services | Name, description, duration, price, category for each service | Works well. Pre-populated from template. |
| 3 | Hours | 7-day grid with open/close toggles | Clean UI. "Copy Mon–Fri" helper is nice. |
| 4 | FAQs | Question + answer pairs | Pre-populated from template. No validation enforced. |
| 5 | AI Receptionist | Greeting message, escalation email, slot duration | **Escalation email label says "escalated to this email" but our new escalation inbox uses in-app notifications, not email.** Confusing for founders. |
| 6 | Review & Publish | Summary of all sections with edit links | Clean summary. "Publish Tenant" button. |

**Publish** → ~3 seconds → Success screen with URLs.

**Clicks: 7 screens × ~3 interactions = ~21 clicks**

#### Phase B: Founder Creates Owner Account (1 screen)

| Step | Action | Clicks |
|------|--------|--------|
| 1 | Click "Create Owner Account" on success page | 1 |
| 2 | Enter owner name + email | 2 |
| 3 | Check legal consent checkbox | 1 |
| 4 | Click "Create Account" | 1 |
| 5 | System generates random password (displayed once) | 0 |
| 6 | Founder copies password and sends to owner manually | ~3 |

**Friction:** Password shown in plain text on screen. No email delivery. Founder must manually share credentials via email/WhatsApp.

**Clicks: ~8**

#### Phase C: Owner Logs In (2 screens)

| Step | Action | Clicks |
|------|--------|--------|
| 1 | Visit admin URL | 1 |
| 2 | Enter email + password | 2 |
| 3 | Dashboard loads | 0 |

**Friction:** First-time owner sees the admin dashboard with zero data. No onboarding tour, no welcome modal, no guided next steps.

**Clicks: 3**

#### Phase D: WhatsApp Configuration (Settings → 4+ screens)

Not included in the wizard. Owner must navigate to:

| Step | Action | Clicks |
|------|--------|--------|
| 1 | Go to Settings | 1 |
| 2 | Find Channels section | 1 |
| 3 | Click WhatsApp | 1 |
| 4 | Enter Twilio Account SID, Auth Token, WhatsApp number | 3 |
| 5 | Save | 1 |

**Friction:** Requires Twilio account and technical knowledge. No documentation or guided setup. No test-send button.

**Clicks: ~7**

---

## Summary

| Metric | Count |
|--------|-------|
| Total screens to go through | ~12 |
| Total clicks (founder + owner) | ~46 |
| Total clicks if self-serve existed | ~25 (estimated) |
| Screens with pre-populated defaults | 5/7 |
| Screens with validation | 4/7 |
| Screens with guidance text | 7/7 |
| Third-party accounts required | 1 (Twilio) |
| Founder touchpoints required | 1 (must create tenant + owner) |

## Friction Points (Critical)

1. **No self-serve signup.** No `/signup` route exists. A business owner cannot create an account. This is the single biggest blocker.

2. **Wizard is founder-only.** Lives at `/ops/onboarding`, requires super admin login. Business owners never see it.

3. **No "clinic" industry template.** The closest is "dental clinic" but a general medical clinic has no template. Falls back to "professional services" which has generic data.

4. **WhatsApp setup is a separate, undocumented process.** Requires Twilio account, SID, auth token, and WhatsApp Business number. None of this is mentioned in the wizard. Not discoverable.

5. **Owner credentials delivered manually.** Password is shown once on screen. No email delivery. No secure sharing mechanism. Founder must copy-paste to the owner.

6. **No post-login onboarding for the owner.** Dashboard is empty. No welcome tour, no guided setup, no "what to do next" prompts.

7. **No email delivery infrastructure.** No transactional emails (welcome, password reset, notifications) despite having an email field.

8. **Hardcoded `nuvoraos.vercel.app` domain.** Production URLs are hardcoded in `onboarding.service.ts` and `onboarding.controller.ts`. Won't work with custom domains.

9. **Draft persistence is localStorage-only.** Refresh loses step position if cache clears. No server-side session persistence.

10. **"Escalation Email" label is misleading.** Label says "escalated to this email" but the new escalation inbox uses in-app dashboard notifications, not email.

## Recommendations

### Must-fix for self-serve:

1. Create a `/signup` route with email + password + business name
2. Convert the wizard from "founder onboards a tenant" to "owner sets up their own business"
3. Add WhatsApp/Twilio setup as a wizard step with inline documentation
4. Send owner credentials via email using Supabase's built-in email
5. Add a welcome tour / guided first-run experience for new owners
6. Replace hardcoded `nuvoraos.vercel.app` with `config.BASE_URL`

### Nice-to-haves:

7. Add "Clinic" and "General Medical" industry templates
8. Server-side session persistence for wizard drafts
9. Test-send button for WhatsApp configuration
10. Update escalation email label to mention in-app inbox

## Verdict

**FOUNDERS REQUIRED.** In its current state, a non-technical clinic owner cannot get operational without the founder's direct involvement. The platform has no self-serve signup path, the onboarding wizard requires super admin access, and WhatsApp configuration demands Twilio expertise. Estimated time to first message: **30–45 minutes with founder assistance**. Self-serve would require the recommendations above and a re-architected signup flow.
