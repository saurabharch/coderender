import { notFound } from "next/navigation";
import { getDb } from "@/lib/store";
import { ServerLayerRenderer } from "@/components/layer-renderer";
import { pageVars } from "@/lib/uibuilder";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = getDb().prepare("SELECT title FROM ContentBlock WHERE key=? AND published=1").get(`page:${slug}`) as
    { title: string } | undefined;
  const composed = getDb().prepare("SELECT id FROM PageBlock WHERE pageSlug=? LIMIT 1").get(slug);
  return { title: b?.title ? `${b.title} — CodeRender` : composed ? `${slug} — CodeRender` : "Page — CodeRender" };
}

export default async function CmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const blocks = getDb().prepare("SELECT * FROM PageBlock WHERE pageSlug=? ORDER BY ord").all(slug) as
    { id: number; type: string; title: string; body: string; props: string }[];
  if (blocks.length > 0) {
    const vars = getDb().prepare("SELECT name, value FROM PageVar WHERE pageSlug=?").all(slug) as
      { name: string; value: string }[];
    return (
      <div className="wrap section max-w-3xl">
        <ServerLayerRenderer layers={blocks} vars={pageVars(vars)} />
      </div>
    );
  }
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
