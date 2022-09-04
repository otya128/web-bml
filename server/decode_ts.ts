import stream from "stream";
import { TsUtil, TsChar, TsStream, TsDate } from "@chinachu/aribts";
import zlib from "zlib";
import { EntityParser, MediaType, parseMediaType, entityHeaderToString, parseMediaTypeFromString } from './entity_parser';
import * as wsApi from "./ws_api";
import { ComponentPMT, AdditionalAribBXMLInfo } from './ws_api';

type DownloadComponentInfo = {
    componentId: number,
    transactionId: number,
    downloadedModuleCount: number,
    modules: Map<number, DownloadModuleInfo>,
    dataEventId: number,
};
enum CompressionType {
    None = -1,
    Zlib = 0,
}

type DownloadModuleInfo = {
    compressionType: CompressionType,
    originalSize?: number,
    moduleId: number,
    moduleVersion: number,
    moduleSize: number,
    contentType?: string,
    blocks?: (Buffer | undefined)[],
    downloadedBlockCount: number,
    dataEventId: number,
};

type CachedModuleFile = {
    contentType: MediaType,
    contentLocation: string | null,
    data: Buffer,
};

type CachedModule = {
    downloadModuleInfo: DownloadModuleInfo,
    files?: Map<string | null, CachedModuleFile>,
    dataEventId: number,
};

export type DecodeTSOptions = {
    sendCallback: (msg: wsApi.ResponseMessage) => void;
    serviceId?: number;
    parsePES?: boolean;
    dumpError?: boolean;
};

type CachedComponent = {
    modules: Map<number, CachedModule>,
};

