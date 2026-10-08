# Ticket: Agent stores real lead name, never friend

Parent: [Wayfinder map: real lead names from chat + finish previous plans](161-lead-name-capture-map.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
Blocked-by: (none — frontier)

## Question

Why does a chat lead end up named "friend" even after the user shared their
real name, and what minimal change captures it?

## Diagnosis (pre-claim trace)

- `contact` stage asks "name plus phone or email" in ONE message, but
  `extractContact` (`lib/identity.ts`) only splits phone/email vs `rest`.
- Name-only reply ("Saurabh") has no phone/email → treated as missing contact,
  name discarded, `tries++`. Next turn's phone-only reply has empty `rest` →
  `"friend"` forever, written into `Appointment` + `Lead`.
- `rest` keeps filler ("My name is Saurabh" → first word "My" via `addressAs`).

## Decision needed

- Pure `parseLeadName(rest)` in `honorific.ts` (prefix-strip + filler reject).
- Preserve parsed name across retry turns in intake state.
- Never persist literal "friend" — store `""`, fall back only at render.


Resolution: pure parseLeadName in honorific.ts + name preserved across contact retries + never persist 'friend'. Live public-chat proof thread: name-only then phone → state/Lead/Appointment all 'Probeert', probe rows cleaned.
