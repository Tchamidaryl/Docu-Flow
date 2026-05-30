import { Resend } from "resend";
import prisma from "@/lib/prisma";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface ResendEmailOptions {
    to: string | string[];
    subject: string;
    html: string;
    from?: string;
}

/**
 * Send email using Resend API
 */
export async function sendEmailViaResend(
    options: ResendEmailOptions,
): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        if (!process.env.RESEND_API_KEY) {
            console.warn("Resend API key not configured");
            return { success: false, error: "Resend API key not configured" };
        }

        const emails = Array.isArray(options.to) ? options.to : [options.to];
        const results = [];

        for (const email of emails) {
            const result = await resend.emails.send({
                from:
                    options.from ||
                    `${process.env.RESEND_FROM_NAME || "DocuFlow"} <${process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"}>`,
                to: email,
                subject: options.subject,
                html: options.html,
            });

            if (result.error) {
                console.error(
                    `Failed to send email to ${email}:`,
                    result.error,
                );
                results.push({ email, success: false, error: result.error });
            } else {
                console.log(`Email sent to ${email}:`, result.data?.id);
                results.push({ email, success: true, id: result.data?.id });
            }
        }

        const allSuccess = results.every((r) => r.success);
        return {
            success: allSuccess,
            id: results[0]?.id,
            error: allSuccess
                ? undefined
                : results.map((r) => `${r.email}: ${r.error}`).join("; "),
        };
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
        console.error("Failed to send email via Resend:", errorMessage);
        return { success: false, error: errorMessage };
    }
}

/**
 * Log email sent via Resend
 */
export async function logEmailSent(
    recipientEmail: string,
    subject: string,
    template: string,
    documentId?: string,
    resendId?: string,
    success: boolean = true,
    error?: string,
): Promise<void> {
    try {
        await prisma.emailLog.create({
            data: {
                recipientEmail,
                subject,
                template,
                documentId,
                status: success ? "SENT" : "FAILED",
                failureReason: error,
                sentAt: success ? new Date() : undefined,
                metadata: resendId ? { resendId } : undefined,
            },
        });
    } catch (err) {
        console.error("Failed to log email:", err);
    }
}
