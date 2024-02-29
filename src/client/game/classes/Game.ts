import { Vec3, World } from 'cannon-es';
import { Euler, Mesh, MeshBasicMaterial, PerspectiveCamera, PointLight, Scene, Vector2, Vector3, WebGLRenderer } from 'three';
import { ABILITY_COLOR, ABILITY_FONT, ABILITY_SIZE, CONTROLLED_HEALTH_HEIGHT, CONTROLLED_HEALTH_WIDTH, CONTROLLED_RADIUS, CROSSHAIR_COLOR, CROSSHAIR_INNER_RADIUS, CROSSHAIR_LINE_WIDTH, CROSSHAIR_OUTER_RADIUS, ENEMY_HEALTH, FONT, GAME_LENGTH, GAP, GRAVITY, HEALTH_FONT, HITMARKER_DURATION, HITMARKER_INNER_RADIUS, HITMARKER_OUTER_RADIUS, KILLS_FONT, KILL_ARROW_LINE_WIDTH, KILL_ARROW_WIDTH, KILL_DURATION, KILL_RADIUS, OWN_HEALTH, REMAINING_ABILITY_COLOR, REASPAWN_FONT, RESPAWN_TIME, SKY_COLOR, TEAMMATE_FONT, TEAMMATE_HEALTH_HEIGHT, TEAMMATE_RADIUS, TEXT_COLOR, TIME_FONT, TIME_STEP, CROSSHAIR_KILL_COLOR, CROSSHAIR_KILL_DURATION, HITMARKER_COLOR, HITMARKER_LINE_WIDTH, RAY_FADE_SPEED, SWITCH_TIME } from '../util/constants';
import heroes from '../util/heroes';
import { Collision, keymap, renderHealth } from '../util';
import { formatSeconds, request } from '../../util';
import { generateMap } from '../util/map';
import { Config, defaultConfig } from '../../../util';
import Player from './Player';
import Projectile from './Projectile';
import Target from './Target';

