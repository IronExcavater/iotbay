export interface BrowserAddressLocale {
    country?: string;
    language?: string;
}

export function getBrowserAddressLocale(): BrowserAddressLocale {
    if (typeof navigator === 'undefined') {
        return {};
    }

    const language = resolveBrowserLanguage();
    const trimmedLanguage = language.trim();
    const country = resolveTimeZoneCountry() ?? resolveRegion(trimmedLanguage);

    return {
        country,
        language: trimmedLanguage || undefined,
    };
}

function resolveBrowserLanguage() {
    return (
        navigator.languages.find((value) => value.trim()) ??
        navigator.language ??
        ''
    );
}

function resolveTimeZoneCountry(): string | undefined {
    if (
        typeof Intl === 'undefined' ||
        typeof Intl.DateTimeFormat !== 'function'
    ) {
        return undefined;
    }

    try {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (!timeZone) {
            return undefined;
        }

        if (timeZone.startsWith('Australia/')) {
            return 'AU';
        }
        if (timeZone === 'Pacific/Auckland' || timeZone === 'Pacific/Chatham') {
            return 'NZ';
        }

        return undefined;
    } catch {
        return undefined;
    }
}

function resolveRegion(language: string): string | undefined {
    if (!language) {
        return undefined;
    }

    const intlLocale = readIntlRegion(language);
    if (intlLocale) {
        return intlLocale;
    }

    const parts = language.split(/[-_]/);
    const region = parts[1]?.trim();
    return isRegion(region) ? region.toUpperCase() : undefined;
}

function readIntlRegion(language: string): string | undefined {
    if (typeof Intl === 'undefined' || typeof Intl.Locale !== 'function') {
        return undefined;
    }

    try {
        const region = new Intl.Locale(language).region;
        return isRegion(region) ? region.toUpperCase() : undefined;
    } catch {
        return undefined;
    }
}

function isRegion(value: string | undefined): value is string {
    return typeof value === 'string' && /^[A-Za-z]{2}$/.test(value.trim());
}
