import React, { useState, useEffect } from 'react';
import { db } from '@/api/db';
import { uploadLogo } from '@/api/integrations/storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, Upload, Save, Loader2, Image, Palette, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function CompanyBranding() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const { data: settings, isLoading, isError } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      try {
        const list = await db.companySettings.list();
        return list[0] || null;
      } catch (err) {
        console.error('Failed to fetch company settings:', err);
        // Return null so the form still works with defaults
        return null;
      }
    },
    retry: false, // Don't retry on error
  });

  const [form, setForm] = useState({
    company_name: 'BKK-YGN Cargo',
    logo_url: '',
    tagline: 'Bangkok to Yangon Cargo & Shopping Services',
    email: '',
    phone: '',
    address: '',
    tax_id: '',
    bank_name: '',
    bank_account: '',
    bank_account_name: '',
    primary_color: '#2563eb',
    currency: 'THB',
  });

  useEffect(() => {
    if (settings) {
      console.log('Loaded company settings:', settings);
      console.log('Logo URL from DB:', settings.logo_url);
      setForm({
        company_name: settings.company_name || 'BKK-YGN Cargo',
        logo_url: settings.logo_url || '',
        tagline: settings.tagline || '',
        email: settings.email || '',
        phone: settings.phone || '',
        address: settings.address || '',
        tax_id: settings.tax_id || '',
        bank_name: settings.bank_name || '',
        bank_account: settings.bank_account || '',
        bank_account_name: settings.bank_account_name || '',
        primary_color: settings.primary_color || '#2563eb',
        currency: settings.currency || 'THB',
      });
      // Reset logo error when settings load
      setLogoError(false);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      try {
        if (settings?.id) {
          return await db.companySettings.update(settings.id, data);
        } else {
          return await db.companySettings.create(data);
        }
      } catch (err) {
        console.error('Failed to save company settings:', err);
        throw new Error(
          err.message?.includes('relation') 
            ? 'Database table not found. Please run the migration first.'
            : err.message || 'Failed to save settings'
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-settings'] });
      toast.success('Company settings saved successfully');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to save settings');
    },
  });

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload an image (JPEG, PNG, GIF, or WebP).');
      return;
    }

    // Validate file size (max 5MB for logos)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File size exceeds 5MB limit. Please upload a smaller image.');
      return;
    }

    setUploading(true);
    setLogoError(false); // Reset error state before upload
    try {
      console.log('Uploading logo...');
      const result = await uploadLogo(file);
      console.log('Upload result:', result);
      
      const logoUrl = result.url || result.file_url;
      console.log('Logo URL to save:', logoUrl);
      
      if (!logoUrl) {
        throw new Error('No URL returned from upload');
      }
      
      // Update local form state
      setForm((prev) => ({ ...prev, logo_url: logoUrl }));
      
      // Auto-save to database immediately
      if (settings?.id) {
        console.log('Updating existing settings with logo:', settings.id);
        await db.companySettings.update(settings.id, { logo_url: logoUrl });
      } else {
        console.log('Creating new settings with logo');
        await db.companySettings.create({ ...form, logo_url: logoUrl });
      }
      
      queryClient.invalidateQueries({ queryKey: ['company-settings'] });
      toast.success('Logo uploaded and saved successfully');
    } catch (err) {
      console.error('Logo upload error:', err);
      toast.error(err.message || 'Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    saveMutation.mutate(form);
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {isError && (
        <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-800">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Database setup required:</strong> The company_settings table may not exist. 
            Please run the migration: <code className="bg-amber-100 px-1 rounded">migrations/create_company_settings.sql</code>
          </AlertDescription>
        </Alert>
      )}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Company Branding
          </CardTitle>
          <CardDescription>
            Customize your company logo and name. These will appear on invoices and throughout the
            app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Upload */}
          <div className="space-y-3">
            <Label>Company Logo</Label>
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center bg-slate-50 overflow-hidden">
                {form.logo_url && !logoError ? (
                  <img 
                    src={form.logo_url} 
                    alt="Logo" 
                    className="w-full h-full object-contain"
                    onError={() => {
                      console.error('Failed to load logo from:', form.logo_url);
                      setLogoError(true);
                    }}
                    onLoad={() => setLogoError(false)}
                  />
                ) : (
                  <div className="flex flex-col items-center">
                    <Image className="w-8 h-8 text-slate-300" />
                    {logoError && <span className="text-xs text-rose-500 mt-1">Load failed</span>}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('logo-upload').click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Upload Logo
                </Button>
                <p className="text-xs text-slate-500">Recommended: 200x200px, PNG or JPG</p>
                {form.logo_url && (
                  <a 
                    href={form.logo_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline block truncate max-w-[200px]"
                    title={form.logo_url}
                  >
                    View uploaded logo →
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Company Name & Tagline */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company Name *</Label>
              <Input
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                placeholder="Your company name"
              />
            </div>
            <div className="space-y-2">
              <Label>Tagline</Label>
              <Input
                value={form.tagline}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                placeholder="Your company tagline"
              />
            </div>
          </div>

          {/* Contact Info */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="contact@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+66 XX XXX XXXX"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Address</Label>
            <Textarea
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Company address"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Tax ID</Label>
            <Input
              value={form.tax_id}
              onChange={(e) => setForm({ ...form, tax_id: e.target.value })}
              placeholder="Tax identification number"
            />
          </div>
        </CardContent>
      </Card>

      {/* Bank Details */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Bank Details</CardTitle>
          <CardDescription>For invoice payment information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Bank Name</Label>
              <Input
                value={form.bank_name}
                onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                placeholder="Bank name"
              />
            </div>
            <div className="space-y-2">
              <Label>Account Number</Label>
              <Input
                value={form.bank_account}
                onChange={(e) => setForm({ ...form, bank_account: e.target.value })}
                placeholder="Account number"
              />
            </div>
            <div className="space-y-2">
              <Label>Account Name</Label>
              <Input
                value={form.bank_account_name}
                onChange={(e) => setForm({ ...form, bank_account_name: e.target.value })}
                placeholder="Account holder name"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Theme */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-blue-600" />
            Theme
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="space-y-2">
              <Label>Primary Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.primary_color}
                  onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer border-0"
                />
                <Input
                  value={form.primary_color}
                  onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                  className="w-28"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Settings
        </Button>
      </div>
    </div>
  );
}
