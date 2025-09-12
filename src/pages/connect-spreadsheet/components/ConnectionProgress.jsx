import React from 'react';
import Icon from '../../../components/AppIcon';

const ConnectionProgress = ({ currentStep, steps, isVisible }) => {
  if (!isVisible) return null;

  const getStepIcon = (step, index) => {
    if (index < currentStep) return 'CheckCircle';
    if (index === currentStep) return step?.processing ? 'Loader2' : step?.icon;
    return step?.icon;
  };

  const getStepStatus = (index) => {
    if (index < currentStep) return 'completed';
    if (index === currentStep) return 'active';
    return 'pending';
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 elevation-1">
      <div className="flex items-center space-x-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg">
          <Icon name="Activity" size={20} className="text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Connection Progress</h3>
          <p className="text-sm text-muted-foreground">Setting up your spreadsheet connection</p>
        </div>
      </div>
      <div className="space-y-4">
        {steps?.map((step, index) => {
          const status = getStepStatus(index);
          const isProcessing = index === currentStep && step?.processing;
          
          return (
            <div key={index} className="flex items-start space-x-4">
              {/* Step Indicator */}
              <div className="flex flex-col items-center">
                <div className={`
                  flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300
                  ${status === 'completed' 
                    ? 'bg-success border-success text-success-foreground' 
                    : status === 'active' ?'bg-primary border-primary text-primary-foreground' :'bg-background border-border text-muted-foreground'
                  }
                `}>
                  <Icon 
                    name={getStepIcon(step, index)} 
                    size={16} 
                    className={isProcessing ? 'animate-spin' : ''}
                  />
                </div>
                {index < steps?.length - 1 && (
                  <div className={`
                    w-0.5 h-8 mt-2 transition-colors duration-300
                    ${index < currentStep ? 'bg-success' : 'bg-border'}
                  `} />
                )}
              </div>
              {/* Step Content */}
              <div className="flex-1 pb-8">
                <div className="flex items-center justify-between mb-1">
                  <h4 className={`
                    font-medium transition-colors duration-300
                    ${status === 'completed' || status === 'active' 
                      ? 'text-foreground' :'text-muted-foreground'
                    }
                  `}>
                    {step?.title}
                  </h4>
                  {status === 'completed' && (
                    <span className="text-xs text-success font-medium">Completed</span>
                  )}
                  {status === 'active' && isProcessing && (
                    <span className="text-xs text-primary font-medium">Processing...</span>
                  )}
                </div>
                
                <p className={`
                  text-sm transition-colors duration-300
                  ${status === 'completed' || status === 'active' 
                    ? 'text-muted-foreground' :'text-muted-foreground/60'
                  }
                `}>
                  {step?.description}
                </p>

                {/* Step Details */}
                {status === 'active' && step?.details && (
                  <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <div className="space-y-2">
                      {step?.details?.map((detail, detailIndex) => (
                        <div key={detailIndex} className="flex items-center space-x-2 text-sm">
                          <Icon name="ArrowRight" size={12} className="text-primary" />
                          <span className="text-foreground">{detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error State */}
                {status === 'active' && step?.error && (
                  <div className="mt-3 p-3 bg-error/5 border border-error/20 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <Icon name="AlertCircle" size={16} className="text-error mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-error">{step?.error?.title}</p>
                        <p className="text-sm text-error/80 mt-1">{step?.error?.message}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {/* Overall Progress */}
      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Overall Progress</span>
          <span className="text-sm text-muted-foreground">
            {currentStep} of {steps?.length} steps completed
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(currentStep / steps?.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default ConnectionProgress;