import { Injectable, LoggerService, Scope } from '@nestjs/common';
import * as winston from 'winston';
import { ConfigService } from '@nestjs/config';

const { combine, timestamp, errors, json, colorize, printf, splat } = winston.format;

const devFormat = printf(({ level, message, timestamp, context, trace, ...meta }) => {
  const ctx = context ? `[${context}]` : '';
  const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  const err = trace ? `\n${trace}` : '';
  return `${timestamp} ${level.padEnd(7)} ${ctx.padEnd(20)} ${message}${extra}${err}`;
});

@Injectable({ scope: Scope.TRANSIENT })
export class AppLogger implements LoggerService {
  private logger: winston.Logger;
  private context?: string;

  constructor(private readonly configService?: ConfigService) {
    const isProd = (configService?.get('NODE_ENV') ?? process.env.NODE_ENV) === 'production';

    this.logger = winston.createLogger({
      level: isProd ? 'info' : 'debug',
      format: isProd
        ? combine(timestamp(), errors({ stack: true }), splat(), json())
        : combine(
            colorize({ all: true }),
            timestamp({ format: 'HH:mm:ss' }),
            errors({ stack: true }),
            splat(),
            devFormat,
          ),
      transports: [
        new winston.transports.Console(),
        ...(isProd
          ? [
              new winston.transports.File({
                filename: 'logs/error.log',
                level: 'error',
                maxsize: 10 * 1024 * 1024,
                maxFiles: 5,
              }),
              new winston.transports.File({
                filename: 'logs/combined.log',
                maxsize: 20 * 1024 * 1024,
                maxFiles: 10,
              }),
            ]
          : []),
      ],
    });
  }

  setContext(context: string) {
    this.context = context;
    return this;
  }

  log(message: any, context?: string, ...meta: any[]) {
    this.logger.info(message, { context: context || this.context, ...this.parseMeta(meta) });
  }

  error(message: any, trace?: string, context?: string, ...meta: any[]) {
    this.logger.error(message, { context: context || this.context, trace, ...this.parseMeta(meta) });
  }

  warn(message: any, context?: string, ...meta: any[]) {
    this.logger.warn(message, { context: context || this.context, ...this.parseMeta(meta) });
  }

  debug(message: any, context?: string, ...meta: any[]) {
    this.logger.debug(message, { context: context || this.context, ...this.parseMeta(meta) });
  }

  verbose(message: any, context?: string, ...meta: any[]) {
    this.logger.verbose(message, { context: context || this.context, ...this.parseMeta(meta) });
  }

  private parseMeta(meta: any[]): Record<string, any> {
    if (!meta?.length) return {};
    if (meta.length === 1 && typeof meta[0] === 'object') return meta[0];
    return { extra: meta };
  }
}
