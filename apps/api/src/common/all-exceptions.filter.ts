import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@auditflow/db';

const logger = new Logger('ExceptionFilter');

function mapPrismaError(err: Prisma.PrismaClientKnownRequestError): {
  statusCode: number;
  message: string;
  errorCode: string;
} {
  switch (err.code) {
    case 'P2002': {
      const fields = (err.meta?.target as string[] | undefined)?.join(', ') ?? 'field';
      return {
        statusCode: HttpStatus.CONFLICT,
        message: `A record with this ${fields} already exists.`,
        errorCode: 'UNIQUE_CONSTRAINT',
      };
    }
    case 'P2003':
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Referenced record does not exist.',
        errorCode: 'FOREIGN_KEY_CONSTRAINT',
      };
    case 'P2025':
      return {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Record not found.',
        errorCode: 'RECORD_NOT_FOUND',
      };
    case 'P2000':
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Provided value is too long for the field.',
        errorCode: 'VALUE_TOO_LONG',
      };
    case 'P2011':
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'A required field is missing.',
        errorCode: 'NULL_CONSTRAINT',
      };
    default:
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'A database error occurred. Please try again.',
        errorCode: `PRISMA_${err.code}`,
      };
  }
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const path = request?.url ?? 'unknown';

    // Known HTTP exceptions (NestJS built-in, HttpException subclasses)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as { message?: string | string[] }).message ?? exception.message;

      const normalizedMessage = Array.isArray(message) ? message.join('; ') : message;

      return response.status(status).json({
        statusCode: status,
        message: normalizedMessage,
        timestamp: new Date().toISOString(),
        path,
      });
    }

    // Prisma known request errors
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const prismaErr = exception as Prisma.PrismaClientKnownRequestError;
      const mapped = mapPrismaError(prismaErr);
      logger.warn(`Prisma ${prismaErr.code} on ${path}: ${prismaErr.message}`);
      return response.status(mapped.statusCode).json({
        statusCode: mapped.statusCode,
        message: mapped.message,
        errorCode: mapped.errorCode,
        timestamp: new Date().toISOString(),
        path,
      });
    }

    // Prisma validation errors (bad input to query)
    if (exception instanceof Prisma.PrismaClientValidationError) {
      logger.warn(`Prisma validation error on ${path}`);
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Invalid data provided. Please check your input.',
        errorCode: 'VALIDATION_ERROR',
        timestamp: new Date().toISOString(),
        path,
      });
    }

    // Unhandled/unknown errors — log full error server-side, return generic message
    logger.error(
      `Unhandled exception on ${path}: ${exception instanceof Error ? exception.message : String(exception)}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred. The system administrator has been notified.',
      errorCode: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
      path,
    });
  }
}
