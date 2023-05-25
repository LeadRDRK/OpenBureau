import { State } from ".";

export interface Plugin {
    init: (state: State) => boolean | Promise<boolean>;
    uninit: () => void;
}