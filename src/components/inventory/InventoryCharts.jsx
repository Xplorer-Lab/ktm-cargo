import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Legend
} from 'recharts';
import { format, subDays, parseISO } from 'date-fns';

export default function InventoryCharts({ movements = [], items = [] }) {
    // Process data for Stock Movement History (last 30 days)
    const getStockHistoryData = () => {
        const last30Days = Array.from({ length: 30 }, (_, i) => {
            const date = subDays(new Date(), 29 - i);
            return format(date, 'yyyy-MM-dd');
        });

        return last30Days.map(date => {
            const dayMovements = movements.filter(m =>
                m.created_date && m.created_date.startsWith(date)
            );

            const incoming = dayMovements
                .filter(m => m.movement_type === 'in')
                .reduce((sum, m) => sum + (m.quantity || 0), 0);

            const outgoing = dayMovements
                .filter(m => m.movement_type === 'out')
                .reduce((sum, m) => sum + (m.quantity || 0), 0);

            return {
                date: format(parseISO(date), 'MMM dd'),
                incoming,
                outgoing
            };
        });
    };

    // Process data for Inventory Value by Category
    const getCategoryValueData = () => {
        const categories = {};

        items.forEach(item => {
            const cat = item.category || 'uncategorized';
            const value = (item.current_stock || 0) * (item.unit_cost || 0);

            if (!categories[cat]) {
                categories[cat] = 0;
            }
            categories[cat] += value;
        });

        return Object.entries(categories).map(([name, value]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value
        }));
    };

    const stockHistoryData = getStockHistoryData();
    const categoryValueData = getCategoryValueData();

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg font-medium">Stock Movement (30 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stockHistoryData}>
                                <defs>
                                    <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                />
                                <Legend />
                                <Area
                                    type="monotone"
                                    dataKey="incoming"
                                    name="Restock (In)"
                                    stroke="#10b981"
                                    fillOpacity={1}
                                    fill="url(#colorIn)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="outgoing"
                                    name="Usage (Out)"
                                    stroke="#f43f5e"
                                    fillOpacity={1}
                                    fill="url(#colorOut)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg font-medium">Inventory Value by Category</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={categoryValueData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} unit="฿" />
                                <YAxis dataKey="name" type="category" fontSize={12} tickLine={false} axisLine={false} width={100} />
                                <Tooltip
                                    formatter={(value) => `฿${value.toLocaleString()}`}
                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                />
                                <Bar dataKey="value" name="Total Value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={32} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
