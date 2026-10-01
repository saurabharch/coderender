import Link from "next/link";
import { notFound } from "next/navigation";
import { getTodo } from "@/lib/todos";
import { CommentThread } from "@/components/comment-thread";

export default async function TodoDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const todo = getTodo(Number(id));
  if (!todo) notFound();
  return (
    <>
      <Link href="/admin/todos" className="text-sm font-semibold text-brand-deep">← All todos</Link>
      <h1 className="mt-1 text-2xl font-extrabold">{todo.title}</h1>
      <p className="mt-1 font-mono text-xs text-zinc-500">{todo.status}{todo.assigneeEmail ? ` · ${todo.assigneeEmail}` : ""}</p>
      {todo.body && <p className="mt-2 text-sm whitespace-pre-wrap">{todo.body}</p>}
      <h2 className="mt-6 font-bold">Discussion</h2>
      <div className="mt-2 max-w-2xl">
        <CommentThread resourceType="todo" resourceId={String(todo.id)} />
      </div>
    </>
  );
}
