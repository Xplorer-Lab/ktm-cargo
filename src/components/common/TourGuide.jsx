import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const tourSteps = {
  inventory: [
    {
      element: '#inventory-header',
      popover: {
        title: 'Inventory (ကုန်ပစ္စည်း စီမံခန့်ခွဲမှု)',
        description:
          'ကုန်ပစ္စည်း လက်ကျန်များ၊ ပေးသွင်းသူများ (Suppliers) ကို စီမံခန့်ခွဲနိုင်ပါတယ်။',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#add-item-btn',
      popover: {
        title: 'ပစ္စည်းအသစ်ထည့်ရန်',
        description:
          'ကုန်ပစ္စည်းအသစ်များကို စာရင်းသွင်းပြီး လိုအပ်သော Vendor များနှင့် ချိတ်ဆက်သတ်မှတ်နိုင်ပါတယ်။',
        side: 'left',
        align: 'start',
      },
    },
    {
      element: '#bulk-actions',
      popover: {
        title: 'အများအပြား လုပ်ဆောင်ရန် (Bulk Actions)',
        description:
          'CSV ဖိုင်များ အသုံးပြု၍ ကုန်ပစ္စည်းစာရင်းများကို အလွယ်တကူ အသွင်း/အထုတ် လုပ်နိုင်ပါတယ်။',
        side: 'bottom',
        align: 'center',
      },
    },
  ],
  dashboard: [
    {
      element: '#dashboard-header',
      popover: {
        title: 'Dashboard (ပင်မစာမျက်နှာ)',
        description:
          'လုပ်ငန်းတစ်ခုလုံးရဲ့ ဝင်ငွေ၊ ထွက်ငွေ၊ Shipment အရေအတွက်တွေကို တစ်နေရာတည်းမှာ ခြုံငုံကြည့်ရှုနိုင်တဲ့ နေရာဖြစ်ပါတယ်။',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#kpi-cards',
      popover: {
        title: 'အဓိက ကိန်းဂဏန်းများ (Key Metrics)',
        description:
          'စုစုပေါင်း Shipment တွေ၊ လတ်တလော Order တွေနဲ့ ဝင်ငွေတွေကို အလွယ်တကူ မြင်တွေ့နိုင်ပါတယ်။',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#recent-activity',
      popover: {
        title: 'လတ်တလော လုပ်ဆောင်ချက်များ (Recent Activity)',
        description:
          'စနစ်ထဲမှာ နောက်ဆုံးလုပ်ထားတဲ့ Shipment နဲ့ လုပ်ဆောင်ချက်တွေကို ဒီနေရာမှာ အမြဲတွေ့မြင်နိုင်ပါတယ်။',
        side: 'left',
        align: 'start',
      },
    },
  ],
  shipments: [
    {
      element: '#shipments-header',
      popover: {
        title: 'Shipments (ပို့ဆောင်မှုများ)',
        description:
          'ဖောက်သည်တွေဆီ ပို့ဆောင်ရမယ့် Shipment တွေကို ဒီကနေတဆင့် မှတ်တမ်းတင်၊ စီမံခန့်ခွဲရပါတယ်။',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#create-shipment-btn',
      popover: {
        title: 'Shipment အသစ်ဖန်တီးခြင်း',
        description:
          'Customer အသစ် (သို့) ရှိပြီးသား Customer တွေအတွက် ကုန်ကျစရိတ် (Shipping Cost) တွေတွက်ချက်ပြီး Cargo/Vendor တွေဆီ အပ်နှံဖို့ Order ဖွင့်နိုင်ပါတယ်။',
        side: 'left',
        align: 'start',
      },
    },
    {
      element: '#shipment-filters',
      popover: {
        title: 'ရှာဖွေခြင်း (Filters)',
        description:
          'ပို့ဆောင်ဆဲ၊ ပို့ဆောင်ပြီး စတဲ့ Status တွေအလိုက် ကိုယ်ရှာချင်တဲ့ Shipment ကို အလွယ်တကူ စစ်ထုတ်ရှာဖွေနိုင်ပါတယ်။',
        side: 'bottom',
        align: 'start',
      },
    },
  ],
  shoppingOrders: [
    {
      element: '#orders-header',
      popover: {
        title: 'Shopping Orders (ဝယ်ယူပေးခြင်း)',
        description:
          'Personal Shopper အနေနဲ့ Customer တွေအတွက် ပစ္စည်းဝယ်ယူပေးရတဲ့ လုပ်ငန်းစဉ် (Order) တွေကို ဒီမှာစီမံခန့်ခွဲရပါတယ်။',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#new-order-btn',
      popover: {
        title: 'Order အသစ်ဖန်တီးခြင်း',
        description:
          'Customer မှာယူတဲ့ ကုန်ပစ္စည်းတန်ဖိုး၊ ဝယ်ယူခ (Commission) နဲ့ ပို့ဆောင်ခ (Shipping Cost) တွေကို ဒီကနေ တွက်ချက်မှတ်တမ်းတင်ပါမယ်။',
        side: 'left',
        align: 'start',
      },
    },
  ],
  customers: [
    {
      element: '#customers-header',
      popover: {
        title: 'Customers (ဖောက်သည်များ)',
        description:
          'ဖောက်သည်တွေရဲ့ လိပ်စာ၊ ဖုန်းနံပါတ်နဲ့ ယခင်မှာယူခဲ့တဲ့ အချက်အလက်တွေကို မှတ်တမ်းတင်ထားတဲ့ နေရာပါ။',
        side: 'bottom',
        align: 'start',
      },
    },
  ],
  vendors: [
    {
      element: '#vendors-header',
      popover: {
        title: 'Vendors (ပို့ဆောင်ရေး လုပ်ငန်းများ)',
        description:
          'ချိတ်ဆက်ထားတဲ့ ကုန်စည်ပို့ဆောင်ရေး (Cargo) တွေရဲ့ အချက်အလက်၊ ဈေးနှုန်းတွေကို ဒီမှာ မှတ်တမ်းတင်ထားပါတယ်။',
        side: 'bottom',
        align: 'start',
      },
    },
  ],
  procurement: [
    {
      element: '#procurement-header',
      popover: {
        title: 'Procurement (ဝယ်ယူရေးနှင့် ထောက်ပံ့မှု)',
        description:
          'ပေးသွင်းသူများ (Vendors) ထံမှ ကုန်ပစ္စည်းဝယ်ယူခြင်း၊ PO များကို စီမံခန့်ခွဲနိုင်ပါတယ်။',
        side: 'bottom',
        align: 'start',
      },
    },
  ],
  invoices: [
    {
      element: '#invoices-header',
      popover: {
        title: 'Invoices (ငွေတောင်းခံလွှာများ)',
        description:
          'Customer တွေကို ပေးပို့တဲ့ ငွေတောင်းခံလွှာတွေကို ခြေရာခံ စောင့်ကြည့်နိုင်ပါတယ်။',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#invoice-stats',
      popover: {
        title: 'ငွေကြေး အခြေအနေများ (Overview)',
        description: 'ရရန်ရှိတဲ့ငွေ၊ ရပြီးတဲ့ငွေ ပမာဏတွေကို ဒီမှာ ကြည့်ရှုနိုင်ပါတယ်။',
        side: 'bottom',
        align: 'center',
      },
    },
  ],
};

function normalizeKey(key) {
  if (!key) return '';
  return key.charAt(0).toLowerCase() + key.slice(1);
}

export const hasTour = (pageKey) => {
  return !!tourSteps[normalizeKey(pageKey)];
};

export const startTour = (pageKey) => {
  const normalizedKey = normalizeKey(pageKey);
  const steps = tourSteps[normalizedKey];

  if (!steps) {
    console.warn(`No tour steps defined for page: ${pageKey}`);
    return;
  }

  const driverObj = driver({
    showProgress: true,
    steps: steps,
    nextBtnText: 'ရှေ့သို့',
    prevBtnText: 'နောက်သို့',
    doneBtnText: 'ပြီးပြီ',
    closeBtnText: 'ပိတ်မည်',
  });

  driverObj.drive();
};

// Backwards compatibility
export const startInventoryTour = () => startTour('inventory');
