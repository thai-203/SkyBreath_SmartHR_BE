import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger(LoggingInterceptor.name);

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const request = context.switchToHttp().getRequest<Request>();
        const { method, url, body } = request;
        const userAgent = request.get('user-agent') || '';
        const ip = request.ip;

        const now = Date.now();

        this.logger.log(
            `[Request] ${method} ${url} - IP: ${ip} - User-Agent: ${userAgent}`,
        );

        if (Object.keys(body || {}).length > 0) {
            this.logger.debug(`[Request Body] ${JSON.stringify(body)}`);
        }

        return next.handle().pipe(
            tap({
                next: () => {
                    const responseTime = Date.now() - now;
                    this.logger.log(
                        `[Response] ${method} ${url} - ${responseTime}ms`,
                    );
                },
                error: (error) => {
                    const responseTime = Date.now() - now;
                    this.logger.error(
                        `[Response] ${method} ${url} - ${responseTime}ms - Error: ${error.message}`,
                    );
                },
            }),
        );
    }
}
