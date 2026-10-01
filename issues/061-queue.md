# Queue handler (Analog spirit, native)

Status: done
Labels: feature

## Question
Jobs run inline or not at all; no durable queue, retries, dead-letter,
or ops visibility; calendar sync has no background path.

## Done when
- Job table live; `lib/queue-core.ts` (backoff math) + `lib/queue.ts`
  (enqueue/claim/complete/fail, handlers incl. gcal.push/pull) + worker
  tick in scheduler + manual run endpoint.
- /admin/ops queue console (depth, failed, retry, purge).
- gcal push flows through queue; chain green + smoke.
