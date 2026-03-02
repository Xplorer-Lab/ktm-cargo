import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/db';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Search, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

export default function CustomerShoppingOrders({ customer }) {
    const [searchTerm, setSearchTerm] = useState('');

    const { data: orders = [], isLoading } = useQuery({
        queryKey: ['customer-shopping-orders', customer?.id],
        queryFn: async () => {
            if (!customer?.id) return [];
            const allOrders = await db.shoppingOrders.list();
            return allOrders
                .filter(order => order.customer_id === customer.id)
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        },
        enabled: !!customer?.id
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'PENDING': return 'bg-amber-100 text-amber-800';
            case 'ORDERED': return 'bg-blue-100 text-blue-800';
            case 'RECEIVED': return 'bg-purple-100 text-purple-800';
            case 'SHIPPED': return 'bg-emerald-100 text-emerald-800';
            case 'CANCELLED': return 'bg-rose-100 text-rose-800';
            default: return 'bg-slate-100 text-slate-800';
        }
    };

    const filteredOrders = orders.filter(
        (o) =>
            o.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.tracking_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <ShoppingBag className="w-6 h-6 text-blue-600" />
                        Shopping Orders
                    </h2>
                    <p className="text-slate-500">Track and manage your requested purchases.</p>
                </div>
            </div>

            <Card className="border-0 shadow-sm">
                <CardHeader className="border-b bg-slate-50/50 pb-4">
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                        <div className="relative w-full sm:w-96">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                            <Input
                                placeholder="Search by item name or tracking number..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 bg-white"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-8 text-center text-slate-500">Loading your orders...</div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="p-12 text-center flex flex-col items-center">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                <ShoppingBag className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900 mb-1">No orders found</h3>
                            <p className="text-slate-500 max-w-sm mx-auto">
                                {searchTerm ? 'No orders match your search criteria.' : "You haven't requested any shopping orders yet."}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-600 border-b">
                                    <tr>
                                        <th className="px-6 py-4 font-medium whitespace-nowrap">Order Details</th>
                                        <th className="px-6 py-4 font-medium whitespace-nowrap">Status</th>
                                        <th className="px-6 py-4 font-medium whitespace-nowrap">Date</th>
                                        <th className="px-6 py-4 font-medium whitespace-nowrap text-right">Estimated Cost</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredOrders.map((order) => (
                                        <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-900 line-clamp-2">
                                                    {order.item_name}
                                                </div>
                                                {order.item_url && (
                                                    <a
                                                        href={order.item_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
                                                    >
                                                        <ExternalLink className="w-3 h-3" /> View Product
                                                    </a>
                                                )}
                                                <div className="text-xs text-slate-500 mt-1">
                                                    Qty: {order.quantity} {order.tracking_number ? `• Tracking: ${order.tracking_number}` : ''}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="secondary" className={getStatusColor(order.status)}>
                                                    {order.status}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                {order.created_at ? format(new Date(order.created_at), 'MMM d, yyyy') : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium">
                                                {order.estimated_cost > 0 ? `฿${order.estimated_cost.toLocaleString()}` : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
