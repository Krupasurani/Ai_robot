import React from 'react';
import { Eye, EyeOff, X, Upload, File as FileIcon } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import MultipleSelector, { type Option } from '@/components/ui/multi-select';

interface BaseFieldProps {
  field: any;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
}

const FieldDescription: React.FC<{ description: string; error?: string; className?: string }> = ({
  description, 
  error, 
  className,
}) => {
  if (!description || error) return null;
  
  return (
    <p className={cn('text-xs text-muted-foreground mt-1.5 leading-relaxed opacity-85', className)}>
      {description}
    </p>
  );
};

export const TextFieldRenderer: React.FC<BaseFieldProps> = ({
  field,
  value,
  onChange,
  error,
  disabled,
}) => {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.name} className="text-sm font-medium">
        {field.displayName}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <div className="relative">
        <Input
          id={field.name}
          type={field.isSecret ? (showPassword ? 'text' : 'password') : 'text'}
        placeholder={field.placeholder}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
          className={cn('pr-10', error && 'border-destructive aria-invalid:ring-destructive/20')}
          aria-invalid={!!error}
        />
        {field.isSecret && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
            disabled={disabled}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        )}
      </div>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      <FieldDescription description={field.description} error={error} />
    </div>
  );
};

export const PasswordFieldRenderer: React.FC<BaseFieldProps> = ({
  field,
  value,
  onChange,
  error,
  disabled,
}) => {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.name} className="text-sm font-medium">
        {field.displayName}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <div className="relative">
        <Input
          id={field.name}
          type={showPassword ? 'text' : 'password'}
        placeholder={field.placeholder}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
          className={cn('pr-10', error && 'border-destructive aria-invalid:ring-destructive/20')}
          aria-invalid={!!error}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
          disabled={disabled}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      <FieldDescription description={field.description} error={error} />
    </div>
  );
};

export const EmailFieldRenderer: React.FC<BaseFieldProps> = ({
  field,
  value,
  onChange,
  error,
  disabled,
}) => {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.name} className="text-sm font-medium">
        {field.displayName}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Input
        id={field.name}
        type="email"
        placeholder={field.placeholder}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(error && 'border-destructive aria-invalid:ring-destructive/20')}
        aria-invalid={!!error}
      />
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      <FieldDescription description={field.description} error={error} />
    </div>
  );
};

export const UrlFieldRenderer: React.FC<BaseFieldProps> = ({
  field,
  value,
  onChange,
  error,
  disabled,
}) => {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.name} className="text-sm font-medium">
        {field.displayName}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Input
        id={field.name}
        type="url"
        placeholder={field.placeholder}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(error && 'border-destructive aria-invalid:ring-destructive/20')}
        aria-invalid={!!error}
      />
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      <FieldDescription description={field.description} error={error} />
    </div>
  );
};

export const TextareaFieldRenderer: React.FC<BaseFieldProps> = ({
  field,
  value,
  onChange,
  error,
  disabled,
}) => {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.name} className="text-sm font-medium">
        {field.displayName}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Textarea
        id={field.name}
        placeholder={field.placeholder}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={3}
        className={cn(error && 'border-destructive aria-invalid:ring-destructive/20')}
        aria-invalid={!!error}
      />
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      <FieldDescription description={field.description} error={error} />
    </div>
  );
};

export const SelectFieldRenderer: React.FC<BaseFieldProps> = ({
  field,
  value,
  onChange,
  error,
  disabled,
}) => {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.name} className="text-sm font-medium">
        {field.displayName}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Select value={value || ''} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger
          id={field.name}
          className={cn('w-full', error && 'border-destructive aria-invalid:ring-destructive/20')}
          aria-invalid={!!error}
        >
          <SelectValue placeholder={field.placeholder || 'Select an option'} />
        </SelectTrigger>
        <SelectContent>
          {field.options?.map((option: string) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
        </Select>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      <FieldDescription description={field.description} error={error} />
    </div>
  );
};

