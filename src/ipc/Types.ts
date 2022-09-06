export type IpcHandlers = {[key: string]: (state: any, content: any) => IpcData | void};
export interface IpcData {
    type: string;
    content?: any;
    tag?: any;
}
export function isIpcData(object: any): object is IpcData {
    return (typeof object == "object" && typeof object.type == "string");
}