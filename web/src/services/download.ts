export function downloadFile(
    filename: string,
    content: string,
    mimeType: string
) {
    const blob = new Blob([content], { type: mimeType });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
}

export function downloadHtml(
    artifact?: {
        filename: string;
        html: string;
    } | null
) {
    if (!artifact) {
        return false;
    }

    downloadFile(artifact.filename, artifact.html, 'text/html;charset=utf-8');
    return true;
}
