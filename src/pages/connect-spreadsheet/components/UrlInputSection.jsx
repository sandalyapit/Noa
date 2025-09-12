import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

const UrlInputSection = ({ onUrlSubmit, isProcessing, validationError }) => {
  const [url, setUrl] = useState('');
  const [isValidUrl, setIsValidUrl] = useState(false);

  const validateGoogleSheetsUrl = (inputUrl) => {
    const googleSheetsPattern = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
    return googleSheetsPattern?.test(inputUrl);
  };

  const handleUrlChange = (e) => {
    const inputUrl = e?.target?.value;
    setUrl(inputUrl);
    setIsValidUrl(validateGoogleSheetsUrl(inputUrl));
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (isValidUrl && !isProcessing) {
      const spreadsheetId = url?.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1];
      onUrlSubmit(url, spreadsheetId);
    }
  };

  const handlePasteExample = () => {
    const exampleUrl = "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit";
    setUrl(exampleUrl);
    setIsValidUrl(true);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 elevation-1">
      <div className="flex items-center space-x-3 mb-4">
        <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg">
          <Icon name="Link" size={20} className="text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Connect Google Sheets</h2>
          <p className="text-sm text-muted-foreground">Enter your Google Sheets URL to get started</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Input
            label="Google Sheets URL"
            type="url"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            value={url}
            onChange={handleUrlChange}
            error={validationError}
            description="Paste the full URL of your Google Sheets document"
            className="pr-12"
          />
          {url && (
            <div className="absolute right-3 top-9 flex items-center">
              {isValidUrl ? (
                <Icon name="CheckCircle" size={16} className="text-success" />
              ) : (
                <Icon name="AlertCircle" size={16} className="text-error" />
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            type="submit"
            variant="default"
            disabled={!isValidUrl || isProcessing}
            loading={isProcessing}
            iconName="ArrowRight"
            iconPosition="right"
            className="flex-1"
          >
            {isProcessing ? 'Connecting...' : 'Connect Spreadsheet'}
          </Button>
          
          <Button
            type="button"
            variant="outline"
            onClick={handlePasteExample}
            iconName="FileText"
            iconPosition="left"
            disabled={isProcessing}
          >
            Try Example
          </Button>
        </div>
      </form>

      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-start space-x-3">
          <Icon name="Info" size={16} className="text-primary mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground mb-1">How to get your Google Sheets URL:</p>
            <ol className="text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Open your Google Sheets document</li>
              <li>Click the "Share" button in the top right</li>
              <li>Set sharing to "Anyone with the link can view"</li>
              <li>Copy the URL from your browser's address bar</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UrlInputSection;