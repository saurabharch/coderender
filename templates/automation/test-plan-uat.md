# Test Plan and UAT: {{workflow}} · {{client}}

## Test cases
| # | Scenario | Input | Expected result | Pass? |
|---|----------|-------|-----------------|-------|
| 1 | Happy path | typical record | created/updated correctly | |
| 2 | Missing required field | | rejected with clear message | |
| 3 | Duplicate submission | same record twice | one record, no double action | |
| 4 | Unusual characters / long text | | handled | |
| 5 | Downstream API down | | retry, then alert | |
| 6 | Rate limit hit | burst of runs | throttled, no loss | |
| 7 | Credential expired | | alert names the credential | |
| 8 | Large volume | {{n}} records | completes within {{time}} | |
| 9 | Approval rejected | | correct branch, logged | |
| 10 | AI output low confidence | | routed to human queue | |

## UAT with client
Tester {{name}} · Date {{date}} · Environment {{test/prod-with-test-data}}
| Business scenario | Result | Comments |
|-------------------|--------|----------|

## Sign-off
Accepted by {{name}} on {{date}}. Known issues accepted: {{list}}.