export function decodeTS(options: DecodeTSOptions): TsStream {
    const { sendCallback: send, serviceId, parsePES, dumpError } = options;
    const tsStream = new TsStream();
    const tsUtil = new TsUtil();
    let pmtRetrieved = false;
    let pidToComponent = new Map<number, ComponentPMT>();
    let componentToPid = new Map<number, ComponentPMT>();
    let currentTime: number | null = null;
    const downloadComponents = new Map<number, DownloadComponentInfo>();
    const cachedComponents = new Map<number, CachedComponent>();
    let currentProgramInfo: wsApi.ProgramInfoMessage | null = null;
    // SDTのEIT_present_following_flag
    // key: service_id
    const eitPresentFollowingFlag = new Map<number, boolean>();
    // program_number = service_id
    let pidToProgramNumber = new Map<number, number>();
    let programNumber: number | null = null;
    let pcr_pid: number | null = null;
    // 字幕/文字スーパーのPESのPID
    let privatePes = new Set<number>();

    // ワンセグの場合0x1fc8-0x1fcfまでの固定PIDでPMTでワンセグのみを受信している場合PATは受信されない
    // ワンセグPMTを10回受信する間にPATが未受信であればワンセグだと判定
    let oneSegPMTCount = 0;
    let oneSeg = false;
    let patRetrieved = false;

    if (dumpError) {
        tsStream.on("drop", (pid: any, counter: any, expected: any) => {
            let time = "unknown";

            if (tsUtil.hasTime()) {
                let date = tsUtil.getTime();
                if (date) {
                    time = `${("0" + date.getHours()).slice(-2)}:${("0" + date.getMinutes()).slice(-2)}:${("0" + date.getSeconds()).slice(-2)}`;
                }
            }

            console.error(`pid: 0x${("000" + pid.toString(16)).slice(-4)}, counter: ${counter}, expected: ${expected}, time: ${time}`);
        });
    }

    tsStream.on("info", (data: any) => {
        console.error("");
        console.error("info:");
        Object.keys(data).forEach(key => {
            console.error(`0x${("000" + parseInt(key, 10).toString(16)).slice(-4)}: packet: ${data[key].packet}, drop: ${data[key].drop}, scrambling: ${data[key].scrambling}`);
        });
    });

    tsStream.on("tdt", (pid: any, data: any) => {
        tsUtil.addTdt(pid, data);
        const time = tsUtil.getTime()?.getTime();
        if (time != null && currentTime !== time) {
            currentTime = time;
            send({
                type: "currentTime",
                timeUnixMillis: currentTime,
            });
        }
    });

    tsStream.on("tot", (pid: any, data: any) => {
        tsUtil.addTot(pid, data);
        const time = tsUtil.getTime()?.getTime();
        if (time != null && currentTime !== time) {
            currentTime = time;
            send({
                type: "currentTime",
                timeUnixMillis: currentTime,
            });
        }
    });

    tsStream.on("pat", (pid: any, data: any) => {
        patRetrieved = true;
        tsUtil.addPat(pid, data);
        const programs: { program_number: number, network_PID?: number, program_map_PID?: number }[] = data.programs;
        const pat = new Map<number, number>();
        programNumber = null;
        for (const program of programs) {
            if (program.program_map_PID != null) {
                // 多重化されていればとりあえず一番最初のprogram_number使っておく
                programNumber ??= program.program_number;
                pat.set(program.program_map_PID, program.program_number);
            }
        }
        if (pat.size !== pidToProgramNumber.size || [...pidToProgramNumber.keys()].some((x) => !pat.has(x))) {
            console.log("PAT changed", pat);
            if (serviceId != null && pat.size !== 1) {
                console.warn("multiplexed!");
            }
            pmtRetrieved = false;
        }
        pidToProgramNumber = pat;
    });

    tsStream.on("pmt", (pid: any, data: any) => {
        // 多重化されている
        if (!oneSeg && pidToProgramNumber.size !== 1) {
            if (pidToProgramNumber.size === 0 && pid === 0x1fc8 && !patRetrieved) {
                oneSegPMTCount++;
                if (oneSegPMTCount >= 10) {
                    oneSeg = true;
                    programNumber ??= data.program_number;
                }
            }
            if (pidToProgramNumber.get(pid) !== (serviceId ?? programNumber)) {
                return;
            }
        }
        const ptc = new Map<number, ComponentPMT>();
        const ctp = new Map<number, ComponentPMT>();
        privatePes.clear();
        for (const stream of data.streams) {
            if (parsePES && stream.stream_type === 0x06) {
                privatePes.add(stream.elementary_PID);
            }
            const pid = stream.elementary_PID;
            let bxmlInfo: AdditionalAribBXMLInfo | undefined;
            let componentId: number | undefined;
            let data_component_id: number | undefined;
            for (const esInfo of stream.ES_info) {
                if (esInfo.descriptor_tag == 0x52) { // Stream identifier descriptor ストリーム識別記述子
                    // PID => component_tagの対応
                    const component_tag = esInfo.component_tag;
                    componentId = component_tag;
                } else if (esInfo.descriptor_tag == 0xfd) { // Data component descriptor データ符号化方式記述子
                    let additional_data_component_info: Buffer = esInfo.additional_data_component_info;
                    data_component_id = esInfo.data_component_id as number;
                    // FIXME!!!!!!!!
                    // aribtsの実装がおかしくてdata_component_idを8ビットとして読んでる
                    if (esInfo.additional_data_component_info.length + 1 === esInfo.descriptor_length) {
                        data_component_id <<= 8;
                        data_component_id |= additional_data_component_info[0];
                        additional_data_component_info = additional_data_component_info.subarray(1);
                    }
                    // STD-B10 第2部 付録J 表J-1参照
                    if (data_component_id == 0x0C || // 地上波
                        data_component_id == 0x0D || // 地上波
                        data_component_id == 0x07 || // BS
                        data_component_id == 0x0B // CS
                    ) {
                        bxmlInfo = decodeAdditionalAribBXMLInfo(additional_data_component_info);
                    }
                }
            }
            if (componentId == null) {
                continue;
            }
            const componentPMT: ComponentPMT = {
                componentId,
                pid,
                bxmlInfo,
                streamType: stream.stream_type,
                dataComponentId: data_component_id,
            };
            ptc.set(pid, componentPMT);
            ctp.set(componentPMT.componentId, componentPMT);
        }
        pcr_pid = data.PCR_PID;
        pidToComponent = ptc;
        if (!pmtRetrieved || componentToPid.size !== ctp.size || [...componentToPid.keys()].some((x) => !ctp.has(x))) {
            // PMTが変更された
            // console.log("PMT changed");
            componentToPid = ctp;
            pmtRetrieved = true;
            const msg: wsApi.PMTMessage = {
                type: "pmt",
                components: [...componentToPid.values()]
            };
            send(msg);
        }
    });


    tsStream.on("packet", (pid, data) => {
        if (privatePes.has(pid) && data.data_byte != null) {
            const info = (tsStream.info as any)[pid];
            if (data.payload_unit_start_indicator) {
                info.buffer.reset();
                info.buffer.add(data.data_byte);
                if (data.data_byte.length >= 6) {
                    info.buffer.entireLength = data.data_byte.readUInt16BE(4) + 6;
                } else {
                    info.buffer.entireLength = 0x7fffffff;
                }
            } else {
                info.buffer.add(data.data_byte);
            }
            if (info.buffer.entireLength === info.buffer.length) {
                const pes: Buffer = info.buffer.concat();
                info.buffer.reset();
                const msg = decodePES(pes);
                if (msg != null) {
                    send(msg);
                }
            }
        }
        if (pid !== pcr_pid) {
            return;
        }
        const program_clock_reference_base = data.adaptation_field?.program_clock_reference_base;
        const program_clock_reference_extension = data.adaptation_field?.program_clock_reference_extension;
        // console.log(program_clock_reference_base);
        if (program_clock_reference_base != null && program_clock_reference_extension != null) {
            send({
                type: "pcr",
                pcrBase: program_clock_reference_base,
                pcrExtension: program_clock_reference_extension,
            });
        }
    });

    tsStream.on("bit", (_pid, data) => {
        // FIXME: node-aribts側の問題でCRCが不一致だと変なobjBitが送られてきてしまう
        if (data.broadcaster_descriptors == null) {
            return;
        }
        // data.first_descriptorsはSI伝送記述子のみ
        // 地上波だとbroadcaster_idは255
        const original_network_id: number = data.original_network_id;
        const broadcasters: wsApi.BITBroadcaster[] = [];
        for (const broadcaster_descriptor of data.broadcaster_descriptors) {
            let broadcaster_id: number = broadcaster_descriptor.broadcaster_id;
            const broadcasterNameDescriptor = broadcaster_descriptor.descriptors.find((x: any) => x.descriptor_tag === 0xD8);
            const broadcasterName = broadcasterNameDescriptor?.char == null ? null : new TsChar(broadcasterNameDescriptor.char).decode();
            const serviceListDescriptor = broadcaster_descriptor.descriptors.find((x: any) => x.descriptor_tag === 0x41);
            const extendedBroadcasterDescriptor = broadcaster_descriptor.descriptors.find((x: any) => x.descriptor_tag === 0xCE);
            const affiliations = extendedBroadcasterDescriptor?.affiliations?.map((x: { affiliation_id: number }) => x.affiliation_id) ?? [];
            const affiliationBroadcasters = extendedBroadcasterDescriptor?.broadcasters?.map((x: { original_network_id: number, broadcaster_id: number }) => ({ originalNetworkId: x.original_network_id, broadcasterId: x.broadcaster_id })) ?? [];
            const services = (serviceListDescriptor?.services as ({ service_id: number, service_type: number }[] | null | undefined))?.map(x => ({ serviceId: x.service_id, serviceType: x.service_type })) ?? [];
            if (broadcaster_id === 255) {
                // broadcaster_id = extendedBroadcasterDescriptor?.terrestrial_broadcaster_id ?? broadcaster_id;
            }
            const broadcaster: wsApi.BITBroadcaster = {
                affiliations,
                broadcasterId: broadcaster_id,
                broadcasterName,
                affiliationBroadcasters: affiliationBroadcasters,
                services,
                terrestrialBroadcasterId: extendedBroadcasterDescriptor?.terrestrial_broadcaster_id,
            };
            broadcasters.push(broadcaster);
        }
        const msg: wsApi.BITMessage = {
            type: "bit",
            broadcasters,
            originalNetworkId: original_network_id,
        };
        send(msg);
    });

    function getStreamInfo() {
        if (!tsUtil.hasOriginalNetworkId() || !tsUtil.hasTransportStreamId() || !tsUtil.hasTransportStreams(tsUtil.getOriginalNetworkId())) {
            return;
        }

        return {
            onid: (tsUtil.getTransportStreams(tsUtil.getOriginalNetworkId()) as { [key: number]: any })[tsUtil.getTransportStreamId()].original_network_id,
            tsid: tsUtil.getTransportStreamId(),
            sid: serviceId ?? programNumber,
            nid: tsUtil.getOriginalNetworkId(),
        };
    }

    function sendStreamInfo() {
        if (currentProgramInfo == null) {
            const ids = getStreamInfo();
            if (ids != null) {
                currentProgramInfo = {
                    type: "programInfo",
                    eventId: null,
                    transportStreamId: ids.tsid,
                    originalNetworkId: ids.onid,
                    serviceId: ids.sid,
                    eventName: null,
                    startTimeUnixMillis: null,
                    durationSeconds: null,
                    networkId: ids.nid,
                };
                send(currentProgramInfo);
            }
        }
    }

    tsStream.on("eit", (pid, data) => {
        // FIXME: node-aribts側の問題でCRCが不一致だと変なobjEitが送られてきてしまう
        if (data.events == null) {
            return;
        }
        if (oneSeg && pid !== 0x0027) { // L-EIT
            return;
        } else if (!oneSeg && pid !== 0x0012) { // H-EIT
            return;
        }
        const ids = getStreamInfo();
        if (ids == null) {
            return;
        }
        if (ids.onid !== data.original_network_id || ids.sid !== ids.sid) {
            return;
        }
        if (data.current_next_indicator === 0) {
            return;
        }
        if (data.table_id !== 0x4e) { // 自TS, 現在/次のイベント情報
            return;
        }
        if (data.section_number !== 0) { // 現在のイベント情報かどうか
            return;
        }
        if (data.events.length !== 1) {
            return;
        }
        const event = data.events[0];
        const duration = new TsDate(event.duration).decodeTime();
        const durationSeconds = duration[0] * 3600 + duration[1] * 60 + duration[2];
        const startTime =  new TsDate(event.start_time).decode();
        const eventId: number = event.event_id;
        const descriptors: any[] = event.descriptors;
        const shortEvent = descriptors.find(x => x.descriptor_tag === 0x4D); // 短形式イベント記述子
        const shortEventName = shortEvent == null ? null : new TsChar(shortEvent.event_name_char).decode();
        const prevProgramInfo = currentProgramInfo;
        currentProgramInfo = {
            type: "programInfo",
            eventId: eventId,
            transportStreamId: ids.tsid,
            originalNetworkId: ids.onid,
            serviceId: ids.sid,
            eventName: shortEventName,
            startTimeUnixMillis: startTime?.getTime(),
            durationSeconds: durationSeconds,
            networkId: ids.nid,
        };
        if (prevProgramInfo?.eventId !== currentProgramInfo.eventId ||
            prevProgramInfo?.transportStreamId !== currentProgramInfo.transportStreamId ||
            prevProgramInfo?.originalNetworkId !== currentProgramInfo.originalNetworkId ||
            prevProgramInfo?.serviceId !== currentProgramInfo.serviceId ||
            prevProgramInfo?.startTimeUnixMillis !== currentProgramInfo.startTimeUnixMillis ||
            prevProgramInfo?.eventName !== currentProgramInfo.eventName ||
            prevProgramInfo?.durationSeconds !== currentProgramInfo.durationSeconds ||
            prevProgramInfo?.networkId !== currentProgramInfo.networkId) {
            send(currentProgramInfo);
        }
    });

    tsStream.on("nit", (pid, data) => {
        tsUtil.addNit(pid, data);
        sendStreamInfo();
    });

    tsStream.on("sdt", (pid, data) => {
        tsUtil.addSdt(pid, data);
        eitPresentFollowingFlag.clear();
        if (data.table_id === 0x42) { // 自ストリームのSDT
            for (const service of data.services) {
                eitPresentFollowingFlag.set(service.service_id, service.EIT_present_following_flag !== 0);
                for (const descriptor of service.descriptors) {
                    if (descriptor.descriptor_tag == 0x48) {// 0x48 サービス記述子
                        // console.log(service.service_id, new TsChar(descriptor.service_name_char).decode(), new TsChar(descriptor.service_provider_name_char).decode());
                    }
                }
            }
        }
        sendStreamInfo();
    });

    tsStream.on("sit", (pid: any, data: any) => {
        const services = data.services[0].service;
        const short_event_descriptor = services.filter((data: any) => data.descriptor_tag === 0x4D);
        const event_name_char = new TsChar(short_event_descriptor[0].event_name_char).decode();
        const serviceId = data.services[0].service_id;

        let tot_descriptor;
        const transmission_tot = data.transmission_info.filter((data: any) => data.descriptor_tag === 0xC3);
        const service_tot = services.filter((data: any) => data.descriptor_tag === 0xC3);
        let jst_time = 0;
        let event_start_time = 0;

        if (transmission_tot.length > 0) {
            tot_descriptor = transmission_tot;
        }
        else if (service_tot.length > 0) {
            tot_descriptor = service_tot;
        }
        if (tot_descriptor) {
            jst_time = new TsDate(tot_descriptor[0].jst_time).decode().getTime();
            event_start_time = new TsDate(service_tot[0].event_start_time).decode().getTime();
        }

        const event_group_descriptor = services.filter((data: any) => data.descriptor_tag === 0xD6);
        let event_Id = null;
        if (event_group_descriptor.length > 0) {
            if (event_group_descriptor[0].events.filter((data: any) => data.service_id === serviceId).length > 0) {
                event_Id = event_group_descriptor[0].events.filter((data: any) => data.service_id === serviceId)[0].event_id;
            }
        }

        currentProgramInfo = {
            type: "programInfo",
            eventId: event_Id,
            transportStreamId: null,
            originalNetworkId: data.transmission_info[1].network_id,
            serviceId: serviceId,
            eventName: event_name_char,
            startTimeUnixMillis: event_start_time,
            durationSeconds: null,
            networkId: null,
        };
        send(currentProgramInfo);

        if (currentTime !== jst_time) {
            currentTime = jst_time;
            send({
                type: "currentTime",
                timeUnixMillis: currentTime,
            });
        }
    });

    tsStream.on("dsmcc", (pid: any, data: any) => {
        const c = pidToComponent.get(pid);
        if (c == null) {
            return;
        }
        const { componentId, bxmlInfo } = c;
        if (data.table_id === 0x3b) {
            // DII
            // console.log(pid, data);
            const transationIdLow2byte: number = data.table_id_extension;
            const sectionNumber: number = data.section_number;
            const lastSectionNumber: number = data.last_section_number;

            // dsmccMessageHeader
            // protocolDiscriminatorは常に0x11
            // dsmccTypeは常に0x03
            // messageIdは常に0x1002
            const message = data.message;
            const downloadId: number = message.downloadId;
            // downloadIdの下位28ビットは常に1で運用される
            const data_event_id = (downloadId >> 28) & 15;
            const modules = new Map<number, DownloadModuleInfo>();
            const transactionId: number = message.transaction_id;
            if (downloadComponents.get(componentId)?.transactionId === data.message.transaction_id) {
                return;
            }
            const componentInfo: DownloadComponentInfo = {
                componentId,
                modules,
                transactionId,
                downloadedModuleCount: 0,
                dataEventId: data_event_id,
            };
            // console.log(`componentId: ${componentId.toString(16).padStart(2, "0")} downloadId: ${downloadId}`)
            // blockSizeは常に4066
            const blockSize: number = message.blockSize;
            // windowSize, ackPeriod, tCDownloadWindowは常に0
            // privateDataは運用しない
            // 0<=numberOfModules<=64で運用
            // moduleSize<=256KB
            // compatibilityDescriptorは運用しない
            for (const module of data.message.modules) {
                const moduleId: number = module.moduleId;
                const moduleVersion: number = module.moduleVersion;
                const moduleSize: number = module.moduleSize;
                const moduleInfo: DownloadModuleInfo = {
                    compressionType: CompressionType.None,
                    moduleId,
                    moduleVersion,
                    moduleSize,
                    blocks: new Array(Math.ceil(moduleSize / blockSize)),
                    downloadedBlockCount: 0,
                    dataEventId: data_event_id,
                };
                modules.set(moduleId, moduleInfo);
                // console.log(`   moduleId: ${moduleId.toString(16).padStart(4, "0")} moduleVersion: ${moduleVersion}`)
                for (const info of module.moduleInfo) {
                    // Type記述子, ダウンロード推定時間記述子, Compression Type記述子のみ運用される(TR-B14 第三分冊 4.2.4 表4-4参照)
                    if (info.descriptor_tag === 0x01) { // Type記述子 STD-B24 第三分冊 第三編 6.2.3.1
                        const contentType = info.text_char.toString("ascii");
                        moduleInfo.contentType = contentType;
                    } else if (info.descriptor_tag === 0x07) { // ダウンロード推定時間記述子 STD-B24 第三分冊 第三編 6.2.3.6
                        const descriptor: Buffer = info.descriptor;
                        const est_download_time = descriptor.readUInt32BE(0);
                    } else if (info.descriptor_tag === 0xC2) { // Compression Type記述子 STD-B24 第三分冊 第三編 6.2.3.9
                        const descriptor: Buffer = info.descriptor;
                        const compression_type = descriptor.readInt8(0); // 0: zlib
                        const original_size = descriptor.readUInt32BE(1);
                        moduleInfo.originalSize = original_size;
                        moduleInfo.compressionType = compression_type as CompressionType;
                    }
                }
            }
            let returnToEntryFlag: boolean | undefined;
            for (const privateData of data.message.privateData) {
                const descriptor_tag: number = privateData.descriptor_tag;
                // arib_bxml_privatedata_descriptor
                // STD-B24 第二分冊 (1/2) 第二編 9.3.4参照
                if (descriptor_tag === 0xF0) {
                    returnToEntryFlag = !!(privateData.descriptor[0] & 0x80);
                }
            }
            const cachedComponent = cachedComponents.get(componentId);
            if (downloadComponents.get(componentId)?.dataEventId !== componentInfo.dataEventId && cachedComponent != null) {
                cachedComponent.modules.clear();
            }
            send({
                type: "moduleListUpdated",
                componentId,
                modules: data.message.modules.map((x: any) => ({ id: x.moduleId, version: x.moduleVersion, size: x.moduleSize })),
                dataEventId: data_event_id,
                returnToEntryFlag,
            });
            downloadComponents.set(componentId, componentInfo);
        } else if (data.table_id === 0x3c) {
            if (bxmlInfo == null) {
                return;
            }
            const componentInfo = downloadComponents.get(componentId);
            if (componentInfo == null) {
                return;
            }
            // DDB
            const headerModuleId: number = data.table_id_extension;
            const headerModuleVersionLow5bit: number = data.version_number;
            const headerBlockNumberLow8bit: number = data.section_number;

            // dsmccMessageHeader
            // protocolDiscriminatorは常に0x11
            // dsmccTypeは常に0x03
            // messageIdは常に0x1002
            const message = data.message;
            const downloadId: number = message.downloadId;
            // downloadIdの下位28ビットは常に1で運用される
            const data_event_id = (downloadId >> 28) & 15;
            const moduleId = message.moduleId;
            const moduleVersion = message.moduleVersion;
            const blockNumber = message.blockNumber;

            const moduleInfo = componentInfo.modules.get(moduleId);
            // console.log(`download ${componentId.toString(16).padStart(2, "0")}/${moduleId.toString(16).padStart(4, "0")}`)
            if (moduleInfo == null) {
                return;
            }
            if (moduleInfo.moduleVersion !== moduleVersion) {
                return;
            }
            if (moduleInfo.dataEventId !== data_event_id) {
                return;
            }
            if (moduleInfo.blocks == null || moduleInfo.blocks.length <= blockNumber) {
                return;
            }
            if (moduleInfo.blocks[blockNumber] != null) {
                return;
            }
            moduleInfo.blocks[blockNumber] = data.message.blockDataByte as Buffer;
            moduleInfo.downloadedBlockCount++;
            if (moduleInfo.downloadedBlockCount >= moduleInfo.blocks.length) {
                componentInfo.downloadedModuleCount++;
                const cachedComponent = cachedComponents.get(componentId) ?? {
                    modules: new Map<number, CachedModule>(),
                };
                const cachedModule: CachedModule = {
                    downloadModuleInfo: moduleInfo,
                    dataEventId: data_event_id,
                };
                let moduleData = Buffer.concat(moduleInfo.blocks as Buffer[]);
                moduleInfo.blocks = undefined;
                const previousCachedModule = cachedComponent.modules.get(moduleInfo.moduleId);
                if (previousCachedModule != null && previousCachedModule.downloadModuleInfo.moduleVersion === moduleInfo.moduleVersion && previousCachedModule.dataEventId === moduleInfo.dataEventId) {
                    // 更新されていない
                    return;
                }
                if (moduleInfo.compressionType === CompressionType.Zlib) {
                    moduleData = zlib.inflateSync(moduleData);
                }
                const mediaType = moduleInfo.contentType == null ? null : parseMediaTypeFromString(moduleInfo.contentType).mediaType;
                // console.info(`component ${componentId.toString(16).padStart(2, "0")} module ${moduleId.toString(16).padStart(4, "0")}updated`);
                if (mediaType == null || (mediaType.type === "multipart" && mediaType.subtype === "mixed")) {
                    const parser = new EntityParser(moduleData);
                    const mod = parser.readEntity();
                    if (mod?.multipartBody == null) {
                        console.error("failed to parse module");
                    } else {
                        const files = new Map<string | null, CachedModuleFile>();
                        for (const entity of mod.multipartBody) {
                            const location = entity.headers.find(x => x.name === "content-location");
                            if (location == null) { // 必ず含む
                                console.error("failed to find Content-Location");
                                continue;
                            }
                            const contentType = entity.headers.find(x => x.name === "content-type");
                            if (contentType == null) { // 必ず含む
                                console.error("failed to find Content-Type");
                                continue;
                            }
                            const mediaType = parseMediaType(contentType.value);
                            if (mediaType.mediaType == null) {
                                console.error("failed to parse Content-Type", entityHeaderToString(contentType));
                                continue;
                            }
                            if (mediaType.error) {
                                console.log("failed to parse Content-Type", entityHeaderToString(contentType));
                            }
                            const locationString = entityHeaderToString(location);
                            // console.log("    ", locationString, entityHeaderToString(contentType));
                            files.set(locationString, {
                                contentLocation: locationString,
                                contentType: mediaType.mediaType,
                                data: entity.body,
                            });
                        }
                        cachedModule.files = files;
                        send({
                            type: "moduleDownloaded",
                            componentId,
                            moduleId,
                            files: [...files.values()].map(x => ({
                                contentType: x.contentType,
                                contentLocation: x.contentLocation,
                                dataBase64: x.data.toString("base64"),
                            })),
                            version: moduleVersion,
                            dataEventId: data_event_id,
                        });
                    }
                } else {
                    const files = new Map<string | null, CachedModuleFile>();
                    files.set(null, {
                        contentLocation: null,
                        contentType: mediaType,
                        data: moduleData,
                    });
                    cachedModule.files = files;
                    send({
                        type: "moduleDownloaded",
                        componentId,
                        moduleId,
                        files: [...files.values()].map(x => ({
                            contentType: x.contentType,
                            contentLocation: x.contentLocation,
                            dataBase64: x.data.toString("base64"),
                        })),
                        version: moduleVersion,
                        dataEventId: data_event_id,
                    });
                }
                cachedComponent.modules.set(moduleInfo.moduleId, cachedModule);
                cachedComponents.set(componentId, cachedComponent);
            }
        } else if (data.table_id === 0x3d) {
            // ストリーム記述子
            const data_event_id = data.table_id_extension >> 12;
            const event_msg_group_id = data.table_id_extension & 0b1111_1111_1111;
            const stream_descriptor: Buffer = data.stream_descriptor;
            const events: wsApi.ESEvent[] = [];
            for (let i = 0; i + 1 < stream_descriptor.length;) {
                const descriptor_tag = stream_descriptor.readUInt8(i);
                i++;
                const descriptor_length = stream_descriptor.readUInt8(i);
                i++;
                const descriptor = stream_descriptor.subarray(i, i + descriptor_length);
                i += descriptor_length;
                if (descriptor.length !== descriptor_length) {
                    break;
                }
                if (descriptor_tag === 0x17) { // NPT参照記述子 NPTReferenceDescriptor
                    if (descriptor_length < 18) {
                        continue;
                    }
                    // 0のみ運用
                    const postDiscontinuityIndicator = descriptor[0] >> 7;
                    // 運用しない (常に0)
                    const dsm_contentId = descriptor[0] & 127;
                    // 7bit reserved
                    const STC_Reference = descriptor.readUInt32BE(2) + ((descriptor[1] & 1) * 0x100000000);
                    // 31bit reserved
                    const NPT_Reference = descriptor.readUInt32BE(10) + ((descriptor[9] & 1) * 0x100000000);
                    // 0/1か1/1のみ運用
                    const scaleNumerator = descriptor.readUInt16BE(14);
                    const scaleDenominator = descriptor.readUInt16BE(16);
                    events.push({
                        type: "nptReference",
                        postDiscontinuityIndicator: !!postDiscontinuityIndicator,
                        dsmContentId: dsm_contentId,
                        STCReference: STC_Reference,
                        NPTReference: NPT_Reference,
                        scaleNumerator,
                        scaleDenominator,
                    });
                } else if (descriptor_tag === 0x40) { // 汎用イベントメッセージ記述子 General_event_descriptor
                    if (descriptor_length < 11) {
                        continue;
                    }
                    const event_msg_group_id = (descriptor.readUInt16BE(0) >> 4) & 0b1111_1111_1111;
                    // 4bit reserved_future_use
                    const time_mode = descriptor.readUInt8(2);

                    const event_msg_type = descriptor.readUInt8(8);
                    const event_msg_id = descriptor.readUInt16BE(9);
                    const private_data_byte = descriptor.subarray(11);
                    // 0x00と0x02のみが運用される(TR-B14, TR-B15)
                    if (time_mode === 0) {
                        // 40bit reserved_future_use
                        events.push({
                            type: "immediateEvent",
                            eventMessageType: event_msg_type,
                            eventMessageGroupId: event_msg_group_id,
                            eventMessageId: event_msg_id,
                            privateDataByte: Array.from(private_data_byte),
                            timeMode: time_mode
                        });
                    } else if (time_mode === 0x01 || time_mode === 0x05) {
                        // event_msg_MJD_JST_time
                    } else if (time_mode === 0x02) {
                        // 7bit reserved_future_use
                        // event_msg_NPT
                        const NPT = descriptor.readUInt32BE(4) + ((descriptor[3] & 1) * 0x100000000);
                        events.push({
                            type: "nptEvent",
                            eventMessageType: event_msg_type,
                            eventMessageNPT: NPT,
                            eventMessageGroupId: event_msg_group_id,
                            eventMessageId: event_msg_id,
                            privateDataByte: Array.from(private_data_byte),
                            timeMode: time_mode
                        });
                    } else if (time_mode === 0x03) {
                        // 4bit reserved_future_use
                        // 36bit event_msg_relativeTime
                    }
                }
            }
            send({
                type: "esEventUpdated",
                events,
                componentId,
                dataEventId: data_event_id,
            });
        }
    });
    return tsStream;
}

