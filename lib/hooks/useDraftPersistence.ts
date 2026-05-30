"use client";

import { useEffect, useRef, useCallback } from "react";

interface DraftData {
    title: string;
    description?: string;
    content: string;
    contentJson?: any;
    tags: string[];
    priority: string;
    dueDate?: string;
    isConfidential: boolean;
    templateId?: string;
}

/**
 * Hook for auto-saving document drafts to localStorage
 */
export function useDraftPersistence(documentId: string | null) {
    const saveTimeoutRef = useRef<NodeJS.Timeout>();

    const saveDraft = useCallback(
        (data: Partial<DraftData>) => {
            if (!documentId && !data.title) return;

            const draftKey = documentId ? `draft_${documentId}` : "new_draft";
            const existingDraft = localStorage.getItem(draftKey);
            const existingData = existingDraft ? JSON.parse(existingDraft) : {};

            const updatedDraft = {
                ...existingData,
                ...data,
                lastSaved: new Date().toISOString(),
            };

            localStorage.setItem(draftKey, JSON.stringify(updatedDraft));
        },
        [documentId],
    );

    const getDraft = useCallback(
        (key?: string) => {
            const draftKey =
                key || (documentId ? `draft_${documentId}` : "new_draft");
            const draft = localStorage.getItem(draftKey);
            return draft ? JSON.parse(draft) : null;
        },
        [documentId],
    );

    const autoSave = useCallback(
        (data: Partial<DraftData>) => {
            // Clear existing timeout
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }

            // Set new timeout for auto-save (3 seconds of inactivity)
            saveTimeoutRef.current = setTimeout(() => {
                saveDraft(data);
            }, 3000);
        },
        [saveDraft],
    );

    const clearDraft = useCallback(
        (key?: string) => {
            const draftKey =
                key || (documentId ? `draft_${documentId}` : "new_draft");
            localStorage.removeItem(draftKey);
        },
        [documentId],
    );

    const getAllDrafts = useCallback(() => {
        const drafts: Record<string, DraftData & { lastSaved: string }> = {};

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith("draft_") || key === "new_draft") {
                const data = localStorage.getItem(key);
                if (data) {
                    drafts[key] = JSON.parse(data);
                }
            }
        }

        return drafts;
    }, []);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    return {
        saveDraft,
        getDraft,
        autoSave,
        clearDraft,
        getAllDrafts,
    };
}

/**
 * Hook for managing draft list in UI
 */
export function useDraftList() {
    const getAllDrafts = useCallback(() => {
        const drafts: Array<{
            key: string;
            title: string;
            lastSaved: string;
            description?: string;
        }> = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith("draft_") || key === "new_draft") {
                const data = localStorage.getItem(key);
                if (data) {
                    const parsed = JSON.parse(data);
                    drafts.push({
                        key,
                        title: parsed.title || "Untitled Draft",
                        lastSaved: parsed.lastSaved || new Date().toISOString(),
                        description: parsed.description,
                    });
                }
            }
        }

        return drafts.sort(
            (a, b) =>
                new Date(b.lastSaved).getTime() -
                new Date(a.lastSaved).getTime(),
        );
    }, []);

    const removeDraft = useCallback((key: string) => {
        localStorage.removeItem(key);
    }, []);

    return {
        getAllDrafts,
        removeDraft,
    };
}
