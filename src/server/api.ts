import { createHash } from 'crypto';
import { Request, RequestHandler, Router } from 'express';
import { MongoClient } from 'mongodb';
import { defaultConfig, User } from '../util';

const hash = (str: string) => createHash('sha256').update(str).digest('hex');
const checkAuth = (arr: string[]) => {
    if (!Array.isArray(arr) || arr.length !== 2 || arr.some(x => typeof x !== 'string')) throw 'Invalid authorization.';
};
const validateAuth = async (arr: string[]) => {
    checkAuth(arr);
    if (arr.some(x => x.trim().length < 3)) throw 'Usernames and passwords must be at least 3 characters long.';
    if (!/^[a-z0-9_]+$/i.test(arr[0])) throw 'Usernames must only contain English letters, digits and underscores (_).';
    if (await findUser(arr[0], false)) throw 'Username taken.';
};
const getHeader = (req: Request) => {
    const arr = JSON.parse(req.headers.authorization!);
    checkAuth(arr);
    return arr;
};
const findUser = async (name: string, err = true) => {
    const user = await (await collection).findOne({ name });
    if (!user && err) throw 'User not found.';
    return user!;
};
const getUser = async (auth: string[]) => {
    const user = await findUser(auth[0]);
    if (user.password !== hash(auth[1])) throw 'Incorrect credentials.';
    return user;
};
const handler = (fn: (req: Request) => any): RequestHandler => async (req, res) => {
    try {
        res.json(await fn(req) || {});
    } catch (e) {
        res.json({ error: e + '' });
    }
};

const client = new MongoClient(process.env.MONGO_URI!);
const collection = client.connect().then(() => client.db('shooter_game').collection<User>('users'));

export default Router()
    .post('/auth/login', handler(async req => {
        checkAuth(req.body);
        return await getUser(req.body);
    }))
    .post('/auth/signup', handler(async req => {
        await validateAuth(req.body);
        await (await collection).insertOne({
            name: req.body[0],
            password: hash(req.body[1]),
            config: defaultConfig,
            matches: [],
        });
        return { name: req.body[0] };
    }))
    .post('/auth/edit', handler(async req => {
        await validateAuth(req.body);
        await (await collection).updateOne({ name: (await getUser(getHeader(req))).name }, { $set: { name: req.body[0], password: hash(req.body[1]) } });
        return { name: req.body[0] };
    }))
    .post('/auth/config', handler(async req => {
        await (await collection).updateOne({ name: (await getUser(getHeader(req))).name }, { $set: { config: req.body } });
    }))
    .post('/getUser', handler(async req => {
        const user = await findUser(req.body.name);
        return [user.name, user.matches];
    }))
    .post('/getMatch', handler(async req => {
        const user =  await findUser(req.body.name);
        const data = user.matches[+req.body.id - 1];
        if (!data) throw 'Invalid match index.';
        return [user.name, data];
    }))
    .post('/postMatch', handler(async req => {
        const user = await getUser(getHeader(req));
        await (await collection).updateOne({ name: user.name }, { $set: { matches: [...user.matches, req.body] } });
        return { id: user.matches.length + 1 };
    }));