function decodeAdditionalAribBXMLInfo(additional_data_component_info: Buffer): AdditionalAribBXMLInfo {
    let off = 0;
    // 地上波についてはTR-B14 第二分冊 2.1.4 表2-3を参照
    // BSについてはTR-B15 第一分冊 5.1.5 表5-4を参照
    // BS, CSについてはTR-B15 第四分冊 5.1.5 表5-4を参照
    // 00: データカルーセル伝送方式およびイベントメッセージ伝送方式 これのみが運用される
    // 01: データカルーセル伝送方式(蓄積専用データサービス)
    const transmission_format = ((additional_data_component_info[off] & 0b11000000) >> 6) & 0b11;
    // component_tag=0x40のとき必ず1となる
    // startup.xmlが最初に起動される (STD-B24 第二分冊 (1/2) 第二編 9.2.2参照)
    const entry_point_flag = ((additional_data_component_info[off] & 0b00100000) >> 5) & 0b1;
    const bxmlInfo: AdditionalAribBXMLInfo = {
        transmissionFormat: transmission_format,
        entryPointFlag: !!entry_point_flag,
    };
    // STD-B24 第二分冊 (1/2) 第二編 9.3参照
    if (entry_point_flag) {
        // 運用
        const auto_start_flag = ((additional_data_component_info[off] & 0b00010000) >> 4) & 0b1;
        // 以下が運用される
        // 0011: 960x540 (16:9)
        // 0100: 640x480 (16:9)
        // 0101: 640x480 (4:3)

        // 以下は仕様のみ
        // 0000: 混在
        // 0001: 1920x1080 (16:9)
        // 0010: 1280x720 (16:9)
        // 0110: 320x240 (4:3)
        // 1111: 指定しない (Cプロファイルでのみ運用)
        const document_resolution = ((additional_data_component_info[off] & 0b00001111) >> 0) & 0b1111;
        off++;
        // 0のみが運用される
        const use_xml = ((additional_data_component_info[off] & 0b10000000) >> 7) & 0b1;
        // 地上波, CSでは0のみが運用される
        // BSでは1(bml_major_version=1, bml_minor_version=0)が指定されることもある
        const default_version_flag = ((additional_data_component_info[off] & 0b01000000) >> 6) & 0b1;
        // 地上波では1のみ運用, BS/CSの場合1の場合単独視聴可能, 0の場合単独視聴不可
        const independent_flag = ((additional_data_component_info[off] & 0b00100000) >> 5) & 0b1;
        // 運用される
        const style_for_tv_flag = ((additional_data_component_info[off] & 0b00010000) >> 4) & 0b1;
        // reserved
        off++;
        bxmlInfo.entryPointInfo = {
            autoStartFlag: !!auto_start_flag,
            documentResolution: document_resolution,
            useXML: !!use_xml,
            defaultVersionFlag: !!default_version_flag,
            independentFlag: !!independent_flag,
            styleForTVFlag: !!style_for_tv_flag,
            bmlMajorVersion: 1,
            bmlMinorVersion: 0,
        };
        // BSではbml_major_versionは1
        // CSではbml_major_versionは2
        // 地上波ではbml_major_versionは3
        if (default_version_flag === 0) {
            let bml_major_version = additional_data_component_info[off] << 16;
            off++;
            bml_major_version |= additional_data_component_info[off];
            bxmlInfo.entryPointInfo.bmlMajorVersion = bml_major_version;
            off++;
            let bml_minor_version = additional_data_component_info[off] << 16;
            off++;
            bml_minor_version |= additional_data_component_info[off];
            bxmlInfo.entryPointInfo.bmlMinorVersion = bml_minor_version;
            off++;
            // 運用されない
            if (use_xml == 1) {
                let bxml_major_version = additional_data_component_info[off] << 16;
                off++;
                bxml_major_version |= additional_data_component_info[off];
                bxmlInfo.entryPointInfo.bxmlMajorVersion = bxml_major_version;
                off++;
                let bxml_minor_version = additional_data_component_info[off] << 16;
                off++;
                bxml_minor_version |= additional_data_component_info[off];
                bxmlInfo.entryPointInfo.bxmlMinorVersion = bxml_minor_version;
                off++;
            }
        }
    } else {
        // reserved
        off++;
    }
    if (transmission_format === 0) {
        // additional_arib_carousel_info (STD-B24 第三分冊 第三編 C.1)
        // 常に0xF
        const data_event_id = ((additional_data_component_info[off] & 0b11110000) >> 4) & 0b1111;
        // 常に1
        const event_section_flag = ((additional_data_component_info[off] & 0b00001000) >> 3) & 0b1;
        //reserved
        off++;
        // 地上波ならば常に1, BS/CSなら1/0
        const ondemand_retrieval_flag = ((additional_data_component_info[off] & 0b10000000) >> 7) & 0b1;
        // 地上波ならば常に0, BS/CSなら/-
        const file_storable_flag = ((additional_data_component_info[off] & 0b01000000) >> 6) & 0b1;
        // 運用
        const start_priority = ((additional_data_component_info[off] & 0b00100000) >> 5) & 0b1;
        bxmlInfo.additionalAribCarouselInfo = {
            dataEventId: data_event_id,
            eventSectionFlag: !!event_section_flag,
            ondemandRetrievalFlag: !!ondemand_retrieval_flag,
            fileStorableFlag: !!file_storable_flag,
            startPriority: start_priority,
        };
        // reserved
        off++;
    } else if (transmission_format == 1) {
        // reserved
        off++;
    }
    return bxmlInfo;
}

