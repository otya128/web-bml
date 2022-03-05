// TR-B14 5.2(p2)参照
// nvram://<affiliation_id>;group/<block number> 
// nvram://[<original_network_id>;]local/<block number>
// nvram://[<original_network_id>;]local_web/<block number>
// nvram://tr_common/<block number>
// nvram://bookmark/<block number>
// nvram://denbun/<block number>
// nvram://receiverinfo/<region type>

// STD-B24参照
// nvram://~/<block number>
// nvram://common/<block number> ネットワークごとに共通
// original_network_idは常に省略

import { parseBinaryStructure, readBinaryFields, writeBinaryFields } from "./binary_table";

function readNVRAM(uri: string): Uint8Array | null {
    if (uri === "nvram://receiverinfo/prefecture") {
        return new Uint8Array(0);
    } else if (uri === "nvram://receiverinfo/regioncode") {
        return new Uint8Array(0);
    } else if (uri === "nvram://receiverinfo/zipcode") {
        return new Uint8Array(0);
    }
    const m = uri.match(/^nvram:\/\/((?<affiliationId>[0-9a-fA-F]{2});)?(?<type>[^\/]+)\/(?<block>\d+)$/);
    if (!m?.groups) {
        return null;
    }
    const strg = localStorage.getItem("NVRAM_" + uri);
    if (!strg) {
        return new Uint8Array(0);
    }
    return Uint8Array.from(window.atob(strg), c => c.charCodeAt(0));
}

function writeNVRAM(uri: string, data: Uint8Array): boolean {
    // 書き込めない気がする
    if (uri === "nvram://receiverinfo/prefecture") {
        return false;
    } else if (uri === "nvram://receiverinfo/regioncode") {
        return false;
    } else if (uri === "nvram://receiverinfo/zipcode") {
        return false;
    }
    const m = uri.match(/^nvram:\/\/((?<affiliationId>[0-9a-fA-F]{2});)?(?<type>[^\/]+)\/(?<block>\d+)$/);
    if (!m?.groups) {
        return false;
    }
    localStorage.setItem("NVRAM_" + uri, window.btoa(String.fromCharCode(...data)));
    return true;
}

export function readPersistentArray(filename: string, structure: string): any[] | null {
    // TR-B14 5.2.7
    if (filename === "nvram://receiverinfo/prefecture") {
        return [255];
    } else if (filename === "nvram://receiverinfo/regioncode") {
        return [0];
    } else if (filename === "nvram://receiverinfo/zipcode") {
        return [""];
    }
    const fields = parseBinaryStructure(structure);
    if (!fields) {
        return null;
    }
    const a = readNVRAM(filename);
    if (!a) {
        return null;
    }
    if (a.length === 0) {
        return null;
    }
    let [result, _] = readBinaryFields(a, fields);
    return result;
};

export function writePersistentArray(filename: string, structure: string, data: any[], period?: Date): number {
    const fields = parseBinaryStructure(structure);
    if (!fields) {
        return NaN;
    }
    let bin = writeBinaryFields(data, fields);
    const a = writeNVRAM(filename, bin);
    if (!a) {
        return NaN;
    }
    return 0;
};
