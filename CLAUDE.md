# Allday Pickle Co. — Project Context for Claude Code

## Business
- Pickleball court venue, Lai Chi Kok, Hong Kong
- Address: 寶源亞洲中心, open 24/7
- WhatsApp: +852 9474 7571
- Instagram: @alldaypickleco
- Admin email: house@alldaypickleco.com

## Tech Stack
- Frontend: Vercel (auto-deploy from GitHub)
- Backend: Google Apps Script (Web App endpoint)
- Database: Google Sheets
- Admin dashboard: admin.html on Vercel
- Future: PayMe API + Cloudflare Workers for webhooks

## File Structure
- index.html — HTML skeleton only, no CSS or JS
- css/main.css — all styles, edit colors/design here
- js/config.js — API_URL, WA number, court prices
- js/translations.js — all EN/ZH/JA text (never edit booking logic here)
- js/booking.js — 4-step booking widget logic
- js/app.js — language switching, renderAll(), page init
- admin.html — admin dashboard (password protected)
- allday-pickle-backend-v3.gs — Google Apps Script backend
- CLAUDE.md — this file

## GitHub
- Repo: github.com/alldaypickleco/alldaypickleco.
- Username: alldaypickleco
- Email: house@alldaypickleco.com
- Branch: main
- Note: folder name has trailing period (alldaypickleco.)

## Google Sheet
- ID: 18jikpKFTFbDNfQc8Cx7mZnKLt3v2-28TbQzfsp3whAk
- URL: https://docs.google.com/spreadsheets/d/18jikpKFTFbDNfQc8Cx7mZnKLt3v2-28TbQzfsp3whAk
- Tabs: Bookings, Blocks, Coupons, DoorCodes, BallMachine, Codes
- Key columns in Bookings tab:
  - Col Q: Door code (4 digit, looked up from Codes tab)
  - Col AF: Times Booked (number)
  - Col AH: Repeat customer? (values: "First time" or "Yes")

## Apps Script
- Current API URL: https://script.google.com/macros/s/AKfycbzUhq-cB14FXodw5vlY8U77u7W8ufIAOZjOvy6dWZMvACjPJKRy2R8PL1xWj95n_fc2pg/exec
- Admin password: adpc2025admin (CHANGE BEFORE GO LIVE)
- File: allday-pickle-backend-v3.gs

## Courts
- Home Court 主場 — capacity 8 pax, regulation size
- Practice Court 練習場 — capacity 6 pax, compact
- Both Courts 全場 — capacity 30 pax
- Extra pax charge: +$75/person/hour over capacity
- Booking "Both" blocks Home AND Practice (bidirectional)

## Pricing Tiers
- Peak: weekday 18:00-23:00 / weekend+PH 09:00-23:00
- Off-Peak: weekday 09:00-18:00
- Night Owl / Early Bird: 23:00-09:00 all days
- Multi-hour discounts: 5% for 2h, 10% for 3h
- Home Court: off-peak $300/h, peak $400/h
- Practice Court: off-peak $200/h, peak $300/h
- Both Courts: off-peak $500/h, peak $700/h

## Booking Flow (website widget)
- Step 1: Court selection (Home / Practice / Both)
- Step 2: Date + Time — Calendly layout (calendar left, slots right)
- Step 3: Duration (1h/2h/3h) + Pax + Ball machine + Coupon
- Step 4: Review + Hold (30 min timer)

## Business Rules
- Hold time: 30 minutes (NOT 1 hour)
- Max online booking: 3 hours (more = WhatsApp us)
- Ball machine: 1 unit, free, 1 customer per hour max
- Night Owl slots: NO rewards
- Free/Cancelled bookings: NO rewards
- One coupon per booking, no stacking

## Rewards Program
- $20 credit per hour booked
- Valid 7 days from booking date
- Only for paid + non-night-owl bookings
- Tracked manually by customer

## Door Codes
- Format: 4 digits + # (e.g. 2841#)
- Changes daily, same code for all bookings that day
- Stored in DoorCodes tab in Google Sheet
- You (admin) add each day's code manually each evening
- System fetches automatically when confirming a booking

## WhatsApp Confirmation Message
Three parts:
1. ALWAYS: booking details + door code + entry link
2. CONDITIONAL: rewards block (only if paid AND not night owl)
3. ALWAYS: WA community link + sign off
4. FIRST TIMER ONLY: "how did you find us?" question

Chinese default, English toggle in admin dashboard.
First timer detection: Col AH = "First time"

Key links:
- Entry instructions: https://bit.ly/3QJcT4F
- Rewards T&C: https://docs.google.com/document/d/1bfu1nyVGtrEytqQPzARBDAnRZdqlA7Cudb8kDwAGb5k/edit?usp=drivesdk
- WA Community: https://chat.whatsapp.com/Bm1d1An8XQ95Ftq36x0xDd

## Payment
- Current: FPS / PayMe manual confirmation
- FPS phone: +852 9474 7571
- Future: PayMe Business API (applied, pending HSBC approval)
- Future backend: Cloudflare Workers to receive PayMe webhooks
- Same confirmation UX regardless of payment method

## Admin Dashboard Features (admin.html)
- Password login
- Bookings tab: pending/confirmed/all with filters + stats
- Court Blocks tab: weekly calendar, add/remove blocks
- Upcoming tab: next 20 confirmed bookings
- Per booking: Confirm, Release, Generate WA Message buttons
- WA Message: auto-generates Chinese/English with rewards + first-timer logic
- Court block calendar: green=booking, orange=block, white=free
- Click free cell = pre-fills Add Block form

## Pending Tasks (do in Claude Code)
1. Update Apps Script (allday-pickle-backend-v3.gs):
   - Change HOLD_HOURS from 1 to 0.5 (30 minutes)
   - Add pax parameter to createBooking + extra charge calc
   - Add BallMachine tab + availability check
   - Add Coupons tab + validateCoupon + useCoupon endpoints
   - Add DoorCodes tab + getDoorCode endpoint
   - Add night owl pricing tier (23:00-09:00)
   - Update confirmBooking to auto-fetch door code
   - Add releaseNotification (log RELEASED_UNPAID for CVR)
   - Run setupDoorCodesSheet() once after update
   - Redeploy as new version, update API_URL in index.html + admin.html

2. Rebuild booking widget (js/booking.js + js/translations.js + js/config.js):
   - New step order: Court → Date+Time → Duration → Review
   - Calendly layout for Step 2 (calendar left, slots right)
   - Show court name as pill reminder on Step 2
   - Add pax selector + extra charge calculator
   - Add ball machine Yes/No toggle
   - Add compact coupon field (collapsed by default)
   - Add 30 min countdown timer on confirmation screen
   - Add email field to Step 4
   - All unhappy paths with WhatsApp fallback
   - Midnight-crossing bookings (e.g. 23:00-02:00)

3. Admin dashboard updates (admin.html):
   - Add Coupons tab (view/create/deactivate)
   - Add CVR% stats panel
   - Add pax display on booking cards

4. PayMe API integration (when HSBC approves):
   - Set up Cloudflare Workers backend
   - Create payment request endpoint
   - Handle webhook for auto-confirmation
   - Update confirmation flow

## Colors (edit in css/main.css :root)
- --g: #1B5C3F (primary green)
- --o: #F47820 (orange accent)
- --lime: #7DC52E (lime accent)
- --cream: #F5F0E8 (page background)

## How to Push to GitHub from Claude Code
Use SSH (set up once):
1. claude> generate SSH key and add to GitHub
2. After that: git add . && git commit -m "message" && git push
