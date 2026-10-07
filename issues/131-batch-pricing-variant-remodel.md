# Ticket 131-batch-pricing + variant-remodel

Status: done
Labels: pricing, inventory, ux

Pricing moves to the batch (FEFO lot sell price → tiers → base). Variants
become pure measurement (type/value/unit + optional color/size, no price,
product prefilled). Batches carry cost + sell; scan/name/SKU lookup kept.

- [x] ProductLot cost/sell (sqlite migrate + Prisma mirror).
- [x] lotPrice() FEFO-first + priceFor() resolution order + commerce tests green.
- [x] Add Product: price out, measurement in, auto first-variant, photo kept.
- [x] Add Variant: no price, product prefilled, measure type/value/unit + variety.
- [x] Batch Cost/Sell fields + rows show them; scan/by-name/SKU verified live.
- [x] Chain green + live quote/sale-at-batch-price verify + release.
