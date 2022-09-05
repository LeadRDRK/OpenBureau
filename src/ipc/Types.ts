export type IpcHandlers = {[key: string]: (...args: any[]) => IpcData | void};
export interface IpcData {
    type: string;
    args: any[];
    tag?: any;
}
export function isIpcData(object: any): object is IpcData {
    return (typeof object == "object" && typeof object.type == "string" && Array.isArray(object.args));
}