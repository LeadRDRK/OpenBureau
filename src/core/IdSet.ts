export class IdSet extends Set<number> {
    last: number = -1;
    add() {
        ++this.last;
        return super.add(this.last);
    }

    delete(value: number) {
        if (value == this.last) {
            while (--this.last != -1) {
                if (this.has(this.last))
                    break;
            }
        }
        return super.delete(value);
    }
}