export function overload() {
    return ((target: Function, key: string, value: any) => {
    }) as any;
}