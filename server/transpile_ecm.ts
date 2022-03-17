import { parse } from "@babel/parser";
import generate from "@babel/generator";
import traverse from "@babel/traverse";
import { callExpression, identifier, memberExpression } from "@babel/types";

export function transpile(code: string): string {
    const ast = parse(code);
    traverse(ast, {
        enter(path) {
            if (path.isNewExpression()) {
                if (path.node.callee.type !== "V8IntrinsicIdentifier") {
                    path.replaceWith(callExpression(identifier("__newBT"), [path.node.callee, ...path.node.arguments]));
                }
            }
        },
        // あくまでSTD-B24 7.2.1 Base conventionsでFloatを実装しなくても良いと書かれているように見えるけど実際は整数であることが前提?
        // ただしNaNはあるので|0するのはやめてMath.truncを呼び出す
        // STD B-24 第二編 付属2 5.4.2.2で32ビット単精度整数と規定
        exit(path) {
            if (path.isBinaryExpression()) {
                if (path.node.operator === "/") {
                    path.replaceWith(callExpression(memberExpression(identifier("Math"), identifier("trunc")), [path.node]));
                    path.skip();
                }
            }
        }
    })
    const output = generate(
        ast,
        {
        },
        code
    );
    return output.code;
}
