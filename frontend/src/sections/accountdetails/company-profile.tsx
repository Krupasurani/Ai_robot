import { z as zod } from 'zod';
import { toast } from 'sonner';
import { Loader2, Building2, Mail, MapPin, Upload, Trash2, Camera, Globe, CheckCircle2 } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ImageCropperDialog } from '@/components/ui/image-cropper-dialog';
import { AddressAutocomplete, AddressComponents } from '@/components/ui/address-autocomplete';

import { cn } from '@/utils/cn';
import { useTranslate } from 'src/locales';
import { countries } from 'src/assets/data';
import { useAdmin } from 'src/context/AdminContext';

import { Input } from 'src/components/ui/input';
import { Label } from 'src/components/ui/label';
import { Form } from 'src/components/hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from 'src/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from 'src/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectItem,
  SelectValue,
  SelectContent,
  SelectTrigger,
} from 'src/components/ui/select';

import {
  updateOrg,
  getOrgById,
  getOrgLogo,
  uploadOrgLogo,
  deleteOrgLogo,
  getOrgIdFromToken,
  getDataCollectionConsent,
  updateDataCollectionConsent,
} from './utils';

const ProfileSchema = zod.object({
  registeredName: zod.string().min(1, { message: 'Name is required' }),
  shortName: zod.string().optional(),
  contactEmail: zod
    .string()
    .email({ message: 'Invalid email' })
    .min(1, { message: 'Email is required' }),
  permanentAddress: zod.object({
    addressLine1: zod.string().optional(),
    city: zod
      .string()
      .optional()
      .refine((val) => !val || /^[A-Za-z\s]+$/.test(val), 'City must contain only letters'),
    state: zod
      .string()
      .optional()
      .refine((val) => !val || /^[A-Za-z\s]+$/.test(val), 'State must contain only letters'),
    postCode: zod.string().optional(),
    country: zod.string().optional(),
  }),
  dataCollectionConsent: zod.boolean().optional(),
});

type ProfileFormData = zod.infer<typeof ProfileSchema>;

