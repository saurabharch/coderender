export const CONTACT = {
  phone: process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "+919831778894",
  whatsapp:
    process.env.NEXT_PUBLIC_WHATSAPP ??
    "https://wa.me/919831778894?text=I%20want%20to%20grow%20my%20business%20with%20CodeRender",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@coderender.in",
  address: "India (address on request)",
};

export interface Vertical {
  slug: string;
  label: string;
  blurb: string;
  pains: [string, string, string];
  wins: [string, string, string];
  chatQ: string;
  chatA: string;
}

export const VERTICALS: Vertical[] = [
  { slug: "salon-owners", label: "Salon Owners", blurb: "Bookings, bridal packages, and repeat visits on autopilot.",
    pains: ["Weekend slots go empty while DMs pile up unanswered", "Bridal enquiries need price lists at midnight", "One-time visitors never return"],
    wins: ["Instant replies with services + prices, in your tone", "Bridal packages quoted and scheduled automatically", "Win-back offers to past clients every month"],
    chatQ: "Price for the bridal package?", chatA: "₹8,999 all-inclusive — slots open this weekend. Shall I book you in?" },
  { slug: "gym-fitness-centres", label: "Gym & Fitness Centres", blurb: "Trials, renewals, and class fills from Maps + WhatsApp.",
    pains: ["Trial enquiries arrive after staff hours", "Renewals slip because nobody follows up", "New batches start half-empty"],
    wins: ["Trials booked and confirmed in seconds, 24/7", "Renewal reminders with one-tap payment links", "Batch announcements that fill seats"],
    chatQ: "Do you have morning batches?", chatA: "Yes — 6, 7 and 8 AM, plus a free trial Thursday. Want me to reserve 7 AM?" },
  { slug: "bakers-cake-shops", label: "Bakers and Cake Shops", blurb: "Same-day orders and festive rush, answered in seconds.",
    pains: ["Custom-cake DMs need back-and-forth at peak hours", "Festive rush overwhelms the counter", "Customers forget you between birthdays"],
    wins: ["Flavours, sizes, and prices answered instantly", "Order slots capped automatically so you never overbook", "Festival broadcasts to past buyers"],
    chatQ: "1kg chocolate truffle for tomorrow?", chatA: "Yes! ₹850, pickup after 4 PM. Eggless? Reply YES to confirm." },
  { slug: "doctors-health-clinics", label: "Doctors & Health Clinics", blurb: "Appointments, reminders, and review-led trust.",
    pains: ["Front desk drowns in appointment calls", "No-shows waste doctor hours", "New patients pick whoever has better reviews"],
    wins: ["Appointments booked + confirmed without phone tag", "Reminders that cut no-shows", "Review requests to happy patients, answered for you"],
    chatQ: "Is Dr. Sharma available Saturday?", chatA: "Yes — 10:30 AM and 12:15 PM are open. Shall I book 10:30?" },
  { slug: "restaurant-bars", label: "Restaurant & Bars", blurb: "Table bookings, offers, and weekend footfall.",
    pains: ["Weekend tables go empty on slow days", "DMs keep asking for menu, hours, parking", "Regulars drift to the new place across the street"],
    wins: ["Table bookings confirmed in seconds", "Slow-day offers pushed to past guests", "Reviews answered before they cost you rank"],
    chatQ: "Table for 4 tonight at 8?", chatA: "Done — table for 4 at 8 PM under your name. See you tonight!" },
  { slug: "pest-control", label: "Pest Control Businesses", blurb: "Quotes, AMC renewals, and season-ready campaigns.",
    pains: ["Quote enquiries need site details you ask twice", "AMCs lapse silently every year", "Monsoon demand spikes with no staff to answer"],
    wins: ["Quotes with BHK + pest type captured upfront", "AMC renewal reminders before expiry", "Seasonal broadcasts that book the quarter"],
    chatQ: "Charges for 2BHK cockroach treatment?", chatA: "₹1,499 with 90-day warranty. Free inspection tomorrow — morning or evening?" },
  { slug: "car-garages-mechanics", label: "Car Garages & Mechanics", blurb: "Service bookings, pickups, and repeat maintenance.",
    pains: ["Service calls interrupt floor work all day", "Customers forget periodic maintenance", "Estimates need photos customers never send"],
    wins: ["Bookings with car model + concern captured", "Maintenance reminders at the right kilometre", "Photo-based estimates before the car arrives"],
    chatQ: "Swift due for 40k service. Slot tomorrow?", chatA: "Yes — 10 AM free, pickup available. Share your location to confirm." },
  { slug: "tours-travels", label: "Tours and Travels", blurb: "Itinerary enquiries handled instantly, day or night.",
    pains: ["Itinerary questions arrive at 1 AM", "Package PDFs get ignored", "Honeymoon season slips to faster repliers"],
    wins: ["Destinations, dates, and budget captured instantly", "Itineraries sent while intent is hot", "Follow-ups until they book or opt out"],
    chatQ: "3N/4D Goa under 25k for 2?", chatA: "Yes — beachside stay + transfers at ₹23,499. Sending the day-wise plan now." },
  { slug: "yoga-wellness", label: "Yoga & Wellness", blurb: "Batches, trials, and membership renewals.",
    pains: ["Trial queries repeat the same 5 questions", "Memberships lapse quietly", "New batches need 20 signups fast"],
    wins: ["Timings, fees, and trial booked in one chat", "Renewal nudges before expiry", "Batch launches broadcast to warm leads"],
    chatQ: "Fees for weekday morning yoga?", chatA: "₹2,000/month, 6:30–7:30 AM. First trial free — join tomorrow?" },
  { slug: "handyman-services", label: "Handyman Services", blurb: "Job enquiries, quotes, and repeat locality work.",
    pains: ["Every job needs photos + address + timing", "Small jobs get lost between big ones", "Localities forget you after one visit"],
    wins: ["Job type, photos, and slot captured upfront", "Quotes in minutes, not days", "Locality re-targeting for repeat work"],
    chatQ: "AC deep service + gas refill cost?", chatA: "₹1,799 all-in. Technician free tomorrow 11 AM–1 PM — confirm?" },
];

export type VerticalSlug = (typeof VERTICALS)[number]["slug"];
