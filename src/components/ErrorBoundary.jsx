import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Send } from 'lucide-react';
import { logger } from '@/api/logger';
import { toast } from 'sonner';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      feedback: '',
      sendingFeedback: false,
      feedbackSent: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log to our service
    logger.logError(error, errorInfo);
    this.setState({ errorInfo });
  }

  handleFeedbackSubmit = () => {
    if (!this.state.feedback.trim()) return;

    this.setState({ sendingFeedback: true });

    // Simulate sending feedback
    setTimeout(() => {
      logger.logEvent('user_crash_feedback', {
        message: this.state.feedback,
        error: this.state.error?.message,
      });

      this.setState({
        sendingFeedback: false,
        feedbackSent: true,
        feedback: '',
      });
      toast.success('Thank you for your feedback!');
    }, 1000);
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      feedback: '',
      feedbackSent: false,
    });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-rose-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h1>
            <p className="text-slate-600 mb-6">
              We encountered an unexpected error. Please try refreshing the page.
            </p>

            {/* Feedback Form */}
            {!this.state.feedbackSent ? (
              <div className="mb-6 text-left">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  What were you doing when this happened?
                </label>
                <div className="flex gap-2">
                  <Textarea
                    value={this.state.feedback}
                    onChange={(e) => this.setState({ feedback: e.target.value })}
                    placeholder="Describing the steps helps us fix this faster..."
                    className="min-h-[80px] text-sm"
                  />
                </div>
                <div className="flex justify-end mt-2">
                  <Button
                    size="sm"
                    onClick={this.handleFeedbackSubmit}
                    disabled={this.state.sendingFeedback || !this.state.feedback.trim()}
                    className="bg-slate-800 text-white hover:bg-slate-700"
                  >
                    {this.state.sendingFeedback ? 'Sending...' : 'Send Report'}
                    {!this.state.sendingFeedback && <Send className="w-3 h-3 ml-2" />}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mb-6 p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm border border-emerald-200">
                Thanks! Your feedback has been sent to our engineering team.
              </div>
            )}

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="text-left bg-slate-100 p-4 rounded-md mb-6 overflow-auto max-h-48 text-xs font-mono">
                <p className="font-bold text-rose-600 mb-2">{this.state.error.toString()}</p>
                <pre>{this.state.errorInfo?.componentStack}</pre>
              </div>
            )}
            <div className="flex gap-3 justify-center">
              <Button onClick={() => window.history.back()} variant="outline">
                Go Back
              </Button>
              <Button onClick={this.handleReset} className="bg-blue-600 hover:bg-blue-700">
                Refresh Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
