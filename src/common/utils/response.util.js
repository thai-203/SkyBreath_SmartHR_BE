export class ResponseUtil {
    static sendResponse(res, message, data, statusCode = 200) {
        return res.status(statusCode).json({
            success: true,
            message,
            data,
        });
    }

    static sendError(res, message, statusCode = 500, errorCode = 'INTERNAL_SERVER_ERROR', errors = null) {
        return res.status(statusCode).json({
            success: false,
            message,
            errorCode,
            errors,
        });
    }

    static successResponse(res, statusCode = 200, data = null, message = 'Success') {
        return res.status(statusCode).json({
            success: true,
            data,
            message,
        });
    }
}
