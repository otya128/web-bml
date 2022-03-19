// NVRAMに保存するためにはBS/CSの場合broadcaster_idが必要になりBS/地上波の場合affiliation_idが必要となる
// BSの場合original_network_idとservice_idの組からbroadcaster_idはほぼ固定なのであらかじめ用意する
// 地上波の場合多様なのでBITを受信するとlocalStorageに保存する
import { ResponseMessage } from "../server/ws_api";
import * as resource from "./resource";

type Broadcaster = {
    services: {
        [serviceId: number]: {
            broadcasterId: number,
        }
    },
    terrestrialBroadcasterId?: number,
    lastUpdated: number,
};

type Affiliation = {
    affiliations: number[],
    lastUpdated: number,
};

function broadcasterEquals(lhs: Broadcaster, rhs: Broadcaster): boolean {
    if (lhs.terrestrialBroadcasterId != rhs.terrestrialBroadcasterId) {
        return false;
    }
    const lhsEntries = Object.entries(lhs.services);
    const rhsEntries = Object.entries(rhs.services);
    if (lhsEntries.length !== rhsEntries.length) {
        return false;
    }
    return JSON.stringify(lhsEntries.sort(([a], [b]) => Number.parseInt(a) - Number.parseInt(b))) === JSON.stringify(rhsEntries.sort(([a], [b]) => Number.parseInt(a) - Number.parseInt(b)))
}

function affiliationsEquals(lhs: number[] | undefined, rhs: number[]) {
    if (lhs == null) {
        return false;
    }
    return lhs.length === rhs.length && lhs.every(x => rhs.indexOf(x) !== -1);
}

import { broadcaster4 } from "./broadcaster_4";
import { broadcaster7 } from "./broadcaster_7";

export class BroadcasterDatabase {
    private broadcastersPrefix = "broadcasters_";
    private affiliationsPrefix = "affiliations_";
    // 録画再生時に上書きしたら困るので分ける
    private broadcasters = new Map<number, Broadcaster>();
    private affiliations = new Map<string, Affiliation>();
    private localStorageBroadcasters = new Map<number, Broadcaster>();
    private localStorageAffiliations = new Map<string, Affiliation>();

    public getBroadcasterId(originalNetworkId?: number | null, serviceId?: number | null): number | null {
        if (originalNetworkId == null || serviceId == null) {
            return null;
        }
        const broadcaster = this.broadcasters.get(originalNetworkId);
        if (broadcaster == null) {
            return null;
        }
        const service = broadcaster.services[serviceId];
        return service?.broadcasterId;
    }

    public getAffiliationIdList(originalNetworkId?: number | null, broadcasterId?: number | null): number[] | null {
        if (originalNetworkId == null) {
            return null;
        }
        const bid = broadcasterId ?? 255;
        return this.affiliations.get(`${originalNetworkId}.${bid}`)?.affiliations ?? null;
    }

