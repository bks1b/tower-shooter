import { Body, Sphere, Vec3 } from 'cannon-es';
import { Curve, Material, Mesh, MeshBasicMaterial, MeshLambertMaterial, Raycaster, SphereGeometry, TubeGeometry, Vector3 } from 'three';
import { BOT_POSITION_TRESHOLD, BOT_SHOOTING_CONST, BRIDGE_HEIGHT, DEATH_DEPTH, GRAVITY, JUMP_DOT_PRODUCT, JUMP_VELOCITY, LINEAR_DAMPING, MAIN_TOWER_GAP, PLAYER_RADIUS, PLAYER_SPEED, RAMP_WIDTH, RAY_RADIUS_SCALE, RAY_THICKNESS, RESPAWN_TIME, TOWER_HEIGHT, WIDTH_PERCENTAGE } from '../util/constants';
import heroes from '../util/heroes';
import { bridgeX, groundHeight, groundWidth, mainRampX, spawnZ, towerCenterZ } from '../util/map';
import { Collision, CollisionGroups, Hero, ProjectileWeapon } from '../util';
import Game from './Game';
import HealthSprite from './HealthSprite';
import Projectile from './Projectile';

class LinearCurve extends Curve<Vector3> {
    constructor(private p1: Vector3, private p2: Vector3) {
        super();
    }

    getPoint(t: number) {
        return this.p1.clone().add(this.p2.clone().sub(this.p1.clone()).multiplyScalar(t));
    }
}

export default class {
    body: Body;
    mesh: Mesh;
    health: number;
    direction = new Vector3();
    died: number | false = false;
    lastAbilityUsage = 0;
    private healthSprite: HealthSprite;
    private canJump = true;
    private lastShot = 0;
    private lastHitBy: number | null = null;
    private hitByControlled = false;
    constructor(public game: Game, public hero: Hero, private team: number, public index: number) {
        this.health = hero.health;
        this.body = new Body({
            type: Body.DYNAMIC,
            shape: new Sphere(PLAYER_RADIUS),
            linearDamping: LINEAR_DAMPING,
            mass: 1,
            collisionFilterGroup: [CollisionGroups.OWN_PLAYER, CollisionGroups.ENEMY_PLAYER][team],
            collisionFilterMask: CollisionGroups.OBJECT | [CollisionGroups.ENEMY_PROJECTILE, CollisionGroups.OWN_PROJECTILE][team],
            collisionResponse: true,
        });
        game.world.addBody(this.body);
        this.body.addEventListener('collide', (e: Collision) => {
            const p = game.getProjectile(e);
            if (p && this.damage(p.hero.weapon.damage, p.index) && this.team && p.index === game.controlledPlayerIndex) game.lastHitmarker = game.time;
            if (-e.contact.ni.dot(new Vec3(0, 1, 0)) >= JUMP_DOT_PRODUCT) this.canJump = true;
        });
        this.mesh = new Mesh(new SphereGeometry(PLAYER_RADIUS), new MeshLambertMaterial({ color: hero.color }));
        this.mesh.userData = { type: 'players', team, index };
        game.scene.add(this.mesh);
        this.healthSprite = new HealthSprite(game.scene, team, hero.health);
        this.body.position.copy(this.spawnPosition);
        this.direction = new Vector3(0, 0, 1 - 2 * team);
    }

    get spawnPosition() {
        return new Vec3((-this.index + (heroes.length - 1) / 2) * groundWidth * WIDTH_PERCENTAGE / heroes.length, PLAYER_RADIUS, spawnZ * (this.team ? 1 : -1));
    }

    get cameraPosition() {
        return this.mesh.position.clone().add(new Vector3(0, PLAYER_RADIUS, 0));
    }

    die() {
        if (this.died) return;
        this.died = this.game.time;
        this.body.sleep();
        this.body.position.copy(this.spawnPosition);
        if (this.lastHitBy !== null) {
            this.game.kills.unshift([this.index, this.lastHitBy, this.team, this.game.time]);
            if (this.hitByControlled) {
                this.game.controlledKills[this.lastHitBy] = (this.game.controlledKills[this.lastHitBy] || 0) + 1;
                this.game.lastKill = this.game.time;
            }
        }
    }

    damage(dmg: number, index: number) {
        if (this.died) return false;
        this.lastHitBy = index;
        this.hitByControlled = this.team === 1 && this.game.controlledPlayerIndex === index;
        this.health = Math.max(0, this.health - dmg);
        if (!this.health) this.die();
        else this.healthSprite.update(this.health);
        return true;
    }

    move(x: number, z: number, dt: number) {
        const c = PLAYER_SPEED * dt / Math.sqrt(x ** 2 + z ** 2);
        this.body.velocity.x += x * c;
        this.body.velocity.z += z * c;
    }

    jump() {
        if (this.canJump || this.hero.flyingVelocity) {
            this.body.velocity.y += (this.hero.flyingVelocity || JUMP_VELOCITY);
            this.canJump = !!this.hero.flyingVelocity;
        }
    }

    raycast() {
        return new Raycaster(this.cameraPosition, this.direction).intersectObjects(this.game.scene.children.filter(x => x.userData.type ? x.userData.team !== this.team && (x.type !== 'player' || !this.game.players[x.userData.team][x.userData.index].died) : x.userData.object))[0];
    }

