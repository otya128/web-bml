export { };
import * as resource from "./resource";
// @ts-ignore
import { JSInterpreter } from "./interpreter/js_interpreter";
import { browser, browserStatus } from "./browser";
import { launchDocument } from "./document";

// const interpreter = new NativeInterpreter(browser);
const interpreter = new JSInterpreter(browser);
browserStatus.interpreter = interpreter;
resource.fetchResourceAsync("/40/0000").then(() => {
    if (resource.fetchLockedResource("/40/0000/startup.bml")) {
        launchDocument("/40/0000/startup.bml");
    } else {
        launchDocument("/40/0000");
    }
});
