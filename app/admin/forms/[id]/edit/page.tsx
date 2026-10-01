import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormById } from "@/lib/forms";
import { FormBuilder } from "@/components/form-builder";

export default async function EditFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = getFormById(Number(id));
  if (!form) notFound();
  return (
    <>
      <Link href="/admin/forms" className="text-sm font-semibold text-brand-deep">← All forms</Link>
      <h1 className="mt-1 text-2xl font-extrabold">Edit: {form.title}</h1>
      <p className="mt-1 font-mono text-xs text-zinc-500">/f/{form.slug} · {form.status}</p>
      <div className="mt-4">
        <FormBuilder initial={{
          id: form.id, title: form.title, slug: form.slug, fields: form.fields,
          successMessage: form.successMessage, redirectUrl: form.redirectUrl, status: form.status,
        }} />
      </div>
    </>
  );
}
