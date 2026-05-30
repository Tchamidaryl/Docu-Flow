import { sendEmail, verifyEmailConfig } from "@/lib/email/mailer";

export async function GET() {
    try {
        const isValid = await verifyEmailConfig();

        if (!isValid) {
            return Response.json(
                { error: "Email configuration is invalid" },
                { status: 400 },
            );
        }

        await sendEmail({
            to: process.env.SMTP_USER || "test@example.com",
            subject: "DocuFlow Email Test",
            html: "<h1>Email Configuration Test</h1><p>If you received this, your email is configured correctly!</p>",
        });

        return Response.json({
            success: true,
            message: "Test email sent successfully",
        });
    } catch (error) {
        return Response.json(
            { error: String(error) },
            {
                status: 500,
            },
        );
    }
}
