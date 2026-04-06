type LogLevel = 'info' | 'warn' | 'error';

type LogMeta = Record<string, unknown>;

function toErrorObject(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    value: String(error),
  };
}

function writeLog(level: LogLevel, message: string, meta?: LogMeta): void {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta } : {}),
  };

  if (level === 'error') {
    console.error(JSON.stringify(payload));
    return;
  }

  if (level === 'warn') {
    console.warn(JSON.stringify(payload));
    return;
  }

  console.log(JSON.stringify(payload));
}

export function logInfo(message: string, meta?: LogMeta): void {
  writeLog('info', message, meta);
}

export function logWarn(message: string, meta?: LogMeta): void {
  writeLog('warn', message, meta);
}

export function logError(message: string, error: unknown, meta?: LogMeta): void {
  writeLog('error', message, {
    ...meta,
    error: toErrorObject(error),
  });
}
