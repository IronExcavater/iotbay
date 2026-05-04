export function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener('load', () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
                return;
            }
            reject(new Error('Unable to read image'));
        });
        reader.addEventListener('error', () => {
            reject(reader.error ?? new Error('Unable to read image'));
        });
        reader.readAsDataURL(file);
    });
}

export function compressImageToDataUrl(
    file: File,
    maxSize = 400,
    quality = 0.85
): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.addEventListener('load', () => {
            URL.revokeObjectURL(url);
            const ratio = Math.min(
                maxSize / img.width,
                maxSize / img.height,
                1
            );
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width * ratio);
            canvas.height = Math.round(img.height * ratio);
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Unable to compress image'));
                return;
            }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        });

        img.addEventListener('error', () => {
            URL.revokeObjectURL(url);
            reject(new Error('Unable to load image'));
        });

        img.src = url;
    });
}

export function isSupportedImage(file: File) {
    return file.type.startsWith('image/');
}
