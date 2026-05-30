import winston from 'winston';
import path from 'path';

const logsDir = path.join(process.cwd(), 'logs');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'docuflow' },
  transports: [
    // Error logs
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Combined logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

export const log = logger;

export interface AuditLogData {
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  status: 'SUCCESS' | 'FAILURE';
  errorMessage?: string;
  metadata?: Record<string, any>;
}

/**
 * Log audit trail
 */
export function logAudit(data: AuditLogData) {
  log.info('AUDIT', data);
}

/**
 * Log error with context
 */
export function logError(
  message: string,
  error: Error,
  context?: Record<string, any>
) {
  log.error(message, {
    error: {
      message: error.message,
      stack: error.stack,
    },
    context,
  });
}

/**
 * Log API request
 */
export function logApiRequest(data: {
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  userId?: string;
  ipAddress?: string;
}) {
  log.info('API_REQUEST', data);
}

/**
 * Log document action
 */
export function logDocumentAction(
  documentId: string,
  userId: string,
  action: string,
  details?: Record<string, any>
) {
  logAudit({
    userId,
    action,
    resourceType: 'DOCUMENT',
    resourceId: documentId,
    status: 'SUCCESS',
    metadata: details,
  });
}

/**
 * Log approval action
 */
export function logApprovalAction(
  documentId: string,
  userId: string,
  approvalStatus: string,
  comment?: string
) {
  logAudit({
    userId,
    action: 'APPROVAL_ACTION',
    resourceType: 'DOCUMENT',
    resourceId: documentId,
    status: 'SUCCESS',
    metadata: {
      approvalStatus,
      comment,
    },
  });
}

/**
 * Log email sent
 */
export function logEmailSent(
  recipientEmail: string,
  subject: string,
  template: string
) {
  log.info('EMAIL_SENT', {
    recipientEmail,
    subject,
    template,
  });
}

/**
 * Log authentication
 */
export function logAuthentication(
  userId: string,
  success: boolean,
  ipAddress?: string
) {
  logAudit({
    userId,
    action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILURE',
    resourceType: 'USER',
    resourceId: userId,
    status: success ? 'SUCCESS' : 'FAILURE',
    ipAddress,
  });
}
