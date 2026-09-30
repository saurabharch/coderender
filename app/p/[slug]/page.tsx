import { notFound } from "next/navigation";
import { getDb } from "@/lib/store";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = getDb().prepare("SELECT title FROM ContentBlock WHERE key=? AND published=1").get(`page:${slug}`) as
    { title: string } | undefined;
  return { title: b?.title ? `${b.title} — CodeRender` : "Page — CodeRender" };
}

export default async function CmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = getDb().prepare("SELECT * FROM ContentBlock WHERE key=? AND published=1").get(`page:${slug}`) as
    { title: string; body: string } | undefined;
  if (!b) notFound();
  return (
    <div className="wrap section max-w-3xl">
      <h1 className="display-1">{b.title}</h1>
      <div className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed">{b.body}</div>
    </div>
  );
}
