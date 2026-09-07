import express, { type Express, type Request, type Response } from 'express';
// iniciar el proyecto
// node src/app.ts
const app: Express = express();

app.get('/', (req: Request, res: Response) => {
    res.send('Hello World!');
});

app.listen(3000);