export const MultiSelectFieldRenderer: React.FC<BaseFieldProps> = ({
  field,
  value,
  onChange,
  error,
  disabled,
}) => {
  const selectedValues = Array.isArray(value) ? value : [];
  const options: Option[] = (field.options || []).map((opt: string) => ({
    value: opt,
    label: opt,
  }));

  const selectedOptions: Option[] = selectedValues
    .map((val: string) => options.find((opt) => opt.value === val))
    .filter(Boolean) as Option[];

  const handleChange = (newOptions: Option[]) => {
    onChange(newOptions.map((opt) => opt.value));
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {field.displayName}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <MultipleSelector
        value={selectedOptions}
        onChange={handleChange}
        defaultOptions={options}
        placeholder={field.placeholder || 'Select options...'}
        disabled={disabled}
        maxSelected={field.maxSelected}
        className={cn(error && 'border-destructive')}
            />
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      <FieldDescription description={field.description} error={error} />
    </div>
  );
};

export const CheckboxFieldRenderer: React.FC<BaseFieldProps> = ({
  field,
  value,
  onChange,
  error,
  disabled,
}) => {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center space-x-2">
          <Checkbox
          id={field.name}
            checked={!!value}
          onCheckedChange={(checked) => onChange(checked)}
            disabled={disabled}
          className={cn(error && 'border-destructive')}
          />
        <Label
          htmlFor={field.name}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
            {field.displayName}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
      </div>
      {error && <p className="text-xs text-destructive mt-1 ml-6">{error}</p>}
      <FieldDescription description={field.description} error={error} className="ml-6" />
    </div>
  );
};

export const NumberFieldRenderer: React.FC<BaseFieldProps> = ({
  field,
  value,
  onChange,
  error,
  disabled,
}) => {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.name} className="text-sm font-medium">
        {field.displayName}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Input
        id={field.name}
        type="number"
        placeholder={field.placeholder}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        min={field.validation?.minLength}
        max={field.validation?.maxLength}
        className={cn(error && 'border-destructive aria-invalid:ring-destructive/20')}
        aria-invalid={!!error}
      />
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      <FieldDescription description={field.description} error={error} />
    </div>
  );
};

export const DateFieldRenderer: React.FC<BaseFieldProps> = ({
  field,
  value,
  onChange,
  error,
  disabled,
}) => {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.name} className="text-sm font-medium">
        {field.displayName}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Input
        id={field.name}
        type="date"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(error && 'border-destructive aria-invalid:ring-destructive/20')}
        aria-invalid={!!error}
      />
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      <FieldDescription description={field.description} error={error} />
    </div>
  );
};

export const DateRangeFieldRenderer: React.FC<BaseFieldProps> = ({
  field,
  value,
  onChange,
  error,
  disabled,
}) => {
  const rangeValue = value || { start: '', end: '' };

  const handleStartChange = (startDate: string) => {
    onChange({ ...rangeValue, start: startDate });
  };

  const handleEndChange = (endDate: string) => {
    onChange({ ...rangeValue, end: endDate });
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {field.displayName}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <div className="flex gap-3">
        <div className="flex-1">
          <Label
            htmlFor={`${field.name}-start`}
            className="text-xs text-muted-foreground mb-1 block"
          >
            Start Date
          </Label>
          <Input
            id={`${field.name}-start`}
          type="date"
          value={rangeValue.start}
          onChange={(e) => handleStartChange(e.target.value)}
          disabled={disabled}
            className={cn(error && 'border-destructive')}
          />
        </div>
        <div className="flex-1">
          <Label htmlFor={`${field.name}-end`} className="text-xs text-muted-foreground mb-1 block">
            End Date
          </Label>
          <Input
            id={`${field.name}-end`}
          type="date"
          value={rangeValue.end}
          onChange={(e) => handleEndChange(e.target.value)}
          disabled={disabled}
            className={cn(error && 'border-destructive')}
        />
        </div>
      </div>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      <FieldDescription description={field.description} error={error} />
    </div>
  );
};

export const BooleanFieldRenderer: React.FC<BaseFieldProps> = ({
  field,
  value,
  onChange,
  error,
  disabled,
}) => {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center space-x-2">
            <Checkbox
          id={field.name}
              checked={!!value}
          onCheckedChange={(checked) => onChange(checked)}
              disabled={disabled}
          className={cn(error && 'border-destructive')}
            />
        <Label
          htmlFor={field.name}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
              {field.displayName}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
      </div>
      {error && <p className="text-xs text-destructive mt-1 ml-6">{error}</p>}
      <FieldDescription description={field.description} error={error} className="ml-6" />
    </div>
  );
};

