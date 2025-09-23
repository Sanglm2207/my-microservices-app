import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';

interface SwaggerOptions {
    title: string;
    version: string;
    description: string;
    apiBaseUrl: string; // ví dụ: http://localhost:4001
    apiDocsPath: string; // ví dụ: /api-docs
}

/**
 * Hàm thiết lập Swagger UI cho một ứng dụng Express.
 * @param app - Instance của ứng dụng Express.
 * @param options - Các tùy chọn cấu hình cho Swagger.
 */
export const setupSwagger = (app: Express, options: SwaggerOptions) => {
    const { title, version, description, apiBaseUrl, apiDocsPath } = options;

    const swaggerDefinition = {
        openapi: '3.0.0',
        info: {
            title,
            version,
            description,
        },
        servers: [
            {
                url: apiBaseUrl,
                description: 'Development server',
            },
        ],
        // Thêm các component dùng chung ở đây để tránh lặp lại
        components: {
            securitySchemes: {
                cookieAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'access_token',
                    description: 'Access token is set in an httpOnly cookie after login.'
                }
            },
            responses: {
                UnauthorizedError: {
                    description: 'Access token is missing or invalid',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    message: { type: 'string', example: 'Access Denied. No token provided.' }
                                }
                            }
                        }
                    }
                },
                ForbiddenError: {
                    description: 'User does not have permission to access this resource',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    message: { type: 'string', example: 'Forbidden: Insufficient permissions.' }
                                }
                            }
                        }
                    }
                }
            }
        }
    };

    const swaggerOptions = {
        swaggerDefinition,
        apis: [
            path.join(process.cwd(), './apps/**/src/routes/*.ts'),
            path.join(process.cwd(), './packages/**/src/**/*.ts') // Quét cả JSDoc trong packages (ví dụ: schemas)
        ],
    };

    const swaggerSpec = swaggerJsdoc(swaggerOptions);

    app.use(apiDocsPath, swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    console.log(`📄 Swagger docs for ${title} available at ${apiBaseUrl}${apiDocsPath}`);
};