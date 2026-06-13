# FRONTDESKOS Founder Operating Manual

> **Purpose**: Run Nuvora as founder, salesperson, onboarding specialist, support engineer, and business owner — without reading the codebase.
>
> **If you disappear for 6 months and come back, this document tells you everything.**

---

# SECTION 1 — What Nuvora Actually Is

## What the product does

Nuvora is an AI receptionist for service businesses. It replaces the front desk — the person who answers calls, books appointments, answers FAQs, captures leads, and sends follow-ups.

A customer visits the business website. Instead of calling or filling a contact form, they talk to an AI chatbot. The chatbot:

- Answers questions about services, pricing, hours
- Captures lead information
- Books appointments
- Handles rescheduling and cancellations
- Escalates to a human when it cannot handle the request
- Sends follow-ups automatically

## What value it delivers

- **Never miss a lead** — Every website visitor gets an instant response, 24/7
- **Zero staffing cost** — No receptionist salary, no shifts, no breaks
- **Faster booking** — Customer books in 2 minutes instead of a 10-minute call
- **Consistent answers** — AI always gives correct info (you control the knowledge base)
- **Owner visibility** — Dashboard shows every lead, appointment, and issue

## What industries it serves

- **Gyms & fitness studios** — Memberships, class bookings, trial sessions
- **Salons** — Service booking (hair, nails, skincare), stylist selection
- **Spas & wellness centers** — Massage bookings, package inquiries, gift cards
- **Dental clinics** — Appointment scheduling, procedure inquiries, insurance questions

The product works for any service business that takes appointments and gets asked the same questions repeatedly.

## What the customer sees

A customer lands on the business website. They see:

1. A professional business page (hosted on your domain or subdomain)
2. Service listings with descriptions and prices
3. Booking flow to select service, date, time, and confirm
4. An AI chat widget in the bottom corner
5. FAQ page with common questions answered
6. Contact information and hours

The chat widget follows them across every page. It remembers the conversation context.

## What the business owner sees

The owner logs into their admin dashboard at `/[businessSlug]/admin`. They see:

1. **Dashboard** — Overview of new leads, upcoming appointments, escalations
2. **Leads** — Every person who inquired but hasn't booked yet
3. **Appointments** — All booked appointments with customer details
4. **Escalations** — Conversations the AI could not handle (needs human attention)
5. **Follow-ups** — Automated messages sent to leads/customers
6. **Knowledge requests** — Questions the AI could not answer from the FAQ

The owner can view, filter, and act on everything from the dashboard.

---

## Common Mistakes

- Confusing Nuvora with a website builder. It is a receptionist that comes with a website. The website exists to give the AI a place to live.
- Thinking the AI works without setup. It needs FAQs, services, and hours configured. The AI is only as good as the knowledge you give it.
- Expecting the AI to handle everything. The AI handles ~80% of conversations. The remaining 20% require human escalation. This is by design.

---

### Founder Checklist

- [ ] I can explain what Nuvora does in one sentence
- [ ] I can name the four target industries
- [ ] I understand the difference between what customer sees and what owner sees
- [ ] I know what conversations the AI handles vs escalates

---

# SECTION 2 — Complete User Journey

```
Visitor
  ↓  (lands on marketing site or tenant page)
Sees website + AI chat widget
  ↓  (asks question or starts booking)
AI responds or captures lead
  ↓  (if booking intent detected)
Booking flow initiated
  ↓  (selects service, date, time, confirms)
Appointment created → Lead created (if new)
  ↓  (owner logs in)
Dashboard shows new lead + appointment
  ↓  (follow-up triggered)
Customer gets reminder / follow-up message
  ↓  (repeat)
Customer returns → AI remembers context
```

## Full lifecycle from acquisition to retention

### Stage 1: Visitor discovers Nuvora

- Finds marketing site through ads, SEO, referral, or direct visit
- Sees hero section explaining the value proposition
- Browses How It Works, Solutions, Demo sections
- Clicks "Book a Demo" or "Live Demo"

### Stage 2: Demo is booked

- Visitor fills name, email, phone, business name
- You receive the lead notification (currently manual — you check the system)
- You contact them to schedule a discovery call

### Stage 3: Discovery call

- You understand their business: services, hours, FAQs, pain points
- You explain how Nuvora solves their problem
- You agree on pricing (currently manual, no automated billing)
- They become a client

### Stage 4: Onboarding

- You collect required information (business name, slug, services, hours, FAQs, admin email)
- You create the tenant in the system
- You configure services, FAQs, hours, AI settings
- You create admin access for the owner
- You verify the website and dashboard

### Stage 5: Handover

- You send the owner their website URL and admin URL
- You walk them through the dashboard (15-min training)
- They start receiving leads and appointments

### Stage 6: Ongoing operations

- Owner monitors dashboard daily
- AI handles customer conversations
- Owner handles escalations
- Follow-ups run automatically
- You provide support as needed

---

## Common Mistakes

- Skipping the discovery call. Every business has unique requirements. You need to understand them before onboarding.
- Not verifying the website before handover. Always visit the tenant page and test booking before telling the client their site is live.
- Assuming the owner will figure out the dashboard. Always do the 15-minute walkthrough.

---

### Founder Checklist

