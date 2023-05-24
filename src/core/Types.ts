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

    magnitude() {
        let { x, y, z } = this;
        return Math.sqrt(x * x + y * y + z * z);
    }

    distance(v: Vector3) {
        let s = this.subtract(v);
        return s.magnitude();
    }

    dot(v: Vector3) {
        return (this.x * v.x + this.y * v.y + this.z * v.z);
    }

    cross(v: Vector3) {
        let { x, y, z } = this;
        return new Vector3(
            (y * v.z) - (z * v.y),
            (z * v.x) - (x * v.z),
            (x * v.y) - (y * v.x)
        );
    }

    add(v: Vector3) {
        return new Vector3(
            this.x + v.x,
            this.y + v.y,
            this.z + v.z
        );
    }

    subtract(v: Vector3) {
        return new Vector3(
            this.x - v.x,
            this.y - v.y,
            this.z - v.z
        );
    }

    multiply(v: Vector3) {
        return new Vector3(
            this.x * v.x,
            this.y * v.y,
            this.z * v.z
        );
    }

    divide(v: Vector3) {
        return new Vector3(
            this.x / v.x,
            this.y / v.y,
            this.z / v.z
        );
    }

    lerp(v: Vector3, a: number) {
        return new Vector3(
            numLerp(this.x, v.x, a),
            numLerp(this.y, v.y, a),
            numLerp(this.z, v.z, a)
        );
    }
}

function numLerp(v0: number, v1: number, t: number) {
    return (1 - t) * v0 + t * v1;
}

export class Matrix3 {
    m = [
        1, 0, 0,
        0, 1, 0,
        0, 0, 1
    ];

    set(arr: number[]) {
        if (arr.length != 9)
            throw new Error("Invalid matrix array");

        this.m = arr;
    }

    setIdentity() {
        this.m = [
            1, 0, 0,
            0, 1, 0,
            0, 0, 1
        ];
    }

    getValue(row: number, column: number) {
        if (row >= 3 || column >= 3)
            throw new Error("Invalid row or column index");

        return this.m[row * 3 + column];
    }

    getRotationX() {
        return Math.atan2(this.m[7], this.m[8]);
    }

    getRotationY() {
        var m = this.m;
        return Math.atan2(-m[6], Math.sqrt(m[7] * m[7] + m[8] * m[8]));
    }

    getRotationZ() {
        return Math.atan2(this.m[3], this.m[0]);
    }

    // TODO
}