import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart as RechartsPie, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

export function VendorSpendChart({ data }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Vendor Spend Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPie>
              <Pie
                data={data.slice(0, 6)}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="totalSpend"
                nameKey="name"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {data.slice(0, 6).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `฿${value.toLocaleString()}`} />
            </RechartsPie>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