export const TagsFieldRenderer: React.FC<BaseFieldProps> = ({
  field,
  value,
  onChange,
  error,
  disabled,
}) => {
  const [inputValue, setInputValue] = React.useState('');
  const tags = Array.isArray(value) ? value : [];

  const handleAddTag = () => {
    if (inputValue.trim() && !tags.includes(inputValue.trim())) {
      onChange([...tags, inputValue.trim()]);
      setInputValue('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.name} className="text-sm font-medium">
        {field.displayName}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Input
        id={field.name}
        placeholder={field.placeholder || 'Type and press Enter to add tags'}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyPress={handleKeyPress}
        disabled={disabled}
        className={cn('mb-3', error && 'border-destructive aria-invalid:ring-destructive/20')}
        aria-invalid={!!error}
      />
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((tag, index) => (
            <Badge key={index} variant="outline" className="text-xs h-5 px-2 py-0">
              {tag}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="ml-1 h-4 w-4 rounded-full hover:bg-destructive/10"
                onClick={() => handleRemoveTag(tag)}
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      <FieldDescription description={field.description} error={error} />
    </div>
  );
};

export const JsonFieldRenderer: React.FC<BaseFieldProps> = ({
  field,
  value,
  onChange,
  error,
  disabled,
}) => {
  const [jsonString, setJsonString] = React.useState('');
  const [jsonError, setJsonError] = React.useState('');

  React.useEffect(() => {
    if (value) {
      try {
        setJsonString(JSON.stringify(value, null, 2));
      } catch (e) {
        setJsonString(String(value));
      }
    }
  }, [value]);

  const handleChange = (newValue: string) => {
    setJsonString(newValue);
    setJsonError('');

    if (newValue.trim()) {
      try {
        const parsed = JSON.parse(newValue);
        onChange(parsed);
      } catch (e) {
        setJsonError('Invalid JSON format');
      }
    } else {
      onChange(null);
    }
  };

  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.name} className="text-sm font-medium">
        {field.displayName}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Textarea
        id={field.name}
        placeholder={field.placeholder || 'Enter valid JSON'}
        value={jsonString}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled}
        rows={4}
        className={cn(
          'font-mono text-xs',
          (error || jsonError) && 'border-destructive aria-invalid:ring-destructive/20'
        )}
        aria-invalid={!!error || !!jsonError}
      />
      {(error || jsonError) && (
        <p className="text-xs text-destructive mt-1">{error || jsonError}</p>
      )}
      <FieldDescription description={field.description} error={error || jsonError} />
    </div>
  );
};

export const FileFieldRenderer: React.FC<BaseFieldProps> = ({
  field,
  value,
  onChange,
  error,
  disabled,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onChange(file);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = () => {
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {field.displayName}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept={field.validation?.format || '*'}
        disabled={disabled}
      />
      
      {value ? (
        <div className="p-3 rounded-lg border border-border bg-card flex items-center justify-between gap-3 transition-all hover:border-primary/30">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 rounded bg-primary/10 flex items-center justify-center">
              <FileIcon className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium break-words">{value.name}</p>
              <p className="text-xs text-muted-foreground">{(value.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleRemoveFile}
            disabled={disabled}
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={handleButtonClick}
          disabled={disabled}
          className="w-full h-12 border-dashed hover:border-solid hover:bg-primary/5"
        >
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            <span className="text-sm font-medium">
              {field.placeholder || 'Click to upload file'}
            </span>
          </div>
        </Button>
      )}
      
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      <FieldDescription description={field.description} error={error} />
    </div>
  );
};

// Field renderer component map
const FIELD_RENDERER_MAP: Record<string, React.FC<BaseFieldProps>> = {
  TEXT: TextFieldRenderer,
  PASSWORD: PasswordFieldRenderer,
  EMAIL: EmailFieldRenderer,
  URL: UrlFieldRenderer,
  TEXTAREA: TextareaFieldRenderer,
  SELECT: SelectFieldRenderer,
  MULTISELECT: MultiSelectFieldRenderer,
  CHECKBOX: CheckboxFieldRenderer,
  NUMBER: NumberFieldRenderer,
  DATE: DateFieldRenderer,
  DATERANGE: DateRangeFieldRenderer,
  BOOLEAN: BooleanFieldRenderer,
  TAGS: TagsFieldRenderer,
  JSON: JsonFieldRenderer,
  FILE: FileFieldRenderer,
};

// Main field renderer that determines which component to use
export const FieldRenderer: React.FC<BaseFieldProps> = (props) => {
  const { field } = props;
  const RendererComponent = FIELD_RENDERER_MAP[field.fieldType] || TextFieldRenderer;
  return <RendererComponent {...props} />;
};
