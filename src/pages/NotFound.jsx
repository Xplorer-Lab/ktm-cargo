import { Button } from '@/components/ui/button';
import { logger } from '@/api/logger';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, Home } from 'lucide-react';
import { toast } from 'sonner';

export default function NotFound() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleReport = () => {
    logger.logEvent('404_page_reached', {
      path: location.pathname,
      referrer: document.referrer,
    });
    toast.success('Thanks! We have logged this broken link.');
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 bg-slate-50">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md w-full">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-10 h-10 text-amber-600" />
        </div>

        <h1 className="text-3xl font-bold text-slate-900 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Page Not Found</h2>

        <p className="text-slate-600 mb-8">
          Sorry, the page you are looking for ({location.pathname}) does not exist.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => navigate('/')} className="flex items-center gap-2">
            <Home className="w-4 h-4" />
            Go Home
          </Button>

          <Button
            variant="outline"
            onClick={handleReport}
            className="flex items-center gap-2 text-slate-600"
          >
            Report Broken Link
          </Button>
        </div>
      </div>
    </div>
  );
}
