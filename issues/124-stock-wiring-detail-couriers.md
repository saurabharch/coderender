# Ticket 124-stock-wiring + product detail + couriers

Status: done
Labels: correctness, product

Analysis (verified in code, not guessed):
- A1 (bug): saveProduct writes Product.stock directly, never the ledger.
  Create → no StockLevel row, no OPENING move. Quick-edit → mirror diverges
  from ledger permanently (mirror only flows ledger→Product). Display masked
  it via COALESCE(s.qty,p.stock,0) in stockLevels.
- A2 (missing): no product detail route (shop/[id]/ holds only labels/).
- A3 (missing): no courier directory; tracking numbers are dead text.
- Noted limits: variant stock has no ledger (product-level moves only);
  cart lines are JSON (parsed in JS, bounded).

- [x] inventory: setProductStock + openProductStock; commerce.saveProduct
      routes create/edit stock through them (untracked kinds write mirror).
- [x] Live coherence tests: create→level+opening move; edit→adjust move;
      sale→mirror==level (re-proven).
- [x] Product detail route shop/[id] with tabs (overview/sales/stock/engagement).
- [x] Courier directory + tracking-URL links on shipments.
- [x] Chain green + live verify + release.
