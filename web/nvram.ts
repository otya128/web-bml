// /documents/nvram.md参照
import { parseBinaryStructure, readBinaryFields, writeBinaryFields } from "./binary_table";

type NvramAccessId =
    "broadcaster_id" | // 事業者ごと(BSとCS)
    "original_network_id" | // ネットワークごと(地上波とCS)
    "affiliation_id"; // 系列ごと(地上波)

type NvramPermission = "" | "r" | "rw";

type BroadcastType = "GR" | "BS" | "CS";

type NvramArea = {
    broadcastType: BroadcastType,
    // nvram://id;aaa/bbb/<block number>
    //         ~~ここ
    prefixId: NvramAccessId | null,
    // nvram://aaa/bbb/<block number>
    //         ~~~~~~~ここ
    prefix: string,
    startBlock: number,
    lastBlock: number,
    // 大きさ(バイト)
    size: number,
    // 固定領域
    isFixed: boolean,
    // 事業者ごとに保存されるといった情報
    // 共通であれば[]
    accessId: NvramAccessId[],
    // nvrams://
    isSecure: boolean,
    permissions: { [broadcastType in BroadcastType]: NvramPermission },
};

const nvramAreas: NvramArea[] = [
    // 地上波
    // 地上デジタルテレビジョン放送事業者系列専用領域
    {
        broadcastType: "GR",
        prefixId: "affiliation_id",
        prefix: "group",
        startBlock: 0,
        lastBlock: 63,
        size: 64,
        isFixed: true,
        accessId: ["affiliation_id"],
        permissions: {
            "GR": "rw",
            "BS": "rw",
            "CS": "",
        },
        isSecure: false,
    },
    // 地上デジタルテレビジョン放送事業者専用領域
    {
        broadcastType: "GR",
        prefixId: null,
        prefix: "local",
        startBlock: 0,
        lastBlock: 63,
        size: 64,
        isFixed: true,
        accessId: ["original_network_id"],
        permissions: {
            "GR": "rw",
            "BS": "",
            "CS": "",
        },
        isSecure: false,
    },
    // 地上デジタルテレビジョン放送事業者専用放送通信共通領域
    {
        broadcastType: "GR",
        prefixId: null,
        prefix: "local_web",
        startBlock: 0,
        lastBlock: 31,
        size: 64,
        isFixed: true,
        accessId: ["original_network_id"],
        permissions: {
            "GR": "rw",
            "BS": "",
            "CS": "",
        },
        isSecure: false,
    },
    // 地上デジタルテレビジョン放送事業者共通領域
    {
        broadcastType: "GR",
        prefixId: null,
        prefix: "tr_common",
        startBlock: 0,
        lastBlock: 31,
        size: 64,
        isFixed: true,
        accessId: [],
        permissions: {
            "GR": "rw",
            "BS": "r",
            "CS": "",
        },
        isSecure: false,
    },
    // BS事業者共通領域
    {
        broadcastType: "BS",
        prefixId: null,
        prefix: "common",
        startBlock: 0,
        lastBlock: 15,
        size: 64,
        isFixed: true,
        accessId: [],
        permissions: {
            "GR": "r",
            "BS": "rw",
            "CS": "",
        },
        isSecure: false,
    },
    // BS事業者専用領域
    {
        broadcastType: "BS",
        prefixId: null,
        prefix: "~",
        startBlock: 0,
        lastBlock: 15,
        size: 64,
        isFixed: true,
        accessId: ["broadcaster_id"],
        permissions: {
            "GR": "",
            "BS": "rw",
            "CS": "rw",
        },
        isSecure: false,
    },
    // BS事業者専用領域
    {
        broadcastType: "BS",
        prefixId: null,
        prefix: "~/ext",
        startBlock: 16,
        lastBlock: 63,
        size: 64,
        isFixed: true,
        accessId: ["broadcaster_id"],
        permissions: {
            "GR": "",
            "BS": "rw",
            "CS": "rw",
        },
        isSecure: false,
    },
    // BSデジタル放送事業者専用放送通信共通領域
    {
        broadcastType: "BS",
        prefixId: null,
        prefix: "local_web",
        startBlock: 0,
        lastBlock: 31,
        size: 64,
        isFixed: true,
        accessId: ["broadcaster_id"],
        permissions: {
            "GR": "",
            "BS": "rw",
            "CS": "",
        },
        isSecure: false,
    },
    // 広帯域CSデジタル放送事業者共通領域
    {
        broadcastType: "CS",
        prefixId: null,
        prefix: "cs_common",
        startBlock: 0,
        lastBlock: 31,
        size: 64,
        isFixed: true,
        accessId: [],
        permissions: {
            "GR": "r",
            "BS": "rw",
            "CS": "",
        },
        isSecure: false,
    },
    // 広帯域CSデジタル放送事業者専用領域
    {
        broadcastType: "CS",
        prefixId: null,
        prefix: "~",
        startBlock: 0,
        lastBlock: 46,
        size: 64,
        isFixed: true,
        accessId: ["original_network_id", "broadcaster_id"],
        permissions: {
            "GR": "",
            "BS": "rw",
            "CS": "rw",
        },
        isSecure: true,
    },
    // 広帯域CSデジタル放送事業者専用放送通信共通領域
    {
        broadcastType: "CS",
        prefixId: null,
        prefix: "local_web",
        startBlock: 0,
        lastBlock: 15,
        size: 64,
        isFixed: true,
        accessId: ["broadcaster_id"],
        permissions: {
            "GR": "",
            "BS": "",
            "CS": "rw",
        },
        isSecure: false,
    },
];