- [ ] I can recite the complete user journey from visitor to repeat customer
- [ ] I know when in the journey I take manual action vs the system automates
- [ ] I understand where leads can be lost (no follow-up, slow response, AI can't answer)
- [ ] I know what needs to happen before a business can go live

---

# SECTION 3 — Every Public Page (Marketing Site)

## Route: `/`

**Purpose**: Convert visitors into demo bookings. This is the front door of the business.

**Who uses it**: Prospects evaluating Nuvora.

**Inputs**: Visitor arrives via ad, search, referral, or direct.

**Outputs**: A booked demo call, or enough interest to return later.

**Success condition**: Visitor submits the "Book a Demo" form.

### Page sections (top to bottom):

| Section | Purpose | CTA | What Happens After |
|---------|---------|-----|-------------------|
| **Navigation bar** | Brand + page links + CTA button | "Book a Demo" | Scrolls or goes to booking form |
| **Hero** | Instant value prop — AI receptionist for service businesses | "Book a Demo" / "Live Demo" | Booking flow / scrolls to demo section |
| **How It Works** | Explain the product in 3 steps (Lead → Appointment → Customer) | None (informational) | Scroll naturally |
| **Solutions** | Industry-specific value props (Gym, Salon, Spa, Dental) | None (informational) | Scroll naturally |
| **Demo Section** | Live chat simulation showing AI in action | None (informational) | Scroll naturally |
| **Product Screenshots** | Animated mockups of dashboard, leads, appointments, chat | None (informational) | Scroll naturally |
| **Industries / Use Cases** | Specific vertical examples | None (informational) | Scroll naturally |
| **Pricing / Testimonials** | Social proof + pricing info | None (informational) | Scroll naturally |
| **Final CTA** | Last chance to convert | "Book a Demo" | Booking form |
| **Footer** | Links, contact, social | Various | Navigation |

### What each section achieves:

**Hero**: 3-5 seconds to answer "what is this?" If it fails, they leave. Must show: AI receptionist + service business + immediate value.

**How It Works**: Visitor is asking "how does this work?" This section answers: Lead walks in → AI handles → Appointment booked → Customer served.

**Solutions**: Visitor is asking "is this for my industry?" Each card targets a specific vertical. Gym owners should feel "this was made for me."

**Demo Section**: Visitor is skeptical. They want to see the AI working. The animated chat simulation shows the real experience.

**Product Screenshots**: Visitor is thinking "what do I get?" Shows the dashboard, leads, appointments — the owner experience.

**Final CTA**: Visitor has consumed all info. This is the last opportunity. Must be prominent and low-friction.

---

## Route: `/features`

**Purpose**: Detailed feature breakdown for serious evaluators.

**Who uses it**: Prospects who need more detail before booking.

**Inputs**: Visitor clicks "Features" in navigation.

**Outputs**: Deeper understanding of capabilities.

**Success condition**: Visitor proceeds to book a demo.

---

## Route: `/pricing`

**Purpose**: Show pricing information (currently placeholder/coming soon).

**Who uses it**: Prospects evaluating cost.

**Inputs**: Visitor clicks "Pricing" in navigation.

**Outputs**: Pricing understanding.

**Success condition**: Visitor proceeds to book a demo or leaves contact info.

---

---

### Founder Checklist

- [ ] I can describe every section of the homepage and its conversion goal
- [ ] I know the primary CTA on every section
- [ ] I can articulate what a visitor thinks/feels at each stage of scrolling
- [ ] I understand which sections are informational vs conversion-focused

---

# SECTION 4 — Every Tenant Page

Each tenant (client business) gets a dedicated subdomain-page at `/[businessSlug]`. The slug is a URL-safe version of the business name (e.g., `brightsmile-dental`).

## Route: `/`

**Purpose**: Primary landing page for the business. Converts visitors into leads/appointments.

**Who uses it**: The business's customers.

**Inputs**: Visitor searches for the business and finds this page.

**Outputs**: A lead captured or appointment booked.

**Success condition**: Customer starts a booking or initiates a chat.

**What the customer sees**:
- Business name, tagline, hero image (default gradient if none provided)
- Quick info: hours, phone, address
- "Book Now" CTA button
- Services preview
- AI chat widget in bottom corner

**Data source**: Business record from database (name, slug, tagline, hours).

---

## Route: `/services`

**Purpose**: List all services the business offers with descriptions and pricing.

**Who uses it**: Customers deciding what to book.

**Inputs**: Visitor clicks "Services" or navigates from homepage.

**Outputs**: Customer selects a service and proceeds to booking.

**Success condition**: Customer clicks "Book" on a service.

**What the customer sees**:
- Service name
- Description
- Duration
- Price
- "Book Now" button per service

**Data source**: `services` table for this business.

---

## Route: `/booking`

**Purpose**: Complete appointment booking flow.

**Who uses it**: Customers ready to book.

**Inputs**: Customer selects a service (from services page or directly).

**Outputs**: A confirmed appointment.

**Success condition**: Customer sees "Booking Confirmed" page.

**What the customer sees**:
- Step 1: Select date
- Step 2: Select available time slot
- Step 3: Enter name, email, phone
- Step 4: Confirm booking
- Available slots shown (based on business hours and existing appointments)

**Data source**: `booking` flow reads from `business_hours`, `calendar_slots`, and existing `appointments` to show availability.

---

## Route: `/booking/success`

**Purpose**: Confirm booking was successful and provide next steps.

**Who uses it**: Customer who just booked.

**Inputs**: Successful booking creation.

**Outputs**: Customer has confirmation details.

**Success condition**: Customer receives confirmation and knows what happens next.

**What the customer sees**:
- Confirmation message
- Service, date, time, business name
- Business contact info
- Option to add to calendar

**Data source**: The appointment record just created.

---

## Route: `/contact`

**Purpose**: Display business contact information.

**Who uses it**: Customers who want to call, email, or visit.

**Inputs**: Visitor navigates to contact page.

**Outputs**: Customer contacts the business directly or uses chat.

**Success condition**: Customer finds the information they need or initiates contact.

**What the customer sees**:
- Phone number
- Email
- Physical address
- Business hours
- AI chat widget (same as all pages)

**Data source**: Business record (phone, email, address, hours).

---

## Route: `/faq`

**Purpose**: Answer common questions without needing the AI.

**Who uses it**: Customers with quick questions.

**Inputs**: Visitor navigates to FAQ page.

**Outputs**: Customer finds answer or uses chat for more specific questions.

**Success condition**: Customer gets their question answered.

**What the customer sees**:
- List of questions organized by category/topic
- Expandable answers

**Data source**: `faqs` table for this business.

---

## Route: `/about`

**Purpose**: Tell the business story.

**Who uses it**: Customers who want to know more about the business.

**Inputs**: Visitor navigates to about page.

**Outputs**: Deeper connection with the brand.

**Success condition**: Customer feels confident choosing this business.

**What the customer sees**:
- Business description/history
- Team/mission info (if provided)

**Data source**: Business record (description field).

---

## AI Chat Widget (present on all pages)

**Purpose**: Handle customer questions, capture leads, and drive bookings.

**Who uses it**: Every visitor to every tenant page.

**Inputs**: Customer types a question or selects a prompt.

**Outputs**: AI response, lead capture (if new customer), or appointment booking.

**Success condition**: Customer gets what they need — answer, lead captured, or appointment booked.

---

### Common Mistakes

- Slug conflicts. Two businesses cannot share a slug. Verify uniqueness before creating.
- Missing services. Without services, the booking flow is empty. Always add at least 3-5 services.
- Missing FAQs. The AI answers from FAQs. Empty FAQs = AI doesn't know anything.
- Wrong hours. Business hours drive available appointment slots. Wrong hours = wrong availability.
- Not checking the tenant page. Always visit the live URL and test booking before handover.

---

### Founder Checklist

- [ ] I can list every tenant page and its purpose
- [ ] I know what data powers each page
- [ ] I can identify what breaks if services/FAQs/hours are missing
- [ ] I can walk through the complete booking flow as a customer
- [ ] I understand the AI chat widget is on every page

---

# SECTION 5 — Every Admin Page

The admin panel lives at `/[businessSlug]/admin`. Currently it is **not protected** — anyone with the URL can access it. Authentication was removed during cleanup and must be rebuilt.

## Route: `/[businessSlug]/admin`

**Purpose**: Central operations dashboard. Answers "what is happening right now?"

**Who uses it**: Business owner.

**Inputs**: Owner logs into admin.

**Outputs**: Overview of all activity.

**Success condition**: Owner can see new leads, upcoming appointments, and any issues needing attention.

**What the owner sees**:
- Total leads (new, contacted, converted)
- Upcoming appointments (today, this week)
- Pending escalations count
- Recent follow-up activity
- Quick action buttons (view leads, view appointments)

**Data source**: Aggregated counts from `leads`, `appointments`, `escalations`, `follow_ups`.

---

## Route: `/[businessSlug]/admin/leads`

**Purpose**: Manage every person who has shown interest.

**Who uses it**: Business owner.

**Inputs**: Owner navigates to Leads.

**Outputs**: Lead list with status, contact info, source, and actions.

**Success condition**: Owner can view, filter, update status, and contact leads.

**What the owner sees**:
- Table: Name, Email, Phone, Service interested in, Status, Source, Created date
- Filter by status (new, contacted, converted, lost)
- Click to view full lead details
- Option to create a lead manually

**Data source**: `leads` table for this business.

**Actions available**:
- View lead details
- Mark as contacted (status change)
- Mark as converted (lead → customer)
- Mark as lost
- Create new lead manually

**Business outcome**: No lead falls through the cracks. Every inquiry is tracked from first contact to conversion or loss.

---

## Route: `/[businessSlug]/admin/appointments`

**Purpose**: View and manage all scheduled appointments.

**Who uses it**: Business owner.

**Inputs**: Owner navigates to Appointments.

**Outputs**: Appointment list with customer, service, date, time, status.

**Success condition**: Owner can see today's schedule, confirm appointments, and manage the calendar.

**What the owner sees**:
- Table: Customer name, Service, Date, Time, Status, Created date
- Filter by date range and status
- Click to view full appointment details
- Key stats: total appointments today, this week

**Data source**: `appointments` table for this business, joined with `customers`.

**Actions available**:
- View appointment details
- Confirm appointment
- Cancel appointment
- Reschedule (customer-side flow)

**Business outcome**: Owner knows exactly who is coming today and can prepare. No double-booking. No missed appointments.

---

## Route: `/[businessSlug]/admin/escalations`

**Purpose**: Handle conversations the AI could not resolve.

**Who uses it**: Business owner.

**Inputs**: AI escalates a conversation to this page.

**Outputs**: Owner reviews and responds to the escalation.

**Success condition**: Customer gets a human response for complex issues.

**What the owner sees**:
- Table: Customer name, Issue summary, Conversation history, Status, Created date
- Click to view full conversation
- Respond button (currently manual — owner contacts customer outside the system)

**Data source**: `escalations` table, joined with `conversations` and `messages`.

**Actions available**:
- View full conversation transcript
- Mark as resolved
- Contact customer (via phone/email — outside the system currently)

**Business outcome**: Complex customer issues get human attention. AI handles the easy stuff, owner handles the hard stuff.

---

## Route: `/[businessSlug]/admin/follow-ups`

**Purpose**: Track automated follow-up messages sent to leads and customers.

**Who uses it**: Business owner.

**Inputs**: Owner navigates to Follow-ups.

**Outputs**: Follow-up history with status and details.

**Success condition**: Owner can see which follow-ups were sent, opened, and acted upon.

**What the owner sees**:
- Table: Customer, Type (lead/appointment), Message summary, Status (sent/delivered/failed), Scheduled date, Sent date
- Filter by type and status

**Data source**: `follow_ups` table.

**Actions available**:
- View follow-up details
- Resend if failed
- See history of all follow-ups for a customer

**Business outcome**: Leads are nurtured automatically. Customers get reminders. No manual follow-up work.

---

## Route: `/[businessSlug]/admin/knowledge`

**Purpose**: Track questions the AI could not answer.

**Who uses it**: Business owner.

**Inputs**: AI encounters a question not covered by FAQs.

**Outputs**: List of unanswered questions that owner should add to FAQs.

**Success condition**: Owner reviews questions and adds answers to the FAQ, making the AI smarter over time.

**What the owner sees**:
- Table: Question asked, Customer, Date, Status (unanswered/answered)
- Click to view question details

**Data source**: `knowledge_documents` or conversation messages where AI could not answer.

**Actions available**:
- Mark as addressed
- Add answer to FAQ (requires manual FAQ update)

**Business outcome**: The AI gets smarter over time. Each unanswered question is an opportunity to improve.

---

### Common Mistakes

- Not checking escalations. If the owner doesn't check escalations, customers with complex issues get ignored. This is the #1 complaint risk.
- Not reviewing knowledge requests. The AI stays dumb if the owner doesn't add missing FAQ answers. The business owner must actively improve the AI.
- Forgetting the admin exists. The system works best when the owner checks the dashboard daily. Without engagement, leads sit, appointments get missed, escalations pile up.

---

### Founder Checklist

- [ ] I can explain every admin page and its operational purpose
- [ ] I know what data each page surfaces
- [ ] I understand the escalation workflow and why it matters
- [ ] I can guide an owner through their dashboard in 15 minutes
- [ ] I know which admin pages need daily vs weekly attention

---

# SECTION 6 — How I Onboard A New Business

Assume you just closed a gym. Here is the exact workflow.

## Step 1: Information I Collect

Before touching the system, get these from the business owner:

| Item | Example | Required? |
|------|---------|-----------|
| Business name | Peak Performance Gym | Yes |
| Desired URL slug | peak-performance-gym | Yes |
| Tagline | "Train Like an Athlete" | Yes |
| Description | 2-3 sentences about the gym | Recommended |
| Phone | +91 98765 43210 | Yes |
| Email | info@peakperformance.in | Yes |
| Address | 123, MG Road, Bangalore | Recommended |
| Business hours | Mon-Sat 6AM-10PM, Sun 8AM-6PM | Yes |
| Services offered | Personal Training, Group Classes, etc. | Yes |
| Common FAQs | Pricing? Hours? Free trial? | Recommended |
| Owner name | Rajesh Kumar | Yes |
| Owner email | rajesh@peakperformance.in | Yes |
| Logo/Images | Optional | No |

**Minimum Information Required** to begin onboarding:

1. Business name
2. URL slug
3. Business hours
4. At least 3 services (name + description + duration + price)
5. Owner name + email (for admin access)
6. Phone number

Without these, the website and booking flow will not work properly. Do not proceed until you have everything.

## Step 2: Create Business Record

This is the first database record. Every other record depends on it.

**What I do**: Insert a new record in the `businesses` table with the information collected above.

**What I see**: A new business ID is created. This ID is the key for all subsequent records.

**What happens next**: The business slug determines the tenant URL. Choose carefully — it cannot be changed easily.

**What can go wrong**: Duplicate slug (already exists). Invalid characters in slug. Missing required fields.

**How I verify**: The business appears when querying the businesses list. The tenant URL at `/[slug]` loads (even if content is minimal).

## Step 3: Create Services

**What I do**: Insert records in the `services` table linked to the business ID.

**What I see**: Services appear on the tenant page under /services.

**What happens next**: The booking flow can now reference these services. Without services, no one can book.

**What can go wrong**: Prices in wrong format. Duration missing. No description. Duplicate service names.

**How I verify**: Visit `/[slug]/services` — all services display with correct info.

## Step 4: Create FAQs

**What I do**: Insert records in the `faqs` table linked to the business ID.

**What I see**: FAQs appear on the FAQ page. More importantly, the AI uses these to answer customer questions.

**What happens next**: The AI can now answer common questions. If FAQs are missing, the AI says "I don't know" and escalates.

**What can go wrong**: Questions too vague. Answers too short. Missing critical questions (pricing, hours, location).

**How I verify**: Visit `/[slug]/faq` — all FAQs display. Start a chat and ask: "What are your hours?" — AI should answer correctly.

## Step 5: Create Hours

**What I do**: Insert records in the `business_hours` table. One record per day of the week.

**What I see**: Hours appear on the contact page and drive the booking calendar.

**What happens next**: The booking flow only shows available slots within business hours. If hours are wrong, customers can book at wrong times.

**What can go wrong**: Missing days (e.g., no Sunday entry). Wrong time format. Closed days not handled correctly.

**How I verify**: Visit `/[slug]` — hours display correctly. Start a booking — available slots match the business hours.

## Step 6: Configure AI

**What I do**: Set AI configuration for this business. This includes:
- AI greeting message (e.g., "Hi! Welcome to Peak Performance Gym. How can I help?")
- AI personality/tone (professional, friendly)
- Conversation routing rules (when to escalate)

**What I see**: The AI chat widget uses the configured greeting and tone.

**What happens next**: When a customer visits the tenant page and starts a chat, the AI uses this configuration.

**What can go wrong**: Generic greeting that doesn't match the business brand. Wrong tone (too formal for a gym, too casual for a dental clinic).

**How I verify**: Start a chat on the tenant page. First message should be the configured greeting.

## Step 7: Create Admin Access

**What I do**: Insert a record in the `admin_users` table linking the owner's email to the business ID.

**What I see**: The owner can now access `/[slug]/admin`.

**What happens next**: Owner logs in and sees the dashboard. Currently, access is URL-based with middleware protection — no self-service password system.

**What can go wrong**: Wrong email. Wrong business ID link. Multiple admin records for same person.

**How I verify**: Try accessing `/[slug]/admin` with the owner's credentials — it should load the dashboard.

## Step 8: Verify Website

**What I do**: Visit every tenant page as a customer would.

- `/[slug]` — Homepage loads, brand info correct
- `/[slug]/services` — All services display correctly
- `/[slug]/booking` — Booking flow works end to end
- `/[slug]/booking/success` — Confirmation page works
- `/[slug]/contact` — Business info correct
- `/[slug]/faq` — FAQs display correctly

**What I see**: A fully functional business website.

**What happens next**: The website is ready for customers. The owner can start sharing the URL.

**What can go wrong**: Missing content on any page. Broken booking flow. Incorrect hours or pricing. Chat widget not loading.

**How I verify**: Go through the complete customer journey on the tenant site. Book a test appointment. Verify it appears in admin.

## Step 9: Verify Dashboard

**What I do**: Log into the admin panel as the owner would.

- Dashboard loads with correct business name
- Leads page is empty (ready for new leads)
- Appointments shows the test appointment from Step 8
- Escalations page loads
- Follow-ups page loads
- Knowledge requests page loads

**What I see**: A fully functional admin dashboard.

**What happens next**: The owner can start using the dashboard immediately.

**What can go wrong**: Dashboard doesn't load. Missing data. Wrong business showing.

**How I verify**: Navigate all admin pages. The test appointment from Step 8 should be visible.

## Step 10: Hand Over to Client

**What I do**: Send the owner their access information and schedule a 15-minute training call.

**What I see**: The owner now has everything they need to run their business with Nuvora.

**What happens next**: The owner starts monitoring leads and appointments. They handle escalations. They update FAQs. They use the dashboard daily.

**What can go wrong**: Owner doesn't understand the dashboard. Owner forgets to check escalations. Owner doesn't add more FAQs.

**How I verify**: Schedule a follow-up call 1 week after handover. Check if they've logged in, viewed leads, and handled any escalations.

---

## Onboarding Checklist

Use this for every new business:

- [ ] Collected: Business name, slug, hours, minimum 3 services, owner name + email, phone
- [ ] Business record created
- [ ] Services created (minimum 3)
- [ ] FAQs created (recommend minimum 10)
- [ ] Business hours created (all 7 days, or clearly marked closed days)
- [ ] AI greeting configured
- [ ] Admin access created for owner
- [ ] Website verified: all pages load, booking works, chat works
- [ ] Dashboard verified: test appointment visible, all admin pages load
- [ ] Handover completed: owner has URLs and 15-min training done
- [ ] Follow-up scheduled: 1 week after handover

---

### Common Mistakes

- **Wrong slug**: Slug cannot change. Pick carefully. Use business name, lowercase, hyphens for spaces.
- **Missing services**: Booking flow is empty without services. Add at least 3-5.
- **Missing FAQs**: AI cannot answer questions without FAQs. Add minimum 10 common questions.
- **Missing admin access**: Owner cannot see their dashboard. Always verify admin access works.
- **Missing hours**: Booking calendar shows no availability. Always enter all 7 days.
- **Not testing booking**: First real customer might hit a broken flow. Always book a test appointment.
- **Wrong pricing format**: Prices must be in the correct format (paise/rupees). Verify on services page.
- **Not verifying AI chat**: AI might be misconfigured. Test a chat conversation before handover.

---

### Founder Checklist

- [ ] I have memorized the 10-step onboarding workflow
- [ ] I have the Minimum Information Required list ready to send prospects
- [ ] I have an onboarding checklist printed or saved for every new client
- [ ] I know how to avoid each common mistake
- [ ] I can onboard a gym end-to-end in under 2 hours
- [ ] I can onboard a salon, spa, or dental clinic with the same workflow

---

# SECTION 7 — Admin Access

## How admin access works today

Currently, admin access is **completely open**. There is no authentication, no login page, no password, no middleware protection. Anyone who knows the URL `/[businessSlug]/admin` can view the dashboard.

This is a temporary state. Authentication was reverted during cleanup and will be rebuilt.

## How do I give an owner access?

Just send them the URL: `https://nuvoraos.vercel.app/[businessSlug]/admin`

There is no account creation, no login step, no password. The dashboard is publicly accessible.

## How do I remove access?

**Cannot currently.** Since there is no authentication at all, there is no way to restrict access. Anyone with the URL can view the dashboard. The only workaround is to not share the URL publicly.

## Current limitations (be honest)

- **Absolutely no security.** Anybody with the URL can see the dashboard. Do not share admin URLs broadly until authentication is rebuilt.
- **No owner distinction.** Every visitor to the admin URL sees the same dashboard. No way to identify who is viewing it.
- **No role management.** Cannot give read-only access or distinguish between owner and staff.
- **No multi-business access for you.** You must visit each business's admin URL separately.
- **No signup, login, or password system.** None of it exists yet.

This is a critical gap. Authentication must be rebuilt before onboarding real clients.

---

### Founder Checklist

- [ ] I understand admin URLs are publicly accessible
- [ ] I know not to share admin URLs publicly
- [ ] I know authentication will need to be rebuilt
- [ ] I understand this is the #1 security risk right now

---

# SECTION 8 — Creating A New Tenant

When a new salon signs up, here is every record needed and every configuration required.

## Minimum Information Required

Before starting, get from the business owner:

1. **Business name** (e.g., "Glamour Salon")
2. **URL slug** (e.g., `glamour-salon`)
3. **Business phone** (with country code)
4. **Business email**
5. **Business address** (full, with city/pin code)
6. **Business hours** — for each day of the week (open time, close time, or closed)
7. **At least 3 services** — each with name, description, duration (minutes), price
8. **Owner full name**
9. **Owner email**
10. **Tagline** (short, 5-10 words)

## Method A: Using Supabase Console (SQL)

This is the manual approach. Use this when there is no admin UI.

### Step 1: Create the business record

```sql
INSERT INTO businesses (
  name, slug, tagline, description,
  phone, email, address,
  status, created_at
) VALUES (
  'Glamour Salon', 'glamour-salon', 'Where Beauty Meets Elegance',
  'Premium unisex salon in Bangalore offering haircuts, styling, coloring, and skincare services.',
  '+91 87654 32109', 'hello@glamoursalon.in',
  '456, Indiranagar, Bangalore',
  'active', NOW()
) RETURNING id;
```

**Save the returned ID.** You need it for every subsequent step.

### Step 2: Create services

```sql
INSERT INTO services (business_id, name, description, duration, price, category) VALUES
  ('BUSINESS_ID', 'Haircut & Style', 'Wash, cut, and blow-dry by our expert stylists', 45, 599, 'Hair'),
  ('BUSINESS_ID', 'Hair Coloring', 'Full-head professional hair coloring with premium products', 120, 2499, 'Hair'),
  ('BUSINESS_ID', 'Facial Treatment', 'Deep-cleansing facial with organic products', 60, 1299, 'Skincare'),
  ('BUSINESS_ID', 'Manicure & Pedicure', 'Nail care with massage and polish', 75, 999, 'Nails'),
  ('BUSINESS_ID', 'Bridal Makeup', 'Complete bridal makeup package with trial', 180, 5999, 'Makeup');
```

### Step 3: Create FAQs

```sql
INSERT INTO faqs (business_id, question, answer, category) VALUES
  ('BUSINESS_ID', 'What are your opening hours?', 'We are open Mon-Sat 9AM-8PM and Sun 10AM-6PM.', 'General'),
  ('BUSINESS_ID', 'Do I need to book in advance?', 'Walk-ins welcome, but we recommend booking for guaranteed slots, especially on weekends.', 'Booking'),
  ('BUSINESS_ID', 'What payment methods do you accept?', 'We accept cash, UPI, credit/debit cards, and all major wallets.', 'Billing'),
  ('BUSINESS_ID', 'How long does a haircut take?', 'A standard haircut takes about 45 minutes including wash and styling.', 'Services'),
  ('BUSINESS_ID', 'Do you offer home services?', 'Currently we serve only at our salon location.', 'Services'),
  ('BUSINESS_ID', 'Can I cancel or reschedule?', 'Yes, free cancellation up to 2 hours before. Late cancellations may incur a fee.', 'Booking'),
  ('BUSINESS_ID', 'What brands do you use?', 'We use professional brands including Schwarzkopf, L''Oreal Professional, and OPI.', 'Services'),
  ('BUSINESS_ID', 'Do you have parking?', 'Yes, we have dedicated parking for customers.', 'General'),
  ('BUSINESS_ID', 'Do you offer gift vouchers?', 'Yes, gift vouchers available in denominations of ₹500, ₹1000, ₹2000, and ₹5000.', 'Billing'),
  ('BUSINESS_ID', 'What is your cancellation policy?', 'Cancel 2+ hours before for free. Within 2 hours, 50% charge applies.', 'Booking');
```

### Step 4: Create business hours

```sql
INSERT INTO business_hours (business_id, day_of_week, open_time, close_time, is_closed) VALUES
  ('BUSINESS_ID', 0, '10:00', '18:00', false),  -- Sunday
  ('BUSINESS_ID', 1, '09:00', '20:00', false),  -- Monday
  ('BUSINESS_ID', 2, '09:00', '20:00', false),  -- Tuesday
  ('BUSINESS_ID', 3, '09:00', '20:00', false),  -- Wednesday
  ('BUSINESS_ID', 4, '09:00', '20:00', false),  -- Thursday
  ('BUSINESS_ID', 5, '09:00', '21:00', false),  -- Friday
  ('BUSINESS_ID', 6, '09:00', '21:00', false);  -- Saturday
```

### Step 5: Create AI configuration

Set the AI greeting and behavior parameters for the business. This is typically done through the database or environment configuration that controls the LangGraph flow.

### Step 6: Verify (no admin access to create — dashboard is open)

Admin pages are currently publicly accessible at `/[slug]/admin`. No account creation needed. Authentication will be rebuilt later.

### Step 7: Verify

- Visit `https://nuvoraos.vercel.app/glamour-salon`
- Visit `https://nuvoraos.vercel.app/glamour-salon/services`
- Visit `https://nuvoraos.vercel.app/glamour-salon/booking`
- Visit `https://nuvoraos.vercel.app/glamour-salon/faq`
- Visit `https://nuvoraos.vercel.app/glamour-salon/admin`
- Start a chat and ask a FAQ question
- Book a test appointment
- Verify appointment appears in admin

## Method C: Using the Onboarding Wizard (UI)

The wizard at `https://nuvoraos.vercel.app/ops/onboarding` provides a step-by-step UI for creating a new business. It handles business creation, services, FAQs, hours, AI greeting, and publishing — all from one flow.

1. Visit `/ops/onboarding`
2. Enter business info (name, slug, contact details)
3. Add services (name, description, duration, price)
4. Add FAQs (question, answer)
5. Set business hours (one record per day)
6. Configure AI greeting message
7. Review and publish

The wizard creates all records automatically and validates each step before publishing.

## Method B: Using API Endpoints

If the backend is running, you can use API calls instead of SQL.

```bash
# 1. Create business
curl -X POST https://frontdeskos.onrender.com/api/businesses \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "name": "Glamour Salon",
    "slug": "glamour-salon",
    "tagline": "Where Beauty Meets Elegance",
    "phone": "+91 87654 32109",
    "email": "hello@glamoursalon.in",
    "address": "456, Indiranagar, Bangalore"
  }'

# Save the business ID from the response.

# 2. Add services (repeat for each service)
curl -X POST https://frontdeskos.onrender.com/api/businesses/ID/services \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"name": "Haircut & Style", "description": "...", "duration": 45, "price": 599}'

# 3. Add FAQs
curl -X POST https://frontdeskos.onrender.com/api/businesses/ID/faqs \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"question": "What are your hours?", "answer": "..."}'

# 4. Add business hours
curl -X POST https://frontdeskos.onrender.com/api/businesses/ID/hours \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"day_of_week": 1, "open_time": "09:00", "close_time": "20:00"}'

# 5. (Admin access skipped — dashboard is publicly accessible)
# Authentication will be rebuilt later.
```

The API key is configured in your backend `.env` as `ADMIN_API_KEY`. It must match the frontend's `ADMIN_API_KEY` in `.env.local`. If they don't match, the API returns "Unauthorized".

---

### Founder Checklist

- [ ] I can create a complete tenant using SQL in under 30 minutes
- [ ] I can create a complete tenant using API calls in under 15 minutes
- [ ] I have both methods documented and available
- [ ] I know the Minimum Information Required and get it before starting
- [ ] I have a verification checklist to confirm the tenant is fully operational

---

# SECTION 9 — How The AI Receptionist Works

From an operator perspective. No code.

## The AI is always listening

When a customer visits any page on the tenant website, the AI chat widget is there. It loads automatically. It greets the customer based on the configured greeting message.

## What the customer experiences

1. Customer lands on website
2. Chat widget appears in bottom corner
3. AI sends greeting: "Hi! Welcome to [Business Name]. How can I help?"
4. Customer types a question or selects from suggested prompts
5. AI processes the message and responds

## What the AI can do

| Customer Request | AI Action | Result |
|-----------------|-----------|--------|
| "What are your hours?" | Looks up business hours from FAQs | Answers with correct hours |
| "How much is a haircut?" | Looks up service from FAQs or services | Answers with price |
| "I want to book an appointment" | Initiates booking flow | Collects info and creates appointment |
| "I need to cancel" | Initiates cancellation flow | Cancels appointment or escalates |
| "I need to reschedule" | Initiates reschedule flow | Reschedules or escalates |
| "Do you offer XYZ?" | Searches FAQs and services | Answers or escalates |
| Customer is angry/confused | Detects emotion | Escalates to human |
| Customer asks something unusual | Cannot find answer | Escalates to human |

## How the AI thinks

The AI follows a conversation flow. It classifies each customer message into one of these intents:

- **Greeting** — Customer says hi. AI responds with greeting.
- **Information** — Customer asks a question. AI searches FAQs + services for answer.
- **Pricing** — Customer asks about cost. AI responds with service pricing.
- **Lead Capture** — Customer shows interest but doesn't book. AI captures contact info.
- **Booking** — Customer wants to schedule. AI collects service, date, time, and contact info.
- **Reschedule** — Customer wants to change existing appointment. AI handles or escalates.
- **Cancellation** — Customer wants to cancel. AI handles or escalates.
- **Escalation** — AI cannot handle or customer is frustrated. AI creates escalation record.
- **Unknown** — AI cannot classify intent. AI asks clarifying questions or escalates.

## What the business owner should expect

- **Most conversations are information requests.** Customers ask about hours, pricing, location. The AI handles these autonomously.
- **Some conversations become leads.** Customer says "I'm interested" but doesn't book. Lead is captured and appears in dashboard.
- **Some conversations become appointments.** Customer completes the booking flow. Appointment appears in dashboard.
- **Some conversations become escalations.** AI cannot answer, or customer is frustrated. Escalation appears in dashboard.
- **The AI improves over time.** When the owner adds more FAQs, the AI can answer more questions.

## What the business owner should NOT expect

- The AI will not answer questions not in the FAQs. If the FAQ doesn't cover it, the AI says "I don't know" and escalates.
- The AI will not make phone calls. It only handles chat on the website.
- The AI will not handle every emotional situation. If a customer is angry or confused, it escalates.
- The AI will not work perfectly on day one. It needs FAQ updates as new questions come in.

---

### Founder Checklist

- [ ] I can explain what the AI does and doesn't do
- [ ] I understand the 9 conversation intents and what triggers each
- [ ] I know that AI quality = FAQ quality
- [ ] I can explain to an owner why the AI escalated a conversation
- [ ] I can guide an owner on how to improve their AI over time

---

# SECTION 10 — What Happens Behind The Scenes

Operational view. What changes in the system when events occur.

## When a Lead is Captured

**What triggers it**: Customer shows interest but doesn't book. Options: customer asks about services without booking, customer provides contact info but doesn't complete booking, AI determines customer is researching.

**What happens in the system**:
- A new `lead` record is created
- Lead status is set to "new"
- Lead includes source (chat widget), customer name, contact info, and service interest

**What appears in dashboard**:
- Dashboard lead count increases by 1
- New row appears in the Leads table
- Lead status shows "new" — needs attention

**What the owner should do**:
- View the lead details
- Contact the customer (phone/email — outside the system)
- Update lead status to "contacted" once reached
- Update to "converted" if customer books

**What can go wrong**:
- Lead captured but no contact info (if customer didn't provide)
- Lead captured but source not tracked (can't measure where leads come from)
- Owner doesn't see the lead (doesn't check dashboard)

**How to verify**:
- Check the Leads page — new lead should appear
- Verify the lead has name, contact, and service interest

---

## When an Appointment is Booked

**What triggers it**: Customer completes the booking flow (selects service → date → time → enters contact info → confirms).

**What happens in the system**:
- A new `appointment` record is created
- Status is set to "pending" (needs owner confirmation)
- A new `customer` record is created if this is a first-time customer
- A `conversation` record captures the interaction
- A `follow_up` record may be created for reminders

**What appears in dashboard**:
- Dashboard appointment count increases by 1
- New row in Appointments table
- Customer info linked to the appointment

**What the owner should do**:
- View the appointment
- Confirm the appointment (change status to "confirmed")
- Prepare for the customer's visit
- Send a reminder (follow-up) closer to the date

**What can go wrong**:
- Double-booking (if slot management is not working correctly)
- Customer enters wrong contact info
- Time slot in wrong timezone
- Appointment created but not reflected in dashboard (sync issue)

**How to verify**:
- Check the Appointments page — new appointment should appear with correct service, date, time, and customer
- Try booking from the customer side and confirm it shows in admin

---

## When an Appointment is Cancelled

**What triggers it**: Customer requests cancellation through the AI or owner cancels through admin.

**What happens in the system**:
- Appointment status changes to "cancelled"
- The time slot becomes available again for other customers
- A cancellation record is logged

**What appears in dashboard**:
- Appointment status shows "cancelled"
- Dashboard may show cancellation stats over time

**What the owner should do**:
- Review the cancellation reason (if provided)
- Update lead status for that customer (may want to follow up)
- Consider whether to reach out and rebook

**What can go wrong**:
- High cancellation rate indicates a problem (pricing, service quality, hours issues)
- Cancelled appointments not freeing up slots (system bug)

**How to verify**:
- Check the appointment status shows "cancelled"
- Attempt to book the same time slot — it should be available

---

## When an Escalation is Triggered

**What triggers it**: AI cannot answer the customer's question, customer is frustrated or angry, customer asks to speak to a human, AI confidence is below threshold.

**What happens in the system**:
- A new `escalation` record is created
- The full conversation history is attached to the escalation
- Status is set to "pending"
- The customer is told a human will follow up

**What appears in dashboard**:
- Dashboard escalation count increases by 1
- New row in Escalations table
- Owner can view the full conversation transcript

**What the owner should do**:
- View the escalation immediately (this is urgent — customer needs human help)
- Read the conversation history
- Contact the customer via phone/email
- If the question can be answered via FAQ, add the answer to FAQs
- Mark escalation as "resolved" once handled

**What can go wrong**:
- Owner doesn't check escalations (customer feels ignored)
- Escalations pile up (AI needs FAQ improvements)
- Owner doesn't add missing FAQ answers (same questions escalate repeatedly)

**How to verify**:
- Check the Escalations page — new escalation appears with conversation history
- After resolution, mark as "resolved" and confirm it moves out of pending

---

## When a Follow-up is Triggered

**What triggers it**: A lead hasn't been contacted for X days. An appointment is coming up (reminder). A customer hasn't visited in Y weeks. The system has automated follow-up rules configured.

**What happens in the system**:
- A new `follow_up` record is created
- Status is set to "scheduled"
- When sent, status updates to "sent"
- If delivery fails, status updates to "failed"

**What appears in dashboard**:
- Dashboard may show pending follow-ups
- Follow-ups page shows all scheduled and sent follow-ups
- Owner can see which follow-ups were delivered and which failed

**What the owner should do**:
- Review follow-up performance (are they working?)
- Check failed deliveries and correct issues
- Consider customizing follow-up messages

**What can go wrong**:
- Follow-ups not being sent (system issue)
- Follow-ups going to wrong contact info
- Customers not responding to follow-ups (message quality issue)

**How to verify**:
- Check the Follow-ups page — scheduled follow-ups should show "scheduled" status
- After trigger time, check they show "sent"
- Check delivery status if available

---

### Founder Checklist

- [ ] I know what happens in the system when a lead is captured
- [ ] I know what happens when an appointment is booked
- [ ] I understand the escalation workflow and why it's urgent
- [ ] I know how follow-ups work and what can go wrong
- [ ] I can diagnose issues by checking the relevant dashboard page

---

# SECTION 11 — Daily Operations

If you run Nuvora every day, here is what to check.

## Morning Checklist

Every business day, do this:

- [ ] Check the backend is running (visit `https://frontdeskos.onrender.com/api/health`)
- [ ] Check the frontend is running (visit `https://nuvoraos.vercel.app/`)
- [ ] For each active client:
  - [ ] Check their Escalations page — any pending escalations from overnight?
  - [ ] Check their Appointments page — confirm today's schedule is correct
  - [ ] Check their Leads page — any new leads that need follow-up?
  - [ ] Check their Knowledge Requests — any unanswered questions to add to FAQs?

**Time required**: 5 minutes per client (for current scale). Does not scale beyond 10 clients without automation.

**What to look for**:
- Escalations that have been pending for more than 24 hours (this is bad)
- Appointments that show no customer contact info (data quality issue)
- Leads that are days old and still "new" (owner not engaging)

## Weekly Checklist

Once per week:

- [ ] Review all escalations from the week — identify patterns
- [ ] Review all knowledge requests — update FAQs for repeated questions
- [ ] Check all client dashboards — are owners logging in?
- [ ] Review appointment no-show rate — any patterns?
- [ ] Check backend logs for errors (via Render dashboard)
- [ ] Review Supabase database size and usage

**Time required**: 15-30 minutes.

**What to look for**:
- Same questions escalating repeatedly — this means FAQs need updating
- Owners not logging in — they need a check-in call
- Backend errors — 500 errors, timeout issues
- Database growing faster than expected

## Monthly Checklist

Once per month:

- [ ] Full operational review for each client
- [ ] Review lead conversion rate (leads → appointments → customers)
- [ ] Review AI performance (what % of conversations handled without escalation?)
- [ ] Client satisfaction check-in call
- [ ] Review and update any gap documentation
- [ ] Check for software updates (backend, frontend, dependencies)
- [ ] Review infrastructure costs (Render, Supabase, Vercel)
- [ ] Plan next month's onboarding targets

**Time required**: 1-2 hours.

---

### Founder Checklist

- [ ] I have a morning routine for checking system health
- [ ] I have a weekly routine for deeper review
- [ ] I have a monthly routine for strategic review
- [ ] I know what to look for at each interval
- [ ] I understand that the current process does not scale well beyond 10 clients

---

# SECTION 12 — Troubleshooting

## Scenario 1: "The chatbot isn't responding"

**First Thing To Check**: Is the chat widget visible on the page?
- Visit the tenant page
- Look for the chat widget in the bottom corner
- If not visible: check if the page has an error in browser console (F12)

**Second Thing To Check**: Is the backend running?
- Visit `https://frontdeskos.onrender.com/api/health`
- If health endpoint returns an error, the backend is down

**Verification Step**: 
- If backend is down: Check Render dashboard for service status. The free tier may have spun down due to inactivity. A request should wake it up within 30-60 seconds.
- If chat widget is missing: Check if the chat component is properly included in the tenant page. This could be a deployment issue.
- If chat widget shows but doesn't respond: Check the AI configuration for this business. The AI might be in a broken state.

---

## Scenario 2: "Appointments aren't appearing"

**First Thing To Check**: Are there appointments in the database?
- Open Supabase console
- Query: `SELECT * FROM appointments WHERE business_id = 'X' ORDER BY created_at DESC`

**Second Thing To Check**: Is the booking flow working?
- Visit `/[slug]/booking`
- Try to book an appointment as a customer
- Does the flow complete? Does it show an error?

**Verification Step**:
- If appointments exist in DB but not showing in dashboard: Frontend issue. Check if the admin page is loading the data correctly. Look for errors in the browser console.
- If booking flow fails: Check if services exist. Check if business hours are configured. Check if there's a timezone issue.
- If no appointments in DB: The booking flow is not creating appointments. Check the backend logs for errors during booking creation.

---

## Scenario 3: "Dashboard is empty"

**First Thing To Check**: Is the dashboard loading at all?
- Visit `/[slug]/admin`
- Does the page load? Is there an error message?

**Second Thing To Check**: Does the business have any data?
- Open Supabase console
- Check `leads`, `appointments`, `escalations`, `follow_ups` for this business
- If all tables are empty: The business is new and has no activity yet. This is normal.
- If tables have data but dashboard shows empty: Frontend data loading issue.

**Verification Step**:
- If dashboard doesn't load: Admin access issue. Check the `admin_users` record for this business and this user.
- If data exists but not displayed: Check browser console for API errors. The frontend might be unable to fetch data from the backend.
- If truly no data: This is correct for a new business. The dashboard will populate as customers interact.

---

## Scenario 4: "Follow-ups are not being sent"

**First Thing To Check**: Are there follow-up records in the database?
- Query: `SELECT * FROM follow_ups WHERE business_id = 'X' ORDER BY scheduled_date DESC`

**Second Thing To Check**: Are follow-ups being created but not sent?
- Check the status of recent follow-up records
- If status is "scheduled" and scheduled date is past: The sending mechanism is failing
- If no follow-up records exist: The follow-up creation trigger is not working

**Verification Step**:
- Follow-ups are handled by the backend. Check backend logs for errors related to follow-up processing.
- Verify that the follow-up schedule is configured for this business.
- Some follow-ups may depend on a cron job or scheduler. Check if that component is running.

---

## Scenario 5: "Business owner cannot access admin panel"

**First Thing To Check**: Is the URL correct?
- Verify the admin URL: `https://nuvoraos.vercel.app/[correct-slug]/admin`
- Common mistake: wrong slug or wrong URL structure

**Second Thing To Check**: Does the admin access record exist?
- Query: `SELECT * FROM admin_users WHERE business_id = 'X' AND email = 'owner@email.com'`
- If no record: Admin access was never created
- If record exists: The authentication middleware might not recognize it

**Verification Step**:
- If no record: Create the `admin_users` record
- If record exists but access denied: Check the middleware logic. The admin system currently uses middleware-level authentication. Verify that the middleware is not blocking the request.
- If middleware is the issue: This may require a fix to the backend/frontend code.

---

## Scenario 6: "Leads are not showing up"

**First Thing To Check**: Has any customer interacted with the website?
- Without customer traffic, there will be no leads. Ask the owner: "Have you shared the website with anyone?"
- Check if the website URL is correct and accessible

**Second Thing To Check**: Is lead capture working?
- Visit the tenant page as a customer
- Start a chat and show interest ("I'm looking for a haircut")
- Does the AI capture your information?
- Check if a lead was created after the test interaction

**Verification Step**:
- If AI chat works but leads aren't created: The lead capture flow in the AI is broken
- If AI chat doesn't work: Backend or AI configuration issue (see Scenario 1)
- If there's genuinely no traffic: Marketing issue, not a technical issue

---

## Scenario 7: "The AI is giving wrong answers"

**First Thing To Check**: What question was asked and what answer was given?
- The owner should show you the conversation transcript
- Check if the correct FAQ exists for this question

**Second Thing To Check**: If the FAQ exists, why did the AI not use it?
- Check the FAQ content — is it clear and specific?
- Check if there are conflicting FAQs that might confuse the AI
- Check if the question was asked in a way the AI didn't understand

**Verification Step**:
- If FAQ is missing: Add the correct answer to FAQs
- If FAQ is incorrect: Update the FAQ with the correct information
- If FAQ exists but AI ignored it: This is an AI behavior issue. The LangGraph flow may need adjustment.
- After fixing, test by asking the same question and verify the AI gives the correct answer.

---

## General troubleshooting principles

1. **Always check the obvious first**: Is the server running? Is the URL correct? Is the data there?
2. **Reproduce the issue as a customer**: Walk through the exact flow the customer followed
3. **Check the database**: If something isn't showing, it's either not being created or not being displayed. Check the DB to determine which.
4. **Check the logs**: The backend logs (Render dashboard) are your best debugging tool
5. **Test with a known working client**: Compare against a business that works correctly to isolate the issue

---

### Founder Checklist

- [ ] I have a troubleshooting playbook for each common issue
- [ ] I know the First Thing To Check for each scenario
- [ ] I can reproduce issues as a customer to diagnose
- [ ] I know how to check the database directly for data issues
- [ ] I know when an issue is a code bug vs a configuration problem

---

# SECTION 13 — Demo Script

## Demo to a Gym

**Pages to open**:
1. `https://nuvoraos.vercel.app/` (marketing site — start here)
2. A gym tenant page (e.g., a demo page if one exists)
3. The admin dashboard

**Script**:

"Nuvora is an AI receptionist for gyms. Let me show you how it works."

1. **Start on the marketing site hero section.**
   - "This is what your potential customers see when they find Nuvora."
   - "The message is simple: AI receptionist for your gym. Never miss a lead."

2. **Scroll through How It Works.**
   - "Lead walks in → AI handles them → Appointment booked → Customer served."
   - "Three steps. Zero human involvement for 80% of conversations."

3. **Show the gym-specific solution card.**
   - "This is built for gyms. Memberships, trial sessions, class bookings."
   - "Your customers ask the same questions every day. The AI answers them."

4. **Open the demo tenant page.**
   - "Your gym gets a professional website like this."
   - "Customers can see services, book appointments, and ask questions."
   - "Show the chat widget. Open it. Ask: 'How much is a membership?'"
   - "The AI responds instantly. 24/7. Even when you're sleeping."

5. **Book a fake appointment.**
   - "Watch this. I'll book a trial session right now."
   - Select service → pick date → pick time → enter info → confirm.
   - "Done. 2 minutes. No phone call. No front desk."

6. **Open the admin dashboard.**
   - "And here's what you see on your end."
   - Show leads page: "Every person who asked a question but didn't book."
   - Show appointments page: "Every booking that came through."
   - Show escalations: "The few conversations the AI couldn't handle."

7. **Close with the value proposition.**
   - "For gym owners: you're losing leads every day because no one answers the phone at 9 PM."
   - "Nuvora answers them. Books them. Follows up. All automatically."
   - "You just check your dashboard in the morning and see who's coming in today."

**What to emphasize**:
- 24/7 availability
- No extra staff needed
- Instant booking
- Dashboard visibility into every lead

---

## Demo to a Salon

**Different pages**: Same structure but use salon-specific examples.

**Different emphasis**:
- "Salon customers browse services before booking. Your AI can answer 'How much is a haircut?' instantly."
- "Bridal packages, skin treatments, nail art — the AI can explain and book all of them."
- "Your busiest time is evenings and weekends. The AI handles the booking rush while your receptionist is hands-on with a client."

**Different talking points**:
- Stylist selection (if your system supports it)
- Service menu browsing
- Last-minute booking availability

---

## Demo to a Spa

**Different emphasis**:
- "Spa customers often have questions about packages, durations, and what's included."
- "The AI can explain the difference between a Swedish massage and a deep tissue massage."
- "Gift card inquiries? The AI handles them."
- "Booking a couple's massage? Handled."

**Different pages to open**:
- Focus on services with longer descriptions
- Show the booking flow for a package

---

## Demo to a Dental Clinic

**Different emphasis**:
- "Dental patients need to know procedures, costs, insurance, and appointment duration."
- "The AI answers: 'How much is a root canal?' 'Do you accept my insurance?' 'What's the recovery time?'"
- "Emergency appointments get flagged and escalated immediately."
- "New patient intake can start through the chat."

**Different talking points**:
- Serious tone (medical context)
- Insurance/coverage questions
- Emergency handling
- Follow-up reminders for regular checkups

---

### General Demo Principles

1. **Always start with the problem**: "You're losing leads every day when no one answers."
2. **Show, don't tell**: Book a real appointment. Show the real dashboard.
3. **Let them touch it**: Ask the prospect to ask the AI a question themselves.
4. **Handle objections upfront**: "Yes, you need to add your FAQs. Yes, the occasional escalation still needs you. But 80% is handled."
5. **Close with a clear next step**: "Let's get you set up. I need some information."

---

### Founder Checklist

- [ ] I have a demo script memorized for gyms
- [ ] I have adapted talking points for salons, spas, and dental clinics
- [ ] I can show the complete flow: visitor → AI → lead → booking → dashboard
- [ ] I can handle common objections during a demo
- [ ] I always close with a clear next step

---

# SECTION 14 — Current Gaps

Brutally honest assessment.

## Manual Processes (Not Scalable)

| Process | Current State | Why It's a Problem |
|---------|--------------|-------------------|
| **Tenant creation** | Manual SQL or API calls | Every new client requires manual work. No self-service. |
| **Admin access** | Manual database insert | No signup, no password reset, no self-service. |
| **Billing** | Does not exist | Zero revenue collection. Cannot charge clients. |
| **Onboarding** | Entirely manual | You must do everything. No automated setup. |
| **Client support** | Direct contact only | No ticket system, no knowledge base for clients. |
| **Lead follow-up** | Manual for you | Demo leads come in but no automated outreach from you. |
| **Monitoring** | Manual checking | No automated alerts for backend issues. |

## Missing Features

| Feature | Impact |
|---------|--------|
| **Authentication system** | Owners cannot sign in/out independently. No security. |
| **Multi-role admin** | Cannot give staff limited access. |
| **Multi-business dashboard** | You cannot see all clients from one view. |
| **Automated billing** | Cannot charge clients. Zero revenue. |
| **Self-service onboarding** | You must do every onboarding personally. |
| **Email notifications** | Owners must manually check dashboard. No alerts. |
| **Analytics** | No lead conversion reports, no AI performance metrics. |
| **SMS/WhatsApp integration** | Follow-ups only go through chat. No phone-based outreach. |
| **Tenant custom domain** | Businesses cannot use their own domain. |
| **Mobile app** | Owners cannot manage on mobile. |
| **Public listing/directory** | No way for customers to discover businesses. |

## What Would Break at Scale

**At 5 businesses**:
- Morning checklist takes 25 minutes. Doable but annoying.
- Manual tenant creation is still manageable (one every few weeks).

**At 20 businesses**:
- Morning checklist takes 1.5 hours. Not sustainable.
- No multi-business dashboard — you need to visit 20 separate admin pages.
- Any backend issue affects all 20 clients simultaneously.
- Manual tenant creation becomes a significant time sink.
- No automated billing means no revenue to hire help.

**At 50 businesses**:
- System collapses without automation.
- Cannot manage without multi-business view.
- Backend on a single server (Render free tier) will not handle the load.
- No queue/task system means follow-ups and escalations will be unreliable.
- No proper monitoring means you won't know something is broken until a client complains.

**At 100 businesses**:
- Requires: proper infrastructure (load balancing, multiple servers), queue system, automated billing, multi-tenant admin dashboard, self-service onboarding, automated monitoring/alerting, dedicated support system, full-time team.

## Single Biggest Bottleneck

> **The product works. The business system does not.**

You have a functional product that can handle conversations, capture leads, and book appointments. What you don't have is the operational infrastructure to acquire, onboard, bill, and support clients at scale.

No billing = no revenue = no hiring = everything falls on you.

No self-service onboarding = you are the bottleneck for every new client.

No multi-business view = you cannot manage more than a handful of clients.

The product is ready for 20 businesses. The operating system is not.

---

### Founder Checklist

- [ ] I understand every current gap in the system
- [ ] I know what breaks at 5, 20, 50, and 100 businesses
- [ ] I accept that no billing is the #1 problem
- [ ] I have internalized: product works, business system doesn't
- [ ] I can prioritize what to fix first based on impact

---

# SECTION 15 — Business Readiness Assessment

**Scoring: 0–100 for each category**

## Product Readiness: 70/100

**What works**: AI receptionist handles information, lead capture, and booking. Tenant website is professional. Admin dashboard shows relevant data. Chat widget works across all pages.

**What's missing**: Analytics, reporting, email notifications, multi-business view for you, custom domains, mobile access, proper authentication.

**Verdict**: The product is good enough to sell today. Customers get value. But power features are missing.

## Sales Readiness: 20/100

**What works**: Marketing site explains the product. Demo flow works.

**What's missing**: No pricing page with actual prices. No billing system. No CRM for tracking prospects. No automated demo booking follow-up. No sales collateral (case studies, pitch deck, comparison sheets). No way to charge customers.

**Verdict**: Cannot sell in any real sense. You can demonstrate but not transact.

## Onboarding Readiness: 15/100

**What works**: The workflow is documented (in this manual). You can onboard a business in ~2 hours.

**What's missing**: No self-service onboarding. No admin UI for tenant creation. Every step requires SQL or API calls. No templates to speed up setup. No automated verification.

**Verdict**: Onboarding is a manual craft, not a process. Does not scale.

## Operational Readiness: 10/100

**What works**: You can check system health manually. You can troubleshoot with this manual.

**What's missing**: No monitoring. No alerts. No multi-business dashboard. No support system. No automated health checks. No backup verification process. No SLA you can commit to.

**Verdict**: Operating Nuvora is a part-time job that becomes a full-time job at 5 clients.

## Scalability Readiness: 5/100

**What works**: The technical architecture (Next.js + Express + Supabase) can scale with investment.

**What's missing**: Single-server backend. No queue system. No caching. No CDN strategy. No automated scaling. No database connection pooling tuned for many tenants. No separation of concerns (AI processing could block API responses).

**Verdict**: Works for a demo. Works for a few clients. Breaks at any real scale.

---

## Overall Readiness: 24/100

The product exists and works. The business to sell, onboard, bill, and support it does not.

---

### Founder Checklist

- [ ] I understand each readiness score and why it's that number
- [ ] I know what needs to improve to raise each score
- [ ] I accept the overall 24/100 assessment
- [ ] I can prioritize which score to improve first based on business goals

---

# SECTION 16 — First Customer Simulation

Assume you close a gym tomorrow. "Peak Performance Gym." Here is every action you take.

## Step 1: Discovery Call

**Situation**: Rajesh (owner) found your website. He booked a demo. You're on a call.

**You say**:
- "Tell me about your gym. What do you offer?"
- "How do customers currently book? Phone? Walk-in?"
- "What questions do customers ask most?"
- "How many leads do you think you lose because no one answers?"

**Rajesh says**:
- Personal training, group classes, yoga, nutrition counseling
- Phone and walk-in only. No online booking.
- "What are your hours?" "How much is personal training?" "Do you have a free trial?"
- "Probably 5-10 people a week. We're busy during sessions and can't answer."

**You say**:
- "That's exactly what Nuvora solves. Imagine every one of those 5-10 people gets an instant response and books online."

## Step 2: Requirement Gathering

**You ask for**:
| Item | Rajesh's Answer |
|------|----------------|
| Business name | Peak Performance Gym |
| Desired slug | peak-performance-gym |
| Tagline | "Train Like an Athlete" |
| Phone | +91 98765 43210 |
| Email | info@peakperformance.in |
| Address | 123, MG Road, Bangalore |
| Hours | Mon-Fri 5AM-10PM, Sat 6AM-8PM, Sun 8AM-6PM |
| Services | Personal Training (₹1,500/session), Group Classes (₹500/class), Yoga (₹400/class), Nutrition Counseling (₹2,000/session), Trial Session (Free) |
| Owner name | Rajesh Kumar |
| Owner email | rajesh@peakperformance.in |

**Common FAQs you prepare**:
- Hours, pricing, free trial availability, parking, trainer qualifications, membership options, cancellation policy

## Step 3: Pricing Discussion

**You say**: "Currently we charge ₹X/month for the AI receptionist. Plus a one-time setup fee of ₹Y."

**Rajesh says**: "That seems reasonable. Let's do it."

**Important**: There is no billing system. You must handle payment outside the system (UPI, bank transfer, invoice). Track payments manually until billing is built.

## Step 4: Payment

**You do**:
1. Send Rajesh an invoice/manual payment request
2. Confirm payment received in your bank account
3. Note the payment in your own tracking (spreadsheet, notebook, whatever works)

## Step 5: Tenant Creation

**You do** (using Method B — API calls from Section 8):

```bash
# Create the business (ADMIN_API_KEY must match backend's .env value)
curl -X POST https://frontdeskos.onrender.com/api/businesses \
  -H "Content-Type: application/json" \
  -H "x-api-key: fdos_adm_8a3f9c2e1b7d4f6a8c0e2d4b6a8c0e2d" \
  -d '{"name": "Peak Performance Gym", "slug": "peak-performance-gym", "tagline": "Train Like an Athlete", "description": "Premium fitness center in Bangalore...", "phone": "+91 98765 43210", "email": "info@peakperformance.in", "address": "123, MG Road, Bangalore"}'
```

**Save the business ID** returned from the response.

## Step 6: Service Creation

**You do** (5 API calls or a batch if the API supports it):

```bash
# Personal Training
curl -X POST https://frontdeskos.onrender.com/api/businesses/ID/services \
  -H "Content-Type: application/json" \
  -H "x-api-key: fdos_adm_8a3f9c2e1b7d4f6a8c0e2d4b6a8c0e2d" \
  -d '{"name": "Personal Training", "description": "One-on-one training with certified coach", "duration": 60, "price": 1500}'

# Group Classes
curl -X POST ... -d '{"name": "Group Classes", "description": "HIIT, CrossFit, Zumba", "duration": 45, "price": 500}'

# Yoga
curl -X POST ... -d '{"name": "Yoga Session", "description": "Hatha and Vinyasa", "duration": 60, "price": 400}'

# Nutrition Counseling
curl -X POST ... -d '{"name": "Nutrition Counseling", "description": "Personalized diet plan", "duration": 45, "price": 2000}'

# Trial Session
curl -X POST ... -d '{"name": "Free Trial Session", "description": "Try before you commit", "duration": 30, "price": 0}'
```

**Verify**: Visit `https://nuvoraos.vercel.app/peak-performance-gym/services`

## Step 7: FAQ Creation

**You do** (10 API calls):

```bash
curl -X POST https://frontdeskos.onrender.com/api/businesses/ID/faqs \
  -H "Content-Type: application/json" \
  -H "x-api-key: fdos_adm_8a3f9c2e1b7d4f6a8c0e2d4b6a8c0e2d" \
  -d '{"question": "What are your opening hours?", "answer": "Mon-Fri 5AM-10PM, Sat 6AM-8PM, Sun 8AM-6PM"}'

# Repeat for all 10 FAQs
```

**Verify**: Visit `https://nuvoraos.vercel.app/peak-performance-gym/faq`

## Step 8: Hours Setup

**You do**:

```bash
# Monday-Friday
for day in 1 2 3 4 5; do
  curl -X POST https://frontdeskos.onrender.com/api/businesses/ID/hours \
    -H "Content-Type: application/json" \
    -H "x-api-key: fdos_adm_8a3f9c2e1b7d4f6a8c0e2d4b6a8c0e2d" \
    -d "{\"day_of_week\": $day, \"open_time\": \"05:00\", \"close_time\": \"22:00\", \"is_closed\": false}"
done

# Saturday
curl -X POST ... -d '{"day_of_week": 6, "open_time": "06:00", "close_time": "20:00", "is_closed": false}'

# Sunday
curl -X POST ... -d '{"day_of_week": 0, "open_time": "08:00", "close_time": "18:00", "is_closed": false}'
```

**Verify**: Visit the booking page — available slots should match business hours.

## Step 9: AI Setup

**You do**: Configure the AI greeting and behavior.

Set: "Hi! Welcome to Peak Performance Gym. I can help you with memberships, class schedules, personal training, and booking. How can I help you today?"

**You verify**: Open chat on the tenant page. The greeting message should appear.

## Step 10: Admin Handover

**You do**: No admin creation needed. The dashboard is publicly accessible at the admin URL.

**You verify**: Open `https://nuvoraos.vercel.app/peak-performance-gym/admin`. Dashboard loads.

## Step 11: First Test Lead

**You do** (manually, as a customer would):

1. Open an incognito browser
2. Visit `https://nuvoraos.vercel.app/peak-performance-gym`
3. Open the chat widget
4. Type: "Hi, I'm interested in personal training"
5. AI responds with info
6. Type: "Can I book a free trial?"
7. Complete the booking flow

**You verify**: Check the admin dashboard at `peak-performance-gym/admin` — a new lead and appointment should appear.

## Step 12: First Test Booking

**You do**: Same as above — complete the booking flow as a customer.

**You verify**: The appointment appears in the admin Appointments page with correct service, date, time, and customer info.

## Step 13: First Weekly Review

**You do**: One week after launch:
1. Call Rajesh
2. Ask: "How many leads have you gotten? Any escalations? Any questions from customers the AI couldn't answer?"
3. Check the dashboard to see real data
4. Add any missing FAQs based on actual customer questions
5. Confirm Rajesh knows how to use the dashboard
6. Ask for a testimonial if he's happy

---

### Founder Checklist

- [ ] I have walked through the complete first customer simulation
- [ ] I know every step from discovery call to weekly review
- [ ] I have the API commands ready for tenant creation
- [ ] I have the FAQ template ready for each industry
- [ ] I can complete the entire process in under 2 hours

---

# SECTION 17 — Business Owner Handover Guide

## What You Send the Client

After onboarding, send this to the business owner:

---

**Subject**: Your Nuvora is Live! 🎉

Hi [Owner Name],

Your AI receptionist is now active. Here's everything you need:

**Your Website**: https://nuvoraos.vercel.app/[slug]
**Your Dashboard**: https://nuvoraos.vercel.app/[slug]/admin

**What to do next:**

1. Visit your website and see how it looks
2. Open the chat widget and ask a question to test the AI
3. Log into your dashboard to see leads and appointments
4. Book a test appointment to see how the flow works

**How to use your dashboard:**

- **Leads** — People who've shown interest. Check daily. Contact them.
- **Appointments** — Booked services. Confirm them. Prepare for customers.
- **Escalations** — Conversations the AI couldn't handle. Check urgently.
- **Follow-ups** — Automatic reminders sent to customers.
- **Knowledge** — Questions the AI couldn't answer. Add answers to improve it.

**Need help?** Reply to this email or call me at [your number].

Best,
[Your Name]

---

## The 15-Minute Owner Training Script

Share your screen. Walk them through this exactly.

### Minute 0-2: Your Website

"Let me show you what your customers see."

1. Open their tenant website in browser
2. Scroll through the homepage
3. Point out: "This is your brand. Your services. Your hours."
4. "Everything here is powered by the information we set up."

### Minute 2-5: The AI Chat

"Now let's see the AI in action."

1. Open the chat widget
2. Ask: "What are your hours?" — AI answers
3. Ask: "How much is [service]?" — AI answers
4. "This is what every customer experiences. 24/7. No staff needed."
5. "The AI knows everything we put in the FAQs. If you want it to know more, add more FAQs."

### Minute 5-8: Book a Test Appointment

"Let's see what happens when someone books."

1. Go to the services page
2. Click "Book" on a service
3. Select a date and time
4. Enter test customer info
5. Confirm booking
6. "Done. 2 minutes. Now let's see where that appears."

### Minute 8-12: The Dashboard

"Here's your command center."

1. Open the admin dashboard
2. "This is where you'll start every day."
3. Show Leads: "Everyone who showed interest. Check this every morning."
4. Show Appointments: "The test booking we just made should be here."
5. Show Escalations: "The conversations the AI couldn't handle. Check this most urgently."
6. Show Follow-ups: "Automatic reminders. You don't need to do anything here."
7. Show Knowledge: "Questions the AI couldn't answer. Add these to FAQs to make the AI smarter."

### Minute 12-15: What to Do Daily

"Your daily routine — 5 minutes."

1. Morning: Check Escalations (handle urgent ones)
2. Check Appointments (see who's coming today)
3. Check Leads (contact new ones)
4. Weekly: Review Knowledge requests (add missing FAQs)
5. "That's it. The AI handles the rest."

### Close

"Any questions? I'll call you in a week to see how it's going. In the meantime, if anything breaks or you need help, just email/call me."

---

## Handover Checklist

- [ ] Website URL sent to client
- [ ] Admin URL sent to client
- [ ] Client understands dashboard pages
- [ ] Client has tested the AI chat
- [ ] Client has booked a test appointment
- [ ] Client knows daily routine
- [ ] 1-week follow-up scheduled

---

### Common Mistakes

- **Sending URLs without context**: The owner doesn't know what to do with them. Always pair URLs with the training script.
- **Assuming the owner will explore**: Most owners will not explore the dashboard. Walk them through it.
- **Not scheduling a follow-up**: The owner might not use the system. A 1-week check-in catches issues early.
- **Not verifying the owner can log in**: Always confirm they can access the admin panel during the training.

---

### Founder Checklist

- [ ] I have a handover template ready to send
- [ ] I have the 15-minute training script memorized
- [ ] I always schedule a 1-week follow-up
- [ ] I verify the owner can access their dashboard during training

---

# SECTION 18 — SOP Library

## SOP 1: Onboard a New Business

**Purpose**: Add a new client to Nuvora.

**Steps**:
1. Collect Minimum Information Required (see Section 8)
2. Create business record (API or SQL)
3. Save returned business ID
4. Create minimum 3-5 services
5. Create minimum 10 FAQs
6. Create business hours (all 7 days)
7. Configure AI greeting message
8. Create admin access for owner
9. Verify website (visit all pages)
10. Verify AI chat (test 3 questions)
11. Book test appointment (verify in admin)
12. Send handover email with URLs
13. Schedule 15-min training call
14. Schedule 1-week follow-up

**Time**: ~2 hours per client.

---

## SOP 2: Update Services

**Purpose**: Add, modify, or remove services for an existing client.

**Steps**:
1. Get the business ID (from existing records)
2. Identify which service needs changing
3. If adding: Create new service record with name, description, duration, price
4. If modifying: Find the existing service ID and update the fields
5. If removing: Deactivate or delete the service record
6. Verify: Visit `/[slug]/services` and confirm the change is reflected
7. Verify: Try booking the modified service through the flow

**Note**: Removing a service may affect existing appointments with that service. Handle with care.

---

## SOP 3: Update FAQs

**Purpose**: Add or modify FAQ entries to improve AI responses.

**Steps**:
1. Check Knowledge Requests in the admin dashboard — these are questions the AI couldn't answer
2. Write clear, accurate answers
3. Create new FAQ records linked to the business ID
4. Categorize the FAQ (e.g., Booking, Pricing, Services, General)
5. Verify: Start a chat on the tenant website and ask the question
6. Verify: The AI should now answer correctly

**Best practices**:
- Answers should be 1-3 sentences
- Include specific details (prices, hours, policies)
- Use natural language (how a receptionist would answer)

---

## SOP 4: Change Business Hours

**Purpose**: Update the operating hours for a client.

**Steps**:
1. Get the business ID
2. Get the current hours records
3. For each day that changed: Update the open_time, close_time, or is_closed flag
4. Verify: Visit the booking page — available slots should reflect new hours
5. Verify: The FAQ "What are your hours?" should still be correct (update separately if needed)

**Note**: Changing hours may affect existing appointments. If hours are being reduced, check if any existing appointments fall outside new hours and handle them.

---

## SOP 5: Reset AI Configuration

**Purpose**: Fix a misconfigured or broken AI setup.

**Steps**:
1. Check the current AI greeting and configuration:
2. If the greeting is wrong: Update to the correct greeting message
3. If the AI is not responding: Check backend health
4. If the AI gives wrong answers: Review FAQs for incorrect information
5. If FAQ answers are wrong: Update the specific FAQ
6. If FAQs look correct: The AI model may need a reset (check backend logs)
7. Verify: Start a chat and test 5 common questions
8. Verify: Confirm escalation behavior works for unknown questions

---

## SOP 6: Troubleshoot Missing Appointments

**Purpose**: Diagnose and fix missing appointments in the dashboard.

**Steps**:
1. Check if appointments exist in the database
2. If appointments exist but not in dashboard: Frontend issue — check browser console for API errors
3. If appointments don't exist in DB: Booking flow is failing — test it as a customer
4. If booking flow fails: Check services exist, check hours are set, check for errors in the booking API
5. If booking flow works but appointment not created: Backend issue — check Render logs for booking creation errors
6. Fix the identified issue (missing data, backend error, frontend bug)
7. Verify: Book a test appointment and confirm it appears in dashboard

---

## SOP 7: Troubleshoot AI Failures

**Purpose**: Diagnose and fix AI chatbot failures.

**Steps**:
1. Check backend health: Visit `https://frontdeskos.onrender.com/api/health`
2. Check if the chat widget loads on the tenant page
3. If widget doesn't load: Check the page for JavaScript errors (browser console)
4. If widget loads but AI doesn't respond: Check the AI service configuration
5. If AI responds incorrectly: Check FAQ quality
6. If AI responds with "I don't know": Add the missing answer to FAQs
7. If AI is completely broken: Check Render logs for errors in the LangGraph flow
8. Verify: Ask the same question that was failing — should work now

---

## SOP 8: Offboard a Client

**Purpose**: Remove a client from Nuvora.

**Steps**:
1. Confirm with the client that they want to discontinue
2. Settle any outstanding payments (manual — no billing system)
3. Deactivate the business record (set status to "inactive" rather than deleting — preserves data)
4. Notify the client that their website and dashboard will stop working
5. Optionally, export their data (leads, appointments, customer list)
6. Remove admin access for their users
7. Document the reason for offboarding (valuable for product decisions)

**Do NOT delete data unless requested**. Keep records for potential reactivation or reference.

---

### Founder Checklist

- [ ] I have all 8 SOPs documented and accessible
- [ ] I have practiced each SOP at least once
- [ ] I know where to find SOPs quickly during an issue
- [ ] I update SOPs as processes change

---

# SECTION 19 — Revenue Operations

## How Nuvora Makes Money

**Currently**: Zero. There is no billing system. You are not charging anyone.

**How it should make money**: Monthly subscription fee per business for the AI receptionist, plus optional one-time setup fee.

## Suggested Pricing Model

| Tier | Price | Features |
|------|-------|----------|
| **Setup Fee** | ₹5,000–₹10,000 one-time | Tenant creation, service setup, FAQ creation, AI configuration, training |
| **Monthly** | ₹2,000–₹5,000/month | AI receptionist, website hosting, dashboard access, follow-ups |
| **Premium Add-ons** | TBD | Custom domain, advanced analytics, extra admin users, priority support |

## What Revenue Looks Like

| # Clients | Setup Revenue (₹5k each) | Monthly Revenue (₹3k avg) | Total Monthly |
|-----------|-------------------------|--------------------------|---------------|
| 1 | ₹5,000 | ₹3,000 | ₹3,000 |
| 5 | ₹25,000 | ₹15,000 | ₹15,000 |
| 10 | ₹50,000 | ₹30,000 | ₹30,000 |
| 20 | ₹1,00,000 | ₹60,000 | ₹60,000 |
| 50 | ₹2,50,000 | ₹1,50,000 | ₹1,50,000 |

To reach ₹1,00,000 monthly recurring revenue: ~33 clients at ₹3,000/month.

## Current Manual Costs

| Item | Cost | Notes |
|------|------|-------|
| Render hosting | ~$7-15/month | Backend API |
| Vercel hosting | Free tier | Frontend |
| Supabase | Free tier | Database |
| OpenAI/Groq API | Usage-based | AI model costs |
| Domain | ~₹1,000/year | For marketing site |

Total operational cost: ~₹3,000-5,000/month for small scale. Scales with AI usage.

## How a Client Moves from Lead to Paying Customer

```
Prospect discovers Nuvora
  ↓
Books demo (form on website)
  ↓
You contact them (manual follow-up)
  ↓
Discovery call
  ↓
You propose pricing (verbal/manual quote)
  ↓
Client agrees
  ↓
Client pays (bank transfer/UPI — no automated billing)
  ↓
You confirm payment (manually check bank)
  ↓
You onboard (Section 6 workflow)
  ↓
Client goes live
  ↓
You invoice them monthly (manual)
  ↓
Client pays monthly (manual)
```

The billing flow is 100% manual. Every single step requires your action.

## What is Manual vs Automated

| Activity | Current State |
|----------|--------------|
| Lead capture from website | Automated (AI chat → lead record) |
| Appointment booking | Automated (customer → booking flow → appointment record) |
| FAQ answering | Automated (AI → FAQ lookup → response) |
| Escalation | Automated (AI → escalation record) |
| Follow-ups | Semi-automated (records created, delivery depends on backend) |
| **Prospect follow-up** | **Manual — you** |
| **Pricing/discussions** | **Manual — you** |
| **Payment collection** | **Manual — you** |
| **Invoicing** | **Manual — you** |
| **Tenant creation** | **Manual — you** |
| **Onboarding** | **Manual — you** |
| **Client support** | **Manual — you** |
| **Monitoring** | **Manual — you** |

---

### Founder Checklist

- [ ] I understand the current revenue is ₹0
- [ ] I have a pricing model in mind
- [ ] I know that every billing step is manual
- [ ] I know how many clients I need to reach my revenue goals
- [ ] I have a plan for collecting payments (bank account, UPI, etc.)

---

# SECTION 20 — Scaling Plan

## What Breaks at Each Stage

### 5 Businesses

**Operational bottlenecks**:
- Morning check takes 25 minutes
- No multi-business view — visiting 5 separate dashboards
- Manual billing for 5 clients is manageable but annoying

**Technical bottlenecks**:
- Render free tier handles this fine
- Supabase free tier handles this fine
- No issues yet

**Hiring needs**: None

**Automation opportunities**:
- Single command or script to check all businesses health
- Batch API calls for common operations

### 20 Businesses

**Operational bottlenecks**:
- Morning check takes 1.5 hours — unsustainable
- Manual billing for 20 clients becomes a half-day task per month
- Manual tenant creation for new clients is painful
- Client support requests start coming in regularly

**Technical bottlenecks**:
- Render free tier may not handle 20 businesses with concurrent chat users
- LangGraph AI processing on single server could cause latency
- No proper logging makes debugging hard across 20 businesses
- Database queries may slow down without proper indexing

**Hiring needs**: Part-time support person for client communication

**Automation opportunities**:
- Multi-business admin dashboard (essential)
- Automated billing system (essential)
- Self-service onboarding (important)
- Monitoring/alerting setup (important)

### 50 Businesses

**Operational bottlenecks**:
- Cannot manage without multi-business dashboard
- Cannot onboard manually
- Client support becomes full-time job
- Churn starts if clients don't get timely support

**Technical bottlenecks**:
- Single server cannot handle 50 businesses
- No queue system → AI responses get slower
- Database needs proper connection pooling
- Vercel free tier exceeded — need Pro plan
- AI API costs significant — need monitoring

**Hiring needs**:
- Full-time support person
- Part-time developer for technical issues
- You move to sales and strategy

**Automation opportunities**:
- Automated onboarding flow
- Self-service dashboard for clients
- Automated health monitoring and alerts
- Client communication templates

### 100 Businesses

**Operational bottlenecks**:
- Need a team: sales, support, onboarding, operations
- Need proper company structure
- Need SLAs, escalation procedures, client management

**Technical bottlenecks**:
- Need load-balanced backend servers
- Need queue system (Redis/Bull) for async tasks
- Need CDN for frontend assets
- Need database read replicas
- Need full monitoring stack (logs, metrics, alerts)
- Need automated backups and disaster recovery

**Hiring needs**:
- 2-3 person team minimum
- Developer for technical maintenance
- Support person for client communication
- You focus on sales and growth

**Automation opportunities**:
- Everything should be automated by this point
- Self-serve client portal
- Automated billing with dunning
- Automated onboarding flows
- AI-powered support for common client questions

---

## What I Must Build Next (Ranked by ROI)

| Rank | What | Why | Effort | Impact |
|------|------|-----|--------|--------|
| 1 | **Billing system** | Zero revenue is existential risk. Cannot hire, cannot scale, cannot invest without revenue. | Medium | Critical |
| 2 | **Multi-business admin dashboard** | You cannot manage 20 separate dashboards. Need unified view. | Medium | High |
| 3 | **Self-service tenant creation UI** | You are the bottleneck for every new client. Need admin UI. | Medium | High |
| 4 | **Authentication system** | Owners need proper login. No security = no trust. | Medium | High |
| 5 | **Monitoring + alerts** | You discover issues when client complains. Need proactive alerts. | Low | High |
| 6 | **Email notifications for owners** | Owners won't check dashboard. Need email alerts for leads/escalations. | Low | High |
| 7 | **Sales CRM basics** | Track prospects through pipeline. Currently tracking in your head/notes. | Low | Medium |
| 8 | **Analytics/reporting** | Show owners their lead conversion, AI performance, booking trends. | Medium | Medium |
| 9 | **Queue system for AI** | Prevent slow responses under load. | Medium | Medium |
| 10 | **Custom domains** | Let businesses use their own domain. | Medium | Medium |

---

### Founder Checklist

- [ ] I know what breaks at 5, 20, 50, and 100 businesses
- [ ] I understand the ranked build list and why billing is #1
- [ ] I have a realistic view of when I need to hire
- [ ] I can plan my build order based on ROI

---

# SECTION 21 — Founder Knowledge Test

After reading this manual, test yourself.

## Part A — Operational Questions

Answer these 20 questions without looking at the manual.

1. A gym signs up today. What are the first 5 things you do?
2. Where do you verify appointments are being created?
3. How do you know lead capture is working?
4. What page does a business owner use most frequently?
5. What happens after an escalation is created?
6. What is the Minimum Information Required to onboard a new business?
7. How do you create admin access for a business owner?
8. What happens if a business has no FAQs configured?
9. How do you check if the backend is running?
10. What is the first thing you check when the chatbot isn't responding?
11. What is the difference between a lead and an appointment in the system?
12. How do you update business hours for a client?
13. What do you send a client during handover?
14. What is the most important page for a business owner to check daily?
15. How do follow-ups work and what can go wrong?
16. What is the current billing process?
17. What is the biggest bottleneck at 20 businesses?
18. What is the single biggest gap in Nuvora today?
19. How do you offboard a client?
20. Name three things that are manual that should be automated.

## Part B — Onboarding Simulation

### Fictional Business: "Peak Performance Gym"

| Detail | Value |
|--------|-------|
| Owner | Rajesh Kumar |
| Email | rajesh@peakperformance.in |
| Phone | +91 98765 43210 |
| Address | 123, MG Road, Bangalore |
| Hours | Mon-Fri 5AM-10PM, Sat 6AM-8PM, Sun 8AM-6PM |
| Personal Training | ₹1,500/session, 60 min |
| Group Classes | ₹500/class, 45 min |
| Yoga | ₹400/class, 60 min |
| Nutrition Counseling | ₹2,000/session, 45 min |
| Free Trial Session | Free, 30 min |
| Tagline | "Train Like an Athlete" |
| Desired Slug | peak-performance-gym |

**Your task**: Walk through every step of onboarding this business. Write out each action you would take, in order.

Check your answer against Section 16.

## Part C — Troubleshooting Simulation

For each scenario, write what you would check first, what you would check second, and how you would verify resolution.

1. **Scenario**: A gym owner calls you. "The chatbot stopped responding this morning."
   - First check:
   - Second check:
   - Verification:

2. **Scenario**: A salon owner says, "I had 3 bookings yesterday but they're not showing in my dashboard."
   - First check:
   - Second check:
   - Verification:

3. **Scenario**: A dental clinic owner says, "My dashboard is empty."
   - First check:
   - Second check:
   - Verification:

4. **Scenario**: A spa owner says, "Follow-ups are not being sent."
   - First check:
   - Second check:
   - Verification:

5. **Scenario**: A gym owner says, "I can't log into my admin panel."
   - First check:
   - Second check:
   - Verification:

6. **Scenario**: A salon owner says, "The AI gave a customer the wrong price for a haircut."
   - First check:
   - Second check:
   - Verification:

7. **Scenario**: A dental clinic says, "No leads are showing up even though we've had website visitors."
   - First check:
   - Second check:
   - Verification:

8. **Scenario**: A spa owner says, "Customers are booking appointments, but they're not appearing in my schedule."
   - First check:
   - Second check:
   - Verification:

9. **Scenario**: A gym owner says, "I added new FAQs but the AI still doesn't know the answers."
   - First check:
   - Second check:
   - Verification:

10. **Scenario**: A client calls you at 9 PM. "My entire website is down."
    - First check:
    - Second check:
    - Verification:

## Part D — Founder Readiness Score

Score yourself 0-100 on each dimension.

### Product Understanding (0-100)

Can you explain what Nuvora does in one sentence? Can you describe what the customer sees, what the owner sees, and what the AI handles?

**Score**: ___/100

### Operational Understanding (0-100)

Do you know what happens when a lead is captured, an appointment is booked, an escalation is triggered? Can you troubleshoot common issues?

**Score**: ___/100

### Onboarding Understanding (0-100)

Can you onboard a gym, salon, spa, or dental clinic without looking at the manual? Do you know every step, every record needed, and how to verify success?

**Score**: ___/100

### Troubleshooting Understanding (0-100)

Can you diagnose and fix the top 7 common issues? Do you know what to check first, second, and how to verify?

**Score**: ___/100

### Sales Understanding (0-100)

Can you demo Nuvora to any of the four target industries? Can you handle objections and close?

**Score**: ___/100

### Total Score: ___/500

### Scoring Guide

| Score | Meaning |
|-------|---------|
| 450-500 | You can run Nuvora independently. Time to scale. |
| 350-449 | You know the product but need practice. Reread weak sections. |
| 250-349 | You have gaps. Focus on low-scoring areas. |
| Below 250 | Reread this manual. Too many gaps to operate safely. |

---

### Founder Checklist

- [ ] I have taken the knowledge test
- [ ] I have scored myself honestly
- [ ] I have identified my weakest areas
- [ ] I have a plan to improve weak areas

---

# FRONTDESKOS AT A GLANCE

## Current Readiness Score

**Overall: 24/100**

| Dimension | Score | What It Means |
|-----------|-------|---------------|
| Product Readiness | 70/100 | Good enough to sell. Missing power features. |
| Sales Readiness | 20/100 | Can demo but cannot transact. |
| Onboarding Readiness | 15/100 | Manual craft, not a process. |
| Operational Readiness | 10/100 | No monitoring, no alerts, no multi-business view. |
| Scalability Readiness | 5/100 | Single server. No queue. No redundancy. |

## Biggest Risk

**Zero revenue.** The product works, the business system doesn't. Without billing, every hour you spend is an investment with no return. If you stop working on Nuvora for a month, nothing changes except you've spent another month with zero income from it.

## Biggest Opportunity

**AI receptionist for Indian service businesses is a real need.** Every gym, salon, spa, and dental clinic in India loses leads because they don't answer calls during business hours and have zero online booking. The product solves a real problem. First mover advantage in a fragmented market.

## Fastest Way to Reach First ₹10k MRR

3-4 clients at ₹2,500-3,000/month each.

**Action plan**:
1. Build zero billing infrastructure — just use UPI/bank transfer manually
2. Reach out to 10 gyms and salons in your network
3. Demo and close 3-4 in the first month
4. Invoice and collect manually via UPI
5. This is achievable in 30 days with no code changes

## Fastest Way to Reach First ₹50k MRR

17 clients at ₹3,000/month or 10 clients at ₹5,000/month.

**Action plan**:
1. Build: authentication system + multi-business dashboard (you need this to manage)
2. Sales: outreach to 50 businesses, demo, close
3. Onboard: use manual process but have it down to <1 hour per client
4. Billing: still manual (invest in automated billing at ₹1L MRR stage)
5. Timeline: 3-6 months with consistent sales effort

## Fastest Way to Reach First ₹1L MRR

33 clients at ₹3,000/month.

**Action plan**:
1. Build: automated billing system (priority #1)
2. Build: self-service onboarding UI (priority #2)
3. Build: monitoring + alerts (priority #3)
4. Hire: part-time support person
5. Sales: you focus entirely on sales, delegate onboarding and support
6. Timeline: 6-12 months

## Next 10 Actions You Should Take as Founder

Ranked by impact:

1. **Set a price and start charging.** Even ₹2,000/month. The product delivers value. Start collecting revenue. Use UPI/bank transfer manually. Do not wait for a billing system.
2. **Onboard 1-2 clients manually.** Prove the process works. Document everything (you already have this manual). Get feedback.
3. **Build the billing system.** This is your #1 technical priority. Nothing else matters if you can't collect money.
4. **Build a multi-business dashboard.** You cannot scale beyond 5 clients without this.
5. **Build authentication for owner admin access.** Self-service login for owners. Remove the middleware dependency.
6. **Set up monitoring and alerts.** You should know when the backend is down before your clients do.
7. **Create sales collateral.** One-pager, comparison sheet, case study from your first client, demo video.
8. **Get 10 paying clients.** Then you have real data, real feedback, and real revenue.
9. **Hire a part-time support person.** Frees you to focus on sales and product.
10. **Build automated onboarding UI.** Stop creating tenants manually via SQL/API.

## If I Had Only 30 Days

Focus on one thing: **get 3 paying clients at ₹2,500-3,000/month.** Do not build anything. Use manual processes. The goal is revenue validation.

Actions:
- Day 1-7: Contact 20 gyms/salons in your network
- Day 8-14: Demo to interested prospects
- Day 15-21: Close 3 clients, onboard them manually
- Day 22-30: Collect first payment, get feedback, do weekly review

If you cannot get 3 paying clients in 30 days, the problem is not the product — it's the sales process. Fix that first.

## If I Had Only ₹5,000

Use it for:
- AI API costs (Groq/OpenAI) — ₹2,000-3,000 covers a few months at small scale
- Business registration (GST, etc.) if not done — ₹1,000-2,000
- Don't spend on ads. Don't spend on tools. Don't spend on hosting (you have free tiers).

## If I Had Only One Client

- Deliver amazing service. They are your reference, your case study, your proof.
- Document everything about their setup. Use it as a template for future clients.
- Get a testimonial. Record a video if possible.
- Ask for referrals. "Know any other gym owners who need this?"
- Charge them properly. Do not give it away for free.

## If I Had Ten Clients

- Build or buy the multi-business dashboard. This is non-negotiable.
- Implement basic monitoring (uptime check every 5 minutes).
- Create a simple support process (email-based, respond within 4 hours).
- Set up automated billing or at minimum, batch invoice generation.
- Start tracking metrics: lead conversion, AI handling rate, escalations per business.

## If You Wanted ₹1L MRR

The sequence:

1. **Month 1**: Get 3 clients at ₹3,000. Revenue: ₹9k. Manual everything.
2. **Month 2**: Build billing system. Get 3 more clients. Revenue: ₹18k.
3. **Month 3**: Build multi-business dashboard. Get 4 more clients. Revenue: ₹30k.
4. **Month 4**: Build authentication + owner onboarding flow. Get 5 more clients. Revenue: ₹45k.
5. **Month 5**: Hire part-time support. Get 5 more clients. Revenue: ₹60k.
6. **Month 6**: Build self-service tenant creation. Get 8 more clients. Revenue: ₹84k.
7. **Month 7**: Get 5 more clients. Revenue: ₹99k → ₹1L MRR.

**Total clients needed**: ~33.

**Build investment**: ~3 months of focused development.

**Sales effort**: Consistent outreach — 50+ prospects contacted per month.

**Realistic timeline**: 6-12 months with consistent effort.

---

> **Final word**: The product works. The business doesn't yet. Build the business. Start charging. Everything else follows.
