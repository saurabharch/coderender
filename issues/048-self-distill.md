# Nightly self-distillation loop

Status: done
Labels: feature, ai

## Question
Agents never learn from conversations; weak replies repeat forever.

## Done when
- Nightly job distills weak turns (downvotes, low eval, fallbacks) into redacted
  exemplars via opencode inference; agents retrieve them by vector similarity.
- Admin can view/delete/run; caps prevent runaway inference.
- Chain green + live loop test (seed weak turn → distill → exemplar used).
