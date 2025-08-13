import { Component, ErrorInfo, ReactNode } from 'react';

import { Calculator, AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  calculationType: string;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class CalculationErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log calculation errors for debugging
    if (process.env.NODE_ENV === 'development') {
      console.error(`Calculation Error in ${this.props.calculationType}:`, error, errorInfo);
    }
  }

  private readonly handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  private getErrorMessage(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('division by zero') || message.includes('divide by zero')) {
      return 'Calculation failed due to division by zero. Check your input parameters, especially diameters and lengths.';
    }
    
    if (message.includes('nan') || message.includes('infinity')) {
      return 'Calculation resulted in invalid numbers. Verify that all input values are within reasonable ranges.';
    }
    
    if (message.includes('overflow')) {
      return 'Calculation overflow detected. Your input values may be too large for this calculation.';
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'Network error occurred while processing calculations. Check your internet connection and try again.';
    }
    
    return `Calculation error in ${this.props.calculationType}. Please verify your input parameters and try again.`;
  }

  private getSuggestions(error: Error): string[] {
    const message = error.message.toLowerCase();
    const suggestions: string[] = [];
    
    if (message.includes('division by zero')) {
      suggestions.push('Ensure all diameter and length values are greater than zero');
      suggestions.push('Check that pipe inner diameter is less than outer diameter');
    }
    
    if (message.includes('nan') || message.includes('infinity')) {
      suggestions.push('Verify all numeric inputs are valid numbers');
      suggestions.push('Check that fluid densities are within typical ranges (8-20 PPG)');
      suggestions.push('Ensure survey data has valid MD, TVD, and inclination values');
    }
    
    if (message.includes('overflow')) {
      suggestions.push('Reduce the magnitude of input values');
      suggestions.push('Check for extremely large depth or pressure values');
    }
    
    // General suggestions
    suggestions.push('Double-check all input parameters for reasonableness');
    suggestions.push('Ensure survey data is properly formatted and complete');
    
    return suggestions;
  }

  public override render() {
    if (this.state.hasError && this.state.error) {
      const errorMessage = this.getErrorMessage(this.state.error);
      const suggestions = this.getSuggestions(this.state.error);

      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 m-4">
          <div className="flex items-start">
            <AlertCircle className="h-6 w-6 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                <Calculator className="inline h-5 w-5 mr-2" />
                {this.props.calculationType} Error
              </h3>
              
              <p className="text-red-700 mb-4">{errorMessage}</p>
              
              {suggestions.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-red-800 mb-2">Suggestions:</h4>
                  <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                    {suggestions.map((suggestion, index) => (
                      <li key={`suggestion-${index}-${suggestion.substring(0, 10)}`}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={this.handleRetry}
                  className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Calculation
                </button>
              </div>

              {process.env.NODE_ENV === 'development' && (
                <details className="mt-4 p-3 bg-white rounded border">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700">
                    Debug Information
                  </summary>
                  <pre className="mt-2 text-xs text-gray-600 overflow-x-auto">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default CalculationErrorBoundary;