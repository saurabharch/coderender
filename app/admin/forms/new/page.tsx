import Link from "next/link";
import { FormBuilder } from "@/components/form-builder";

export default function NewFormPage() {
  return (
    <>
      <Link href="/admin/forms" className="text-sm font-semibold text-brand-deep">← All forms</Link>
      <h1 className="mt-1 text-2xl font-extrabold">New form</h1>
      <p className="mt-1 text-sm text-zinc-500">Arrange fields, check the live preview, inspect the JSON Schema, then create.</p>
      <div className="mt-4"><FormBuilder /></div>
    </>
  );
}