export default function CompanyProfile() {
  const { t: tNavbar } = useTranslate('navbar');
  const { t } = useTranslate('settings');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [saveChanges, setSaveChanges] = useState<boolean>(false);
  const [consentLoading, setConsentLoading] = useState<boolean>(false);

  // Image cropper state
  const [cropperOpen, setCropperOpen] = useState<boolean>(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [showMorePrivacy, setShowMorePrivacy] = useState<boolean>(false);
  const initialValuesRef = useRef<ProfileFormData | null>(null);

  const { isAdmin } = useAdmin();

  const methods = useForm<ProfileFormData>({
    resolver: zodResolver(ProfileSchema),
    mode: 'onChange',
  });

  const {
    handleSubmit,
    reset,
    control,
    setValue,
    watch,
    formState: { isValid, isDirty },
  } = methods;

  useEffect(() => {
    const fetchOrgData = async (): Promise<void> => {
      try {
        setLoading(true);
        const orgId = await getOrgIdFromToken();
        const orgData = await getOrgById(orgId);
        const { registeredName, shortName, contactEmail, permanentAddress } = orgData;

        // Fetch data collection consent status
        const consentStatus = Boolean(await getDataCollectionConsent());

        reset({
          registeredName: registeredName || '',
          shortName: shortName || '',
          contactEmail: contactEmail || '',
          permanentAddress: {
            addressLine1: permanentAddress?.addressLine1 || '',
            city: permanentAddress?.city || '',
            state: permanentAddress?.state || '',
            postCode: permanentAddress?.postCode || '',
            country: permanentAddress?.country || '',
          },
          dataCollectionConsent: consentStatus,
        });

        // Store initial values for change detection
        initialValuesRef.current = {
          registeredName: registeredName || '',
          shortName: shortName || '',
          contactEmail: contactEmail || '',
          permanentAddress: {
            addressLine1: permanentAddress?.addressLine1 || '',
            city: permanentAddress?.city || '',
            state: permanentAddress?.state || '',
            postCode: permanentAddress?.postCode || '',
            country: permanentAddress?.country || '',
          },
          dataCollectionConsent: consentStatus,
        };

        setLoading(false);
      } catch (err) {
        setError(t('company_profile.save.failed'));
        setLoading(false);
      }
    };

    fetchOrgData();
  }, [reset, t]);

  // Detect form changes by comparing with initial values
  const watchedValues = watch();
  
  useEffect(() => {
    if (!initialValuesRef.current || loading) return;

    const initial = initialValuesRef.current;
    const current = watchedValues as ProfileFormData;

    const changed =
      current.registeredName !== initial.registeredName ||
      current.shortName !== initial.shortName ||
      current.contactEmail !== initial.contactEmail ||
      current.permanentAddress?.addressLine1 !== initial.permanentAddress?.addressLine1 ||
      current.permanentAddress?.city !== initial.permanentAddress?.city ||
      current.permanentAddress?.state !== initial.permanentAddress?.state ||
      current.permanentAddress?.postCode !== initial.permanentAddress?.postCode ||
      current.permanentAddress?.country !== initial.permanentAddress?.country;

    // Note: Form changes are tracked via isDirty from react-hook-form
    // This effect can be used for additional change tracking if needed
  }, [watchedValues, loading]);

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const orgId = await getOrgIdFromToken();
        const logoUrl = await getOrgLogo(orgId);
        setLogo(logoUrl);
      } catch (err) {
        if (err.response && err.response.status === 404) {
          console.log(t('company_profile.logo.no_logo_found'));
          setLogo(null);
        } else {
          setError(t('company_profile.logo.failed_fetch_logo'));
          console.error(err, 'error in fetching logo');
        }
      }
    };

    fetchLogo();
  }, [t]);

  const onSubmit = async (data: ProfileFormData): Promise<void> => {
    try {
      setSaveChanges(true);
      const orgId = await getOrgIdFromToken();
      const msg = await updateOrg(orgId, data);
      toast.success(msg);
      
      // Update initial values and reset form to clear dirty state
      initialValuesRef.current = { ...data };
      reset(data, { keepValues: true });
    } catch (err) {
      setError(t('company_profile.save.failed'));
    } finally {
      setSaveChanges(false);
    }
  };

  const handleConsentChange = async (checked: boolean): Promise<void> => {
    try {
      setConsentLoading(true);
      const orgId = await getOrgIdFromToken();
      await updateDataCollectionConsent(checked);
      setValue('dataCollectionConsent', checked, { shouldDirty: false });
      toast.success(
        checked
          ? t('personal_profile.photo.data_collection_enabled')
          : t('personal_profile.photo.data_collection_disabled')
      );
    } catch (err) {
      setError(t('personal_profile.photo.data_collection_failed'));
      toast.success(t('personal_profile.photo.data_collection_failed'));
      setValue('dataCollectionConsent', !checked, { shouldDirty: false });
    } finally {
      setConsentLoading(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    try {
      setDeleting(true);
      const orgId = await getOrgIdFromToken();
      await deleteOrgLogo(orgId);

      toast.success(t('company_profile.logo.removed'));
      setDeleting(false);
      setLogo(null);
    } catch (err) {
      setError(t('company_profile.logo.failed_remove'));
      setDeleting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Open cropper dialog with the selected image
    const imageUrl = URL.createObjectURL(file);
    setImageToCrop(imageUrl);
    setCropperOpen(true);

    // Reset file input so same file can be selected again
    event.target.value = '';
  };

  const handleCropComplete = async (croppedBlob: Blob, previewUrl: string): Promise<void> => {
    const formData = new FormData();
    formData.append('file', croppedBlob, 'logo.png');

    try {
      setUploading(true);
      await uploadOrgLogo(formData);
      toast.success(t('company_profile.logo.success'));
      setLogo(previewUrl);
    } catch (err) {
      setError(t('company_profile.logo.failed_upload'));
      toast.error(t('company_profile.logo.failed_upload'));
    } finally {
      setUploading(false);
      // Clean up the object URL
      if (imageToCrop) {
        URL.revokeObjectURL(imageToCrop);
        setImageToCrop(null);
      }
    }
  };

  const handleFileButtonClick = () => {
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen mx-auto font-roboto">
        <Card className="p-8 rounded-2xl flex flex-col items-center max-w-[320px] w-full bg-card/80 backdrop-blur-sm border-border/50 shadow-xl">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <div className="relative p-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </div>
          <div className="mt-6 text-center">
            <p className="text-muted-foreground font-medium">Loading company profile...</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Please wait a moment</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <section className="min-h-screen w-full font-roboto bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
        <div className="relative px-6 py-6 md:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 shadow-lg shadow-primary/5">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground tracking-tight">
                    {t('company_profile.title')}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {t('company_profile.description')}
                  </p>
                </div>
              </div>
              {isAdmin && (
                <Badge
                  variant="outline"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t('company_profile.admin_access')}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <ScrollArea className="h-[calc(100vh-140px)]">
        <div className="px-6 py-6 md:px-8 md:py-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

              {/* Left Column - Logo Section */}
              <div className="lg:col-span-4 xl:col-span-3">
                <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm shadow-xl sticky top-6">
                  <CardHeader className="pb-4 pt-6 px-6">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Camera className="h-4 w-4 text-primary" />
                      {t('company_profile.logo.title')}
                    </CardTitle>
                    <CardDescription className="text-xs leading-relaxed">
                      {t('company_profile.logo.description')}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="px-6 pb-6">
                    {/* Logo Preview */}
                    <div className="relative group">
                      <div className={cn(
                        "relative w-full aspect-square rounded-2xl overflow-hidden",
                        "border-2 border-dashed border-border/50",
                        "bg-gradient-to-br from-muted/50 to-muted/30",
                        "transition-all duration-300",
                        "group-hover:border-primary/40 group-hover:bg-muted/40"
                      )}>
                        {logo ? (
                          <div className="absolute inset-0 p-6 flex items-center justify-center">
                            <img
                              src={logo}
                              alt="Company Logo"
                              className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg"
                            />
                          </div>
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/60">
                            <div className="p-4 rounded-2xl bg-muted/50 mb-3">
                              <Building2 className="h-12 w-12" />
                            </div>
                            <span className="text-sm font-medium">{t('company_profile.logo.no_logo')}</span>
                            <span className="text-xs mt-1">{t('company_profile.logo.add_logo')}</span>
                          </div>
                        )}

                        {/* Hover Overlay */}
                        {isAdmin && (
                          <div className={cn(
                            "absolute inset-0 flex items-center justify-center gap-2",
                            "bg-black/50 backdrop-blur-sm opacity-0 group-hover:opacity-100",
                            "transition-opacity duration-300"
                          )}>
                            <input
                              style={{ display: 'none' }}
                              id="file-upload"
                              type="file"
                              accept="image/*"
                              onChange={handleFileSelect}
                            />
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={handleFileButtonClick}
                              disabled={uploading}
                              className="h-9 px-4 bg-white/90 hover:bg-white text-gray-900 shadow-lg"
                            >
                              {uploading ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <Upload className="h-4 w-4 mr-2" />
                              )}
                              {logo ? t('company_profile.logo.change') : t('company_profile.logo.upload')}
                            </Button>
                            {logo && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleDelete}
                                disabled={deleting}
                                className="h-9 px-4 bg-red-500/90 hover:bg-red-500 text-white shadow-lg border-0"
                              >
                                {deleting ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Upload Instructions */}
                    <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border/30">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        <span className="font-medium text-foreground">{t('company_profile.basic.required')}:</span> {t('company_profile.logo.recommended')}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Form Section */}
              <div className="lg:col-span-8 xl:col-span-9 space-y-6">
                <Form
                  methods={methods}
                  onSubmit={handleSubmit(onSubmit)}
                >
                  {/* Basic Information Card */}
                  <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-xl overflow-hidden">
                    <CardHeader className="pb-6 pt-6 px-6 border-b border-border/30 bg-muted/20">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold">{t('company_profile.basic.title')}</CardTitle>
                          <CardDescription className="text-xs mt-0.5">
                            {t('company_profile.basic.description')}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Registered Name */}
                        <div className="md:col-span-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="space-y-2">
                                <Label
                                  htmlFor="registeredName"
                                  className="text-sm font-medium text-foreground flex items-center gap-2"
                                >
                                  {t('company_profile.basic.registered_name')}
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                                    {t('company_profile.basic.required')}
                                  </Badge>
                                </Label>
                                <Controller
                                  name="registeredName"
                                  control={control}
                                  render={({ field, fieldState }) => (
                                    <div>
                                      <Input
                                        {...field}
                                        id="registeredName"
                                        placeholder={t('company_profile.basic.name_placeholder')}
                                        disabled={!isAdmin}
                                        className={cn(
                                          'h-11 rounded-lg bg-background/50 border-border/50 focus:border-primary/50',
                                          'placeholder:text-muted-foreground/50',
                                          !isAdmin && 'cursor-not-allowed opacity-60'
                                        )}
                                      />
                                      {fieldState.error && (
                                        <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
                                          <span className="h-1 w-1 rounded-full bg-destructive" />
                                          {fieldState.error.message}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p>{t('company_profile.basic.legal_info')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>

                        {/* Display Name */}
                        <div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="space-y-2">
                                <Label
                                  htmlFor="shortName"
                                  className="text-sm font-medium text-foreground"
                                >
                                  {t('company_profile.basic.display_name')}
                                </Label>
                                <Controller
                                  name="shortName"
                                  control={control}
                                  render={({ field, fieldState }) => (
                                    <div>
                                      <Input
                                        {...field}
                                        id="shortName"
                                        placeholder={t('company_profile.basic.display_placeholder')}
                                        disabled={!isAdmin}
                                        className={cn(
                                          'h-11 rounded-lg bg-background/50 border-border/50 focus:border-primary/50',
                                          'placeholder:text-muted-foreground/50',
                                          !isAdmin && 'cursor-not-allowed opacity-60'
                                        )}
                                      />
                                      {fieldState.error && (
                                        <p className="text-xs text-destructive mt-1.5">
                                          {fieldState.error.message}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p>{t('company_profile.basic.display_info')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>

                        {/* Contact Email */}
                        <div>
                          <div className="space-y-2">
                            <Label
                              htmlFor="contactEmail"
                              className="text-sm font-medium text-foreground flex items-center gap-2"
                            >
                              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                              {t('company_profile.basic.contact_email')}
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                                {t('company_profile.basic.required')}
                              </Badge>
                            </Label>
                            <Controller
                              name="contactEmail"
                              control={control}
                              render={({ field, fieldState }) => (
                                <div>
                                  <Input
                                    {...field}
                                    id="contactEmail"
                                    type="email"
                                    placeholder="company@example.com"
                                    disabled={!isAdmin}
                                    className={cn(
                                      'h-11 rounded-lg bg-background/50 border-border/50 focus:border-primary/50',
                                      'placeholder:text-muted-foreground/50',
                                      !isAdmin && 'cursor-not-allowed opacity-60'
                                    )}
                                  />
                                  {fieldState.error && (
                                    <p className="text-xs text-destructive mt-1.5">
                                      {fieldState.error.message}
                                    </p>
                                  )}
                                </div>
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Address Information Card */}
                  <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-xl overflow-hidden mt-6">
                    <CardHeader className="pb-6 pt-6 px-6 border-b border-border/30 bg-muted/20">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <MapPin className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold">{t('company_profile.address.title')}</CardTitle>
                          <CardDescription className="text-xs mt-0.5">
                            {t('company_profile.address.description')}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Street Address */}
                        <div className="md:col-span-2">
                          <div className="space-y-2">
                            <Label htmlFor="addressLine1" className="text-sm font-medium text-foreground">
                              {t('company_profile.address.street')}
                            </Label>
                            <Controller
                              name="permanentAddress.addressLine1"
                              control={control}
                              render={({ field, fieldState }) => (
                                <div>
                                  <AddressAutocomplete
                                    id="addressLine1"
                                    value={field.value || ''}
                                    onChange={field.onChange}
                                    onAddressSelect={(components: AddressComponents) => {
                                      setValue('permanentAddress.addressLine1', components.addressLine1, { shouldDirty: true });
                                      setValue('permanentAddress.city', components.city, { shouldDirty: true });
                                      setValue('permanentAddress.state', components.state, { shouldDirty: true });
                                      setValue('permanentAddress.postCode', components.postCode, { shouldDirty: true });
                                      // Find matching country in dropdown
                                      const matchingCountry = countries.find(
                                        (c) => c.label?.toLowerCase() === components.country?.toLowerCase()
                                      );
                                      if (matchingCountry) {
                                        setValue('permanentAddress.country', matchingCountry.label, { shouldDirty: true });
                                      }
                                    }}
                                    placeholder={t('company_profile.address.street_placeholder')}
                                    disabled={!isAdmin}
                                  />
                                  {fieldState.error && (
                                    <p className="text-xs text-destructive mt-1.5">
                                      {fieldState.error.message}
                                    </p>
                                  )}
                                </div>
                              )}
                            />
                          </div>
                        </div>

                        {/* City */}
                        <div>
                          <div className="space-y-2">
                            <Label htmlFor="city" className="text-sm font-medium text-foreground">
                              {t('company_profile.address.city')}
                            </Label>
                            <Controller
                              name="permanentAddress.city"
                              control={control}
                              render={({ field, fieldState }) => (
                                <div>
                                  <Input
                                    {...field}
                                    id="city"
                                    placeholder={t('company_profile.address.city_placeholder')}
                                    disabled={!isAdmin}
                                    className={cn(
                                      'h-11 rounded-lg bg-background/50 border-border/50 focus:border-primary/50',
                                      'placeholder:text-muted-foreground/50',
                                      !isAdmin && 'cursor-not-allowed opacity-60'
                                    )}
                                  />
                                  {fieldState.error && (
                                    <p className="text-xs text-destructive mt-1.5">
                                      {fieldState.error.message}
                                    </p>
                                  )}
                                </div>
                              )}
                            />
                          </div>
                        </div>

                        {/* State */}
                        <div>
                          <div className="space-y-2">
                            <Label htmlFor="state" className="text-sm font-medium text-foreground">
                              {t('company_profile.address.state')}
                            </Label>
                            <Controller
                              name="permanentAddress.state"
                              control={control}
                              render={({ field, fieldState }) => (
                                <div>
                                  <Input
                                    {...field}
                                    id="state"
                                    placeholder={t('company_profile.address.state_placeholder')}
                                    disabled={!isAdmin}
                                    className={cn(
                                      'h-11 rounded-lg bg-background/50 border-border/50 focus:border-primary/50',
                                      'placeholder:text-muted-foreground/50',
                                      !isAdmin && 'cursor-not-allowed opacity-60'
                                    )}
                                  />
                                  {fieldState.error && (
                                    <p className="text-xs text-destructive mt-1.5">
                                      {fieldState.error.message}
                                    </p>
                                  )}
                                </div>
                              )}
                            />
                          </div>
                        </div>

                        {/* Postal Code */}
                        <div>
                          <div className="space-y-2">
                            <Label htmlFor="postCode" className="text-sm font-medium text-foreground">
                              {t('company_profile.address.zip')}
                            </Label>
                            <Controller
                              name="permanentAddress.postCode"
                              control={control}
                              render={({ field, fieldState }) => (
                                <div>
                                  <Input
                                    {...field}
                                    id="postCode"
                                    placeholder={t('company_profile.address.zip_placeholder')}
                                    disabled={!isAdmin}
                                    className={cn(
                                      'h-11 rounded-lg bg-background/50 border-border/50 focus:border-primary/50',
                                      'placeholder:text-muted-foreground/50',
                                      !isAdmin && 'cursor-not-allowed opacity-60'
                                    )}
                                  />
                                  {fieldState.error && (
                                    <p className="text-xs text-destructive mt-1.5">
                                      {fieldState.error.message}
                                    </p>
                                  )}
                                </div>
                              )}
                            />
                          </div>
                        </div>

                        {/* Country */}
                        <div>
                          <div className="space-y-2">
                            <Label htmlFor="country" className="text-sm font-medium text-foreground flex items-center gap-2">
                              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                              {t('company_profile.address.country')}
                            </Label>
                            <Controller
                              name="permanentAddress.country"
                              control={control}
                              render={({ field, fieldState }) => (
                                <div>
                                  <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    disabled={!isAdmin}
                                  >
                                    <SelectTrigger
                                      className={cn(
                                        'h-11 rounded-lg bg-background/50 border-border/50',
                                        !isAdmin && 'cursor-not-allowed opacity-60'
                                      )}
                                    >
                                      <SelectValue placeholder={t('company_profile.address.country_placeholder')} />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[280px]">
                                      {countries
                                        .filter((country) => country.label && country.code)
                                        .map((country) => (
                                          <SelectItem key={country.label} value={country.label}>
                                            {country.label}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                  {fieldState.error && (
                                    <p className="text-xs text-destructive mt-1.5">
                                      {fieldState.error.message}
                                    </p>
                                  )}
                                </div>
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Save Button */}
                  {isAdmin && (
                    <div className="flex justify-end pt-6">
                      <Button
                        type="submit"
                        disabled={!isValid || !isDirty || !isAdmin}
                        className={cn(
                          'h-11 px-8 rounded-lg font-medium transition-all duration-300',
                          (!isValid || !isDirty || !isAdmin)
                            ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                            : 'bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 text-primary-foreground'
                        )}
                      >
                        {saveChanges ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {t('company_profile.save.saving')}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            {t('company_profile.save.button')}
                          </div>
                        )}
                      </Button>
                    </div>
                  )}
                </Form>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Image Cropper Dialog */}
      <ImageCropperDialog
        open={cropperOpen}
        onClose={() => {
          setCropperOpen(false);
          if (imageToCrop) {
            URL.revokeObjectURL(imageToCrop);
            setImageToCrop(null);
          }
        }}
        imageSrc={imageToCrop}
        onCropComplete={handleCropComplete}
        aspectRatio={1}
        title={t('company_profile.crop.title')}
        description={t('company_profile.crop.description')}
      />
    </section>
  );
}
