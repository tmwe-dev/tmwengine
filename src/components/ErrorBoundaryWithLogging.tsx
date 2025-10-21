import { Component, ErrorInfo, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundaryWithLogging extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🔥 ErrorBoundary caught error:', error);

    // Log automatico per AI
    try {
      await supabase.functions.invoke('log-error', {
        body: {
          component: errorInfo.componentStack?.split('\n')[1]?.trim() || 'Unknown',
          error: error.message,
          stack: error.stack,
          lovableGenerated: true,
          context: `Component stack: ${errorInfo.componentStack?.substring(0, 200)}`
        }
      });

      console.log('✅ Error logged to AI collaboration system');
    } catch (logError) {
      console.error('❌ Failed to log error:', logError);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-background">
          <div className="max-w-md w-full bg-card rounded-lg shadow-lg p-6 space-y-4 border">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="w-8 h-8" />
              <h2 className="text-xl font-bold">Si è verificato un errore</h2>
            </div>
            
            <div className="bg-destructive/10 border border-destructive/20 rounded p-4">
              <p className="text-sm text-destructive font-mono">
                {this.state.error.message}
              </p>
            </div>

            <div className="bg-primary/10 border border-primary/20 rounded p-4">
              <p className="text-sm text-foreground">
                🤖 Gli AI della Chat Laboratory stanno analizzando l'errore...
              </p>
            </div>

            <div className="flex gap-3">
              <Button onClick={this.handleReset} className="flex-1">
                Riprova
              </Button>
              <Button 
                onClick={() => window.location.href = '/'} 
                variant="outline"
                className="flex-1"
              >
                Torna alla Home
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              L'errore è stato registrato automaticamente nel sistema di collaborazione AI
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
