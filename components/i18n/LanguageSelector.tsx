"use client";

import { useLanguage } from "@/lib/hooks/useLanguage";
import { LanguageCode, SUPPORTED_LANGUAGES } from "@/lib/i18n/translations";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function LanguageSelector() {
    const { language, setLanguage, loading } = useLanguage();

    if (loading) return null;

    return (
        <Select
            value={language}
            onValueChange={(value) => setLanguage(value as LanguageCode)}
        >
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
                {Object.entries(SUPPORTED_LANGUAGES).map(
                    ([code, { nativeName, flag }]) => (
                        <SelectItem key={code} value={code}>
                            <span className="flex items-center gap-2">
                                <span>{flag}</span>
                                <span>{nativeName}</span>
                            </span>
                        </SelectItem>
                    ),
                )}
            </SelectContent>
        </Select>
    );
}
