export class Vector3 {
    x = 0;
    y = 0;
    z = 0;

    constructor();
    constructor(x: number, y: number, z: number);
    constructor(x?: number, y?: number, z?: number) {
        if (x && y && z) {
            this.set(x, y, z);
        }
    }

    set(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    // TODO
}