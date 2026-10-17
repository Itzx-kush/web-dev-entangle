import { ZodError } from 'zod';
import { env } from '../config/env.js';

export const errorHandler = (err, req, res, _next) => {
  // SyntaxError from express.json() when parsing bad JSON
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Malformed JSON payload in request body',
    });
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    const formattedIssues = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Request payload failed validation',
      details: formattedIssues,
    });
  }

  // Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Bad Request',
      message: `Invalid format for field '${err.path}'`,
    });
  }

  // Mongoose ValidationError
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => ({
      path: e.path,
      message: e.message,
    }));
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Database schema validation failed',
      details,
    });
  }

  // Database connection errors or network timeouts
  if (
    err.name === 'MongooseServerSelectionError' ||
    err.name === 'MongoNetworkError' ||
    err.message?.includes('buffering timed out') ||
    err.message?.includes('ECONNREFUSED')
  ) {
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Database service is currently unreachable. Please try again later.',
    });
  }

  // Custom HTTP status error
  if (err.statusCode || err.status) {
    const statusCode = err.statusCode || err.status;
    return res.status(statusCode).json({
      error: err.name || 'Error',
      message: err.message,
    });
  }

  // Generic internal server error - never expose stack trace or internal details
  if (!env.isTest) {
    console.error('[Internal Error]', err);
  }

  return res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected internal error occurred.',
  });
};
