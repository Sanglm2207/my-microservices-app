import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import logger from 'logger';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error(
        {
            err, // Log toàn bộ đối tượng lỗi
            request: {
                method: req.method,
                url: req.originalUrl,
                ip: req.ip,
            },
        },
        'An unhandled error occurred in errorHandler'
    );

    if (err instanceof ZodError) {
        const errorMessages = err.errors.map((e) => e.message).join(', ');
        return res.status(400).json({ message: errorMessages });
    }

    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({ message: 'Invalid token' });
    }

    if (err.name === 'ForbiddenError') {
        return res.status(403).json({ message: 'Forbidden' });
    }


    res.status(500).json({
        message: 'An unexpected internal server error occurred.',
        ...(process.env.NODE_ENV === 'development' && { error: err.message, stack: err.stack }),
    });
};