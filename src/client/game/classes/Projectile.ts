import { Body, Sphere } from 'cannon-es';
import { Mesh, MeshLambertMaterial, SphereGeometry, Vector3 } from 'three';
import { PROJECTILE_LIFESPAN } from '../util/constants';
import { CollisionGroups, Hero, ProjectileWeapon } from '../util';
import Game from './Game';

export default class {
    body: Body;
    mesh: Mesh;
    toRemove = false;
    collided = false;
    private startDate: number;
    private toRemoveNext = false;
    constructor(private game: Game, team: number, position: Vector3, velocity: Vector3, public hero: Hero & { weapon: ProjectileWeapon; }, public index: number) {
        this.startDate = game.time;
        this.body = new Body({
            type: Body.DYNAMIC,
            shape: new Sphere(hero.weapon.radius),
            mass: hero.weapon.gravity ? 1 : 0,
            collisionFilterGroup: [CollisionGroups.OWN_PROJECTILE, CollisionGroups.ENEMY_PROJECTILE][team],
            collisionFilterMask: [CollisionGroups.ENEMY_PLAYER | CollisionGroups.ENEMY_TARGET, CollisionGroups.OWN_PLAYER | CollisionGroups.OWN_TARGET][team] | CollisionGroups.OBJECT,
            collisionResponse: !!hero.weapon.knockback,
        });
        this.body.position.set(position.x, position.y, position.z);
        this.body.velocity.set(velocity.x, velocity.y, velocity.z);
        game.world.addBody(this.body);
        this.mesh = new Mesh(new SphereGeometry(hero.weapon.radius), new MeshLambertMaterial({ color: hero.color }));
        game.scene.add(this.mesh);
        this.body.addEventListener('collide', () => this.toRemoveNext = true);
    }

    remove() {
        this.game.world.removeBody(this.body);
        this.game.scene.remove(this.mesh);
        this.toRemove = true;
    }

    update() {
        if (this.game.time - this.startDate >= PROJECTILE_LIFESPAN || this.toRemoveNext) this.remove();
    }

    render() {
        this.mesh.position.set(this.body.position.x, this.body.position.y, this.body.position.z);
    }
}