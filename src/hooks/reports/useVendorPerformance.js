import { useMemo } from 'react';

export function useVendorPerformance(filteredPOs) {
  return useMemo(() => {
    const vendorStats = {};

    filteredPOs.forEach((po) => {
      if (!po.vendor_id) return;
      if (!vendorStats[po.vendor_id]) {
        vendorStats[po.vendor_id] = {
          id: po.vendor_id,
          name: po.vendor_name || 'Unknown',
          totalSpend: 0,
          totalWeight: 0,
          poCount: 0,
          avgCostPerKg: 0,
        };
      }
      vendorStats[po.vendor_id].totalSpend += po.total_amount || 0;
      vendorStats[po.vendor_id].totalWeight += po.total_weight_kg || 0;
      vendorStats[po.vendor_id].poCount += 1;
    });

    Object.values(vendorStats).forEach((v) => {
      v.avgCostPerKg = v.totalWeight > 0 ? v.totalSpend / v.totalWeight : 0;
    });

    return Object.values(vendorStats).sort((a, b) => b.totalSpend - a.totalSpend);
  }, [filteredPOs]);
}
