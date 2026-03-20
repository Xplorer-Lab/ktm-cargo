import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Download,
  Printer,
  CheckCircle,
  Package,
  ClipboardList,
  Plane,
  FileCheck,
} from 'lucide-react';
import { format } from 'date-fns';

/** Escape for safe insertion into HTML (prevents XSS in print documents). */
function escapeHtml(str) {
  if (str == null) return '';
  const s = String(str);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const documentTypes = [
  { id: 'commercial_invoice', label: 'Commercial Invoice', icon: FileText, required: true },
  { id: 'packing_list', label: 'Packing List', icon: ClipboardList, required: true },
  { id: 'air_waybill', label: 'Air Waybill', icon: Plane, required: true },
  { id: 'customs_declaration', label: 'Customs Declaration', icon: FileCheck, required: true },
];

export default function DocumentGenerator({ shipment, onGenerate }) {
  const [generating, setGenerating] = useState(null);
  const [generated, setGenerated] = useState([]);

  const handleGenerate = async (docType) => {
    setGenerating(docType);
    // Simulate generation delay
    await new Promise((r) => setTimeout(r, 500));
    setGenerated([...generated, docType]);
    setGenerating(null);
    onGenerate?.(docType);
  };

  const handleGenerateAll = async () => {
    for (const doc of documentTypes) {
      if (!generated.includes(doc.id)) {
        await handleGenerate(doc.id);
      }
    }
  };

  const handlePrint = (docType) => {
    const printWindow = window.open('', '_blank');
    const content = generateDocumentHTML(docType, shipment);
    // NOTE: document.write() is safe here - writing to a new controlled window for printing
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Shipping Documents
          </CardTitle>
          <Button
            size="sm"
            onClick={handleGenerateAll}
            disabled={generated.length === documentTypes.length}
          >
            Generate All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {documentTypes.map((doc) => {
          const Icon = doc.icon;
          const isGenerated = generated.includes(doc.id);
          const isGenerating = generating === doc.id;

          return (
            <div
              key={doc.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                isGenerated ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isGenerated ? 'bg-emerald-100' : 'bg-white'}`}>
                  <Icon
                    className={`w-4 h-4 ${isGenerated ? 'text-emerald-600' : 'text-slate-500'}`}
                  />
                </div>
                <div>
                  <p className="font-medium text-slate-900">{doc.label}</p>
                  {doc.required && (
                    <Badge variant="outline" className="text-xs">
                      Required
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isGenerated ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <Button size="sm" variant="ghost" onClick={() => handlePrint(doc.id)}>
                      <Printer className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleGenerate(doc.id)}
                    disabled={isGenerating}
                  >
                    {isGenerating ? 'Generating...' : 'Generate'}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function generateDocumentHTML(docType, shipment) {
  const today = format(new Date(), 'MMMM d, yyyy');
  const track = escapeHtml(shipment?.tracking_number || 'Pending');
  const invoiceNumber = track === 'Pending' ? `INV-${String(Date.now())}` : `INV-${track}`;
  const customerName = escapeHtml(shipment?.customer_name || '');
  const customerPhone = escapeHtml(shipment?.customer_phone || '');
  const deliveryAddress = escapeHtml(shipment?.delivery_address || 'Yangon, Myanmar');
  const itemsDesc = escapeHtml(shipment?.items_description || 'General Cargo');
  const serviceType = escapeHtml(shipment?.service_type?.replace('_', ' ') || 'Standard');
  const paymentStatus = escapeHtml(shipment?.payment_status?.toUpperCase() || 'PENDING');
  const weightKg = shipment?.weight_kg != null ? String(shipment.weight_kg) : '';
  const pricePerKg = shipment?.price_per_kg != null ? Number(shipment.price_per_kg) : 95;
  const insuranceAmount = shipment?.insurance_amount ?? 0;
  const packagingFee = Number(shipment?.packaging_fee) || 0;
  const totalAmount = shipment?.total_amount ?? 0;
  const pickupDateStr = shipment?.pickup_date
    ? format(new Date(shipment.pickup_date), 'MMM d, yyyy')
    : 'TBD';
  const refNo = escapeHtml(
    shipment?.tracking_number ? `CD-${shipment.tracking_number}` : `CD-${Date.now()}`
  );

  const baseStyles = `
    <style>
      body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
      .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
      .header h1 { margin: 0; font-size: 24px; }
      .header p { margin: 5px 0; color: #666; }
      .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
      .info-box { border: 1px solid #ddd; padding: 15px; border-radius: 4px; }
      .info-box h3 { margin: 0 0 10px 0; font-size: 14px; color: #666; text-transform: uppercase; }
      .info-box p { margin: 3px 0; }
      table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
      th { background: #f5f5f5; }
      .total-row { font-weight: bold; background: #f9f9f9; }
      .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
      .signature-box { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
      .signature-line { border-top: 1px solid #333; padding-top: 5px; margin-top: 50px; }
    </style>
  `;

  const templates = {
    commercial_invoice: `
      <!DOCTYPE html><html><head><title>Commercial Invoice</title>${baseStyles}</head><body>
        <div class="header">
          <h1>COMMERCIAL INVOICE</h1>
          <p>Bangkok-Yangon Cargo &amp; Shopping Services</p>
          <p>Bangkok, Thailand</p>
        </div>
        <div class="info-grid">
          <div class="info-box">
            <h3>Invoice Details</h3>
            <p><strong>Invoice No:</strong> ${escapeHtml(invoiceNumber)}</p>
            <p><strong>Date:</strong> ${today}</p>
            <p><strong>Tracking:</strong> ${track}</p>
          </div>
          <div class="info-box">
            <h3>Consignee</h3>
            <p><strong>${customerName}</strong></p>
            <p>${customerPhone}</p>
            <p>${deliveryAddress}</p>
          </div>
        </div>
        <table>
          <thead>
            <tr><th>Description</th><th>Weight (kg)</th><th>Rate (THB/kg)</th><th>Amount (THB)</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>${itemsDesc}</td>
              <td>${escapeHtml(weightKg)}</td>
              <td>฿${Number(pricePerKg).toLocaleString()}</td>
              <td>฿${((Number(shipment?.weight_kg) || 0) * (Number(shipment?.price_per_kg) || 95)).toLocaleString()}</td>
            </tr>
            ${shipment?.insurance_opted ? `<tr><td>Insurance (3%)</td><td>-</td><td>-</td><td>฿${Number(insuranceAmount).toLocaleString()}</td></tr>` : ''}
            ${packagingFee > 0 ? `<tr><td>Packaging</td><td>-</td><td>-</td><td>฿${packagingFee}</td></tr>` : ''}
            <tr class="total-row"><td colspan="3">TOTAL</td><td>฿${Number(totalAmount).toLocaleString()}</td></tr>
          </tbody>
        </table>
        <p><strong>Payment Status:</strong> ${paymentStatus}</p>
        <div class="footer">
          <p>This is a computer-generated document. For shipping from Bangkok to Yangon via air cargo.</p>
        </div>
      </body></html>
    `,
    packing_list: `
      <!DOCTYPE html><html><head><title>Packing List</title>${baseStyles}</head><body>
        <div class="header">
          <h1>PACKING LIST</h1>
          <p>Bangkok-Yangon Cargo &amp; Shopping Services</p>
        </div>
        <div class="info-grid">
          <div class="info-box">
            <h3>Shipment Details</h3>
            <p><strong>Tracking No:</strong> ${track}</p>
            <p><strong>Date:</strong> ${today}</p>
            <p><strong>Service:</strong> ${serviceType}</p>
          </div>
          <div class="info-box">
            <h3>Consignee</h3>
            <p><strong>${customerName}</strong></p>
            <p>${deliveryAddress}</p>
          </div>
        </div>
        <table>
          <thead>
            <tr><th>Item No.</th><th>Description</th><th>Quantity</th><th>Weight (kg)</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>${itemsDesc}</td>
              <td>1 Package</td>
              <td>${escapeHtml(weightKg)} kg</td>
            </tr>
            <tr class="total-row">
              <td colspan="3">TOTAL GROSS WEIGHT</td>
              <td>${escapeHtml(weightKg)} kg</td>
            </tr>
          </tbody>
        </table>
        <p><strong>Number of Packages:</strong> 1</p>
        <p><strong>Packaging Type:</strong> ${packagingFee > 0 ? 'Professional Packaging' : 'Standard'}</p>
        <div class="footer">
          <p>Origin: Bangkok, Thailand | Destination: Yangon, Myanmar</p>
        </div>
      </body></html>
    `,
    air_waybill: `
      <!DOCTYPE html><html><head><title>Air Waybill</title>${baseStyles}</head><body>
        <div class="header">
          <h1>AIR WAYBILL</h1>
          <p style="font-size: 18px; font-weight: bold;">${track === 'Pending' ? 'AWB-PENDING' : track}</p>
        </div>
        <div class="info-grid">
          <div class="info-box">
            <h3>Shipper</h3>
            <p><strong>Bangkok-Yangon Cargo Services</strong></p>
            <p>Bangkok, Thailand</p>
            <p>Tel: +66-XX-XXX-XXXX</p>
          </div>
          <div class="info-box">
            <h3>Consignee</h3>
            <p><strong>${customerName}</strong></p>
            <p>${customerPhone}</p>
            <p>${deliveryAddress}</p>
          </div>
        </div>
        <div class="info-grid">
          <div class="info-box">
            <h3>Origin</h3>
            <p><strong>BKK</strong> - Bangkok, Thailand</p>
          </div>
          <div class="info-box">
            <h3>Destination</h3>
            <p><strong>RGN</strong> - Yangon, Myanmar</p>
          </div>
        </div>
        <table>
          <thead>
            <tr><th>Pieces</th><th>Gross Weight</th><th>Description</th><th>Declared Value</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>${escapeHtml(weightKg)} kg</td>
              <td>${itemsDesc}</td>
              <td>฿${Number(totalAmount).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
        <p><strong>Flight Date:</strong> ${pickupDateStr}</p>
        <p><strong>Service Type:</strong> ${shipment?.service_type === 'express' ? 'EXPRESS (1-2 days)' : 'STANDARD (3-5 days)'}</p>
        <div class="signature-box">
          <div><div class="signature-line">Shipper's Signature</div></div>
          <div><div class="signature-line">Carrier's Signature</div></div>
        </div>
      </body></html>
    `,
    customs_declaration: `
      <!DOCTYPE html><html><head><title>Customs Declaration</title>${baseStyles}</head><body>
        <div class="header">
          <h1>CUSTOMS DECLARATION</h1>
          <p>For Export from Thailand to Myanmar</p>
        </div>
        <div class="info-box" style="margin-bottom: 20px;">
          <h3>Declaration Reference</h3>
          <p><strong>Reference No:</strong> ${refNo}</p>
          <p><strong>Date:</strong> ${today}</p>
        </div>
        <div class="info-grid">
          <div class="info-box">
            <h3>Exporter</h3>
            <p><strong>Bangkok-Yangon Cargo Services</strong></p>
            <p>Bangkok, Thailand</p>
          </div>
          <div class="info-box">
            <h3>Importer/Consignee</h3>
            <p><strong>${customerName}</strong></p>
            <p>${deliveryAddress}</p>
          </div>
        </div>
        <table>
          <thead>
            <tr><th>HS Code</th><th>Description</th><th>Quantity</th><th>Weight</th><th>Value (THB)</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>-</td>
              <td>${itemsDesc === 'General Cargo' ? 'Personal Effects / General Cargo' : itemsDesc}</td>
              <td>1 pkg</td>
              <td>${escapeHtml(weightKg)} kg</td>
              <td>฿${Number(totalAmount).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
        <div class="info-box" style="margin-top: 20px;">
          <h3>Declaration</h3>
          <p>I hereby declare that the information provided above is true and accurate to the best of my knowledge.</p>
          <p>The goods described are for personal use / commercial purposes and comply with all applicable export regulations.</p>
        </div>
        <div class="signature-box">
          <div><div class="signature-line">Declarant Signature &amp; Date</div></div>
          <div><div class="signature-line">Customs Officer Stamp</div></div>
        </div>
        <div class="footer">
          <p>This declaration is subject to verification by customs authorities of Thailand and Myanmar.</p>
        </div>
      </body></html>
    `,
  };

  return templates[docType] || '';
}
