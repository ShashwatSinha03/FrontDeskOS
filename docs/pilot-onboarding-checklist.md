# Pilot Onboarding Checklist

Use this checklist for each pilot customer. One checklist per customer.

**Customer:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
**Slug:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
**Date started:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
**Date completed:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

---

## Pre-Onboarding

- [ ] **Customer identified and confirmed** — Pilot agreement signed or verbal confirmation obtained
- [ ] **Industry vertical noted** — e.g., dental, salon, clinic (affects AI greeting and service templates)
- [ ] **Scope confirmed** — Which features will be used (chat, booking, admin dashboard, all)
- [ ] **Expected go-live date agreed** — Coordinate with customer availability

---

## Setup

- [ ] **Business created in Nuvora ops dashboard** — Navigate to ops dashboard → Add Business → enter name + slug + vertical
- [ ] **Owner email address collected** — Must be a real, deliverable email
- [ ] **Owner assigned to business** — Ops dashboard → business detail → Assign Owner → enter email
- [ ] **Owner receives login credentials** — Credentials shared securely (email or out-of-band); confirm owner can log in at `/{slug}/admin`
- [ ] **Business slug verified** — Slug is unique, URL-friendly, matches expected domain pattern (`{slug}.nuvoraos.app`)

---

## Configuration

- [ ] **AI greeting configured and approved** — Default greeting reviewed; custom greeting written if needed; owner approves tone and content
- [ ] **Services configured** — Each service has: name, duration (minutes), price (in cents or dollars per UI)
- [ ] **Business hours set** — Days of week open, opening time, closing time; handle lunch breaks if applicable
- [ ] **FAQs configured** — Common questions and answers loaded for AI knowledge base; minimum 5 FAQs recommended
- [ ] **Off-hours handling configured** — Voicemail or message capture for after-hours inquiries

---

## Verification

- [ ] **Customer-facing website loads** — Navigate to `/{slug}`; hero, services, and CTA display correctly
- [ ] **Booking page works** — Navigate to `/{slug}/book`; service selection, date picker, time slots, and confirmation flow all functional
- [ ] **Admin dashboard accessible** — Navigate to `/{slug}/admin`; login works; dashboard loads without errors
- [ ] **Chat widget operational** — Open public page; click "Chat With Us"; send a test message; AI responds
- [ ] **Owner can log in** — Owner credentials work; dashboard shows their business data only
- [ ] **Mobile responsiveness verified** — Public page, booking page, and admin dashboard render correctly on mobile viewport (375px width)

---

## Launch

- [ ] **Owner briefed on dashboard** — Walk through: viewing leads, managing appointments, responding to escalations, accessing settings
- [ ] **Support contact shared** — Owner has email (founder@nuvora.io) and expected response time
- [ ] **Go-live confirmed** — Owner acknowledges system is ready for real customer traffic
- [ ] **Monitoring activated** — Check that the business appears in ops dashboard monitoring; verify first customer interaction is tracked
- [ ] **Post-launch review scheduled** — Set a date 7 days post-launch to review metrics and gather feedback
