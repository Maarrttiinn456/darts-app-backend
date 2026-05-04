import dotenv from 'dotenv';
dotenv.config({
    path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env',
});
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { errorHandler } from './middleware/errors';
import { openApiSpec } from './lib/openapi';
import authRouter from './routes/auth';
import leaguesRouter from './routes/leagues';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/leagues', leaguesRouter);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
app.get('/api-docs.json', (_req, res) => res.json(openApiSpec));

app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
