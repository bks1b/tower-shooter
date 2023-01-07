export const defaultConfig = {
    sensitivity: 0.002,
    fov: 75,
};

export type User = {
    name: string;
    password: string;
    config: Config;
    matches: Match[];
};

export type Config = Record<'sensitivity' | 'fov', number>;

export type Match = {
    won: boolean;
    duration: number;
    kills: NumberMap;
    endDate: number;
};

export type NumberMap = Record<string, number>;