import type { IconifyIcon } from '@iconify/react';
import type { Control, FieldValues } from 'react-hook-form';

import keyIcon from '@iconify-icons/mdi/key';
import { Controller } from 'react-hook-form';
import robotIcon from '@iconify-icons/mdi/robot';
import fileUploadIcon from '@iconify-icons/ri/file-upload-fill';
import uploadCloudIcon from '@iconify-icons/ri/upload-cloud-2-line';
import React, { memo, useRef, useState, useEffect, useCallback } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { Eye, EyeOff, Loader2, Trash2, Info, CheckCircle2, FileText } from 'lucide-react';
import { Iconify } from 'src/components/iconify';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';

interface DynamicFieldProps {
  name: string;
  label: string;
  control: Control<FieldValues>;
  required?: boolean;
  isEditing: boolean;
  isDisabled?: boolean;
  type?: 'text' | 'password' | 'email' | 'number' | 'url' | 'select' | 'file' | 'checkbox';
  placeholder?: string;
  icon?: string | IconifyIcon;
  defaultIcon?: string | IconifyIcon;
  modelPlaceholder?: string;
  options?: Array<{ value: string; label: string }>;
  multiline?: boolean;
  rows?: number;
  // File upload specific props
  acceptedFileTypes?: string[];
  maxFileSize?: number;
  onFileProcessed?: (data: Record<string, unknown>, fileName: string) => void;
  fileProcessor?: (data: Record<string, unknown>) => Record<string, unknown>;
}

