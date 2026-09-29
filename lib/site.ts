export const CONTACT = {
  phone: process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "1800-000-000",
  whatsapp:
    process.env.NEXT_PUBLIC_WHATSAPP ??
    "https://wa.me/911800000000?text=I%20want%20to%20grow%20my%20business%20with%20CodeRender",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@coderender.in",
  address: "India (address on request)",
};

export const VERTICALS = [
  { slug: "salon-owners", label: "Salon Owners", blurb: "Bookings, bridal packages, and repeat visits on autopilot." },
  { slug: "gym-fitness-centres", label: "Gym & Fitness Centres", blurb: "Trials, renewals, and class fills from Maps + WhatsApp." },
  { slug: "bakers-cake-shops", label: "Bakers and Cake Shops", blurb: "Same-day orders and festive rush, answered in seconds." },
  { slug: "doctors-health-clinics", label: "Doctors & Health Clinics", blurb: "Appointments, reminders, and review-led trust." },
  { slug: "restaurant-bars", label: "Restaurant & Bars", blurb: "Table bookings, offers, and weekend footfall." },
  { slug: "pest-control", label: "Pest Control Businesses", blurb: "Quotes, AMC renewals, and season-ready campaigns." },
  { slug: "car-garages-mechanics", label: "Car Garages & Mechanics", blurb: "Service bookings, pickups, and repeat maintenance." },
  { slug: "tours-travels", label: "Tours and Travels", blurb: "Itinerary enquiries handled instantly, day or night." },
  { slug: "yoga-wellness", label: "Yoga & Wellness", blurb: "Batches, trials, and membership renewals." },
  { slug: "handyman-services", label: "Handyman Services", blurb: "Job enquiries, quotes, and repeat locality work." },
] as const;

export type VerticalSlug = (typeof VERTICALS)[number]["slug"];