// nullは不明
type BroadcasterInfo = {
    affiliationId: number | null,
    originalNetworkId: number | null,
    broadcasterId: number | null,
    broadcastType: BroadcastType | null,
};

let broadcasterInfo: BroadcasterInfo = {
    affiliationId: null,
    originalNetworkId: null,
    broadcasterId: null,
    broadcastType: null,
};

function findNvramArea(url: string, broadcasterInfo: BroadcasterInfo): [BroadcasterInfo, NvramArea] | null {
    const match = url.match(/^nvrams?:\/\/((?<affiliationId>[0-9a-fA-F]{2});)?(?<prefix>.+)\/(?<block>\d+)$/);
    if (!match?.groups) {
        return null;
    }
    const isSecure = url.startsWith("nvrams://");
    let affiliationId: number | null = parseInt(match?.groups.affiliationId, 16);
    if (!Number.isFinite(affiliationId)) {
        affiliationId = null;
    }
    const prefix = match?.groups.prefix;
    const block = parseInt(match?.groups.block) ?? -1;
    for (const area of nvramAreas) {
        if (prefix === area.prefix) {
            if (area.startBlock <= block && area.lastBlock >= block) {
                return [
                    { affiliationId, originalNetworkId: broadcasterInfo.originalNetworkId, broadcasterId: broadcasterInfo.broadcasterId, broadcastType: broadcasterInfo.broadcastType },
                    area
                ];
            }
        }
    }
    return null;
}

function readNVRAM(uri: string): Uint8Array | null {
    const result = findNvramArea(uri, broadcasterInfo);
    if (!result) {
        console.error("readNVRAM: findNvramArea failed", uri);
        return null;
    }
    const [_id, area] = result;
    const strg = localStorage.getItem("NVRAM_" + uri);
    if (!strg) {
        return new Uint8Array(area.isFixed ? area.size : 0);
    }
    const a = Uint8Array.from(window.atob(strg), c => c.charCodeAt(0));
    if (area.isFixed) {
        if (a.length > area.size) {
            return a.subarray(0, area.size);
        } else if (a.length < area.size) {
            const fixed = new Uint8Array(area.size);
            fixed.set(a);
            return fixed;
        }
    }
    return a;
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
    const result = findNvramArea(uri, broadcasterInfo);
    if (!result) {
        console.error("writeNVRAM: findNvramArea failed", uri);
        return false;
    }
    const [_id, area] = result;
    if (area.isFixed) {
        if (data.length > area.size) {
            console.error("writeNVRAM: too large data", uri, data.length, area);
            return false;
        }
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
