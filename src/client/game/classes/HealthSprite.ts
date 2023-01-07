import { CanvasTexture, Scene, Sprite, SpriteMaterial } from 'three';
import { HEALTH_GAP, HEALTH_HEIGHT, HEALTH_SCALE, HEALTH_WIDTH } from '../util/constants';
import { renderHealth } from '../util';

export default class {
    sprite: Sprite;
    private ctx: CanvasRenderingContext2D;
    constructor(scene: Scene, private team: number, private max: number) {
        const canvas = document.createElement('canvas');
        this.ctx = canvas.getContext('2d')!;
        canvas.width = HEALTH_WIDTH * HEALTH_SCALE;
        canvas.height = HEALTH_HEIGHT * HEALTH_SCALE;
        this.sprite = new Sprite(new SpriteMaterial({ map: new CanvasTexture(canvas) }));
        this.sprite.scale.set(HEALTH_WIDTH, HEALTH_HEIGHT, 1);
        scene.add(this.sprite);
        this.update(max);
    }

    update(n: number) {
        renderHealth(this.ctx, n, this.max, this.team, HEALTH_WIDTH * HEALTH_SCALE, HEALTH_HEIGHT * HEALTH_SCALE);
        this.sprite.material.map!.needsUpdate = true;
    }

    setPosition(x: number, y: number, z: number) {
        this.sprite.position.set(x, y + HEALTH_GAP + HEALTH_HEIGHT / 2, z);
    }
}