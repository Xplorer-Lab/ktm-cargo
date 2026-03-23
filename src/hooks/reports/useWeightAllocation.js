import { useMemo } from 'react';

export function useWeightAllocation(filteredPOs) {
  return useMemo(() => {
    return filteredPOs
      .filter((po) => po.total_weight_kg > 0)
      .map((po) => ({
        name: po.po_number || po.id.substring(0, 8),
        allocated: po.allocated_weight_kg || 0,
        remaining: po.remaining_weight_kg || 0,
        total: po.total_weight_kg || 0,
      }))
      .slice(0, 10);
  }, [filteredPOs]);
}
