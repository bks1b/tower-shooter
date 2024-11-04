import { createContext } from 'react';
import { NumberMap } from '../../util';
import { getLang } from '../util';

export const HERO_KILL_DIAMETER = 50;

export const MainContext = createContext<{
    navigate: (x: string[]) => any;
    user: AuthData;
    setUser: (x: AuthData) => any;
        } | null>(null);

export const sumValues = (x: NumberMap) => Object.values(x).reduce((a, b) => a + b, 0);

export const formatDate = (n: number) => new Date(n).toLocaleString(['en-US', 'hu-HU'][getLang()], { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' });

export type AuthData = {
    loggedIn: boolean;
    auth?: string[];
    name?: string;
};