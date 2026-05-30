import { sendEmailViaResend } from "@/lib/email/resend";

export async function GET() {
    const result = await sendEmailViaResend({
        to: "tchamidaryl@gmail.com",  //Type your email here, go on your browser and on the search bar type "localhost:3000/api/v1/test-email and check your email inbox for delivery"
        subject: "Test Email",
        html: "<h1>Test</h1>",
    });
    return Response.json(result);
}