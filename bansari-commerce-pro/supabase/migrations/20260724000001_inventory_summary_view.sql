-- =============================================================================
-- INVENTORY SPRINT-4: CORRECTED v_inventory_summary VIEW
--
-- PURPOSE
--   Replace the Phase-1 view (which lacked warehouse and alias columns) with
--   one whose output columns match InventorySummaryRow exactly.
--
-- COLUMN MAPPING  (InventorySummaryRow field  →  source expression)
--   id               ← pv.id
--   warehouse_id     ← w.id        (warehouses table, created in migration 000000)
--   warehouse_name   ← w.name
--   product_id       ← p.id
--   product_name     ← p.name
--   product_sku      ← p.sku
--   variant_id       ← pv.id       (same row, labelled separately for clarity)
--   variant_sku      ← pv.sku
--   size_label       ← pv.size
--   available_qty    ← GREATEST(pv.stock_current - pv.stock_reserved, 0)
--   reserved_qty     ← pv.stock_reserved
--   damaged_qty      ← 0  (no per-variant damage counter exists yet;
--                          purchase_order_items.damaged_qty tracks PO-receipt
--                          damage only — not a running variant total)
--   avg_cost_price   ← pv.cost_price
--   inventory_value  ← pv.selling_price * pv.stock_current
--   stock_status     ← derived CASE expression
--   low_stock_threshold ← pv.reorder_level
--
-- WAREHOUSE JOIN STRATEGY
--   InventorySummaryRow.warehouse_id is typed `number` (not nullable) and
--   InventorySummaryRow.warehouse_name is typed `string` (not nullable).
--   No UI component currently reads these fields (confirmed by code search:
--   only inventory.service.ts defines the interface).
--
--   product_variants has no warehouse_id column; stock is not yet tracked
--   per-warehouse. We join to the single is_default = true warehouse so that
--   every row carries a real warehouse_id and warehouse_name instead of NULL,
--   satisfying the non-nullable contract. When per-warehouse stock is
--   introduced the join condition will be replaced with a proper FK.
--
-- VERIFIED COLUMN SOURCES (cross-checked against all prior migrations)
--   products         (20260702001523): id, name, sku       ✓
--   product_variants (20260718_v1)   : id, sku, size,
--                                      stock_current, stock_reserved,
--                                      reorder_level, cost_price,
--                                      selling_price                    ✓
--   warehouses       (20260724000000): id, name, is_default             ✓
-- =============================================================================

create or replace view public.v_inventory_summary as
select
  -- ── identity ────────────────────────────────────────────────────────────
  pv.id                                                         as id,

  -- ── warehouse (joined to default; replaced when per-warehouse FK added) ─
  w.id                                                          as warehouse_id,
  w.name                                                        as warehouse_name,

  -- ── product ─────────────────────────────────────────────────────────────
  p.id                                                          as product_id,
  p.name                                                        as product_name,
  p.sku                                                         as product_sku,

  -- ── variant ─────────────────────────────────────────────────────────────
  pv.id                                                         as variant_id,
  pv.sku                                                        as variant_sku,
  pv.size                                                       as size_label,

  -- ── stock quantities ────────────────────────────────────────────────────
  greatest(pv.stock_current - pv.stock_reserved, 0)             as available_qty,
  pv.stock_reserved                                             as reserved_qty,
  0                                                             as damaged_qty,

  -- ── valuation ───────────────────────────────────────────────────────────
  pv.cost_price                                                 as avg_cost_price,
  pv.selling_price * pv.stock_current                          as inventory_value,

  -- ── status ──────────────────────────────────────────────────────────────
  case
    when pv.stock_current = 0
      then 'out_of_stock'
    when greatest(pv.stock_current - pv.stock_reserved, 0) <= pv.reorder_level
      then 'low_stock'
    else 'in_stock'
  end                                                           as stock_status,

  pv.reorder_level                                              as low_stock_threshold

from public.product_variants  pv
join public.products          p  on p.id  = pv.product_id
-- Cross join to the single default warehouse so warehouse_id / warehouse_name
-- are never NULL, satisfying the non-nullable InventorySummaryRow contract.
cross join lateral (
  select id, name
  from   public.warehouses
  where  is_default = true
  limit  1
) w;

comment on view public.v_inventory_summary is
  'Sprint-4: denormalised view matching InventorySummaryRow exactly.
   Column aliases replace the Phase-1 view. Warehouse dimension is sourced
   from the default warehouse until per-warehouse stock tracking is added.';
