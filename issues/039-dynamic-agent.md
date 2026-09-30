# Dynamic agent grilling + secure tools + voice mode

Status: done
Labels: feature

## Question
Wizard is rigid: no voice-call mode, fixed questions, model never improvises,
tools called ad hoc without scope gates.

## Done when
- Voice call mode end to end; free text accepted at every options step.
- Gateway-composed mode question + final recap (capped: ≤25 questions/thread).
- Personas per mode (sales exec / account manager / partner manager), warm tone.
- All tool calls via scoped `callTool()`; FTS memory intact.
- Chain green + adversarial smoke.
