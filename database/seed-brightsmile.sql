-- BrightSmile Dental - Demo Tenant Seed Data
-- Run AFTER database/schema.sql

INSERT INTO businesses (id, name, slug, business_type, archetype, phone, email, address, description, timezone, faqs, escalation_rules, appointment_settings)
VALUES (
  'b7a2f4c1-d93e-48d6-95bc-79f94eb97220',
  'BrightSmile Dental',
  'brightsmile-dental',
  'dental',
  'standard_clinic',
  '(555) 987-6543',
  'hello@brightsmiledental.com',
  '123 Main Street, Suite 200, Anytown, CA 90001',
  'BrightSmile Dental offers comprehensive, gentle dental care for the whole family, from routine cleanings to advanced cosmetic procedures.',
  'America/Los_Angeles',
  '[
    {"question": "What are your office hours?", "answer": "We are open Monday through Friday from 8 AM to 5 PM, and Saturdays from 9 AM to 2 PM."},
    {"question": "Do you accept my insurance?", "answer": "We accept most major PPO dental insurance plans. Give us a call and we will verify your coverage."},
    {"question": "What payment methods do you accept?", "answer": "We accept cash, credit cards, debit cards, and CareCredit financing."},
    {"question": "How often should I get a checkup?", "answer": "We recommend a checkup and cleaning every six months to maintain optimal oral health."},
    {"question": "Do you treat children?", "answer": "Yes, we welcome patients of all ages, starting from age 3."},
    {"question": "What should I expect at my first visit?", "answer": "Your first visit includes a comprehensive exam, X-rays if needed, a professional cleaning, and a personalized treatment plan."},
    {"question": "Is teeth whitening safe?", "answer": "Yes, professional teeth whitening is safe and effective when performed under dental supervision."},
    {"question": "Do you offer emergency appointments?", "answer": "Yes, we reserve same-day slots for dental emergencies. Call us right away if you have severe pain or swelling."},
    {"question": "What is Invisalign and how does it work?", "answer": "Invisalign uses a series of clear, removable aligners to gradually straighten your teeth. Treatment typically takes 6-18 months."},
    {"question": "Can you help with dental anxiety?", "answer": "Absolutely. We offer nitrous oxide (laughing gas), oral sedation, and a calming environment to help anxious patients feel comfortable."}
  ]'::jsonb,
  '{
    "autoEscalateKeywords": ["pain", "emergency", "bleeding", "infection", "lawsuit", "refund"],
    "alertMethods": ["dashboard", "email", "sms"],
    "notifyEmail": "dr.smith@brightsmiledental.com",
    "notifyPhone": "+15559876543",
    "inactivityTimeoutMinutes": 10
  }'::jsonb,
  '{
    "slotDurationMinutes": 30,
    "workingHours": {
      "weekday": {"start": "08:00", "end": "17:00"},
      "saturday": {"start": "09:00", "end": "14:00"},
      "sunday": null
    },
    "recoveryConfig": {
      "inactivityTimeoutMinutes": 10,
      "sequences": {
        "default": [
          {"type": "re_engagement", "delayMinutes": 15, "channel": "web_chat"},
          {"type": "day_1", "delayHours": 24, "channel": "web_chat"},
          {"type": "day_3", "delayHours": 72, "channel": "web_chat"}
        ]
      }
    }
  }'::jsonb
);

-- 5 Services
INSERT INTO services (id, business_id, name, description, price_min, price_max, duration_minutes)
VALUES
  ('b7a2f4c1-d93e-48d6-95bc-000000000001', 'b7a2f4c1-d93e-48d6-95bc-79f94eb97220', 'Comprehensive Exam & Cleaning', 'Full oral exam, digital X-rays, professional cleaning, and fluoride treatment.', 125.00, 225.00, 60),
  ('b7a2f4c1-d93e-48d6-95bc-000000000002', 'b7a2f4c1-d93e-48d6-95bc-79f94eb97220', 'Teeth Whitening', 'Professional in-office Zoom whitening treatment with take-home touch-up kit.', 350.00, 600.00, 90),
  ('b7a2f4c1-d93e-48d6-95bc-000000000003', 'b7a2f4c1-d93e-48d6-95bc-79f94eb97220', 'Invisalign Consultation', '3D intraoral scan, treatment plan simulation, and aligner fitting.', 0.00, 100.00, 45),
  ('b7a2f4c1-d93e-48d6-95bc-000000000004', 'b7a2f4c1-d93e-48d6-95bc-79f94eb97220', 'Composite Filling', 'Tooth-colored resin filling for cavities on molars and premolars.', 150.00, 350.00, 45),
  ('b7a2f4c1-d93e-48d6-95bc-000000000005', 'b7a2f4c1-d93e-48d6-95bc-79f94eb97220', 'Emergency Exam', 'Same-day urgent evaluation, X-rays, and pain management prescription.', 100.00, 200.00, 30);

-- Staff owner
INSERT INTO staff_profiles (user_id, business_id, role, full_name)
VALUES ('00000000-0000-0000-0000-000000000002', 'b7a2f4c1-d93e-48d6-95bc-79f94eb97220', 'owner', 'Dr. James Smith');

-- Availability schedules
INSERT INTO availability_schedules (business_id, day_of_week, start_time, end_time)
VALUES
  ('b7a2f4c1-d93e-48d6-95bc-79f94eb97220', 1, '08:00', '17:00'),
  ('b7a2f4c1-d93e-48d6-95bc-79f94eb97220', 2, '08:00', '17:00'),
  ('b7a2f4c1-d93e-48d6-95bc-79f94eb97220', 3, '08:00', '17:00'),
  ('b7a2f4c1-d93e-48d6-95bc-79f94eb97220', 4, '08:00', '17:00'),
  ('b7a2f4c1-d93e-48d6-95bc-79f94eb97220', 5, '08:00', '17:00'),
  ('b7a2f4c1-d93e-48d6-95bc-79f94eb97220', 6, '09:00', '14:00');

-- Sample customers
INSERT INTO customers (id, business_id, name, email, phone, lifecycle_state, last_interaction_at)
VALUES
  ('c0a80121-0002-4000-8000-000000000001', 'b7a2f4c1-d93e-48d6-95bc-79f94eb97220', 'Alice Johnson', 'alice.j@email.com', '(555) 111-0001', 'New Inquiry', NOW() - INTERVAL '30 minutes'),
  ('c0a80121-0002-4000-8000-000000000002', 'b7a2f4c1-d93e-48d6-95bc-79f94eb97220', 'Bob Martinez', 'bob.m@email.com', '(555) 111-0002', 'Qualified', NOW() - INTERVAL '1 day'),
  ('c0a80121-0002-4000-8000-000000000003', 'b7a2f4c1-d93e-48d6-95bc-79f94eb97220', 'Carol Lee', 'carol.l@email.com', '(555) 111-0003', 'Booking Opportunity', NOW() - INTERVAL '2 hours'),
  ('c0a80121-0002-4000-8000-000000000004', 'b7a2f4c1-d93e-48d6-95bc-79f94eb97220', 'David Kim', NULL, '(555) 111-0004', 'Booked', NOW() - INTERVAL '1 hour'),
  ('c0a80121-0002-4000-8000-000000000005', 'b7a2f4c1-d93e-48d6-95bc-79f94eb97220', 'Eva Chen', 'eva.c@email.com', '(555) 111-0005', 'Follow-Up Pending', NOW() - INTERVAL '3 days');
