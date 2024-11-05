import { Body, ContactEquation } from 'cannon-es';
import Player from '../classes/Player';
import { ENEMY_HEALTH, ENEMY_HEALTH_LOST, OWN_HEALTH, OWN_HEALTH_LOST } from './constants';

export enum CollisionGroups {
    OBJECT = 1,
    OWN_PLAYER = 2,
    ENEMY_PLAYER = 4,
    OWN_TARGET = 8,
    ENEMY_TARGET = 16,
    OWN_PROJECTILE = 32,
    ENEMY_PROJECTILE = 64,
    OTHER_OBJECT = 128,
}

export const objectCollision = {
    collisionFilterGroup: CollisionGroups.OBJECT,
    collisionFilterMask: CollisionGroups.OWN_PLAYER | CollisionGroups.ENEMY_PLAYER | CollisionGroups.OWN_PROJECTILE | CollisionGroups.ENEMY_PROJECTILE | CollisionGroups.OTHER_OBJECT,
};

export const keymap: Record<string, string> = {
    KeyW: 'up',
    KeyA: 'left',
    KeyS: 'down',
    KeyD: 'right',
    ArrowUp: 'up',
    ArrowLeft: 'left',
    ArrowDown: 'down',
    ArrowRight: 'right',
    Space: 'space',
};

export const renderHealth = (ctx: CanvasRenderingContext2D, n: number, max: number, team: number, w: number, h: number, x = 0, y = 0) => {
    ctx.fillStyle = team ? ENEMY_HEALTH_LOST : OWN_HEALTH_LOST;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = team ? ENEMY_HEALTH : OWN_HEALTH;
    ctx.fillRect(x, y, n / max * w, h);
};

export type Collision = { body: Body; contact: ContactEquation; };

type BaseWeapon = Record<'damage' | 'rof', number>;
export type ProjectileWeapon = BaseWeapon & {
    type: 'projectile';
    velocity: number;
    radius: number;
    gravity: boolean;
    knockback?: boolean;
};
export type Hero = {
    color: string;
    health: number;
    role: 'attack' | 'defend';
    flyingVelocity?: number;
    weapon: ({ type: 'hitscan'; } & BaseWeapon) | ProjectileWeapon;
    ability?: {
        description: string[];
        cooldown: number;
        audio: string;
        fn: (p: Player) => any;
    };
    passive?: string[];
};