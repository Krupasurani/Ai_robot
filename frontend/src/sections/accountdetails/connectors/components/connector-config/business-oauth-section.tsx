import React from 'react';
import { Key, Code, Check } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface BusinessOAuthSectionProps {
  adminEmail: string;
  adminEmailError: string | null;
  selectedFile: File | null;
  fileName: string | null;
  fileError: string | null;
  jsonData: Record<string, any> | null;
  onAdminEmailChange: (email: string) => void;
  onFileUpload: () => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

const BusinessOAuthSection: React.FC<BusinessOAuthSectionProps> = ({
  adminEmail,
  adminEmailError,
  selectedFile,
  fileName,
  fileError,
  jsonData,
  onAdminEmailChange,
  onFileUpload,
  onFileChange,
  fileInputRef,
}) => {
  return (
    <Card className="p-6 rounded-xl border border-primary/20 bg-primary/5 mb-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10 flex items-center justify-center">
          <Key className="w-5 h-5 text-primary" />
        </div>
        <h3 className="text-base font-semibold">Business OAuth Configuration</h3>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        For business accounts, upload your Google Cloud Service Account JSON credentials file and
        provide the admin email address.
      </p>

      {/* Admin Email Field */}
      <div className="mb-6">
        <Label htmlFor="admin-email" className="mb-2">
          Admin Email
        </Label>
        <Input
          id="admin-email"
          type="email"
          value={adminEmail}
          onChange={(e) => onAdminEmailChange(e.target.value)}
          placeholder="admin@yourdomain.com"
          className={cn(adminEmailError && 'border-destructive')}
        />
        {adminEmailError ? (
          <p className="text-sm text-destructive mt-1">{adminEmailError}</p>
        ) : (
          <p className="text-xs text-muted-foreground mt-1">
            Enter the Google Workspace admin email address
          </p>
        )}
      </div>

      {/* JSON File Upload */}
      <div className="mb-4">
        <Label className="mb-3 block text-sm font-medium">Google Cloud Service Account JSON</Label>

        <Card
          className={cn(
            'p-4 rounded-lg border-2 cursor-pointer transition-all',
            selectedFile || jsonData
              ? 'border-success/30 bg-success/5'
              : 'border-dashed border-primary/30 bg-primary/5 hover:border-primary/50 hover:bg-primary/10'
          )}
          onClick={onFileUpload}
        >
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'p-2 rounded-lg flex items-center justify-center',
                selectedFile || jsonData ? 'bg-success/10' : 'bg-primary/10'
              )}
            >
              {selectedFile || jsonData ? (
                <Check className="w-6 h-6 text-success" />
              ) : (
                <Code className="w-6 h-6 text-primary" />
              )}
            </div>

            <div className="flex-1">
              <p className="text-sm font-medium mb-1">{fileName || 'Click to upload JSON file'}</p>
              <p className="text-xs text-muted-foreground">
                {selectedFile || jsonData
                  ? 'Google Cloud Service Account credentials loaded'
                  : 'Upload your Google Cloud Service Account JSON file'}
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onFileUpload();
              }}
              className="min-w-[100px]"
            >
              {selectedFile ? 'Replace' : 'Upload'}
            </Button>
          </div>
        </Card>

        {fileError && <p className="text-xs text-destructive mt-2">{fileError}</p>}

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={onFileChange}
          className="hidden"
        />
      </div>

      {/* JSON Data Preview */}
      {jsonData && (
        <div className="mt-4">
          <Label className="mb-2 block text-sm font-medium">Loaded Credentials Preview</Label>
          <Card className="p-4 rounded-lg border bg-muted/50">
            <pre className="text-xs text-muted-foreground font-mono">
              Project ID: {jsonData.project_id}
              <br />
              Client ID: {jsonData.client_id}
              <br />
              Type: {jsonData.type}
              <br />
              {jsonData.client_email && `Service Account: ${jsonData.client_email}`}
            </pre>
          </Card>
        </div>
      )}
    </Card>
  );
};

export default BusinessOAuthSection;
