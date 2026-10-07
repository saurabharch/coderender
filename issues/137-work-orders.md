# Ticket 137-work-orders

Status: done
Labels: plan06, manufacturing

Suggestion order #2. Work orders consume BOM components and receive finished
goods (component cost rolled up). Sale rule for kitted products: finished
stock first, shortfall assembles from components (explodeStockLines).

- [x] WorkOrder table + create/start/produce/cancel + cost roll-up.
- [x] explodeStockLines finished-first.
- [x] API + stock console card.
- [x] Live produce→sell→shortfall verify + release.
