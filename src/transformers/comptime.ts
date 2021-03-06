import * as ts from 'typescript';
import * as tsee from 'tsee';
import { CompilerAPI } from './comptime.lib';

const KEYWORD_COMPILER_EVAL = '__compilerEval';
const KEYWORD_COMPTIME = 'comptime';
const KEYWORD_COMPILER_JOB = '__compilerJob';

export function unescapeText(name: string) {
    // getText() == `'ts-transformer-overload'`
    return name.trim().replace(/(^('|"|`))|(('|"|`)$)/g, '');
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

function parseCode(code: string): ts.SourceFile {
    const source = ts.createSourceFile('_generated_' + Date.now() + '.ts', code, ts.ScriptTarget.ES2020, false, ts.ScriptKind.TS);
    deepSynthesized(source);
    return source;
}

function parseCodePickExpression(code: string): ts.Node {
    const source = parseCode(code);
    return (source.statements[0] as any).expression;
}

/** attention! it will return function call expression, so you need to place it right */
function parseFuncBodyAndGenerateInvoke(codeBody: string): ts.Node {
    const code = `(() => { ${codeBody} })()`;
    return parseCodePickExpression(code);
}

function printCode(node: ts.Node, source: ts.SourceFile): string {
    const printer = ts.createPrinter();
    return printer.printNode(ts.EmitHint.Unspecified, node, source);
}

const formatHost = {
    getCanonicalFileName: (path: string) => path,
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    getNewLine: () => ts.sys.newLine,
};

function extractComptimeCode(checker: ts.TypeChecker, ctx: ts.TransformationContext, node: ts.Node | undefined) {
    const identifiersToCode: Map<ts.Node, string> = new Map;

    if (node && ts.isVariableDeclaration(node)) {
        node = node.initializer;
    }
    if (!node) return '';

    function visitor(node: ts.Node): ts.VisitResult<ts.Node> {
        if (
            ts.isCallExpression(node) &&
            ts.isIdentifier(node.expression) &&
            unescapeText(node.expression.getText()) !== KEYWORD_COMPILER_EVAL &&
            unescapeText(node.expression.getText()) !== KEYWORD_COMPILER_JOB
        ) {
            const sign = checker.getResolvedSignature(node);
            if (sign) {
                const decl = sign.getDeclaration();
    
                if (!ts.isParameter(decl.parent)) {
                    const code = extractComptimeCode(checker, ctx, decl);
                    // console.log('isCallExpression with id', node.getFullText(), decl.getFullText());
                    if (code) identifiersToCode.set(node.expression, `(${code})`);
                }
            }
        }

        if (
            ts.isIdentifier(node) &&
            ts.isPropertyAccessExpression(node.parent) &&
            node.parent.expression === node
        ) {
            const symb = checker.getSymbolAtLocation(node);
            const decls = symb && symb.getDeclarations();

            if (symb && decls) {
                const expr = decls[0];
                // console.log('isPropertyAccessExpression with id', node.parent.getFullText());
                const code = extractComptimeCode(checker, ctx, expr);
                if (code) identifiersToCode.set(node, code);
            }
        }
        return ts.visitEachChild(node, visitor, ctx);
    }
    ts.visitEachChild(node, visitor, ctx);

    const printer = ts.createPrinter({}, {
        substituteNode(hint, node) {
            if (identifiersToCode.has(node)) {
                const code = identifiersToCode.get(node);
                if (code) {
                    return parseCodePickExpression(code);
                }
            }
            return node;
        }
    });

    if (!node) return undefined;

    let printed;
    
    try {
        printed = printer.printNode(ts.EmitHint.Unspecified, node, node.getSourceFile());
    } catch (err) {
        console.error('failed print node:');
        console.error(node.getFullText());
        console.error('identifiers mapping:');
        console.error(identifiersToCode.entries());
        console.error(err);
        throw err;
    }

    return printed;
}

function compileCode(checker: ts.TypeChecker, ctx: ts.TransformationContext, code: string) {
    const runtimeFileName = `_generated_${Date.now()}.ts`;
    const compilerHost = ts.createCompilerHost({
        ...ctx.getCompilerOptions(),
        strict: false,
    });
    const initialGetSourceFile = compilerHost.getSourceFile.bind(compilerHost);
    const file = ts.createSourceFile(runtimeFileName, code, ctx.getCompilerOptions().target || ts.ScriptTarget.ES2018, false, ts.ScriptKind.TS);
    const createdFiles: Record<string, string> = {};

    compilerHost.getSourceFile = (fileName: string, languageVersion, onError, shouldCreateNewSourceFile) => {
        if (fileName === runtimeFileName) return file;
        return initialGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
    };
    compilerHost.writeFile = (fileName: string, contents: string) => {
        createdFiles[fileName] = contents;
    };

    const program = ts.createProgram([ file.fileName ], ctx.getCompilerOptions(), compilerHost);
    program.emit(file, undefined, undefined, false, {
        before: [
            createSuperTransformer(checker, {})
        ],
    });

    return Object.values(createdFiles)[0] as string;
}

function transform_comptime(
    checker: ts.TypeChecker,
    ctx: ts.TransformationContext,
    funcBody: ts.ConciseBody,
) {
    const generatedFuncBody = extractComptimeCode(checker, ctx, funcBody);
    const generatedFuncCode = `(($compiler) => ${generatedFuncBody})`;
    return parseCodePickExpression(generatedFuncCode);
}

function run_transformed_comptime(
    checker: ts.TypeChecker,
    ctx: ts.TransformationContext,
    code: string,
    args: any[] = []
) {
    // console.log('run code> ' + code + '\n----');
    const compiledCode = compileCode(checker, ctx, code);
    let generatedFunc;
    let resultValue;

    try {
        generatedFunc = eval(compiledCode);
    } catch (err) {
        console.error('failed eval generated code:');
        console.error(compiledCode);
        console.error(err);
        throw err;
    }

    try {
        resultValue = generatedFunc(...args);
    } catch (err) {
        console.error('failed run generated func:');
        console.error(compiledCode);
        console.error(err);
        throw err;
    }

    if (typeof resultValue === 'object') resultValue = JSON.stringify(resultValue);
    return parseFuncBodyAndGenerateInvoke(`return (${resultValue})`);
}

function get_genericType_of_callExpr(checker: ts.TypeChecker, expr: ts.CallExpression, genericInd: number) {
    if (expr.typeArguments) {
        const targ = expr.typeArguments[genericInd];
        return checker.getTypeAtLocation(targ);
    }
    return undefined;
}

function resolve_generic_argument(checker: ts.TypeChecker, callExpr: ts.CallExpression, genericArgInd: number, genericArg: ts.TypeNode): ts.Type {
    let t = checker.getTypeFromTypeNode(genericArg);
    if (t.isTypeParameter()) {
        const symb = t.getSymbol();
        const decls = symb && symb.getDeclarations();

        if (decls) {
            // T extends string
            const decl = decls[0];
            const functionDeclExpr = decl.parent;
    
            if (ts.isFunctionExpression(functionDeclExpr)) {
                const maybeCallExpr = functionDeclExpr.parent.parent;
                if (ts.isCallExpression(maybeCallExpr)) {
                    const genericArgs = (maybeCallExpr.typeArguments || []).map((x: ts.TypeNode, i: number) => {
                        return resolve_generic_argument(checker, maybeCallExpr, i, x);
                    });
                    return genericArgs[genericArgInd];
                }
            } else {
                // console.error('|||\n' + functionDeclExpr.kind + ' ____ ' + functionDeclExpr.getText() + '\n||||');
            }
        }
    }

    return t;
}

const _jobApiUserEvents = new tsee.EventEmitter();
const _globalStore: Record<string, any> = {};

function createCompilerJobAPI(params: {
    checker: ts.TypeChecker,
    ctx: ts.TransformationContext,
    sourceFile: ts.SourceFile,
    currentNode: ts.CallExpression,
    setReplaceWith: (newNode: ts.Node) => void,
}): CompilerAPI {
    // TODO: rewrite to static functions

    return {
        replaceWithCode: (code: string) => params.setReplaceWith(parseCodePickExpression(code)),
        replaceWithNode: (astNode: any) => params.setReplaceWith(astNode),
        compileCode: (code: string) => compileCode(params.checker, params.ctx, code),
        extractComptimeCode_funcBody: (astFuncBodyNode: ts.Node) => extractComptimeCode(params.checker, params.ctx, astFuncBodyNode),
        printCode: (astNode: any) => printCode(astNode, astNode.getSourceFile()),
        parseCodePickExpression: (code: string) => parseCodePickExpression(code),
        unescapeText: (text: string) => unescapeText(text),
        // getTypeOf(symb: any): any;
        getTypeOfGeneric: (genericTypeInd: number) => {
            if (params.currentNode.typeArguments) {
                const targ = params.currentNode.typeArguments[genericTypeInd];
                const type = resolve_generic_argument(params.checker, params.currentNode, genericTypeInd, targ);
                return type;
            }
            return undefined;
        },
        getTypeChecker: () => params.checker,
        getTransformContext: () => params.ctx,
        visitEachChild: (astNode: any, visitor: ts.Visitor) => {
            return ts.visitEachChild(astNode, visitor, params.ctx);
        },
        getTs: () => ts,
        getCurrentNode: () => params.currentNode,
        
        addListener: (eventName: string, handler: any) => _jobApiUserEvents.addListener(eventName, handler),
        removeListener: (eventName: string, handler: any) => _jobApiUserEvents.removeListener(eventName, handler),
        emitEvent: (eventName: string, ...args: any) => _jobApiUserEvents.emit(eventName, ...args),

        globalStore: (name: string) => {
            if (!_globalStore[name]) _globalStore[name] = {};
            return _globalStore[name];
        },
    };
}

// use atomic waiter with separate thread to run async functions in sync transformer

let _compiletime_depth = 0;

function createSuperTransformer(checker: ts.TypeChecker, pluginOptions: {}) {
    return (ctx: ts.TransformationContext) => {
        return (sourceFile: ts.SourceFile) => {
            function visitor(node: ts.Node): ts.VisitResult<ts.Node> {
                if (ts.isExpressionStatement(node)) {
                    const child = node.expression;

                    if (ts.isCallExpression(child) && unescapeText(child.expression.getText()) === KEYWORD_COMPILER_EVAL) {
                        return transform_compilerEval(checker, ctx, child);
                    }
                }
                if (ts.isCallExpression(node) && unescapeText(node.expression.getText()) === KEYWORD_COMPTIME) {
                    const arg0 = node.arguments[0];
                    if (ts.isArrowFunction(arg0)) {
                        ++_compiletime_depth;
                        const transformedNode = transform_comptime(checker, ctx, arg0.body);

                        // if (_is_inside_comptime === 1) {
                            const transformedCode = printCode(transformedNode, sourceFile);
                            const result = run_transformed_comptime(checker, ctx, transformedCode);
                            --_compiletime_depth;
                            return result;
                        // }

                        --_compiletime_depth;
                        return transformedNode;
                    }
                }
                if (ts.isCallExpression(node) && unescapeText(node.expression.getText()) === KEYWORD_COMPILER_JOB) {
                    const arg0 = node.arguments[0];
                    if (ts.isArrowFunction(arg0)) {
                        let replaceTo!: ts.Node | undefined;

                        const compilerJobApi = createCompilerJobAPI({
                            checker,
                            ctx,
                            currentNode: node,
                            sourceFile,
                            setReplaceWith: (newNode) => replaceTo = newNode,
                        });

                        ++_compiletime_depth;
                        const transformedNode = transform_comptime(checker, ctx, arg0.body);
                        
                        // if (_is_inside_comptime === 1) {
                            const transformedCode = printCode(transformedNode, sourceFile);
                            const result = run_transformed_comptime(checker, ctx, transformedCode, [ compilerJobApi ]);
                            --_compiletime_depth;

                            if (replaceTo) return replaceTo;
                            return result;
                        // }

                        --_compiletime_depth;
                        return transformedNode;
                    }
                }
                return ts.visitEachChild(node, visitor, ctx);
            }
            return ts.visitEachChild(sourceFile, visitor, ctx);
        };
    };
}


function transform_compilerEval(checker: ts.TypeChecker, ctx: ts.TransformationContext, callExpr: ts.CallExpression) {
    const $genericType = (i: number): ts.Type | undefined => {
        return get_genericType_of_callExpr(checker, callExpr, i);
    };
    
    const $argType = (i: number): ts.Type | undefined => {
        if (callExpr.arguments) {
            const targ = callExpr.arguments[i];
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

    const codeBody = unescapeText(callExpr.arguments[0].getFullText());
    const codeFunc = eval('(() => {' + codeBody + '})');
    const newCode = codeFunc();
    const newNode = parseCode(newCode).statements;
    return newNode as any;
}

export default createSuperTransformer;
