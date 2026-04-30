import { useMemo } from 'react';
import {
  calculateKtmPricing,
  getCargoRate,
} from '../lib/ktmPricing.js';

export function getPricingRoute(route) {
  if (route === 'MM-TH') return 'MYANMAR_THAILAND';
  return 'THAILAND_MYANMAR';
}

export function getServiceTypeForMode(mode) {
  return mode === 'land' ? 'land_cargo' : 'air_cargo';
}

export function useQuoteEstimate({ route = 'TH-MM', mode = 'air', weightKg = '1' } = {}) {
  return useMemo(() => {
    const numericWeight = Number(weightKg);
    if (!Number.isFinite(numericWeight) || numericWeight <= 0) {
      return {
        isValid: false,
        route,
        mode,
        weightKg: numericWeight,
        error: 'Enter a weight greater than 0',
      };
    }

    const pricing = calculateKtmPricing({
      route: getPricingRoute(route),
      mode,
      weightKg: numericWeight,
    });

    return {
      isValid: true,
      route,
      mode,
      serviceType: getServiceTypeForMode(mode),
      weightKg: numericWeight,
      ratePerKg: getCargoRate(mode),
      ...pricing,
    };
  }, [route, mode, weightKg]);
}
