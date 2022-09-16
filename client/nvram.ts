// /documents/nvram.md参照
import { parseBinaryStructure, readBinaryFields, writeBinaryFields } from "./binary_table";
import { BroadcasterDatabase } from "./broadcaster_database";
import { Resources } from "./resource";
import { getTextDecoder, getTextEncoder } from "./text";

type NvramAccessId =
    "broadcaster_id" | // 事業者ごと(BSとCS)
    "original_network_id" | // ネットワークごと(地上波とCS)
    "affiliation_id" | // 系列ごと(地上波)
    "affiliation_id;original_network_id" // 系列+ネットワークごと(地上波Cプロファイル)
    ;

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
    // 地上デジタルテレビジョンCプロファイル放送事業者系列領域
    {
        broadcastType: "GR",
        prefixId: null,
        prefix: "Cprogroup",
        startBlock: 0,
        lastBlock: 31,
        size: 64,
        isFixed: true,
        accessId: ["affiliation_id;original_network_id"],
        permissions: {
            "GR": "rw",
            "BS": "",
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
    serviceId?: number | null,
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
            serviceId: this.resources.serviceId,
        };
    }

    private findNvramArea(url: string, broadcasterInfo: BroadcasterInfo): [AccessInfo, NvramArea] | null {
        const match = url.match(/^nvrams?:\/\/((?<affiliationId>[0-9a-fA-F]{2});)?((?<originalNetworkId>[0-9a-fA-F]{4});)?(?<prefix>.+)\/(?<block>\d+)$/);
        if (!match?.groups) {
            return null;
        }
        const isSecure = url.startsWith("nvrams://");
        let affiliationId: number | null = parseInt(match?.groups.affiliationId, 16);
        if (!Number.isFinite(affiliationId)) {
            affiliationId = null;
        }
        let originalNetworkId: number | null = parseInt(match?.groups.originalNetworkId, 16);
        if (!Number.isFinite(originalNetworkId)) {
            originalNetworkId = null;
        }
        const prefix = match?.groups.prefix;
        const block = parseInt(match?.groups.block) ?? -1;
        for (const area of nvramAreas) {
            if (prefix === area.prefix && area.isSecure === isSecure) {
                if (area.startBlock <= block && area.lastBlock >= block) {
                    return [
                        { block, affiliationId, originalNetworkId, broadcasterId: broadcasterInfo.broadcasterId, broadcastType: broadcasterInfo.broadcastType },
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
                } else if (accessInfo.affiliationId == null) {
                    console.error("affiliationId == null!", accessInfo);
                    return null;
                } else if (broadcasterInfo.affiliationId.includes(accessInfo.affiliationId)) {
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
                if (broadcasterInfo.originalNetworkId == null) {
                    console.error("originalNetworkId == null!");
                    params.append("original_network_id", "null");
                } else {
                    params.append("original_network_id", String(broadcasterInfo.originalNetworkId));
                }
            } else if (a === "affiliation_id;original_network_id") {
                if (accessInfo.affiliationId == null || accessInfo.originalNetworkId == null) {
                    console.error("invalid", accessInfo);
                    return null;
                }
                if (accessInfo.originalNetworkId >= 0x0000 && accessInfo.originalNetworkId <= 0x0003) {
                    // 系列内共通領域
                    params.append("original_network_id", String(accessInfo.originalNetworkId));
                    params.append("affiliation_id", String(accessInfo.affiliationId));
                } else {
                    if (broadcasterInfo.originalNetworkId == null) {
                        console.error("originalNetworkId == null!");
                        params.append("original_network_id", String(accessInfo.originalNetworkId));
                    } else if (accessInfo.originalNetworkId == null) {
                        console.error("originalNetworkId == null!", accessInfo);
                        return null;
                    } else if (broadcasterInfo.originalNetworkId === accessInfo.originalNetworkId) {
                        params.append("original_network_id", String(accessInfo.originalNetworkId));
                    } else {
                        console.error("permission denied (original_network_id)", broadcasterInfo.originalNetworkId, accessInfo.originalNetworkId);
                        return null;
                    }
                    if (broadcasterInfo.affiliationId == null) {
                        console.error("affiliationId == null!");
                        params.append("affiliation_id", String(accessInfo.affiliationId));
                    } else if (accessInfo.affiliationId == null) {
                        console.error("affiliationId == null!", accessInfo);
                        return null;
                    } else if (broadcasterInfo.affiliationId.includes(accessInfo.affiliationId)) {
                        params.append("affiliation_id", String(accessInfo.affiliationId));
                    } else {
                        console.error("permission denied (affiliationId)", broadcasterInfo.affiliationId, accessInfo.affiliationId);
                        return null;
                    }
                }
            } else {
                ((_: never) => { })(a);
            }
        }
        params.append("prefix", nvramArea.prefix);
        if (accessInfo.block != null) {
            params.append("block", String(accessInfo.block));
        }
        if (nvramArea.isSecure) {
            params.append("secure", "true");
            const key = `${broadcasterInfo.originalNetworkId}.${broadcasterInfo.broadcasterId}`;
            const blockPermission = this.providerAreaPermission.get(key);
            if (blockPermission == null) {
                console.error("permission not set (nvrams)");
                return null;
            }
            if (accessInfo.block != null) {
                const allowedServiceId = blockPermission.serviceIdList[accessInfo.block];
                if (allowedServiceId !== 0xffff && allowedServiceId !== broadcasterInfo.serviceId) {
                    console.error("permission denied (nvrams serviceId)", allowedServiceId, broadcasterInfo.serviceId);
                    return null;
                }
            }
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
        } else if (uri === "nvram://receiverinfo/prefecture") {
            strg = localStorage.getItem(this.prefix + "prefix=receiverinfo%2Fprefecture");
            if (strg == null || strg.length === 0) {
                strg = window.btoa(String.fromCharCode(255));
            }
            isFixed = true;
            size = 1;
        } else if (uri === "nvram://receiverinfo/regioncode") {
            strg = localStorage.getItem(this.prefix + "prefix=receiverinfo%2Fregioncode");
            if (strg == null || strg.length === 0) {
                strg = window.btoa(String.fromCharCode(0) + String.fromCharCode(0));
            }
            isFixed = true;
            size = 2;
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
                return null;
            }
            strg = localStorage.getItem(this.prefix + k);
            if (strg != null && area.isSecure) {
                const serviceId = Number.parseInt(strg.split(",")[0]);
                // 更新時に異なるs_idの時はブロック内データを初期化（内部動作）?
                if (serviceId !== 0xffff && serviceId !== binfo.serviceId) {
                    strg = "";
                } else {
                    strg = strg.split(",")[1] ?? "";
                }
            }
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

    private writeNVRAM(uri: string, data: Uint8Array, force: boolean): number {
        // 書き込めない (TR-B14 第二分冊 5.2.7 表5-2参照)
        if (uri === "nvram://receiverinfo/prefecture") {
            if (!force) {
                return NaN;
            }
            localStorage.setItem(this.prefix + "prefix=receiverinfo%2Fprefecture", window.btoa(String.fromCharCode(...data).substring(0, 1)));
            return data.length;
        } else if (uri === "nvram://receiverinfo/regioncode") {
            if (!force) {
                return NaN;
            }
            localStorage.setItem(this.prefix + "prefix=receiverinfo%2Fregioncode", window.btoa(String.fromCharCode(...data).substring(0, 2)));
            return data.length;
            // 書き込める (TR-B14 第二分冊 5.2.7 表5-2参照)
        } else if (uri === "nvram://receiverinfo/zipcode") {
            localStorage.setItem(this.prefix + "prefix=receiverinfo%2Fzipcode", window.btoa(String.fromCharCode(...data).substring(0, 7)));
            return data.length;
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
        if (area.isSecure && id.block != null) {
            const key = `${binfo.originalNetworkId}.${binfo.broadcasterId}`;
            const blockPermission = this.providerAreaPermission.get(key);
            const allowedServiceId = blockPermission?.serviceIdList[id.block];
            localStorage.setItem(this.prefix + k, allowedServiceId + "," + window.btoa(String.fromCharCode(...data)));
        } else {
            localStorage.setItem(this.prefix + k, window.btoa(String.fromCharCode(...data)));
        }
        return data.length;
    }

    public readPersistentArray(filename: string, structure: string): any[] | null {
        if (!filename?.startsWith("nvram://")) {
            return null;
        }
        const fields = parseBinaryStructure(structure);
        if (!fields) {
            return null;
        }
        const a = this.readNVRAM(filename);
        if (!a) {
            return null;
        }
        let [result, _] = readBinaryFields(a, fields, getTextDecoder(this.resources.profile));
        return result;
    }

    public writePersistentArray(filename: string, structure: string, data: any[], period?: Date, force?: boolean): number {
        if (!filename?.startsWith("nvram://")) {
            return NaN;
        }
        const fields = parseBinaryStructure(structure);
        if (!fields) {
            return NaN;
        }
        if (fields.length > data.length) {
            console.error("writePersistentArray: fields.length > data.length");
            return NaN;
        }
        let bin = writeBinaryFields(data, fields, getTextEncoder(this.resources.profile));
        return this.writeNVRAM(filename, bin, force ?? false);
    }

    // key: <original_network_id>.<broadcaster_id>
    // value: <service_id>
    private providerAreaPermission = new Map<string, { lastUpdated: number, serviceIdList: number[] }>();

    public cspSetAccessInfoToProviderArea(data: Uint8Array): boolean {
        const structure = parseBinaryStructure("S:1V,U:2B")!;
        const binfo = this.getBroadcasterInfo();
        if (binfo.originalNetworkId == null || binfo.broadcasterId == null) {
            return false;
        }
        const key = `${binfo.originalNetworkId}.${binfo.broadcasterId}`;
        let off = 0;
        let update: string | undefined;
        let serviceIdList: number[] = [];
        while (off < data.length) {
            const [result, readBits] = readBinaryFields(data.subarray(off), structure, getTextDecoder(this.resources.profile));
            if (off === 0) {
                update = result[0] as string;
            }
            serviceIdList.push(result[1] as number);
            off += readBits / 8;
        }
        if (serviceIdList.length < 47) {
            return false;
        }
        if (update?.length !== 12) {
            return false;
        }
        const year = Number.parseInt(update.substring(0, 4));
        const month = Number.parseInt(update.substring(4, 6));
        const day = Number.parseInt(update.substring(6, 8));
        const hour = Number.parseInt(update.substring(8, 10));
        const minute = Number.parseInt(update.substring(10, 12));
        const date = new Date(year, month - 1, day, hour, minute);
        const time = date.getTime();
        const tz = date.getTimezoneOffset() * 60 * 1000;
        const jst = 9 * 60 * 60 * 1000;
        const updateTime = time - tz - jst;
        const currentTime = this.resources.currentTimeUnixMillis ?? new Date().getTime();
        if (currentTime < updateTime) {
            return false;
        }
        // 保存しておいた方がいいけど結局毎回SetAccessInfoToProviderArea呼ばれるのでそこまで重要ではない
        this.providerAreaPermission.set(key, { serviceIdList, lastUpdated: updateTime });
        return true;
    }

    public readPersistentArrayWithAccessCheck(filename: string, structure: string): any[] | null {
        if (!filename?.startsWith("nvrams://")) {
            return null;
        }
        const fields = parseBinaryStructure(structure);
        if (!fields) {
            return null;
        }
        const a = this.readNVRAM(filename);
        if (!a) {
            return null;
        }
        let [result, _] = readBinaryFields(a, fields, getTextDecoder(this.resources.profile));
        return result;
    }

    public writePersistentArrayWithAccessCheck(filename: string, structure: string, data: any[], period?: Date): number {
        if (!filename?.startsWith("nvrams://")) {
            return NaN;
        }
        const fields = parseBinaryStructure(structure);
        if (!fields) {
            return NaN;
        }
        if (fields.length > data.length) {
            console.error("writePersistentArrayWithAccessCheck: fields.length > data.length");
            return NaN;
        }
        let bin = writeBinaryFields(data, fields, getTextEncoder(this.resources.profile));
        return this.writeNVRAM(filename, bin, false);
    }

    public checkAccessInfoOfPersistentArray(uri: string): number {
        if (uri === "nvram://receiverinfo/zipcode") {
            return 2;
        } else if (uri === "nvram://receiverinfo/regioncode") {
            return 1;
        } else if (uri === "nvram://receiverinfo/prefecture") {
            return 1;
        } else {
            const binfo = this.getBroadcasterInfo();
            const result = this.findNvramArea(uri, binfo);
            if (!result) {
                return NaN;
            }
            const [id, area] = result;
            const k = this.getLocalStorageKey(binfo, id, area);
            if (!k) {
                return 0;
            }
            return 2; // FIXME 読み書き判定(broadcastType)
        }
    }
}
