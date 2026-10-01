import { notFound } from "next/navigation";
import { getDb } from "@/lib/store";
import { FormRenderer } from "@/components/form-renderer";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const f = getDb().prepare("SELECT title FROM FormDef WHERE slug=? AND status='active' AND active=1").get(slug) as { title: string } | undefined;
  return { title: f ? `${f.title} — CodeRender` : "Form — CodeRender" };
}

export default async function DynamicForm({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const f = getDb().prepare("SELECT id, title FROM FormDef WHERE slug=? AND status='active' AND active=1").get(slug) as { id: number; title: string } | undefined;
  if (!f) notFound();
  return (
    <div className="wrap section max-w-xl">
      <h1 className="display-1">{f.title}</h1>
      <FormRenderer slug={slug} className="mt-6 grid gap-3" />
    </div>
  );
}
