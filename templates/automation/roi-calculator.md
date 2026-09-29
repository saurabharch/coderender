# ROI Calculator: {{client}} · {{workflow}}

| Input | Value |
|-------|-------|
| Runs per week | {{}} |
| Minutes saved per run | {{}} |
| Loaded hourly cost of the person doing it | {{}} |
| Errors per month avoided | {{}} |
| Cost per error (rework, refunds, lost deals) | {{}} |

## Formulas
- Weekly hours saved = runs x minutes saved / 60
- Annual labour value = weekly hours x 48 x hourly cost
- Annual error value = errors avoided per month x 12 x cost per error
- Annual benefit = labour value + error value
- Year-1 cost = build price + tool/hosting cost x 12 + retainer x 12
- Payback (months) = build price / (annual benefit / 12 - monthly running cost)
- ROI (year 1) = (annual benefit - year-1 cost) / year-1 cost

## Sanity rules
Use conservative inputs; only count time that can be redeployed; show best/base/worst; if payback exceeds {{6}} months, reduce scope or reprice.

| Scenario | Annual benefit | Year-1 cost | Payback | ROI |
|----------|---------------|-------------|---------|-----|
| Worst | | | | |
| Base | | | | |
| Best | | | | |
