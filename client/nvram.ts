// /documents/nvram.md参照
import { parseBinaryStructure, readBinaryFields, writeBinaryFields } from "./binary_table";
import { BroadcasterDatabase } from "./broadcaster_database";
import { Resources } from "./resource";

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
    affiliationId?: number[] | null,
    originalNetworkId?: number | null,
    broadcasterId?: number | null,
    broadcastType?: BroadcastType | null,
};

type AccessInfo = {
    affiliationId?: number | null,
    originalNetworkId?: number | null,
    broadcasterId?: number | null,
    broadcastType?: BroadcastType | null,
    block?: number | null,
};


export class NVRAM {
    resources: Resources;
    broadcasterDatabase: BroadcasterDatabase;
    prefix: string;
    constructor(resources: Resources, broadcasterDatabase: BroadcasterDatabase, prefix?: string) {
        this.resources = resources;
        this.broadcasterDatabase = broadcasterDatabase;
        this.prefix = prefix ?? "nvram_";
    }

    private getBroadcasterInfo(): BroadcasterInfo {
        const bid = this.broadcasterDatabase.getBroadcasterId(this.resources.originalNetworkId, this.resources.serviceId);
        return {
            originalNetworkId: this.resources.originalNetworkId,
            affiliationId: this.broadcasterDatabase.getAffiliationIdList(this.resources.originalNetworkId, bid),
            broadcasterId: bid,
        };
    }

    private findNvramArea(url: string, broadcasterInfo: BroadcasterInfo): [AccessInfo, NvramArea] | null {
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
                        { block, affiliationId, originalNetworkId: broadcasterInfo.originalNetworkId, broadcasterId: broadcasterInfo.broadcasterId, broadcastType: broadcasterInfo.broadcastType },
                        area
                    ];
                }
            }
        }
        return null;
    }

    private getLocalStorageKey(broadcasterInfo: BroadcasterInfo, accessInfo: AccessInfo, nvramArea: NvramArea): string | null {
        const params = new URLSearchParams();
        for (const a of nvramArea.accessId) {
            if (a === "affiliation_id") {
                if (broadcasterInfo.affiliationId == null) {
                    console.error("affiliationId == null!");
                    params.append("affiliation_id", String(accessInfo.affiliationId));
                } else if (broadcasterInfo.affiliationId.includes(accessInfo.affiliationId!)) {
                    params.append("affiliation_id", String(accessInfo.affiliationId));
                } else {
                    console.error("permission denied (affiliationId)", broadcasterInfo.affiliationId, accessInfo.affiliationId);
                    return null;
                }
            } else if (a === "broadcaster_id") {
                if (accessInfo.broadcasterId == null) {
                    console.error("broadcasterId == null!");
                    params.append("broadcaster_id", "null");
                } else {
                    params.append("broadcaster_id", String(accessInfo.broadcasterId));
                }
            } else if (a === "original_network_id") {
                if (accessInfo.originalNetworkId == null) {
                    console.error("originalNetworkId == null!");
                    params.append("original_network_id", "null");
                } else {
                    params.append("original_network_id", String(accessInfo.originalNetworkId));
                }
            }
        }
        params.append("prefix", nvramArea.prefix);
        if (accessInfo.block != null) {
            params.append("block", String(accessInfo.block));
        }
        if (nvramArea.isSecure) {
            params.append("secure", "true");
        }
        return params.toString();
    }

    private readNVRAM(uri: string): Uint8Array | null {
        let strg: string | null;
        let isFixed: boolean;
        let size: number;
        if (uri === "nvram://receiverinfo/zipcode") {
            strg = localStorage.getItem(this.prefix + "prefix=receiverinfo%2Fzipcode");
            isFixed = true;
            size = 7;
        } else {
            const binfo = this.getBroadcasterInfo();
            const result = this.findNvramArea(uri, binfo);
            if (!result) {
                console.error("readNVRAM: findNvramArea failed", uri);
                return null;
            }
            const [id, area] = result;
            const k = this.getLocalStorageKey(binfo, id, area);
            if (!k) {
                console.error("readNVRAM: access denied", uri);
            }
            strg = localStorage.getItem(this.prefix + k);
            isFixed = area.isFixed;
            size = area.size;
        }
        if (!strg) {
            return new Uint8Array(isFixed ? size : 0);
        }
        const a = Uint8Array.from(window.atob(strg), c => c.charCodeAt(0));
        if (isFixed) {
            if (a.length > size) {
                return a.subarray(0, size);
            } else if (a.length < size) {
                const fixed = new Uint8Array(size);
                fixed.set(a);
                return fixed;
            }
        }
        return a;
    }

    private writeNVRAM(uri: string, data: Uint8Array): number {
        // 書き込めない (TR-B14 第二分冊 5.2.7 表5-2参照)
        if (uri === "nvram://receiverinfo/prefecture") {
            return NaN;
        } else if (uri === "nvram://receiverinfo/regioncode") {
            return NaN;
            // 書き込める (TR-B14 第二分冊 5.2.7 表5-2参照)
        } else if (uri === "nvram://receiverinfo/zipcode") {
            localStorage.setItem(this.prefix + "prefix=receiverinfo%2Fzipcode", window.btoa(String.fromCharCode(...data).substring(0, 7)));
            return NaN;
        }
        const binfo = this.getBroadcasterInfo();
        const result = this.findNvramArea(uri, binfo);
        if (!result) {
            console.error("writeNVRAM: findNvramArea failed", uri);
            return NaN;
        }
        const [id, area] = result;
        if (area.isFixed) {
            if (data.length > area.size) {
                console.error("writeNVRAM: too large data", uri, data.length, area);
                return NaN;
            }
        }
        const k = this.getLocalStorageKey(binfo, id, area);
        if (!k) {
            console.error("writeNVRAM: access denied", uri);
            return NaN;
        }
        localStorage.setItem(this.prefix + k, window.btoa(String.fromCharCode(...data)));
        return data.length;
    }

    public readPersistentArray(filename: string, structure: string): any[] | null {
        // TR-B14 5.2.7
        // FIXME: 郵便番号から算出すべきかも
        // ただし都道府県は郵便番号から一意に定まらないし多くの受像機だと別に設定できるようになってそう
        if (filename === "nvram://receiverinfo/prefecture") {
            return [255];
        } else if (filename === "nvram://receiverinfo/regioncode") {
            return [0];
        }
        const fields = parseBinaryStructure(structure);
        if (!fields) {
            return null;
        }
        const a = this.readNVRAM(filename);
        if (!a) {
            return null;
        }
        let [result, _] = readBinaryFields(a, fields);
        return result;
    }

    public writePersistentArray(filename: string, structure: string, data: any[], period?: Date): number {
        const fields = parseBinaryStructure(structure);
        if (!fields) {
            return NaN;
        }
        if (fields.length > data.length) {
            console.error("writePersistentArray: fields.length > data.length");
            return NaN;
        }
        let bin = writeBinaryFields(data, fields);
        return this.writeNVRAM(filename, bin);
    }
}
