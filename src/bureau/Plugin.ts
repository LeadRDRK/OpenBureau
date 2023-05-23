import { State } from ".";

export interface Plugin {
    init: (state: State) => boolean;
    uninit: () => void;
}