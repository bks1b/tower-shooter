import { Body, Box, ConvexPolyhedron, Vec3 } from 'cannon-es';
import { BoxGeometry, ExtrudeGeometry, Mesh, MeshLambertMaterial, Shape, Vector3 } from 'three';
import Game from '../classes/Game';
import { BRIDGE_COLOR, BRIDGE_GAP, BRIDGE_HEIGHT, GROUND_COLOR, GROUND_PADDING, MAIN_TOWER_BASE_DEPTH, MAIN_TOWER_GAP, MAIN_TOWER_HEIGHT, MAIN_TOWER_WIDTH, MAP_DEPTH, RAMP_COLOR, RAMP_WIDTH, TARGET_THICKNESS, THICKNESS, TOWER_COLOR, TOWER_DEPTH, TOWER_GAP, TOWER_HALF_WALL_WIDTH, TOWER_HEIGHT, TOWER_WIDTH } from './constants';
import { objectCollision } from '.';

export const groundWidth = TOWER_GAP + (TOWER_WIDTH + RAMP_WIDTH + GROUND_PADDING) * 2;
export const bridgeX = (TOWER_GAP + TOWER_WIDTH - TOWER_HALF_WALL_WIDTH) / 2;
export const towerCenterZ = (BRIDGE_HEIGHT + TOWER_HEIGHT) / 2 + BRIDGE_GAP;
export const spawnZ = (BRIDGE_HEIGHT + MAIN_TOWER_GAP) / 2 + BRIDGE_GAP + TOWER_HEIGHT;
export const mainRampX = (MAIN_TOWER_WIDTH + RAMP_WIDTH) / 2;

