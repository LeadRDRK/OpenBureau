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

    distance(v: Vector3) {
        let s = this.subtract(v);
        return Math.sqrt(s.x * s.x + s.y * s.y + s.z * s.z);
    }

    subtract(v: Vector3) {
        return new Vector3(
            this.x - v.x,
            this.y - v.y,
            this.z - v.z
        );
    }

    // TODO
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