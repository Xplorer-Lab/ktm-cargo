import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  CheckCircle,
  Circle,
  Package,
  Calculator,
  Users,
  Gift,
  Play,
  ArrowRight,
  ArrowLeft,
  Mail,
  Sparkles,
  Truck,
  Shield,
  Clock,
  Star,
  Trophy,
  Gem,
  Crown,
  Zap,
  ChevronRight,
} from 'lucide-react';

const onboardingSteps = [
  {
    id: 1,
    title: 'Welcome to BKK-YGN Cargo',
    description: 'Your trusted partner for shipping between Bangkok and Yangon',
    icon: Package,
    color: 'from-blue-500 to-indigo-600',
    highlights: [
      { icon: Truck, text: 'Fast cargo shipping (3-5 days standard, 1-2 days express)' },
      { icon: Gift, text: 'Personal shopping assistance from Thai stores' },
      { icon: Shield, text: 'Real-time tracking for all shipments' },
      { icon: Star, text: 'Competitive rates starting at ฿70/kg' },
    ],
  },
  {
    id: 2,
    title: 'Using the Price Calculator',
    description: 'Get instant quotes for your shipments',
    icon: Calculator,
    color: 'from-emerald-500 to-teal-600',
    steps: [
      { num: 1, text: 'Select your service type (Cargo or Shopping)' },
      { num: 2, text: 'Enter the weight of your package' },
      { num: 3, text: 'Choose optional add-ons (insurance, professional packing)' },
      { num: 4, text: 'Set the exchange rate for MMK conversion' },
      { num: 5, text: 'View your detailed price breakdown' },
    ],
    hasVideo: true,
  },
  {
    id: 3,
    title: 'Customer Benefits & Rewards',
    description: 'Unlock exclusive perks as you ship more',
    icon: Gift,
    color: 'from-amber-500 to-orange-600',
    tiers: [
      { icon: Star, name: 'New Customer', discount: 'Welcome discount', color: 'from-slate-400 to-slate-500' },
      { icon: Trophy, name: 'Regular (5+ shipments)', discount: '5% off all orders', color: 'from-amber-600 to-amber-700' },
      { icon: Gem, name: 'Premium (20+ shipments)', discount: '10% off + priority', color: 'from-purple-500 to-purple-600' },
      { icon: Crown, name: 'VIP (50+ shipments)', discount: '15% off + dedicated support', color: 'from-amber-400 to-yellow-500' },
    ],
  },
  {
    id: 4,
    title: 'Track Your Shipments',
    description: 'Real-time updates on your packages',
    icon: Users,
    color: 'from-purple-500 to-pink-600',
    features: [
      { icon: Mail, text: 'Receive SMS/Email notifications at each stage' },
      { icon: Truck, text: 'View live status: Pending → In Transit → Delivered' },
      { icon: Clock, text: 'Access your complete shipment history anytime' },
      { icon: Shield, text: 'Download invoices and shipping documents' },
    ],
  },
];

