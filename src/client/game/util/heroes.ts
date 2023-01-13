import { Body, Sphere } from 'cannon-es';
import { Mesh, MeshLambertMaterial, SphereGeometry } from 'three';
import Player from '../classes/Player';
import { PROJECTILE_LIFESPAN } from './constants';
import { CollisionGroups, Hero, ProjectileWeapon } from '.';

const dash = {
    description: 'dash forward',
    cooldown: 3,
    fn: (p: Player) => {
        const v = 150;
        p.body.velocity.x += p.direction.x * v;
        p.body.velocity.y += p.direction.y * v;
        p.body.velocity.z += p.direction.z * v;
    },
};

export default <Hero[]>[
    {
        color: '#00aa20',
        health: 130,
        role: 'attack',
        weapon: {
            type: 'hitscan',
            damage: 6,
            rof: 150,
        },
        ability: {
            description: 'restore full health',
            cooldown: 4,
            fn: p => p.health = p.hero.health,
        },
    },
    {
        color: '#fc7f03',
        health: 110,
        role: 'defend',
        flyingVelocity: 5,
        weapon: {
            type: 'projectile',
            velocity: 120,
            radius: 0.5,
            damage: 20,
            rof: 550,
            gravity: false,
            knockback: true,
        },
    },
    {
        color: '#64b9de',
        health: 160,
        role: 'attack',
        weapon: {
            type: 'projectile',
            velocity: 180,
            radius: 0.8,
            damage: 20,
            rof: 500,
            gravity: true,
            knockback: true,
        },
        ability: {
            description: 'launch a grenade that pulls enemies towards itself',
            cooldown: 5,
            fn: p => {
                const c = 0.025;
                const radius = 30;
                const sphereRadius = 1;
                const duration = 5000;
                const color = '#aaaaaa';

                const time = p.game.time;
                const mesh = new Mesh(new SphereGeometry(sphereRadius), new MeshLambertMaterial({ color }));
                p.game.scene.add(mesh);
                const body = new Body({
                    type: Body.DYNAMIC,
                    shape: new Sphere(sphereRadius),
                    mass: 1,
                    collisionFilterGroup: CollisionGroups.OTHER_OBJECT,
                    collisionFilterMask: CollisionGroups.OBJECT,
                    collisionResponse: false,
                });
                body.position.set(p.cameraPosition.x, p.cameraPosition.y, p.cameraPosition.z);
                const v = (p.hero.weapon as ProjectileWeapon).velocity;
                body.velocity.set(p.direction.x * v, p.direction.y * v, p.direction.z * v);
                p.game.world.addBody(body);
                const render = () => {
                    mesh.position.set(body.position.x, body.position.y, body.position.z);
                    if (!collided && p.game.time - time >= PROJECTILE_LIFESPAN) {
                        remove();
                        p.game.world.removeBody(body);
                    }
                };
                const remove = () => {
                    p.game.renderListeners = p.game.renderListeners.filter(x => x !== render);
                    p.game.scene.remove(mesh);
                };
                p.game.renderListeners.push(render);
                let collided = false;
                body.addEventListener('collide', () => {
                    collided = true;
                    const collidedAt = p.game.time;
                    let removedBody = false;
                    body.mass = 0;
                    body.velocity.setZero();
                    const pos = body.position.clone();
                    const update = () => {
                        if (!removedBody) {
                            p.game.world.removeBody(body);
                            removedBody = true;
                        }
                        if (p.game.time - collidedAt >= duration) {
                            remove();
                            p.game.updateListeners = p.game.updateListeners.filter(x => x !== update);
                            return;
                        }
                        p.game.players[1].forEach(q => {
                            const diff = pos.clone().vsub(q.body.position);
                            if (diff.length() > radius || q.died) return;
                            const f = diff.vsub(q.body.velocity.clone().scale(c)).scale(2 / c ** 2);
                            f.y = 0;
                            q.body.applyForce(f);
                        });
                    };
                    p.game.updateListeners.push(update);
                });
            },
        },
    },
    {
        color: '#966432',
        health: 140,
        role: 'attack',
        weapon: {
            type: 'hitscan',
            damage: 20,
            rof: 650,
        },
        ability: dash,
    },
    {
        color: '#eb3636',
        health: 170,
        role: 'defend',
        weapon: {
            type: 'projectile',
            velocity: 300,
            radius: 0.3,
            damage: 40,
            rof: 900,
            gravity: true,
        },
        ability: dash,
    },
];