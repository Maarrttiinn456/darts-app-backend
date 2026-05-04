export const openApiSpec = {
    openapi: '3.0.3',
    info: {
        title: 'Darts App API',
        version: '1.0.0',
    },
    servers: [{ url: 'http://localhost:3000' }],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
        },
        schemas: {
            User: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    username: { type: 'string' },
                    email: { type: 'string', format: 'email' },
                    avatarUrl: { type: 'string', nullable: true },
                    color: { type: 'string', nullable: true },
                    createdAt: { type: 'string', format: 'date-time' },
                },
            },
            League: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    name: { type: 'string' },
                    adminId: { type: 'string', format: 'uuid' },
                    createdAt: { type: 'string', format: 'date-time' },
                },
            },
            LeagueMember: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    username: { type: 'string' },
                    avatarUrl: { type: 'string', nullable: true },
                    color: { type: 'string', nullable: true },
                },
            },
            Error: {
                type: 'object',
                properties: {
                    error: { type: 'string' },
                },
            },
        },
    },
    security: [{ bearerAuth: [] }],
    paths: {
        '/api/auth/register': {
            post: {
                tags: ['Auth'],
                summary: 'Register a new user',
                security: [],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['username', 'email', 'password'],
                                properties: {
                                    username: { type: 'string', minLength: 2 },
                                    email: { type: 'string', format: 'email' },
                                    password: { type: 'string', minLength: 6 },
                                },
                            },
                        },
                    },
                },
                responses: {
                    201: {
                        description: 'User created',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        token: { type: 'string' },
                                        user: { $ref: '#/components/schemas/User' },
                                    },
                                },
                            },
                        },
                    },
                    400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
                },
            },
        },
        '/api/auth/login': {
            post: {
                tags: ['Auth'],
                summary: 'Login',
                security: [],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['email', 'password'],
                                properties: {
                                    email: { type: 'string', format: 'email' },
                                    password: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: 'OK',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        token: { type: 'string' },
                                        user: { $ref: '#/components/schemas/User' },
                                    },
                                },
                            },
                        },
                    },
                    401: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
                },
            },
        },
        '/api/auth/me': {
            get: {
                tags: ['Auth'],
                summary: 'Get current user',
                responses: {
                    200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
                    401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
                },
            },
        },
        '/api/leagues': {
            get: {
                tags: ['Leagues'],
                summary: 'Get all leagues',
                responses: {
                    200: {
                        description: 'OK',
                        content: {
                            'application/json': {
                                schema: { type: 'array', items: { $ref: '#/components/schemas/League' } },
                            },
                        },
                    },
                },
            },
            post: {
                tags: ['Leagues'],
                summary: 'Create a league',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['name', 'memberIds'],
                                properties: {
                                    name: { type: 'string', minLength: 1 },
                                    memberIds: {
                                        type: 'array',
                                        items: { type: 'string', format: 'uuid' },
                                        minItems: 1,
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    201: { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/League' } } } },
                    400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
                },
            },
        },
        '/api/leagues/{leagueId}': {
            get: {
                tags: ['Leagues'],
                summary: 'Get league detail with members',
                parameters: [{ name: 'leagueId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
                responses: {
                    200: {
                        description: 'OK',
                        content: {
                            'application/json': {
                                schema: {
                                    allOf: [
                                        { $ref: '#/components/schemas/League' },
                                        {
                                            type: 'object',
                                            properties: {
                                                members: { type: 'array', items: { $ref: '#/components/schemas/LeagueMember' } },
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                    },
                    404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
                },
            },
        },
    },
};
