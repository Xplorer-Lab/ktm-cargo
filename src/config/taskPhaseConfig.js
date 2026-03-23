import { Rocket, Building, Globe, Users, Megaphone, Settings } from 'lucide-react';

export const phaseConfig = new Map([
  [
    'pre_launch',
    {
      label: 'Pre-Launch',
      icon: Rocket,
      color: 'bg-purple-100 text-purple-800',
      gradient: 'from-purple-500 to-purple-600',
    },
  ],
  [
    'registration',
    {
      label: 'Registration',
      icon: Building,
      color: 'bg-blue-100 text-blue-800',
      gradient: 'from-blue-500 to-blue-600',
    },
  ],
  [
    'infrastructure',
    {
      label: 'Infrastructure',
      icon: Globe,
      color: 'bg-cyan-100 text-cyan-800',
      gradient: 'from-cyan-500 to-cyan-600',
    },
  ],
  [
    'partnership',
    {
      label: 'Partnership',
      icon: Users,
      color: 'bg-amber-100 text-amber-800',
      gradient: 'from-amber-500 to-amber-600',
    },
  ],
  [
    'marketing',
    {
      label: 'Marketing',
      icon: Megaphone,
      color: 'bg-pink-100 text-pink-800',
      gradient: 'from-pink-500 to-pink-600',
    },
  ],
  [
    'operations',
    {
      label: 'Operations',
      icon: Settings,
      color: 'bg-emerald-100 text-emerald-800',
      gradient: 'from-emerald-500 to-emerald-600',
    },
  ],
]);
