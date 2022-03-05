import { parse } from "@babel/parser";
import generate from "@babel/generator";
import traverse from "@babel/traverse";
import { callExpression, identifier } from "@babel/types";

export function transpile(code: string): string {
    const ast = parse(code);
    traverse(ast, {
        enter(path) {
            if (path.isNewExpression()) {
                if (path.node.callee.type !== "V8IntrinsicIdentifier") {
                    path.replaceWith(callExpression(identifier("__newBT"), [path.node.callee, ...path.node.arguments]));
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
