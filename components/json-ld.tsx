const ORG = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "CodeRender",
  description: "Local growth agency: Google Business Profile, WhatsApp automation, local SEO, and fast websites for local businesses.",
  email: "hello@coderender.in",
  telephone: "+919831778894",
  url: "https://coderender.in",
  priceRange: "₹₹",
  areaServed: "IN",
  sameAs: [],
};

const SITE = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "CodeRender",
  url: "https://coderender.in",
};

export function JsonLd() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE) }} />
    </>
  );
}

export function FaqJsonLd({ faqs }: { faqs: { q: string; a: string }[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
