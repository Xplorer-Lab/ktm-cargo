import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const NUMBER_FORMAT = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
});

function formatThb(amount) {
  return `${NUMBER_FORMAT.format(amount)} THB`;
}

export default function QuoteEstimateCard({ estimate }) {
  return (
    <Card className="border-blue-100 bg-blue-50/70">
      <CardHeader>
        <CardTitle>Instant estimate</CardTitle>
        <CardDescription>Final quote may change after staff review.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        {!estimate.isValid ? (
          <p className="text-red-600">{estimate.error}</p>
        ) : (
          <>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Billable weight</span>
              <strong>{NUMBER_FORMAT.format(estimate.billableWeightKg)} kg</strong>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Rate</span>
              <strong>{formatThb(estimate.ratePerKg)} / kg</strong>
            </div>
            <div className="flex justify-between gap-4 border-t pt-3 text-base">
              <span>Estimated total</span>
              <strong>{formatThb(estimate.totalThb)}</strong>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
