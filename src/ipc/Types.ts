export type IPCHandlers = {[key: string]: (...args: any[]) => IPCData | void};
export interface IPCData {
    type: string;
    args: any[];
    tag?: any;
}
export function isIPCData(object: any): object is IPCData {
    return (typeof object == "object" && typeof object.type == "string" && Array.isArray(object.args));
}