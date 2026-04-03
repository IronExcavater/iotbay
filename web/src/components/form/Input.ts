export function inputClassName(hasError = false) {
    return [
        'w-full rounded border px-3 py-2',
        hasError ? 'border-red-500' : 'border-slate-300',
    ].join(' ');
}