const DynamicField = memo(
  ({
    name,
    label,
    control,
    required = false,
    isEditing,
    isDisabled = false,
    type = 'text',
    placeholder = '',
    icon,
    defaultIcon,
    modelPlaceholder,
    options,
    multiline = false,
    rows = 4,
    acceptedFileTypes = ['.json'],
    maxFileSize = 5 * 1024 * 1024, // 5MB
    onFileProcessed,
    fileProcessor,
  }: DynamicFieldProps) => {
    const [showPassword, setShowPassword] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [uploadError, setUploadError] = useState<string>('');

    // Add refs to track autofill detection
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
    const autofillCheckInterval = useRef<NodeJS.Timeout | null>(null);

    // Field type detection
    const isPasswordField = type === 'password';
    const isSelectField = type === 'select';
    const isFileField = type === 'file';
    const isCheckboxField = type === 'checkbox';
    const isModelField = name === 'model';
    const isNumberField = type === 'number';

    // Icon selection logic
    const fieldIcon =
      icon ||
      defaultIcon ||
      (name === 'apiKey'
        ? keyIcon
        : name === 'model'
          ? robotIcon
          : isFileField
            ? fileUploadIcon
            : keyIcon);

    // Enhanced autofill detection function
    const detectAutofill = useCallback(
      (inputElement: HTMLInputElement | HTMLTextAreaElement, onChange: (value: any) => void) => {
        if (!inputElement) return undefined;

        const checkAutofill = () => {
          // Method 1: Check if input has value but React doesn't know about it
          if (
            inputElement.value &&
            inputElement.value !== inputElement.getAttribute('data-react-value')
          ) {
            onChange(
              isNumberField && inputElement.value !== ''
                ? Number(inputElement.value)
                : inputElement.value
            );
            inputElement.setAttribute('data-react-value', inputElement.value);
          }

          // Method 2: Check for browser-specific autofill indicators
          const computedStyle = window.getComputedStyle(inputElement);
          const isAutofilled =
            computedStyle.backgroundColor === 'rgb(250, 255, 189)' || // Chrome
            computedStyle.backgroundColor.includes('rgba(250, 255, 189') || // Chrome with alpha
            inputElement.matches(':-webkit-autofill') || // Webkit browsers
            inputElement.matches(':autofill'); // Standard

          if (isAutofilled && inputElement.value) {
            onChange(
              isNumberField && inputElement.value !== ''
                ? Number(inputElement.value)
                : inputElement.value
            );
            inputElement.setAttribute('data-react-value', inputElement.value);
          }
        };

        // Check immediately
        checkAutofill();

        // Set up polling for autofill detection
        if (autofillCheckInterval.current) {
          clearInterval(autofillCheckInterval.current);
        }

        autofillCheckInterval.current = setInterval(checkAutofill, 200);

        // Also listen for specific events that might indicate autofill
        const events = ['input', 'change', 'blur', 'focus', 'animationstart'];

        const handleEvent = () => {
          setTimeout(checkAutofill, 10);
        };

        events.forEach((eventType) => {
          inputElement.addEventListener(eventType, handleEvent);
        });

        // Cleanup function
        return () => {
          if (autofillCheckInterval.current) {
            clearInterval(autofillCheckInterval.current);
          }
          events.forEach((eventType) => {
            inputElement.removeEventListener(eventType, handleEvent);
          });
        };
      },
      [isNumberField]
    );

    // Cleanup interval on unmount
    useEffect(
      () => () => {
        if (autofillCheckInterval.current) {
          clearInterval(autofillCheckInterval.current);
        }
      },
      []
    );

    // File upload handlers
    const validateFileType = useCallback(
      (file: File): boolean => {
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        return acceptedFileTypes.includes(fileExtension);
      },
      [acceptedFileTypes]
    );

    const processFile = useCallback(
      (file: File) => {
        setIsProcessing(true);
        setUploadError('');

        if (file.size > maxFileSize) {
          setUploadError(`File is too large. Maximum size is ${maxFileSize / (1024 * 1024)} MB.`);
          setIsProcessing(false);
          return;
        }

        if (!validateFileType(file)) {
          setUploadError(`Only ${acceptedFileTypes.join(', ')} files are supported.`);
          setIsProcessing(false);
          return;
        }

        setUploadedFile(file);
        const reader = new FileReader();

        reader.onload = (e: ProgressEvent<FileReader>) => {
          if (e.target && typeof e.target.result === 'string') {
            try {
              const jsonData = JSON.parse(e.target.result);

              if (fileProcessor) {
                try {
                  const extractedData = fileProcessor(jsonData);
                  if (onFileProcessed) {
                    onFileProcessed(extractedData, file.name);
                  }
                } catch (processorError: any) {
                  setUploadError(processorError.message || 'Error processing file data');
                  setUploadedFile(null);
                  setIsProcessing(false);
                  return;
                }
              } else if (onFileProcessed) {
                onFileProcessed(jsonData, file.name);
              }

              setIsProcessing(false);
            } catch (error: any) {
              setUploadError(
                `Invalid JSON format: ${error.message || 'The file does not contain valid JSON data.'}`
              );
              setUploadedFile(null);
              setIsProcessing(false);
            }
          }
        };

        reader.onerror = () => {
          setUploadError('Error reading file. Please try again.');
          setUploadedFile(null);
          setIsProcessing(false);
        };

        reader.readAsText(file);
      },
      [validateFileType, maxFileSize, acceptedFileTypes, onFileProcessed, fileProcessor]
    );

    const handleFileChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        setUploadError('');
        const { files } = event.target;

        if (files && files[0]) {
          processFile(files[0]);
        }
        event.target.value = '';
      },
      [processFile]
    );

    const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    }, []);

    const handleDrop = useCallback(
      (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const { files } = e.dataTransfer;
        if (files.length > 1) {
          setUploadError('Please drop only one file.');
          return;
        }

        if (files && files[0]) {
          processFile(files[0]);
        }
      },
      [processFile]
    );

    const handleRemoveFile = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      setUploadedFile(null);
      setUploadError('');
    }, []);

    // Checkbox field renderer
    if (isCheckboxField) {
      return (
        <div>
          <Controller
            name={name}
            control={control}
            render={({ field, fieldState }) => (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={name}
                  checked={!!field.value}
                  onCheckedChange={(checked) => field.onChange(checked)}
                  disabled={!isEditing || isDisabled}
                  className="data-[state=checked]:bg-primary"
                />
                <Label
                  htmlFor={name}
                  className="text-sm font-normal cursor-pointer flex items-center gap-2"
                >
                  <Iconify icon={fieldIcon} width={18} height={18} />
                  <span>
                    {label}
                    {required ? ' *' : ''}
                  </span>
                </Label>
              </div>
            )}
          />
          {placeholder && (
            <p className="text-xs text-muted-foreground mt-1.5 ml-6 block">{placeholder}</p>
          )}
        </div>
      );
    }

    // File upload field renderer
    if (isFileField) {
      return (
        <div>
          <Label className="text-sm font-medium mb-2 block">
            {label}
            {required ? ' *' : ''}
          </Label>

          <Tooltip>
            <TooltipTrigger asChild>
              <div
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                role="button"
                tabIndex={0}
                onClick={() =>
                  !isProcessing && document.getElementById(`file-upload-${name}`)?.click()
                }
                onKeyDown={(e) => {
                  if (!isProcessing && (e.key === 'Enter' || e.key === ' ')) {
                    document.getElementById(`file-upload-${name}`)?.click();
                  }
                }}
                aria-disabled={isProcessing || isDisabled || !isEditing}
                className={cn(
                  'border-2 border-dashed rounded-xl h-[180px] flex flex-col justify-center items-center text-center',
                  'relative px-4 py-6 transition-all duration-200',
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : uploadedFile
                      ? 'border-green-500 bg-green-500/5'
                      : 'border-border/30 bg-background/60',
                  isProcessing ? 'cursor-wait' : 'cursor-pointer',
                  !isProcessing &&
                    'hover:border-primary hover:bg-primary/5 hover:shadow-md hover:-translate-y-0.5'
                )}
              >
                <TooltipContent>
                  {isProcessing
                    ? 'Processing file...'
                    : 'Drag and drop your file or click to browse'}
                </TooltipContent>

                {isProcessing ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm font-medium">Processing file...</p>
                  </div>
                ) : !uploadedFile ? (
                  <>
                    <div
                      className={cn(
                        'flex items-center justify-center w-15 h-15 rounded-full mb-4',
                        'bg-gradient-to-br from-primary/10 to-primary/15',
                        'transition-all duration-200',
                        isDragging && 'scale-110 bg-primary/10'
                      )}
                    >
                      <Iconify
                        icon={isDragging ? fileUploadIcon : uploadCloudIcon}
                        width={32}
                        height={32}
                        className={cn(
                          'text-primary transition-transform duration-150',
                          isDragging && 'scale-110'
                        )}
                      />
                    </div>
                    <p
                      className={cn(
                        'text-base font-semibold',
                        isDragging ? 'text-primary' : 'text-foreground'
                      )}
                    >
                      {isDragging ? 'Drop file here' : 'Upload file'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">or click to browse files</p>
                    <div className="mt-2 px-3 py-1.5 rounded-md bg-blue-500/10 flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5 text-blue-500" />
                      <p className="text-[10px] font-medium text-blue-500">
                        {acceptedFileTypes.join(', ')} files supported (max{' '}
                        {Math.round(maxFileSize / (1024 * 1024))}MB)
                      </p>
                    </div>
                  </>
                ) : (
                  <AnimatePresence>
                    <m.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col items-center gap-3 w-full"
                    >
                      <div className="flex items-center justify-center w-13 h-13 rounded-full mb-2 bg-gradient-to-br from-green-500/20 to-green-500/20 shadow-lg shadow-green-500/15">
                        <CheckCircle2 className="h-7 w-7 text-green-500" />
                      </div>

                      <div className="px-4 py-2 rounded-lg bg-background/50 border border-border/20 shadow-sm flex items-center w-auto max-w-full">
                        <FileText className="h-5 w-5 text-primary flex-shrink-0 mr-2" />
                        <p className="text-sm font-medium truncate">{uploadedFile.name}</p>
                      </div>

                      <p className="text-[11px] text-muted-foreground">
                        {(uploadedFile.size / 1024).toFixed(1)} KB
                      </p>

                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg text-xs font-semibold px-4 py-2 h-auto bg-gradient-to-br from-red-500/20 to-red-500/20 border-red-500/30 text-red-600 hover:from-red-500/30 hover:to-red-500/30 hover:bg-red-500/30 shadow-sm"
                        onClick={handleRemoveFile}
                      >
                        <Trash2 className="h-4 w-4 mr-1.5" />
                        Remove
                      </Button>
                    </m.div>
                  </AnimatePresence>
                )}
              </div>
            </TooltipTrigger>
          </Tooltip>

          {uploadError && <p className="text-xs text-destructive mt-2 block">{uploadError}</p>}

          {placeholder && !uploadError && (
            <p className="text-xs text-muted-foreground mt-2 block">{placeholder}</p>
          )}

          <input
            id={`file-upload-${name}`}
            type="file"
            accept={acceptedFileTypes.join(',')}
            className="hidden"
            onChange={handleFileChange}
            disabled={isProcessing || isDisabled || !isEditing}
          />
        </div>
      );
    }

    // Select field renderer
    if (isSelectField && options) {
      return (
        <div>
          <Controller
            name={name}
            control={control}
            render={({ field, fieldState }) => (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {label}
                  {required ? ' *' : ''}
                </Label>
                <Select
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  disabled={!isEditing || isDisabled}
                >
                  <SelectTrigger className={cn('w-full', fieldState.error && 'border-destructive')}>
                    <div className="flex items-center gap-2">
                      <Iconify
                        icon={fieldIcon}
                        width={18}
                        height={18}
                        className="text-muted-foreground"
                      />
                      <SelectValue placeholder={`Select ${label}`} />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.error && (
                  <p className="text-xs text-destructive mt-1">{fieldState.error.message}</p>
                )}
              </div>
            )}
          />
        </div>
      );
    }

    // Enhanced regular input field renderer with autofill detection
    return (
      <div>
        <Controller
          name={name}
          control={control}
          render={({ field, fieldState }) => {
            const InputComponent = multiline ? Textarea : Input;

            return (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {label}
                  {required ? ' *' : ''}
                </Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Iconify
                      icon={fieldIcon}
                      width={18}
                      height={18}
                      className="text-muted-foreground"
                    />
                  </div>
                  <InputComponent
                    {...field}
                    ref={(ref: any) => {
                      if (ref) {
                        (
                          inputRef as React.MutableRefObject<
                            HTMLInputElement | HTMLTextAreaElement | null
                          >
                        ).current = ref;
                        // Set up autofill detection when ref is attached
                        setTimeout(() => {
                          detectAutofill(ref, field.onChange);
                        }, 100);
                      }
                    }}
                    type={
                      isPasswordField
                        ? showPassword
                          ? 'text'
                          : 'password'
                        : isNumberField
                          ? 'number'
                          : type
                    }
                    placeholder={placeholder}
                    disabled={!isEditing || isDisabled}
                    required={required}
                    rows={multiline ? rows : undefined}
                    className={cn(
                      'pl-10',
                      isPasswordField && 'pr-10',
                      fieldState.error && 'border-destructive',
                      multiline && 'min-h-[80px]'
                    )}
                    value={
                      isNumberField && field.value !== undefined
                        ? String(field.value)
                        : field.value || ''
                    }
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                      if (isNumberField) {
                        const { value } = e.target;
                        field.onChange(value === '' ? undefined : Number(value));
                      } else {
                        field.onChange(e.target.value);
                      }

                      // Update the data attribute to track React's awareness of the value
                      if (inputRef.current) {
                        inputRef.current.setAttribute('data-react-value', e.target.value);
                      }
                    }}
                    onFocus={() => {
                      // Check for autofill on focus
                      setTimeout(() => {
                        if (inputRef.current) {
                          detectAutofill(inputRef.current, field.onChange);
                        }
                      }, 50);
                    }}
                    onBlur={() => {
                      field.onBlur();
                      // Final check on blur
                      setTimeout(() => {
                        if (inputRef.current) {
                          detectAutofill(inputRef.current, field.onChange);
                        }
                      }, 50);
                    }}
                  />
                  {isPasswordField && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={!isEditing || isDisabled}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
                {fieldState.error && (
                  <p className="text-xs text-destructive mt-1">{fieldState.error.message}</p>
                )}
                {!fieldState.error && !isModelField && placeholder && (
                  <p className="text-xs text-muted-foreground mt-1">{placeholder}</p>
                )}
              </div>
            );
          }}
        />

        {/* Show model placeholder below model field */}
        {isModelField && modelPlaceholder && (
          <p className="text-xs text-muted-foreground mt-1.5 block italic opacity-80">
            {modelPlaceholder}
          </p>
        )}
      </div>
    );
  }
);

DynamicField.displayName = 'DynamicField';

export default DynamicField;