export const generateMap = (game: Game) => {
    const addBox = (size: Triple, color: string, pos: Triple, rot?: Triple) => {
        const mesh = new Mesh(new BoxGeometry(...size), new MeshLambertMaterial({ color }));
        mesh.position.set(...pos);
        if (rot) mesh.rotation.set(...rot);
        mesh.userData.object = true;
        game.scene.add(mesh);
        const body = new Body({
            type: Body.STATIC,
            shape: new Box(new Vec3(...size.map(x => x / 2))),
            ...objectCollision,
            collisionResponse: true,
        });
        body.position.set(...pos);
        if (rot) body.quaternion.setFromEuler(...rot);
        game.world.addBody(body);
    };
    const addRamp = (height: number, depth: number, x: number, y: number, z: number, cRot = 1) => {
        const shape = new Shape();
        shape.moveTo(0, 0);
        shape.lineTo(height, 0);
        shape.lineTo(height, depth);
        shape.lineTo(height - RAMP_WIDTH, depth);
        shape.lineTo(0, 0);
        const mesh = new Mesh(new ExtrudeGeometry(shape, { steps: 1, depth: RAMP_WIDTH, bevelEnabled: false }), new MeshLambertMaterial({ color: RAMP_COLOR }));
        mesh.position.set(x, y, z);
        mesh.rotation.set(0, -Math.PI / 2 * cRot, 0);
        mesh.userData.object = true;
        game.scene.add(mesh);
        const len = mesh.geometry.attributes.position.array.length / 3;
        const body = new Body({
            type: Body.STATIC,
            shape: new ConvexPolyhedron({
                vertices: Array.from({ length: len }, (_, i) => {
                    const vec = new Vector3().fromBufferAttribute(mesh.geometry.attributes.position, i);
                    return new Vec3(vec.x, vec.y, vec.z);
                }),
                faces: Array.from({ length: len / 3 }, (_, i) => [3 * i, 3 * i + 1, 3 * i + 2]),
            }),
            ...objectCollision,
        });
        body.position.set(x, y, z);
        body.quaternion.setFromEuler(0, -Math.PI / 2 * cRot, 0);
        game.world.addBody(body);
    };
    const addMainTower = (z: number, cZ = 1) => {
        addBox([MAIN_TOWER_WIDTH, MAIN_TOWER_BASE_DEPTH, MAIN_TOWER_HEIGHT], TOWER_COLOR, [0, MAIN_TOWER_BASE_DEPTH / 2, (z + MAIN_TOWER_HEIGHT / 2) * cZ]);
        addBox([MAIN_TOWER_WIDTH, TOWER_DEPTH, THICKNESS], TOWER_COLOR, [0, TOWER_DEPTH * 3 / 2, (z + THICKNESS / 2) * cZ]);
        addBox([MAIN_TOWER_WIDTH, THICKNESS, MAIN_TOWER_HEIGHT - RAMP_WIDTH], TOWER_COLOR, [0, TOWER_DEPTH * 2 - THICKNESS / 2, (z + (MAIN_TOWER_HEIGHT - RAMP_WIDTH) / 2) * cZ]);
        game.targets[(cZ + 1) / 2][0].setPosition(0, TOWER_DEPTH * 3 / 2, (z + THICKNESS + TARGET_THICKNESS / 2) * cZ);
        [1, -1].forEach(cX => {
            addBox([THICKNESS, TOWER_DEPTH, MAIN_TOWER_HEIGHT - RAMP_WIDTH], TOWER_COLOR, [(MAIN_TOWER_WIDTH - THICKNESS) / 2 * cX, TOWER_DEPTH * 3 / 2, (z + (MAIN_TOWER_HEIGHT - RAMP_WIDTH) / 2) * cZ]);
            addRamp(MAIN_TOWER_HEIGHT, MAIN_TOWER_BASE_DEPTH, MAIN_TOWER_WIDTH / 2 * cX + RAMP_WIDTH / 2 * (cX ** 2 + cX + cZ - 1), 0, z * cZ, cZ);
        });
    };
    const addTower = (x: number, z: number, cX = 1, cZ = 1) => {
        addBox([TOWER_WIDTH, THICKNESS, TOWER_HEIGHT], TOWER_COLOR, [x * cX, TOWER_DEPTH - THICKNESS / 2, z * cZ]);
        addBox([THICKNESS, TOWER_DEPTH, TOWER_HEIGHT], TOWER_COLOR, [(x + (THICKNESS - TOWER_WIDTH) / 2) * cX, TOWER_DEPTH / 2, z * cZ]);
        addBox([TOWER_HALF_WALL_WIDTH, TOWER_DEPTH, THICKNESS], TOWER_COLOR, [(x + (TOWER_WIDTH - TOWER_HALF_WALL_WIDTH) / 2) * cX, TOWER_DEPTH / 2, (z + (THICKNESS - TOWER_HEIGHT) / 2) * cZ]);
        addRamp(TOWER_HEIGHT, TOWER_DEPTH, (x + TOWER_WIDTH / 2) * cX + RAMP_WIDTH / 2 * (cX ** 2 + cX + cZ - 1), 0, (z - TOWER_HEIGHT / 2) * cZ, cZ);
        game.targets[(cZ + 1) / 2][(cX + 1) / 2 + 1].setPosition((x + (TOWER_WIDTH - TOWER_HALF_WALL_WIDTH) / 2) * cX, TOWER_DEPTH / 2, (z + THICKNESS + (TARGET_THICKNESS - TOWER_HEIGHT) / 2) * cZ);
    };

    const groundHeight = BRIDGE_GAP + TOWER_HEIGHT + MAIN_TOWER_GAP + MAIN_TOWER_HEIGHT + GROUND_PADDING;
    [1, -1].forEach(cZ => {
        addMainTower(BRIDGE_HEIGHT / 2 + BRIDGE_GAP + TOWER_HEIGHT + MAIN_TOWER_GAP, cZ);
        addBox([RAMP_WIDTH, THICKNESS, BRIDGE_HEIGHT], BRIDGE_COLOR, [bridgeX * cZ, -THICKNESS / 2, 0]);
        addBox([TOWER_GAP, THICKNESS, RAMP_WIDTH], BRIDGE_COLOR, [0, TOWER_DEPTH - THICKNESS / 2, cZ * (BRIDGE_HEIGHT / 2 + BRIDGE_GAP + TOWER_HEIGHT - RAMP_WIDTH / 2)]);
        addBox([groundWidth, MAP_DEPTH, groundHeight], GROUND_COLOR, [0, -MAP_DEPTH / 2, (groundHeight + BRIDGE_HEIGHT) / 2 * cZ]);
        [1, -1].forEach(cX => addTower((TOWER_GAP + TOWER_WIDTH) / 2, (BRIDGE_HEIGHT + TOWER_HEIGHT) / 2 + BRIDGE_GAP, cX, cZ));
    });
};

type Triple = [number, number, number];