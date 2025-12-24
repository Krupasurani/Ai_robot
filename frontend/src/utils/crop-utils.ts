import type { Area } from 'react-easy-crop';

export interface ImageTransform {
    rotation: number;
    flipHorizontal: boolean;
    flipVertical: boolean;
}

/**
 * Creates an HTMLImageElement from a URL
 */
export const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.setAttribute('crossOrigin', 'anonymous');
        image.src = url;
    });

/**
 * Converts degrees to radians
 */
function getRadianAngle(degreeValue: number): number {
    return (degreeValue * Math.PI) / 180;
}

/**
 * Gets the cropped image as a Blob with support for rotation and flip
 */
export async function getCroppedImg(
    imageSrc: string,
    pixelCrop: Area,
    outputSize: { width: number; height: number } = { width: 400, height: 400 },
    transform: ImageTransform = { rotation: 0, flipHorizontal: false, flipVertical: false }
): Promise<Blob | null> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        return null;
    }

    const { rotation, flipHorizontal, flipVertical } = transform;

    // Set canvas size to the desired output size
    canvas.width = outputSize.width;
    canvas.height = outputSize.height;

    // Move to center of canvas
    ctx.translate(outputSize.width / 2, outputSize.height / 2);

    // Apply rotation
    ctx.rotate(getRadianAngle(rotation));

    // Apply flips
    ctx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);

    // Move back
    ctx.translate(-outputSize.width / 2, -outputSize.height / 2);

    // Draw the cropped image onto the canvas, scaling to fit
    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        outputSize.width,
        outputSize.height
    );

    // Return as blob
    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            resolve(blob);
        }, 'image/png', 1);
    });
}

/**
 * Gets a data URL from a cropped image with support for rotation and flip
 */
export async function getCroppedImgDataUrl(
    imageSrc: string,
    pixelCrop: Area,
    outputSize: { width: number; height: number } = { width: 400, height: 400 },
    transform: ImageTransform = { rotation: 0, flipHorizontal: false, flipVertical: false }
): Promise<string | null> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        return null;
    }

    const { rotation, flipHorizontal, flipVertical } = transform;

    canvas.width = outputSize.width;
    canvas.height = outputSize.height;

    // Move to center of canvas
    ctx.translate(outputSize.width / 2, outputSize.height / 2);

    // Apply rotation
    ctx.rotate(getRadianAngle(rotation));

    // Apply flips
    ctx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);

    // Move back
    ctx.translate(-outputSize.width / 2, -outputSize.height / 2);

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        outputSize.width,
        outputSize.height
    );

    return canvas.toDataURL('image/png');
}