    shoot() {
        if (this.game.time - this.lastShot < this.hero.weapon.rof) return;
        if (this.hero.weapon.type === 'projectile') this.game.projectiles.push(new Projectile(this.game, this.team, this.cameraPosition, this.direction.clone().multiplyScalar(this.hero.weapon.velocity), <Hero & { weapon: ProjectileWeapon; }>this.hero, this.index));
        else {
            const data = this.raycast();
            if (data?.object.userData.type && this.game[<'players' | 'targets'>data.object.userData.type][data.object.userData.team][data.object.userData.index].damage(this.hero.weapon.damage, this.index) && !this.team && this.index === this.game.controlledPlayerIndex) this.game.lastHitmarker = this.game.time;
            const dot = 2 * this.mesh.position.dot(this.direction);
            const disc = dot ** 2 - 4 * this.mesh.position.lengthSq() + RAY_RADIUS_SCALE * (groundWidth ** 2 + (2 * groundHeight + BRIDGE_HEIGHT) ** 2);
            if (disc >= 0) {
                const ray = new Mesh(
                    new TubeGeometry(new LinearCurve(this.mesh.position, data ? data.point : this.mesh.position.clone().add(this.direction.clone().multiplyScalar((Math.sqrt(disc) - dot) / 2))), 2, RAY_THICKNESS, 16),
                    new MeshBasicMaterial({ color: this.hero.color, transparent: true }),
                );
                this.game.scene.add(ray);
                this.game.rays.push(ray);
            }
        }
        this.lastShot = this.game.time;
    }

    useAbility() {
        if (this.hero.ability && (this.game.time - this.lastAbilityUsage) / 1000 >= this.hero.ability.cooldown) {
            this.hero.ability.fn(this);
            this.lastAbilityUsage = this.game.time;
        }
    }

    update(dt: number) {
        if (this.died && (this.game.time - this.died) / 1000 >= RESPAWN_TIME) {
            this.died = false;
            this.lastHitBy = null;
            this.hitByControlled = false;
            this.health = this.hero.health;
            this.healthSprite.update(this.health);
            this.body.position.copy(this.spawnPosition);
            this.body.wakeUp();
        }
        if (this.body.position.y <= -DEATH_DEPTH) this.die();
        if (this.died) return;
        if (this.team || this.index !== this.game.controlledPlayerIndex) {
            for (const target of [
                ...this.game.targets[1 - this.team].filter(x => x.health),
                ...Math.random() > (2 / (1 + Math.exp(-BOT_SHOOTING_CONST * this.hero.weapon.damage ** 2 / this.hero.weapon.rof)) - 1)
                    ? this.game.players[1 - this.team]
                        .filter(x => !x.died)
                        .map(x => <const>[x, x.body.position.clone().vsub(this.body.position).length()])
                        .sort((a, b) => a[1] - b[1])
                        .map(x => x[0])
                    : [],
            ]) {
                this.direction = target.mesh.position.clone().sub(this.mesh.position).normalize();
                const data = this.raycast()?.object.userData;
                if (data && !data.object) {
                    if (this.hero.weapon.type === 'projectile' && this.hero.weapon.gravity) {
                        const diff = this.body.position.clone().vsub(target.body.position);
                        const v = this.hero.weapon.velocity;
                        const t = Math.sqrt(2) / GRAVITY * Math.sqrt(v ** 2 - GRAVITY * diff.y - Math.sqrt((v ** 2 - GRAVITY * diff.y) ** 2 - GRAVITY ** 2 * diff.length() ** 2));
                        const x = -diff.x / (v * t);
                        const z = -diff.z / (v * t);
                        this.direction.set(x, Math.sqrt(1 - x ** 2 - z ** 2), z);
                    }
                    this.shoot();
                    break;
                }
            }
            const xHalf = Math.sign(this.body.position.x) || 1;
            const team = this.hero.role === 'defend' ? 1 - this.team : this.team;
            const teamZ = 1 - team * 2;
            const smallTarget = [xHalf, -xHalf].find(i => this.game.targets[1 - team][(i + 1) / 2 + 1].health);
            const isOpposite = Math.sign(this.body.position.z) === -teamZ;
            if (isOpposite ? Math.abs(this.body.position.x - bridgeX * (smallTarget || xHalf)) > BOT_POSITION_TRESHOLD : smallTarget && Math.abs(this.body.position.z) >= towerCenterZ) this.move(bridgeX * (smallTarget || xHalf) - this.body.position.x, 0, dt);
            else if (isOpposite || smallTarget) this.move(0, teamZ, dt);
            else if (Math.abs(this.body.position.z) < spawnZ + MAIN_TOWER_GAP / 2 + TOWER_HEIGHT - RAMP_WIDTH) {
                if (Math.abs(this.body.position.x - mainRampX * xHalf) > BOT_POSITION_TRESHOLD) {
                    if (Math.abs(this.body.position.z - spawnZ * teamZ) > BOT_POSITION_TRESHOLD) this.move(0, spawnZ * teamZ - this.body.position.z, dt);
                    else this.move(mainRampX * xHalf - this.body.position.x, 0, dt);
                } else this.move(0, teamZ, dt);
            } else this.move(-xHalf, 0, dt);
        }
    }

    render() {
        (<Material>this.mesh.material).visible = this.healthSprite.sprite.visible = !this.died && (!!this.team || this.index !== this.game.controlledPlayerIndex);
        this.mesh.position.set(this.body.position.x, this.body.position.y, this.body.position.z);
        this.healthSprite.setPosition(this.cameraPosition.x, this.cameraPosition.y, this.cameraPosition.z);
    }
}