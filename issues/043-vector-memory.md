# Vector memory + service recognition + isolation proof

Status: done
Labels: feature

## Question
Memory is lexical-only; service matching is naive; isolation unverified live.

## Done when
- `lib/vectors.ts`: hashed trigram embeddings stored in SQLite, cosine recall
  scoped per thread (FTS kept as fallback).
- Service synonyms map; product answers carry briefing card blocks.
- Cross-fingerprint thread access denied live; own access works.
- Chain green + smoke.