    private seedDatabase() {
        if (!localStorage.getItem(this.broadcastersPrefix + "4")) {
            localStorage.setItem(this.broadcastersPrefix + "4", JSON.stringify(broadcaster4));
        }
        if (!localStorage.getItem(this.broadcastersPrefix + "7")) {
            localStorage.setItem(this.broadcastersPrefix + "7", JSON.stringify(broadcaster7));
        }
        // BS向けにaffiliationsを提示しているのは全国に地上局を持っているNHKだけ?
        if (!localStorage.getItem(this.affiliationsPrefix + "4.1")) {
            localStorage.setItem(this.affiliationsPrefix + "4.1", "{\"affiliations\":[0,1],\"lastUpdated\":1647613392353}");
        }
    }
    private loadDatabase() {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(this.broadcastersPrefix)) {
                const n = Number.parseInt(key.substring(this.broadcastersPrefix.length));
                if (!Number.isInteger(n)) {
                    continue;
                }
                const v = localStorage.getItem(key);
                if (v == null) {
                    continue;
                }
                const broadcaster = JSON.parse(v) as Broadcaster;
                this.localStorageBroadcasters.set(n, { services: Object.fromEntries(Object.entries(broadcaster.services).map(([k, v]) => [Number(k), v])), lastUpdated: broadcaster.lastUpdated });
            }
            if (key?.startsWith(this.affiliationsPrefix)) {
                const k = key.substring(this.affiliationsPrefix.length);
                const v = localStorage.getItem(key);
                if (v == null) {
                    continue;
                }
                const affiliation = JSON.parse(v) as Affiliation;
                this.localStorageAffiliations.set(k, affiliation);
            }
        }
        this.broadcasters = new Map<number, Broadcaster>(this.localStorageBroadcasters.entries());
        this.affiliations = new Map<string, Affiliation>(this.localStorageAffiliations.entries());
    }
    public openDatabase() {
        this.seedDatabase();
        this.loadDatabase();
        // broadcasters_<originalNetworkId>
        // affiliations_<originalNetworkId>.<broadcasterId>
        resource.resourceEventTarget.addEventListener("message", ((event: CustomEvent) => {
            const msg = event.detail as ResponseMessage;
            if (msg.type === "bit") {
                const lastUpdated = resource.currentTime?.timeUnixMillis;
                for (const broadcaster of msg.broadcasters) {
                    if (broadcaster.broadcasterId === 255) {
                        const key = `${msg.originalNetworkId}.${broadcaster.broadcasterId}`;
                        const v = { affiliations: broadcaster.affiliations, lastUpdated: lastUpdated ?? new Date().getTime() };
                        this.affiliations.set(key, v);
                        if (lastUpdated != null) {
                            const prev = this.localStorageAffiliations.get(key);
                            if (prev == null || !affiliationsEquals(prev.affiliations, v.affiliations)) {
                                this.localStorageAffiliations.set(key, v);
                                if (prev == null || prev.lastUpdated < lastUpdated) {
                                    localStorage.setItem(this.affiliationsPrefix + key, JSON.stringify(v));
                                }
                            }
                        }
                        for (const b of broadcaster.affiliationBroadcasters) {
                            const key = `${b.originalNetworkId}.${b.broadcasterId}`;
                            const v = { affiliations: broadcaster.affiliations, lastUpdated: lastUpdated ?? new Date().getTime() };
                            this.affiliations.set(key, v);
                            if (lastUpdated != null) {
                                const prev = this.localStorageAffiliations.get(key);
                                if (prev == null || !affiliationsEquals(prev.affiliations, v.affiliations)) {
                                    this.localStorageAffiliations.set(key, v);
                                    if (prev == null || prev.lastUpdated < lastUpdated) {
                                        localStorage.setItem(this.affiliationsPrefix + key, JSON.stringify(v));
                                    }
                                }
                            }
                        }
                        continue;
                    }
                }
                const key = `${this.broadcastersPrefix}${msg.originalNetworkId}`;
                const tbid = msg.broadcasters.filter(x => x.terrestrialBroadcasterId != null);
                if (tbid.length > 1) {
                    console.error(tbid);
                }
                const v: Broadcaster = {
                    services: Object.fromEntries(msg.broadcasters.flatMap(x => x.services.map(y => [`${y.serviceId}`, { broadcasterId: x.broadcasterId }]))),
                    terrestrialBroadcasterId: tbid[0]?.terrestrialBroadcasterId,
                    lastUpdated: lastUpdated ?? new Date().getTime(),
                };
                this.broadcasters.set(msg.originalNetworkId, v);
                if (lastUpdated != null) {
                    const prev = this.localStorageBroadcasters.get(msg.originalNetworkId);
                    if (prev == null || !broadcasterEquals(v, prev)) {
                        this.localStorageBroadcasters.set(msg.originalNetworkId, v);
                        if (prev == null || prev.lastUpdated < lastUpdated) {
                            localStorage.setItem(key, JSON.stringify(v));
                        }
                    }
                }
            }
        }) as EventListener);
    }
}



