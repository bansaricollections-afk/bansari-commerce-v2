# Inventory V1 Migration

## Tables Created

| Table | Purpose |
|---|---|
| `product_variants` | One row per sellable SKU with full inventory counters |
| `inventory_ledger` | Immutable append-only movement log |
| `inventory_transactions` | Groups ledger entries into atomic operations |
| `inventory_reservations` | Holds reserved stock for pending orders |

## Database Functions

| Function | Purpose |
|---|---|
| `inventory_adjust_stock()` | Atomic stock change with row-lock + ledger append |
| `inventory_reserve()` | Reserve stock, prevent overselling |
| `inventory_release_reservation()` | Release or convert reservation idempotently |
| `inventory_available_stock()` | Computed column: current − reserved |

## Views

| View | Purpose |
|---|---|
| `v_inventory_summary` | Denormalised dashboard view |

## RLS
All tables: `service_role` has full access. Admin JWT users have read access.