function decodePES(pes: Buffer): wsApi.PESMessage | null {
    let pos = 0;
    if (pes.length < 5) {
        return null;
    }
    if (pes[0] !== 0 || pes[1] !== 0 || pes[2] !== 1) {
        return null;
    }
    pos += 3;
    const streamId = pes.readUInt8(pos);
    pos++;
    const pesPacketLength = pes.readUInt16BE(pos);
    pos += 2;
    if (streamId === 0xBF) {
        return {
            type: "pes",
            data: Array.from(pes.subarray(pos, pos + pesPacketLength)),
            streamId
        };
    }
    if (streamId === 0xBE) {
        return null;
    }
    if ((pes[pos] >> 6) !== 0b10) {
        return null;
    }
    const scramblingControl = (pes[pos] >> 4) & 0b11;
    const priority = (pes[pos] >> 3) & 0b1;
    const dataAlignmentIndicator = (pes[pos] >> 2) & 0b1;
    const copyright = (pes[pos] >> 1) & 0b1;
    const original = (pes[pos] >> 0) & 0b1;
    pos++;
    const ptsDTSIndicator = (pes[pos] >> 6) & 0b11;
    const escrFlag = (pes[pos] >> 5) & 0b1;
    const esRateFlag = (pes[pos] >> 4) & 0b1;
    const dsmTrickModeFlag = (pes[pos] >> 3) & 0b1;
    const additionalCopyInfoFlag = (pes[pos] >> 2) & 0b1;
    const crcFlag = (pes[pos] >> 1) & 0b1;
    const extensionFlag = (pes[pos] >> 0) & 0b1;
    pos++;
    const pesHeaderLength = pes[pos];
    pos++;
    const dataPos = pos + pesHeaderLength;
    let pts: number | undefined;
    if (ptsDTSIndicator === 0b10 || ptsDTSIndicator === 0b11) {
        const pts3230 = (pes[pos] >> 1) & 0b111;
        pos++;
        const pts2915 = pes.readUInt16BE(pos) >> 1;
        pos += 2;
        const pts1400 = pes.readUInt16BE(pos) >> 1;
        pos += 2;
        pts = pts1400 + (pts2915 << 15) + (pts3230 * 0x40000000);
    }
    return {
        type: "pes",
        data: Array.from(pes.subarray(dataPos)),
        pts,
        streamId
    };
}
