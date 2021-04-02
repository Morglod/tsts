import * as ts from 'typescript';
import * as http from 'http';

// function request(url: string): Promise<http.IncomingMessage> {
//     return new Promise(resolve => {
//         http.request(url, res => {
//             resolve(res);
//         });
//     });
// }

// function syncAsync<T>(job: () => Promise<T>): T {
//     let done = false;
//     let value;

//     job().then(x => {
//         console.log('done');
//         value = x;
//         done = true;
//     });

//     while (!done) {
//         console.log('step');
//         atomicSleep(100);
//     }

//     return value;
// }

// console.log(
//     'HELLO',

//     syncAsync(() => {
//         return new Promise(reso => {
//             setTimeout(() => {
//                 reso(100)
//             }, 250);
//         })
//     })
// );

export function unescapeText(name: string) {
    // getText() == `'ts-transformer-overload'`
    return name.trim().replace(/(^('|"|`))|(('|"|`)$)/g, '');
}

export function importDecl_getModuleSpecifierName(node: ts.ImportDeclaration) {
    // getText() == `'ts-transformer-overload'`
    return unescapeText(node.moduleSpecifier.getText());
}

export function isImportSpecifier(node: ts.Node, name: string): node is ts.ImportSpecifier {
    if (ts.isImportSpecifier(node)) {

    }
    return false;
}

function unsafeIsNode(x: any): x is ts.Node {
    if (typeof x !== 'object') return false;
    return (x.pos !== undefined && x.end !== undefined)
}

function deepSynthesized(node: any) {
    if (node.pos !== undefined) {
        node.pos = -1;
        node.end = -1;
        node.parent = undefined;
    }
    if (node.flags !== undefined) {
        node.flags = ts.NodeFlags.Synthesized;
    }
    for (const k in node) {
        if (k === 'parent') continue;
        if (unsafeIsNode(node[k])) deepSynthesized(node[k]);
    }
}

// https://github.com/madou/typescript-transformer-handbook
// https://github.com/Microsoft/TypeScript/blob/master/src/services/findAllReferences.ts

function parseCode(code: string) {
    const source = ts.createSourceFile('_generated_' + Date.now() + '.ts', code, ts.ScriptTarget.ES2020, false, ts.ScriptKind.TS);
    deepSynthesized(source);
    return source;
}

function parseCodePickExpression(code: string) {
    const source = parseCode(code);
    return (source.statements[0] as any).expression;
}

/** attention! it will return function call expression, so you need to place it right */
function parseFuncBodyAndGenerateInvoke(codeBody: string, ) {
    const code = `(() => { ${codeBody} })()`;
    return parseCodePickExpression(code);
}

function printCode(node: ts.Node, source: ts.SourceFile): string {
    const printer = ts.createPrinter();
    return printer.printNode(ts.EmitHint.Unspecified, node, source);
}

const formatHost = {
    getCanonicalFileName: path => path,
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    getNewLine: () => ts.sys.newLine,
};

function extractComptimeCode(checker: ts.TypeChecker, ctx: ts.TransformationContext, node: ts.Node) {
    const identifiersToCode: Map<ts.Node, string> = new Map;

    if (ts.isVariableDeclaration(node)) {
        node = node.initializer;
    }

    function visitor(node: ts.Node): ts.VisitResult<ts.Node> {
        if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
            const sign = checker.getResolvedSignature(node);
            const decl = sign.getDeclaration();

            if (!ts.isParameter(decl.parent)) {
                const code = extractComptimeCode(checker, ctx, decl);
                // console.log('isCallExpression with id', node.getFullText(), decl.getFullText());
                if (code) identifiersToCode.set(node.expression, `(${code})`);
            }
        }
        if (
            ts.isIdentifier(node) &&
            ts.isPropertyAccessExpression(node.parent) &&
            node.parent.expression === node
        ) {
            const symb = checker.getSymbolAtLocation(node);
            const expr = symb.getDeclarations()[0];
            // console.log('isPropertyAccessExpression with id', node.parent.getFullText());
            const code = extractComptimeCode(checker, ctx, expr);
            if (code) identifiersToCode.set(node, code);
        }
        return ts.visitEachChild(node, visitor, ctx);
    }
    ts.visitEachChild(node, visitor, ctx);

    const printer = ts.createPrinter({}, {
        substituteNode(hint, node) {
            if (identifiersToCode.has(node)) {
                const code = identifiersToCode.get(node);
                return parseCodePickExpression(code);
            }
            return node;
        }
    });

    if (!node) return undefined;
    return printer.printNode(ts.EmitHint.Unspecified, node, node.getSourceFile());
}

// use atomic waiter with separate thread to run async functions in sync transformer

export default function(checker: ts.TypeChecker, pluginOptions: {}) {
    return (ctx: ts.TransformationContext) => {
        return (sourceFile: ts.SourceFile) => {
            function visitor(node: ts.Node): ts.VisitResult<ts.Node> {
                if (ts.isImportDeclaration(node)) {
                    const moduleName = importDecl_getModuleSpecifierName(node);
                    if (moduleName === 'ts-transformer-overload') {
                        // !!!!!!!
                        // checker.getTypeOfSymbolAtLocation();
                        // https://stackoverflow.com/questions/49139601/how-to-bind-an-identifier-with-an-existing-symbol-on-a-compiler-transformer-in-t


                        // console.log([node.moduleSpecifier.getText()]);
                        // import from ts-transformer-overload/lib
                    }
                }
                if (ts.isDecorator(node)) {
                    const { expression } = node;
                    // console.log(node);
                }
                if (ts.isCallExpression(node) && unescapeText(node.expression.getText()) === 'comptime') {
                    const arg0 = node.arguments[0];
                    if (ts.isArrowFunction(arg0)) {
                        const generatedFuncBody = extractComptimeCode(checker, ctx, arg0.body);
                        const generatedFuncCode = `(() => ${generatedFuncBody})`;

                        // console.log(generatedFuncCode);

                        const runtimeFileName = `_generated_${Date.now()}.ts`;
                        const compilerHost = ts.createCompilerHost({
                            ...ctx.getCompilerOptions(),
                            strict: false,
                        });
                        const initialGetSourceFile = compilerHost.getSourceFile.bind(compilerHost);
                        const file = ts.createSourceFile(runtimeFileName, generatedFuncCode, ctx.getCompilerOptions().target, false, ts.ScriptKind.TS);
                        const createdFiles = {};

                        compilerHost.getSourceFile = (fileName: string, ...args: any) => {
                            if (fileName === runtimeFileName) return file;
                            return initialGetSourceFile(fileName, ...args);
                        };
                        compilerHost.writeFile = (fileName: string, contents: string) => createdFiles[fileName] = contents;

                        const program = ts.createProgram([ file.fileName ], ctx.getCompilerOptions(), compilerHost);
                        program.emit(file);

                        const compiledCode = Object.values(createdFiles)[0] as string;
                        // console.log(compiledCode);
                        const generatedFunc = eval(compiledCode);

                        return parseFuncBodyAndGenerateInvoke(`return (${generatedFunc()})`);
                    }
                }
                if (ts.isExpressionStatement(node)) {
                    const child = node.expression;

                    if (ts.isCallExpression(child) && unescapeText(child.expression.getText()) === 'compileTimeEval') {
                        const $genericType = (i: number): ts.Type | undefined => {
                            if (child.typeArguments) {
                                const targ = child.typeArguments[i];
                                return checker.getTypeAtLocation(targ);
                            }
                            return undefined;
                        };
                        
                        const $argType = (i: number): ts.Type | undefined => {
                            if (child.arguments) {
                                const targ = child.arguments[i];
                                return checker.getTypeAtLocation(targ);
                            }
                            return undefined;
                        };

                        const $eachOfStrUnion = (cb: (value: string) => void, type?: ts.Type) => {
                            if (!type) type = $genericType(0);
                            if (type) {
                                if (type.isUnionOrIntersection()) {
                                    for (const childT of type.types) {
                                        if (childT.isStringLiteral()) {
                                            cb(childT.value);
                                        }
                                    }
                                }
                            }
                        };

                        const codeBody = unescapeText(child.arguments[0].getFullText());
                        const codeFunc = eval('(() => {' + codeBody + '})');
                        const newCode = codeFunc();
                        const newNode = parseCode(newCode).statements;
                        return newNode as any;
                    }
                }
                return ts.visitEachChild(node, visitor, ctx);
            }
            return ts.visitEachChild(sourceFile, visitor, ctx);
        };
    };
}
