import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import {
    Loader2,
    ZoomIn,
    ZoomOut,
    Move,
    Check,
    X,
    ImageIcon,
    RotateCw,
    FlipHorizontal,
    FlipVertical,
    RotateCcw,
    RefreshCw,
} from 'lucide-react';

import { cn } from '@/utils/cn';
import { getCroppedImg, getCroppedImgDataUrl, type ImageTransform } from '@/utils/crop-utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

import { useTranslate } from '@/locales';

interface ImageCropperDialogProps {
    open: boolean;
    onClose: () => void;
    imageSrc: string | null;
    onCropComplete: (croppedBlob: Blob, previewUrl: string) => void;
    aspectRatio?: number;
    title?: string;
    description?: string;
    cropShape?: 'rect' | 'round';
    dragToRepositionText?: string;
}

const DEFAULT_TRANSFORM: ImageTransform = {
    rotation: 0,
    flipHorizontal: false,
    flipVertical: false,
};

export function ImageCropperDialog({
    open,
    onClose,
    imageSrc,
    onCropComplete,
    aspectRatio = 1,
    title,
    description,
    cropShape = 'round',
    dragToRepositionText,
}: ImageCropperDialogProps) {
    const { t } = useTranslate('settings');
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [flipHorizontal, setFlipHorizontal] = useState(false);
    const [flipVertical, setFlipVertical] = useState(false);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const displayTitle = title || t('personal_profile.crop.title');
    const displayDescription = description || t('personal_profile.crop.description');
    const displayDragText = dragToRepositionText || t('personal_profile.crop.drag_to_reposition');

    const transform: ImageTransform = {
        rotation,
        flipHorizontal,
        flipVertical,
    };

    const onCropChange = useCallback((location: Point) => {
        setCrop(location);
    }, []);

    const onZoomChange = useCallback((newZoom: number) => {
        setZoom(newZoom);
    }, []);

    const onRotationChange = useCallback((newRotation: number) => {
        setRotation(newRotation);
    }, []);

    const onCropAreaComplete = useCallback(
        async (_croppedArea: Area, croppedAreaPixels: Area) => {
            setCroppedAreaPixels(croppedAreaPixels);

            // Generate preview
            if (imageSrc) {
                try {
                    const preview = await getCroppedImgDataUrl(
                        imageSrc,
                        croppedAreaPixels,
                        { width: 200, height: 200 },
                        transform
                    );
                    if (preview) {
                        setPreviewUrl(preview);
                    }
                } catch (error) {
                    console.error('Error generating preview:', error);
                }
            }
        },
        [imageSrc, transform]
    );

    const handleApplyCrop = async () => {
        if (!imageSrc || !croppedAreaPixels) return;

        setIsProcessing(true);
        try {
            const croppedBlob = await getCroppedImg(
                imageSrc,
                croppedAreaPixels,
                { width: 400, height: 400 },
                transform
            );
            const croppedPreview = await getCroppedImgDataUrl(
                imageSrc,
                croppedAreaPixels,
                { width: 400, height: 400 },
                transform
            );

            if (croppedBlob && croppedPreview) {
                onCropComplete(croppedBlob, croppedPreview);
                handleClose();
            }
        } catch (error) {
            console.error('Error cropping image:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReset = useCallback(() => {
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setRotation(0);
        setFlipHorizontal(false);
        setFlipVertical(false);
    }, []);

    const handleRotateLeft = useCallback(() => {
        setRotation((prev) => (prev - 90 + 360) % 360);
    }, []);

    const handleRotateRight = useCallback(() => {
        setRotation((prev) => (prev + 90) % 360);
    }, []);

    const handleClose = () => {
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setRotation(0);
        setFlipHorizontal(false);
        setFlipVertical(false);
        setCroppedAreaPixels(null);
        setPreviewUrl(null);
        onClose();
    };

    if (!imageSrc) return null;

    const hasTransformChanges =
        zoom !== 1 ||
        rotation !== 0 ||
        flipHorizontal ||
        flipVertical ||
        crop.x !== 0 ||
        crop.y !== 0;

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
            <DialogContent className="sm:max-w-[640px] p-0 gap-0 overflow-hidden font-sans">
                <DialogHeader className="px-6 pt-6 pb-4">
                    <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                        <ImageIcon className="h-5 w-5 text-primary" />
                        {displayTitle}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                        {displayDescription}
                    </DialogDescription>
                </DialogHeader>

                {/* Cropper Area */}
                <div className="relative w-full h-[340px] bg-zinc-950">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        rotation={rotation}
                        aspect={aspectRatio}
                        onCropChange={onCropChange}
                        onZoomChange={onZoomChange}
                        onRotationChange={onRotationChange}
                        onCropComplete={onCropAreaComplete}
                        cropShape={cropShape}
                        showGrid={true}
                        classes={{
                            containerClassName: 'rounded-none',
                            cropAreaClassName: cropShape === 'round'
                                ? 'border-2 border-white/80 shadow-lg'
                                : 'border-2 border-white/80 rounded-lg shadow-lg',
                        }}
                        style={{
                            mediaStyle: {
                                transform: `scaleX(${flipHorizontal ? -1 : 1}) scaleY(${flipVertical ? -1 : 1})`,
                            },
                            cropAreaStyle: {
                                border: '3px solid rgba(255,255,255,0.9)',
                                boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
                            },
                        }}
                    />

                    {/* Instructions Overlay */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full text-white/80 text-xs pointer-events-none">
                        <Move className="h-3.5 w-3.5" />
                        {displayDragText}
                    </div>
                </div>

                {/* Controls */}
                <div className="px-6 py-5 space-y-5 bg-muted/20 border-t border-border/30">
                    {/* Quick Actions Row */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                            <TooltipProvider delayDuration={200}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-9 w-9"
                                            onClick={handleRotateLeft}
                                        >
                                            <RotateCcw className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Rotate left 90°</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-9 w-9"
                                            onClick={handleRotateRight}
                                        >
                                            <RotateCw className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Rotate right 90°</TooltipContent>
                                </Tooltip>

                                <div className="w-px h-6 bg-border mx-1" />

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant={flipHorizontal ? 'secondary' : 'outline'}
                                            size="icon"
                                            className="h-9 w-9"
                                            onClick={() => setFlipHorizontal((prev) => !prev)}
                                        >
                                            <FlipHorizontal className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Flip horizontal</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant={flipVertical ? 'secondary' : 'outline'}
                                            size="icon"
                                            className="h-9 w-9"
                                            onClick={() => setFlipVertical((prev) => !prev)}
                                        >
                                            <FlipVertical className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Flip vertical</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>

                        {hasTransformChanges && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1.5 text-muted-foreground hover:text-foreground"
                                onClick={handleReset}
                            >
                                <RefreshCw className="h-3.5 w-3.5" />
                                {t('personal_profile.crop.reset')}
                            </Button>
                        )}
                    </div>

                    {/* Zoom Control */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">{t('personal_profile.crop.zoom')}</span>
                            <span className="text-xs text-muted-foreground tabular-nums">
                                {zoom.toFixed(1)}x
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <ZoomOut className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <Slider
                                value={[zoom]}
                                min={1}
                                max={3}
                                step={0.05}
                                onValueChange={(values) => setZoom(values[0])}
                                className="flex-1"
                            />
                            <ZoomIn className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </div>
                    </div>

                    {/* Rotation Control */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">{t('personal_profile.crop.rotation')}</span>
                            <span className="text-xs text-muted-foreground tabular-nums">
                                {rotation}°
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <RotateCcw className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <Slider
                                value={[rotation]}
                                min={0}
                                max={360}
                                step={1}
                                onValueChange={(values) => setRotation(values[0])}
                                className="flex-1"
                            />
                            <RotateCw className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/30">
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-medium text-muted-foreground">{t('personal_profile.crop.preview')}:</span>
                            <div
                                className={cn(
                                    'w-14 h-14 border-2 border-border/50 overflow-hidden',
                                    'bg-gradient-to-br from-muted/50 to-muted/30',
                                    'flex items-center justify-center',
                                    cropShape === 'round' ? 'rounded-full' : 'rounded-lg'
                                )}
                            >
                                {previewUrl ? (
                                    <img
                                        src={previewUrl}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
                                )}
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{t('personal_profile.crop.output')}</p>
                    </div>
                </div>

                {/* Footer */}
                <DialogFooter className="px-6 py-4 border-t border-border/30 bg-background">
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={isProcessing}
                        className="gap-2"
                    >
                        <X className="h-4 w-4" />
                        {t('personal_profile.crop.cancel')}
                    </Button>
                    <Button
                        onClick={handleApplyCrop}
                        disabled={isProcessing || !croppedAreaPixels}
                        className={cn(
                            'gap-2',
                            'bg-gradient-to-r from-primary to-primary/90',
                            'hover:from-primary/90 hover:to-primary',
                            'shadow-lg shadow-primary/20'
                        )}
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {t('personal_profile.crop.processing')}
                            </>
                        ) : (
                            <>
                                <Check className="h-4 w-4" />
                                {t('personal_profile.crop.apply')}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
