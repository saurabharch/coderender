# Tool Registry (orchestrator's toolbox)

Each tool the agent may call. Keep inputs and outputs typed and small.

| Tool | Purpose | Inputs | Outputs | Cost/call | Latency | Failure modes | Retry rule |
|------|---------|--------|---------|-----------|---------|---------------|-----------|
| load_brand_profile | Fetch emotion profile + kit | brand_id | profile JSON | ~0 | <1s | missing fields | ask user |
| write_script | Draft script from brief + profile | brief, profile, length | script text | | | off-tone | regenerate once |
| gen_image | Key frames / stills | prompt, style refs | image files | | | wrong logo | reject + fix prompt |
| gen_video | Short clips | script, frames | clip files | | | artifacts, drift | 2 retries then human |
| gen_voice | Voiceover | script, voice id | audio | | | pronunciation | edit script |
| pick_music | Track selection | mood, tempo | audio | | | licence | fallback library |
| assemble | Edit + captions | clips, audio, captions | final video | | | sync | re-run |
| resize | Platform variants | final, formats | variants | | | crop issues | manual check |
| brand_gate | Score vs rubric | asset, profile | scores + reasons | | | false pass | human sample 10% |

## Orchestration rules
1. Plan the job as steps; show the plan before spending on expensive calls.
2. Run cheap drafts first (script, low-res), gate, then upgrade.
3. Cap retries and total cost per job; escalate to a human.
4. Log every call (inputs hash, cost, latency, result) for the feedback loop.
