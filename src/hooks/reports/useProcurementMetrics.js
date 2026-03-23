import { useMemo } from 'react';

export function useProcurementMetrics(filteredPOs) {
  return useMemo(() => {
    const totalPOSpend = filteredPOs.reduce((sum, po) => sum + (po.total_amount || 0), 0);
    const totalWeightPurchased = filteredPOs.reduce(
      (sum, po) => sum + (po.total_weight_kg || 0),
      0
    );
    const totalWeightAllocated = filteredPOs.reduce(
      (sum, po) => sum + (po.allocated_weight_kg || 0),
      0
    );
    const totalWeightRemaining = filteredPOs.reduce(
      (sum, po) => sum + (po.remaining_weight_kg || 0),
      0
    );
    const avgCostPerKg =
      filteredPOs.length > 0
        ? filteredPOs.reduce((sum, po) => sum + (po.cost_per_kg || 0), 0) / filteredPOs.length
        : 0;
    const pendingPOs = filteredPOs.filter((po) =>
      ['draft', 'pending_approval'].includes(po.status)
    ).length;
    const approvedPOs = filteredPOs.filter((po) =>
      ['approved', 'sent', 'received'].includes(po.status)
    ).length;
    const allocationRate =
      totalWeightPurchased > 0 ? (totalWeightAllocated / totalWeightPurchased) * 100 : 0;

    return {
      totalPOSpend,
      totalWeightPurchased,
      totalWeightAllocated,
      totalWeightRemaining,
      avgCostPerKg,
      pendingPOs,
      approvedPOs,
      allocationRate,
      totalPOs: filteredPOs.length,
    };
  }, [filteredPOs]);
}
