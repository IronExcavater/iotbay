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

export function isSupportedImage(file: File) {
    return file.type.startsWith('image/');
}
