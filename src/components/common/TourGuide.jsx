import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const tourSteps = {
    inventory: [
        {
            element: '#inventory-header',
            popover: {
                title: 'Inventory Management',
                description: 'Track stock levels, manage suppliers, and analyze trends.',
                side: 'bottom',
                align: 'start',
            },
        },
        {
            element: '#add-item-btn',
            popover: {
                title: 'Add New Items',
                description: 'Add inventory items, link them to Vendors, and assign Locations.',
                side: 'left',
                align: 'start',
            },
        },
        {
            element: '#bulk-actions',
            popover: {
                title: 'Bulk Actions',
                description: 'Import or Export your inventory via CSV.',
                side: 'bottom',
                align: 'center',
            },
        },
        {
            element: '[value="analytics"]',
            popover: {
                title: 'Visual Analytics',
                description: 'View charts for stock movements and inventory value.',
                side: 'bottom',
                align: 'center',
            },
        },
        {
            element: '[value="alerts"]',
            popover: {
                title: 'Smart Alerts',
                description: 'See items that need reordering based on usage.',
                side: 'bottom',
                align: 'center',
            },
        },
    ],
    dashboard: [
        {
            element: '#dashboard-header',
            popover: {
                title: 'Dashboard Overview',
                description: 'Your central hub for key performance indicators and recent activity.',
                side: 'bottom',
                align: 'start',
            },
        },
        {
            element: '#kpi-cards',
            popover: {
                title: 'Key Metrics',
                description: 'Quickly view total shipments, active orders, and revenue.',
                side: 'bottom',
                align: 'center',
            },
        },
        {
            element: '#recent-activity',
            popover: {
                title: 'Recent Activity',
                description: 'Stay updated with the latest actions and system events.',
                side: 'left',
                align: 'start',
            },
        },
    ],
    shipments: [
        {
            element: '#shipments-header',
            popover: {
                title: 'Shipment Management',
                description: 'Manage and track all customer shipments.',
                side: 'bottom',
                align: 'start',
            },
        },
        {
            element: '#create-shipment-btn',
            popover: {
                title: 'New Shipment',
                description: 'Create a new shipment order for a customer.',
                side: 'left',
                align: 'start',
            },
        },
        {
            element: '#shipment-filters',
            popover: {
                title: 'Filters',
                description: 'Filter shipments by status to find what you need.',
                side: 'bottom',
                align: 'start',
            },
        },
    ],
    shoppingOrders: [
        {
            element: '#orders-header',
            popover: {
                title: 'Shopping Orders',
                description: 'Manage purchasing orders from e-commerce platforms.',
                side: 'bottom',
                align: 'start',
            },
        },
        {
            element: '#new-order-btn',
            popover: {
                title: 'Create Order',
                description: 'Record a new shopping order request.',
                side: 'left',
                align: 'start',
            },
        },
    ],
    procurement: [
        {
            element: '#procurement-header',
            popover: {
                title: 'Procurement',
                description: 'Manage vendors and purchase orders.',
                side: 'bottom',
                align: 'start',
            },
        },
        {
            element: '#vendor-list',
            popover: {
                title: 'Vendor List',
                description: 'View and manage your approved vendors.',
                side: 'right',
                align: 'start',
            },
        },
    ],
    invoices: [
        {
            element: '#invoices-header',
            popover: {
                title: 'Invoices',
                description: 'Track and manage customer invoices.',
                side: 'bottom',
                align: 'start',
            },
        },
        {
            element: '#invoice-stats',
            popover: {
                title: 'Invoice Overview',
                description: 'Track total, paid, and pending invoice amounts.',
                side: 'bottom',
                align: 'center',
            },
        },
        {
            element: '#invoice-list',
            popover: {
                title: 'Invoice History',
                description: 'View, print, and manage all your invoices here.',
                side: 'top',
                align: 'start',
            },
        },
    ],
};

export const startTour = (pageKey) => {
    const steps = tourSteps[pageKey];

    if (!steps) {
        console.warn(`No tour steps defined for page: ${pageKey}`);
        return;
    }

    const driverObj = driver({
        showProgress: true,
        steps: steps,
    });

    driverObj.drive();
};

// Backwards compatibility
export const startInventoryTour = () => startTour('inventory');
