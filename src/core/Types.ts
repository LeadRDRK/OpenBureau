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

export class Matrix3x4 {
    m = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0
    ];

    set(arr: number[]) {
        if (arr.length != 12)
            throw new Error("Invalid matrix array");

        this.m = arr;
    }

    setIdentity() {
        this.m = [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0
        ];
    }

    getValue(row: number, column: number) {
        if (row >= 3 || column >= 4)
            throw new Error("Invalid row or column index");

        return this.m[row * 4 + column];
    }

    // TODO
}