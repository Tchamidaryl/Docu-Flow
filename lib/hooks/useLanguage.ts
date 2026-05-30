"use client";

import { useEffect, useState, useCallback } from "react";
import { LanguageCode, SUPPORTED_LANGUAGES } from "@/lib/i18n/translations";
import { getTranslation } from "@/lib/i18n/config";

/**
 * Hook for managing user language preference
 */
export function useLanguage() {
    const [language, setLanguageState] = useState<LanguageCode>("en");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load language from localStorage
        const stored = localStorage.getItem(
            "docuflow_language",
        ) as LanguageCode | null;
        const browserLang = navigator.language.split("-")[0];
        const preferredLang =
            stored ||
            (Object.keys(SUPPORTED_LANGUAGES).includes(browserLang)
                ? (browserLang as LanguageCode)
                : "en");

        setLanguageState(preferredLang);
        setLoading(false);
    }, []);

    const setLanguage = useCallback(async (lang: LanguageCode) => {
        setLanguageState(lang);
        localStorage.setItem("docuflow_language", lang);

        // Persist to server
        try {
            await fetch("/api/v1/user/language", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ language: lang }),
            });
        } catch (error) {
            console.error("Failed to save language preference:", error);
        }
    }, []);

    const t = useCallback(
        (key: string, defaultValue?: string): string => {
            return getTranslation(key, language) || defaultValue || key;
        },
        [language],
    );

    return {
        language,
        setLanguage,
        t,
        languages: SUPPORTED_LANGUAGES,
        loading,
    };
}

/**
 * Hook for getting current language
 */
export function useCurrentLanguage(): LanguageCode {
    const [language, setLanguage] = useState<LanguageCode>("en");

    useEffect(() => {
        const stored = localStorage.getItem(
            "docuflow_language",
        ) as LanguageCode | null;
        if (stored) setLanguage(stored);
    }, []);

    return language;
}