export default function CustomerOnboarding({ customer, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);

  const progress = ((completedSteps.length + 1) / onboardingSteps.length) * 100;
  const currentStepData = onboardingSteps[currentStep];
  const Icon = currentStepData?.icon;

  const handleNext = () => {
    setIsAnimating(true);

    setTimeout(() => {
      if (!completedSteps.includes(currentStep)) {
        setCompletedSteps([...completedSteps, currentStep]);
      }
      if (currentStep < onboardingSteps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        onComplete?.();
      }
      setIsAnimating(false);
    }, 150);
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep - 1);
        setIsAnimating(false);
      }, 150);
    }
  };

  const handleSkip = () => {
    onComplete?.();
  };

  const goToStep = (idx) => {
    if (completedSteps.includes(idx) || idx < currentStep) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(idx);
        setIsAnimating(false);
      }, 150);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 animate-in fade-in duration-500">
      <Card className="border-0 shadow-2xl overflow-hidden bg-white dark:bg-slate-900">
        {/* Progress Header */}
        <div className={cn(
          "bg-gradient-to-r p-6 text-white transition-all duration-500",
          currentStepData?.color
        )}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="font-semibold">Getting Started</span>
            </div>
            <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
              Step {currentStep + 1} of {onboardingSteps.length}
            </Badge>
          </div>

          <Progress value={progress} className="h-2 bg-white/20" />

          {/* Step indicators */}
          <div className="flex justify-between mt-6 px-2">
            {onboardingSteps.map((step, idx) => {
              const StepIcon = step.icon;
              const isCompleted = completedSteps.includes(idx);
              const isCurrent = idx === currentStep;
              const isAccessible = isCompleted || idx <= currentStep;

              return (
                <button
                  key={step.id}
                  onClick={() => goToStep(idx)}
                  disabled={!isAccessible}
                  className={cn(
                    "flex flex-col items-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed",
                    isCurrent && "scale-110"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                    isCompleted && "bg-white text-emerald-600",
                    isCurrent && !isCompleted && "bg-white text-slate-800 ring-4 ring-white/30",
                    !isCompleted && !isCurrent && "bg-white/20 text-white/70"
                  )}>
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <StepIcon className="w-5 h-5" />
                    )}
                  </div>
                  <span className={cn(
                    "text-xs font-medium hidden sm:block",
                    isCurrent || isCompleted ? "text-white" : "text-white/50"
                  )}>
                    {step.title.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <CardContent className={cn(
          "p-6 transition-all duration-300",
          isAnimating && "opacity-0 translate-x-4"
        )}>
          <div className="flex items-start gap-4 mb-6">
            <div className={cn(
              "p-3 rounded-2xl bg-gradient-to-br text-white shrink-0",
              currentStepData.color
            )}>
              <Icon className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {currentStepData.title}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                {currentStepData.description}
              </p>
            </div>
          </div>

          {/* Step 1: Welcome Highlights */}
          {currentStep === 0 && currentStepData.highlights && (
            <div className="space-y-3 mb-6">
              {currentStepData.highlights.map((item, idx) => {
                const ItemIcon = item.icon;
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                      <ItemIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-slate-700 dark:text-slate-300">{item.text}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Step 2: Calculator Steps */}
          {currentStep === 1 && (
            <>
              <div className="space-y-3 mb-6">
                {currentStepData.steps?.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
                      {step.num}
                    </div>
                    <span className="text-slate-700 dark:text-slate-300">{step.text}</span>
                  </div>
                ))}
              </div>

              {/* Video placeholder */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 text-center group cursor-pointer hover:from-slate-700 hover:to-slate-800 transition-all">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-full mb-4 group-hover:scale-110 transition-transform">
                  <Play className="w-8 h-8 text-white ml-1" />
                </div>
                <p className="text-white font-medium">Watch: How to Use the Calculator</p>
                <p className="text-slate-400 text-sm mt-1">2 minute tutorial</p>
              </div>
            </>
          )}

          {/* Step 3: Reward Tiers */}
          {currentStep === 2 && currentStepData.tiers && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              {currentStepData.tiers.map((tier, idx) => {
                const TierIcon = tier.icon;
                return (
                  <div
                    key={idx}
                    className={cn(
                      "p-4 rounded-2xl bg-gradient-to-br text-white",
                      tier.color
                    )}
                  >
                    <TierIcon className="w-8 h-8 mb-2" />
                    <p className="font-bold">{tier.name}</p>
                    <p className="text-sm text-white/80 mt-1">{tier.discount}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Step 4: Tracking Features */}
          {currentStep === 3 && currentStepData.features && (
            <div className="space-y-3 mb-6">
              {currentStepData.features.map((item, idx) => {
                const ItemIcon = item.icon;
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl"
                  >
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                      <ItemIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="text-slate-700 dark:text-slate-300">{item.text}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button variant="outline" onClick={handleBack} size="lg">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
              <Button variant="ghost" onClick={handleSkip} size="lg" className="text-slate-500">
                Skip Tutorial
              </Button>
            </div>
            <Button
              onClick={handleNext}
              size="lg"
              className={cn(
                "bg-gradient-to-r text-white shadow-lg min-w-[140px]",
                currentStepData.color,
                `shadow-${currentStepData.color.split('-')[1]}-500/30`
              )}
            >
              {currentStep === onboardingSteps.length - 1 ? (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Get Started
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