export default class {
    world = new World({ gravity: new Vec3(0, -GRAVITY, 0) });
    scene = new Scene();
    spriteScene = new Scene();
    targets = [0, 1].map(i => [0, 1, 2].map(j => new Target(this, i, j)));
    players: Player[][];
    projectiles: Projectile[] = [];
    rays: Mesh<any, MeshBasicMaterial>[] = [];
    kills: number[][] = [];
    controlledKills: Record<string, number> = {};
    updateListeners: (() => any)[] = [];
    renderListeners: (() => any)[] = [];
    controlledPlayerIndex = 0;
    lastHitmarker = 0;
    lastKill = 0;
    private camera: PerspectiveCamera;
    private renderer = new WebGLRenderer();
    private light = new PointLight('#ffffff', 1);
    private ctx: CanvasRenderingContext2D; 
    private lastRender = Date.now();
    private lastControlledIndex = 0;
    private mouseDown = false;
    private keysDown: Record<string, boolean> = {};
    private startDate = Date.now();
    private ended = false;
    private pausedAt: number | false = Date.now();
    private started = false;
    private pausedSum = 0;
    private switchedAt = 0;
    constructor(private config: Config) {
        const canvas = <HTMLCanvasElement>document.getElementById('canvas');
        const settings = <HTMLButtonElement>document.getElementById('settings');
        const menu = <HTMLDivElement>document.getElementById('menu');
        const reset = <HTMLButtonElement>document.getElementById('reset');
        const inputs = [...menu.querySelectorAll('[data-key]')].map(x => <[HTMLInputElement, keyof Config, number]>[x, x.getAttribute('data-key'), +x.getAttribute('data-scale')! || 1]);
        this.ctx = canvas.getContext('2d')!;
        this.players = [0, 1].map(i => heroes.map((x, j) => new Player(this, x, i, j)));
        this.camera = new PerspectiveCamera(config.fov, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.rotation.y = Math.PI;
        this.scene.add(this.light);
        this.renderer.setClearColor(SKY_COLOR);
        this.renderer.autoClear = false;
        generateMap(this);

        const updateInputs = () => inputs.forEach(x => {
            x[0].value = this.config[x[1]] / x[2] + '';
            (<() => any>x[0].oninput)();
        });
        inputs.forEach(x => x[0].oninput = () => {
            this.config[x[1]] = +x[0].value * x[2];
            (<HTMLTableCellElement>x[0].parentElement!.nextSibling!.nextSibling).innerText = x[0].value;
        });
        updateInputs();
        settings.addEventListener('click', () => menu.style.display = '');
        menu.addEventListener('click', e => {
            if ((e.target as HTMLElement).className !== 'popupContainer') return;
            menu.style.display = 'none';
            request('/auth/config', this.config);
        });
        reset.addEventListener('click', () => {
            this.config = { ...defaultConfig };
            updateInputs();
        });

        (window.onresize = () => {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        })();
        document.body.appendChild(this.renderer.domElement);
        canvas.addEventListener('click', () => {
            if (this.pausedAt) canvas.requestPointerLock();
        });
        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement) {
                this.lastRender = this.time;
                this.pausedSum += Date.now() - +this.pausedAt;
                this.pausedAt = false;
                this.started = true;
            } else this.pausedAt = Date.now();
        });
        document.body.addEventListener('keydown', k => {
            if (this.started && this.pausedAt) return;
            if (!this.controlledPlayer.died && this.started && k.code === 'KeyE') this.controlledPlayer.useAbility();
            if (k.code in keymap) this.keysDown[keymap[k.code]] = true;
            const num = +k.code.match(/^Digit(\d)$/)?.[1]! - 1;
            if (!isNaN(num) && num !== this.controlledPlayerIndex && this.players[0][num] && !this.players[0][num].died) {
                this.switchedAt = this.started ? this.time : 0;
                this.lastControlledIndex = this.controlledPlayerIndex;
                this.controlledPlayerIndex = num;
                this.setControlledDirection();
            }
        });
        document.body.addEventListener('keyup', k => {
            if (k.code in keymap) this.keysDown[keymap[k.code]] = false;
        });
        canvas.addEventListener('mousedown', e => {
            if (!this.pausedAt && !e.button) this.mouseDown = true;
        });
        canvas.addEventListener('mouseup', e => {
            if (!this.pausedAt && !e.button) this.mouseDown = false;
        });
        canvas.addEventListener('mousemove', e => {
            if (this.pausedAt) return;
            const euler = new Euler(0, 0, 0, 'YXZ');
            euler.setFromQuaternion(this.camera.quaternion);
            euler.y -= e.movementX * this.config.sensitivity;
            euler.x = Math.max(-Math.PI / 2, Math.min(euler.x - e.movementY * this.config.sensitivity, Math.PI / 2));
            this.camera.quaternion.setFromEuler(euler);
            this.setControlledDirection();
        });

        requestAnimationFrame(() => this.update());
    }

    get controlledPlayer() {
        return this.players[0][this.controlledPlayerIndex];
    }

    get time() {
        return Date.now() - this.pausedSum - (this.pausedAt ? Date.now() - this.pausedAt : 0);
    }

    get switchProgress() {
        return (this.time - this.switchedAt) / SWITCH_TIME;
    }

    setControlledDirection() {
        this.controlledPlayer.direction = this.camera.getWorldDirection(new Vector3());
    }

    getProjectile(e: Collision) {
        const p = this.projectiles.find(x => x.body === e.body && !x.collided);
        if (p) {
            p.collided = true;
            return p;
        }
    }

    end() {
        this.ended = true;
        request<{ id: number; }>('/postMatch', {
            won: !this.targets.map((x, i) => [x.reduce((a, b) => a + b.health, 0), i]).sort((a, b) => b[0] - a[0])[0][1],
            duration: (this.time - this.startDate) / 1000,
            kills: this.controlledKills,
            endDate: Date.now(),
        }, x => window.location.pathname = `/user/${JSON.parse(localStorage.getItem('auth')!)[0]}/${x.id}`);
    }

    update() {
        const remaining = Math.ceil(GAME_LENGTH * 60 - (this.time - this.startDate) / 1000);
        if (this.ended) return;
        if (this.camera.fov !== this.config.fov) {
            this.camera.fov = this.config.fov;
            this.camera.updateProjectionMatrix();
        }
        if (!this.pausedAt) {
            if (remaining < 0) this.end();
            const dt = this.time - this.lastRender;
            this.lastRender = this.time;
            if (!this.controlledPlayer.died) {
                const movementDir = new Vector2(this.keysDown.up ? -1 : this.keysDown.down ? 1 : 0, this.keysDown.right ? 1 : this.keysDown.left ? -1 : 0);
                const angle = Math.atan2(movementDir.x, movementDir.y) + Math.atan2(this.controlledPlayer.direction.z, this.controlledPlayer.direction.x) + Math.PI / 2;
                if (movementDir.length()) this.controlledPlayer.move(Math.cos(angle), Math.sin(angle), dt);
                if (this.mouseDown) this.controlledPlayer.shoot();
                if (this.keysDown.space) this.controlledPlayer.jump();
            }
            this.players.forEach(x => x.forEach(x => x.update(dt)));
            this.projectiles.forEach(x => x.update());
            this.rays.forEach(r => r.material.opacity -= RAY_FADE_SPEED * dt);
            this.projectiles = this.projectiles.filter(p => !p.toRemove);
            this.rays = this.rays.filter(r => r.material.opacity >= 0 || !this.scene.remove(r));
            this.updateListeners.forEach(f => f());
            this.world.step(TIME_STEP, dt / 1000);
        }
        this.players.forEach(x => x.forEach(x => x.render()));
        this.projectiles.forEach(p => p.render());
        this.renderListeners.forEach(f => f());
        this.renderer.clear();
        this.renderer.render(this.scene, this.camera);
        this.renderer.clearDepth();
        this.renderer.render(this.spriteScene, this.camera);

        this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        this.ctx.fillStyle = TEXT_COLOR;
        this.ctx.textBaseline = 'top';
        this.ctx.font = TIME_FONT + FONT;
        const time = this.pausedAt ? this.started ? 'Paused - click to continue' : 'Click anywhere to start' : formatSeconds(remaining);
        this.ctx.font = KILLS_FONT + FONT;
        this.ctx.fillText(time, (window.innerWidth - this.ctx.measureText(time).width) / 2, GAP);
        const controlledKills = Object.values(this.controlledKills).reduce((a, b) => a + b, 0);
        const kills = `${controlledKills} kill${controlledKills === 1 ? '' : 's'}`;
        this.ctx.fillText(kills, window.innerWidth - this.ctx.measureText(kills).width - GAP, GAP);
        this.players[0].filter((_, i) => this.controlledPlayer.died || i !== this.controlledPlayerIndex).forEach((p, i) => {
            const x = window.innerWidth / 2 + (i + 1 - heroes.length / 2) * (TEAMMATE_RADIUS * 2 + GAP);
            this.ctx.beginPath();
            this.ctx.fillStyle = p.hero.color;
            this.ctx.arc(x, TEAMMATE_RADIUS + GAP * 2 + TIME_FONT, TEAMMATE_RADIUS, 0, Math.PI * 2);
            this.ctx.fill();
            if (p.died) {
                const diff = RESPAWN_TIME - (this.time - p.died) / 1000;
                const n = diff / RESPAWN_TIME * TEAMMATE_RADIUS * 2;
                this.ctx.save();
                this.ctx.beginPath();
                this.ctx.rect(x - TEAMMATE_RADIUS, GAP * 2 + TIME_FONT, TEAMMATE_RADIUS * 2, n);
                this.ctx.clip();
                this.ctx.clearRect(x - TEAMMATE_RADIUS, GAP * 2 + TIME_FONT, TEAMMATE_RADIUS * 2, n);
                this.ctx.restore();
                this.ctx.beginPath();
                this.ctx.fillStyle = TEXT_COLOR;
                this.ctx.textBaseline = 'middle';
                this.ctx.font = REASPAWN_FONT + FONT;
                const txt = Math.ceil(diff) + '';
                this.ctx.fillText(txt, x - this.ctx.measureText(txt).width / 2, TEAMMATE_RADIUS + GAP * 2 + TIME_FONT);
            } else {
                renderHealth(this.ctx, p.health, p.hero.health, 0, TEAMMATE_RADIUS * 2, TEAMMATE_HEALTH_HEIGHT, x - TEAMMATE_RADIUS, (TEAMMATE_RADIUS + GAP) * 2 + GAP + TIME_FONT);
                this.ctx.fillStyle = TEXT_COLOR;
                this.ctx.font = TEAMMATE_FONT + FONT;
                this.ctx.textBaseline = 'top';
                const txt = p.index + 1 + '';
                this.ctx.fillText(txt, x - this.ctx.measureText(txt).width / 2, (TEAMMATE_RADIUS + GAP) * 2 + GAP * 2 + TIME_FONT + TEAMMATE_HEALTH_HEIGHT);
            }
        });
        this.kills = this.kills.filter(x => this.time - x[3] < KILL_DURATION * 1000);
        this.kills.forEach((x, i) => {
            const y = GAP + KILLS_FONT + (i + 1) * (KILL_RADIUS + GAP) + i * KILL_RADIUS;
            this.ctx.beginPath();
            this.ctx.fillStyle = this.players[x[2]][x[0]].hero.color;
            this.ctx.arc(window.innerWidth - KILL_RADIUS - GAP, y, KILL_RADIUS, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.fillStyle = this.players[1 - x[2]][x[1]].hero.color;
            this.ctx.arc(window.innerWidth - (KILL_RADIUS + GAP) * 3 - KILL_ARROW_WIDTH - KILL_ARROW_LINE_WIDTH + 1, y, KILL_RADIUS, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.lineWidth = KILL_ARROW_LINE_WIDTH;
            this.ctx.strokeStyle = x[2] ? OWN_HEALTH : ENEMY_HEALTH;
            this.ctx.moveTo(window.innerWidth - (KILL_RADIUS + GAP) * 2 - KILL_ARROW_WIDTH - KILL_ARROW_LINE_WIDTH / 2, y - KILL_RADIUS);
            this.ctx.lineTo(window.innerWidth - (KILL_RADIUS + GAP) * 2 - KILL_ARROW_LINE_WIDTH / 2, y);
            this.ctx.lineTo(window.innerWidth - (KILL_RADIUS + GAP) * 2 - KILL_ARROW_WIDTH - KILL_ARROW_LINE_WIDTH / 2, y + KILL_RADIUS);
            this.ctx.stroke();
        });

        requestAnimationFrame(() => this.update());
        this.camera.position.copy(this.switchProgress < 1
            ? this.players[0][this.lastControlledIndex].cameraPosition
                .multiplyScalar(1 - this.switchProgress)
                .add(this.controlledPlayer.cameraPosition.multiplyScalar(this.switchProgress))
            : this.controlledPlayer.cameraPosition);
        this.light.position.copy(this.camera.position);

        if (this.controlledPlayer.died) return;
        const killT = Math.max(0, 1 - (this.time - this.lastKill) / CROSSHAIR_KILL_DURATION);
        this.ctx.strokeStyle = `rgb(${CROSSHAIR_COLOR.map((x, i) => ((CROSSHAIR_KILL_COLOR[i] - x) * killT + x)).join(',')})`;
        this.ctx.lineWidth = CROSSHAIR_LINE_WIDTH;
        [CROSSHAIR_INNER_RADIUS, CROSSHAIR_OUTER_RADIUS].forEach(r => {
            this.ctx.beginPath();
            this.ctx.arc(window.innerWidth / 2, window.innerHeight / 2, r, 0, Math.PI * 2);
            this.ctx.stroke();
        });
        this.ctx.globalAlpha = Math.max(0, 1 - (this.time - this.lastHitmarker) / HITMARKER_DURATION);
        this.ctx.strokeStyle = HITMARKER_COLOR;
        this.ctx.lineWidth = HITMARKER_LINE_WIDTH;
        [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(c => {
            this.ctx.beginPath();
            this.ctx.moveTo(window.innerWidth / 2 + HITMARKER_OUTER_RADIUS / Math.sqrt(2) * c[0], window.innerHeight / 2 + HITMARKER_OUTER_RADIUS / Math.sqrt(2) * c[1]);
            this.ctx.lineTo(window.innerWidth / 2 + HITMARKER_INNER_RADIUS / Math.sqrt(2) * c[0], window.innerHeight / 2 + HITMARKER_INNER_RADIUS / Math.sqrt(2) * c[1]);
            this.ctx.stroke();
        });
        this.ctx.globalAlpha = 1;
        this.ctx.beginPath();
        this.ctx.fillStyle = this.controlledPlayer.hero.color;
        this.ctx.arc(window.innerWidth - CONTROLLED_RADIUS - GAP, window.innerHeight - CONTROLLED_RADIUS - GAP, CONTROLLED_RADIUS, 0, Math.PI * 2);
        this.ctx.fill();
        renderHealth(this.ctx, this.controlledPlayer.health, this.controlledPlayer.hero.health, 0, CONTROLLED_HEALTH_WIDTH, CONTROLLED_HEALTH_HEIGHT, window.innerWidth - (CONTROLLED_RADIUS + GAP) * 2 - CONTROLLED_HEALTH_WIDTH, window.innerHeight - CONTROLLED_RADIUS - GAP - CONTROLLED_HEALTH_HEIGHT / 2);
        this.ctx.fillStyle = TEXT_COLOR;
        this.ctx.textBaseline = 'alphabetic';
        this.ctx.font = HEALTH_FONT + FONT;
        const health = `${this.controlledPlayer.health}/${this.controlledPlayer.hero.health}`;
        this.ctx.fillText(health, window.innerWidth - (CONTROLLED_RADIUS + GAP) * 2 - (this.ctx.measureText(health).width + CONTROLLED_HEALTH_WIDTH) / 2, window.innerHeight - CONTROLLED_RADIUS - GAP * 2 - CONTROLLED_HEALTH_HEIGHT / 2);
        if (this.controlledPlayer.hero.ability) {
            this.ctx.fillStyle = REMAINING_ABILITY_COLOR;
            this.ctx.fillRect(window.innerWidth - (CONTROLLED_RADIUS + GAP) * 2 - GAP - CONTROLLED_HEALTH_WIDTH - ABILITY_SIZE, window.innerHeight - CONTROLLED_RADIUS - GAP - ABILITY_SIZE / 2, ABILITY_SIZE, ABILITY_SIZE);
            this.ctx.fillStyle = ABILITY_COLOR;
            const diff = Math.max(0, this.controlledPlayer.hero.ability.cooldown - (this.time - this.controlledPlayer.lastAbilityUsage) / 1000);
            const n = diff / this.controlledPlayer.hero.ability.cooldown * ABILITY_SIZE;
            this.ctx.fillRect(window.innerWidth - (CONTROLLED_RADIUS + GAP) * 2 - GAP - CONTROLLED_HEALTH_WIDTH - ABILITY_SIZE, window.innerHeight - CONTROLLED_RADIUS - GAP - ABILITY_SIZE / 2 + n, ABILITY_SIZE, ABILITY_SIZE - n);
            if (diff) {
                this.ctx.fillStyle = TEXT_COLOR;
                this.ctx.font = ABILITY_FONT + FONT;
                this.ctx.textBaseline = 'middle';
                const txt = Math.ceil(diff) + '';
                this.ctx.fillText(txt, window.innerWidth - (CONTROLLED_RADIUS + GAP) * 2 - GAP - CONTROLLED_HEALTH_WIDTH - this.ctx.measureText(txt).width / 2 - ABILITY_SIZE / 2, window.innerHeight - CONTROLLED_RADIUS - GAP + ABILITY_FONT / 16);
            }
        }
    }
}