/*
type OriginalNetworkIdServiceId = string;
type BroadcasterId = number;
const broadcasters = new Map<OriginalNetworkIdServiceId, BroadcasterId>();

type OriginalNetworkIdBroadcasterId = string;
type AffiliationId = number[];
const affiliations = new Map<OriginalNetworkIdBroadcasterId, AffiliationId>();

function sameAffiliations(lhs: number[] | undefined, rhs: number[]) {
    if (lhs == null) {
        return false;
    }
    return lhs.length === rhs.length && lhs.every(x => rhs.indexOf(x) !== -1);
}

export function openDatabase() {
    const req = window.indexedDB.open("broadcaster", 2);
    req.onupgradeneeded = () => {
        req.result.createObjectStore("broadcasters");
        req.result.createObjectStore("affiliations");
    };

    req.onsuccess = () => {
        {
            const tx = req.result.transaction(["broadcasters", "affiliations"], "readonly");
            const broadcastersStore = tx.objectStore("broadcasters");
            const broadcastersCursor = broadcastersStore.openCursor();
            broadcastersCursor.onsuccess = () => {
                if (!broadcastersCursor.result) {
                    return;
                }
                broadcasters.set(broadcastersCursor.result.key as string, broadcastersCursor.result.value.broadcasterId);
                broadcastersCursor.result.continue();
            };
            const affiliationsStore = tx.objectStore("affiliations");
            const affiliationsCursor = affiliationsStore.openCursor();
            affiliationsCursor.onsuccess = () => {
                if (!affiliationsCursor.result) {
                    return;
                }
                affiliations.set(affiliationsCursor.result.key as string, affiliationsCursor.result.value.affiliations);
                affiliationsCursor.result.continue();
            };
        }
        resource.resourceEventTarget.addEventListener("message", ((event: CustomEvent) => {
            const msg = event.detail as ResponseMessage;
            if (msg.type === "bit") {
                const affiliationItems: [string, number[]][] = [];
                const broadcasterItems: [string, number][] = [];
                for (const broadcaster of msg.broadcasters) {
                    if (broadcaster.broadcasterId === 255) {
                        const key = `${msg.originalNetworkId}.${broadcaster.broadcasterId}`;
                        if (!sameAffiliations(affiliations.get(key), broadcaster.affiliations)) {
                            affiliations.set(key, broadcaster.affiliations);
                            affiliationItems.push([key, broadcaster.affiliations]);
                        }
                        for (const b of broadcaster.affiliationBroadcasters) {
                            const key = `${b.originalNetworkId}.${b.broadcasterId}`;
                            if (!sameAffiliations(affiliations.get(key), broadcaster.affiliations)) {
                                affiliations.set(key, broadcaster.affiliations);
                                affiliationItems.push([key, broadcaster.affiliations]);
                            }
                        }
                        continue;
                    }
                    for (const service of broadcaster.services) {
                        const key = `${msg.originalNetworkId}.${service.serviceId}`;
                        if (broadcasters.get(key) === broadcaster.broadcasterId) {
                            continue;
                        }
                        broadcasterItems.push([key, broadcaster.broadcasterId]);
                        broadcasters.set(key, broadcaster.broadcasterId);
                    }
                }
                if (affiliationItems.length !== 0) {
                    const tx = req.result.transaction("affiliations", "readwrite");
                    const store = tx.objectStore("affiliations");
                    const lastUpdated = new Date().getTime();
                    for (const [k, v] of affiliationItems) {
                        store.put({ affiliations: v, lastUpdated }, k);
                    }
                }
                if (broadcasterItems.length !== 0) {
                    const tx = req.result.transaction("broadcasters", "readwrite");
                    const store = tx.objectStore("broadcasters");
                    const lastUpdated = new Date().getTime();
                    for (const [k, v] of broadcasterItems) {
                        store.put({ broadcasterId: v, lastUpdated }, k);
                    }
                }
            }
        }) as EventListener);

    };
}
*/