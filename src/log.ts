export type LogLevel = "debug" | "info" | "warn" | "error";

const env = (
  process.env.LOG_LEVEL ||
  process.env.NODE_LOG_LEVEL ||
  "info"
).toLowerCase();
const levels: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};
const current: LogLevel =
  env === "info" || env === "warn" || env === "error"
    ? (env as LogLevel)
    : "debug";

function shouldLog(level: LogLevel) {
  return levels[level] >= levels[current];
}

export const logger = {
  debug: (...args: any[]) => {
    if (!shouldLog("debug")) return;
    // Use console.debug if available, fallback to console.log
    (console.debug || console.log)(...args);
  },
  info: (...args: any[]) => {
    if (!shouldLog("info")) return;
    console.log(...args);
  },
  warn: (...args: any[]) => {
    if (!shouldLog("warn")) return;
    console.warn(...args);
  },
  error: (...args: any[]) => {
    if (!shouldLog("error")) return;
    console.error(...args);
  },
  level: current,
};

export default logger;
