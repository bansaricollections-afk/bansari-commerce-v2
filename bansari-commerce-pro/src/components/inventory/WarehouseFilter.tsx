'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { Warehouse } from '@/services/inventory.service';

interface Props {
  warehouses: Warehouse[];
  current?: number;
}

export function WarehouseFilter({ warehouses, current }: Props) {
  const router      = useRouter();
  const pathname    = usePathname();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) {
      params.set('warehouseId', e.target.value);
    } else {
      params.delete('warehouseId');
    }
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="warehouse-filter">
      <label htmlFor="warehouse-select" className="filter-label">
        Warehouse
      </label>
      <select
        id="warehouse-select"
        className="filter-select"
        value={current ?? ''}
        onChange={handleChange}
      >
        <option value="">All warehouses</option>
        {warehouses.map(wh => (
          <option key={wh.id} value={wh.id}>
            {wh.name} ({wh.code})
          </option>
        ))}
      </select>
    </div>
  );
}
