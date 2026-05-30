import { LanguageCode, MESSAGES } from "./translations";

/**
 * Get translation for a key in a specific language
 */
export function getTranslation(
    key: string,
    language: LanguageCode = "en",
): string {
    const keys = key.split(".");
    let value: any = MESSAGES[language];

    for (const k of keys) {
        if (typeof value === "object" && value !== null && k in value) {
            value = value[k];
        } else {
            // Fallback to English if key not found
            value = MESSAGES.en;
            for (const fallbackKey of keys) {
                if (
                    typeof value === "object" &&
                    value !== null &&
                    fallbackKey in value
                ) {
                    value = value[fallbackKey];
                } else {
                    return key; // Return key itself if not found
                }
            }
            return value as string;
        }
    }

    return value as string;
}

/**
 * Format date based on language locale
 */
export function formatDateByLanguage(
    date: Date | string,
    language: LanguageCode,
): string {
    const dateObj = typeof date === "string" ? new Date(date) : date;

    const locales: Record<LanguageCode, string> = {
        en: "en-US",
        es: "es-ES",
        fr: "fr-FR",
        de: "de-DE",
        pt: "pt-PT",
        zh: "zh-CN",
        ar: "ar-SA",
    };

    return dateObj.toLocaleDateString(locales[language], {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

/**
 * Format time based on language locale
 */
export function formatTimeByLanguage(
    date: Date | string,
    language: LanguageCode,
): string {
    const dateObj = typeof date === "string" ? new Date(date) : date;

    const locales: Record<LanguageCode, string> = {
        en: "en-US",
        es: "es-ES",
        fr: "fr-FR",
        de: "de-DE",
        pt: "pt-PT",
        zh: "zh-CN",
        ar: "ar-SA",
    };

    return dateObj.toLocaleTimeString(locales[language], {
        hour: "2-digit",
        minute: "2-digit",
    });
}

/**
 * Format currency based on language locale
 */
export function formatCurrencyByLanguage(
    amount: number,
    language: LanguageCode,
    currency: string = "USD",
): string {
    const locales: Record<LanguageCode, string> = {
        en: "en-US",
        es: "es-ES",
        fr: "fr-FR",
        de: "de-DE",
        pt: "pt-PT",
        zh: "zh-CN",
        ar: "ar-SA",
    };

    return new Intl.NumberFormat(locales[language], {
        style: "currency",
        currency,
    }).format(amount);
}

/**
 * Get plural form based on language
 */
export function getPluralForm(
    count: number,
    language: LanguageCode,
    singular: string,
    plural: string,
): string {
    return count === 1 ? singular : plural;
}
