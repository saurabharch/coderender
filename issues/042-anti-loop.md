# Stop re-asking known details (anti-loop + recognition)

Status: done
Labels: bugfix

## Question
Bot re-asks name/contact/requirements even when the DB already knows them;
garbage answers loop forever.

## Done when
- Known phone/email → greeted with honorific, details prefilled, never re-asked.
- Every question caps at 2 attempts, then proceeds best-effort.
- Chain green + loop/regression smoke.
