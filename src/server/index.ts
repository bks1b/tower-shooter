import { join } from 'path';
import express from 'express';
import { config } from 'dotenv';

config();

import api from './api';

const PORT = process.env.PORT || 2000;

express()
    .use(express.json())
    .use('/api', api)
    .use(express.static(join(process.cwd(), 'src/client/static')))
    .use(express.static(join(process.cwd(), 'build')))
    .get('/play', (_, res) => res.sendFile(join(process.cwd(), 'src/client/html/play.html')))
    .get('*', (_, res) => res.sendFile(join(process.cwd(), 'src/client/html/index.html')))
    .listen(PORT, () => console.log('Listening on port', PORT));