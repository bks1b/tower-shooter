import { Body, Cylinder } from 'cannon-es';
import { CylinderGeometry, Mesh, MeshLambertMaterial } from 'three';
import { MAIN_TOWER_HEALTH, TARGET_COLOR, TARGET_RADIUS, TARGET_SEGMENTS, TARGET_THICKNESS, TOWER_HEALTH } from '../util/constants';
import { Collision, CollisionGroups } from '../util';
import Game from './Game';
import HealthSprite from './HealthSprite';

export default class {
    body: Body;
    mesh: Mesh;
    health: number;
    private healthSprite: HealthSprite;
    constructor(private game: Game, private team: number, private index: number) {
        this.health = index ? TOWER_HEALTH : MAIN_TOWER_HEALTH;
        this.mesh = new Mesh(new CylinderGeometry(TARGET_RADIUS, TARGET_RADIUS, TARGET_THICKNESS, TARGET_SEGMENTS), new MeshLambertMaterial({ color: TARGET_COLOR }));
        this.mesh.rotation.set(Math.PI / 2, 0, 0);
        this.mesh.userData = { type: 'targets', team, index };
        game.scene.add(this.mesh);
        this.body = new Body({
            type: Body.STATIC,
            shape: new Cylinder(TARGET_RADIUS, TARGET_RADIUS, TARGET_THICKNESS, TARGET_SEGMENTS),
            collisionFilterGroup: [CollisionGroups.OWN_PLAYER, CollisionGroups.ENEMY_TARGET][team],
            collisionFilterMask: [CollisionGroups.ENEMY_PROJECTILE, CollisionGroups.OWN_PROJECTILE][team],
        });
        this.body.quaternion.setFromEuler(Math.PI / 2, 0, 0);
        game.world.addBody(this.body);
        this.healthSprite = new HealthSprite(game.spriteScene, team, this.health);
        this.body.addEventListener('collide', (e: Collision) => {
            const p = game.getProjectile(e);
            if (p && this.damage(p.hero.weapon.damage) && this.team && p.index === game.controlledPlayerIndex) game.lastHitmarker = game.time;
        });
    }

    damage(dmg: number) {
        if ((!this.index && (this.game.targets[this.team][1].health || this.game.targets[this.team][2].health)) || !this.health) return false;
        this.health = Math.max(0, this.health - dmg);
        if (this.health) this.healthSprite.update(this.health);
        else {
            this.healthSprite.sprite.visible = false;
            if (!this.index) this.game.end();
            else this.game.playAudio(this.team ? 'kill' : 'death');
        }
        return true;
    }

    setPosition(x: number, y: number, z: number) {
        this.mesh.position.set(x, y, z);
        this.body.position.set(x, y, z);
        this.healthSprite.setPosition(x, y + TARGET_RADIUS, z);
    }
}