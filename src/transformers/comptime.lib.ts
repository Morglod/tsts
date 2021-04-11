import type * as ts from 'typescript';

export function __compilerEval<T>(x: string) {
    return {} as any;
}

export function comptime<T>(func: () => T): T {
    return func();
}

export type CompilerAPI = {
    replaceWithCode(code: string): void;
    replaceWithNode(astNode: ts.Node): void;
    compileCode(code: string): string;
    extractComptimeCode_funcBody(astFuncBodyNode: ts.Node): string|undefined;
    printCode(astNode: ts.Node): string;
    parseCodePickExpression(code: string): ts.Node;
    unescapeText(text: string): string;
    // getTypeOf(symb: any): any;
    getTypeOfGeneric<T=any>(genericTypeInd: number): ts.Type | undefined;
    getTypeChecker(): ts.TypeChecker;
    getTransformContext(): ts.TransformationContext;
    visitEachChild<NodeT extends ts.Node>(astNode: NodeT, visitor: ts.Visitor): NodeT;
    getTs(): typeof ts;
    getCurrentNode(): ts.CallExpression;
    
    addListener(eventName: string, handler: any): any;
    removeListener(eventName: string, handler: any): any;
    emitEvent(eventName: string, ...args: any): any;

    globalStore(name: string): any;
};

export function __compilerJob<A1=any,A2=any,A3=any,A4=any,A5=any>(func: ($compiler: CompilerAPI) => void) {
    return undefined!;
}
