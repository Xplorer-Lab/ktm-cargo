import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';

export default function BulkInventoryActions({ items, onImport }) {
    const fileInputRef = useRef(null);

    const handleExport = () => {
        if (!items || items.length === 0) {
            toast.error('No items to export');
            return;
        }

        // Prepare data for export
        const csvData = items.map(item => ({
            Name: item.name,
            SKU: item.sku || '',
            Category: item.category || 'packaging',
            'Current Stock': item.current_stock || 0,
            Unit: item.unit || 'pieces',
            'Reorder Point': item.reorder_point || 10,
            'Unit Cost': item.unit_cost || 0,
            Location: item.location || '',
            Supplier: item.supplier || '', // Legacy field
            'Vendor ID': item.vendor_id || '',
        }));

        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Inventory exported successfully');
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.errors.length > 0) {
                    console.error('CSV Parse Errors:', results.errors);
                    toast.error('Error parsing CSV file');
                    return;
                }

                const importedItems = results.data.map(row => ({
                    name: row.Name,
                    sku: row.SKU,
                    category: row.Category?.toLowerCase() || 'packaging',
                    current_stock: parseInt(row['Current Stock'] || '0', 10),
                    unit: row.Unit || 'pieces',
                    reorder_point: parseInt(row['Reorder Point'] || '10', 10),
                    unit_cost: parseFloat(row['Unit Cost'] || '0'),
                    location: row.Location,
                    vendor_id: row['Vendor ID'],
                    supplier: row.Supplier, // Fallback
                })).filter(item => item.name); // Ensure name exists

                if (importedItems.length === 0) {
                    toast.warning('No valid items found in CSV');
                    return;
                }

                onImport(importedItems);
                // Reset input
                if (fileInputRef.current) fileInputRef.current.value = '';
            },
            error: (error) => {
                console.error('CSV Read Error:', error);
                toast.error('Failed to read CSV file');
            }
        });
    };

    return (
        <div className="flex gap-2">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv"
                className="hidden"
            />
            <Button variant="outline" size="sm" onClick={handleImportClick}>
                <Upload className="w-4 h-4 mr-2" />
                Import CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
            </Button>
        </div>
    );
}
