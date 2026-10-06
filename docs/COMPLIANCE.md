# Website compliance checklist

Each item from the "before you launch a website" checklist, what the app does
now, and what is still yours to do. Updated 6 October 2026.

✅ = done in the code. ⚠️ = done, but needs a decision or check from you. ❌ = still open.

| Item | Status | Where / what |
|---|---|---|
| Privacy policy | ⚠️ | `/privacy` (`src/legalContent.js`). Matches what the app collects. Have a Namibian legal practitioner review it before a commercial launch. |
| Terms of service | ⚠️ | `/terms`. Covers 18+, verification, the marketplace's role, fees, prohibited conduct, liability and Namibian law. Needs the same review. |
| Refund policy | ⚠️ | `/refunds`. Sets out when buyers get refunds (seller can't supply, not delivered, not as described within 48 h), promotions and page access. These are business decisions: change them if they don't match how you want to operate. |
| Cookie policy | ✅ | `/cookies`, with a switch to change the analytics choice at any time. |
| Cookie consent banner | ✅ | `src/CookieBanner.js`. "Essential only" and "Allow analytics" are equal buttons. Nothing optional runs before "Allow". |
| Check tracking | ✅ | No ad trackers. Firebase Analytics is not loaded. The app's own usage events (`src/telemetry.js`) only run after consent and no longer store e-mail addresses. Admin decisions are always logged (they are an audit record, not analytics). |
| Form consents | ✅ | Sign-up links the Terms and Privacy policy and records when they were accepted (`agreedToTermsAt`). The contact form says what the details are used for. |
| Only collect necessary data | ✅ | Gender and nationality are optional. Buyers upload no documents. Date of birth is kept for the 18+ check. |
| Age consent | ✅ | Sign-up refuses anyone under 18 (`src/registrationRules.js`). |
| Data deletion requests | ✅ | Profile → Privacy: download your data (JSON) or request deletion. Requests appear on the Admin dashboard with the steps to follow. |
| Unsubscribe link in emails | ✅ | The app sends no marketing e-mail (only Firebase's own verification and password e-mails). The Privacy policy promises consent and an unsubscribe link if that changes. |
| Real business details | ⚠️ | `src/business.js` feeds the footer, the contact section and the legal pages. **Add your BIPA registration number and registered name there** once you have them. |
| Remove unsupported claims | ✅ | Removed: the "AI Assistant" bubble (there is none), "documents verified within 24 hours", made-up average prices on the old Prices page, and "Real-time analytics". |
| Remove fake reviews | ✅ | None found. There are no testimonials or star ratings. |
| Remove dark patterns | ✅ | The contact form used to say "Message Sent!" without sending anything; it now opens the visitor's e-mail app. The cookie banner has no pre-ticked boxes and an equal "decline". |
| Remove hidden fees | ✅ | Buyers see "You pay N$X" on every listing. Sellers see the 5% commission on the payout form, the listing form and their overview. Delivery charges must be written in the listing. Promotion and page-access prices are shown before paying. |
| Alt text on images | ✅ | Listing photos, post photos, profile photos and logos have meaningful alt text; decorative images have empty alt. |
| Colour contrast | ✅ | White-on-light-green buttons and pale nav buttons were fixed; links use the dark brand green. |
| Keyboard navigation / friendly forms | ✅ | Skip link, visible focus ring on every control, labels tied to inputs on Sign in, Register, contact and the new pages; menus and tabs are real buttons. Older pages (questionnaires, admin) were not reworked in full. |
| Clear button labels | ✅ | Icon-only buttons have labels ("Edit Roma tomatoes", "Remove photo"), and actions say what they do ("Write e-mail", "Message seller", "Request account deletion"). |
| Audit third-party SDKs | ✅ | Firebase, Cloudinary, Flutterwave, MapLibre (BSD), GSAP (free licence), Lucide icons (ISC), react-hot-toast (MIT). All listed in the Privacy policy where they receive data. |
| Check third-party embeds | ⚠️ | Google Fonts, Esri imagery and OpenStreetMap tiles load from their servers (disclosed in the Privacy policy). For launch, move map tiles to a paid provider (see `LAUNCH_CHECKLIST.md`). |
| Copyright on images / licence fonts | ❌ | Poppins is open-licensed (SIL OFL). **The home page photos in `src/images/` (farming, consumers, educators, statistics, promotion, programs, farming-data, register.avif) have no recorded source.** Replace them with your own photos or licensed stock (e.g. Unsplash/Pexels), and note the source of each. Scraped photos that were no longer used were deleted. |
| Check local laws | ⚠️ | Namibia's Electronic Transactions Act 4 of 2019 sets out information online suppliers must show and rules for online sales. Ask your legal practitioner to check the Terms, Refund policy and business details against it, and against the Data Protection Bill if it has been passed. |
