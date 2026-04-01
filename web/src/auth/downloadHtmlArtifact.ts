import type { EmailDownload } from './api';

export function downloadHtmlArtifact(download: EmailDownload) {
    const blob = new Blob([download.html], { type: 'text/html;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = download.filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
}
