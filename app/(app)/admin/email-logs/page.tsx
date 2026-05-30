import React, { useEffect, useState } from "react";

const EmailLogsPage = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadLogs() {
            try {
                const data = await fetchData('/api/v1/admin/email-logs');
                setLogs(data);
            } catch (error) {
                console.error("Failed to load email logs:", error);
            } finally {
                setLoading(false);
            }
        }

        loadLogs();
    }, []);

    if (loading) return <div>Loading...</div>;

    return (
        <div className="container py-10">
            <h1 className="text-3xl font-bold mb-6">Email Logs</h1>
            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-muted">
                            <th className="border p-2 text-left">Recipient</th>
                            <th className="border p-2 text-left">Subject</th>
                            <th className="border p-2 text-left">Template</th>
                            <th className="border p-2 text-left">Status</th>
                            <th className="border p-2 text-left">Sent At</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map((log: any) => (
                            <tr key={log.id} className="border">
                                <td className="border p-2">
                                    {log.recipientEmail}
                                </td>
                                <td className="border p-2">{log.subject}</td>
                                <td className="border p-2">{log.template}</td>
                                <td className="border p-2">
                                    <span
                                        className={`px-2 py-1 rounded text-sm ${log.status === "SENT" ? "bg-green-100 text-green-800" : log.status === "FAILED" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}
                                    >
                                        {log.status}
                                    </span>
                                </td>
                                <td className="border p-2">
                                    {log.sentAt ? new Date(log.sentAt).toLocaleString() : 'Not Sent'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default EmailLogsPage;
