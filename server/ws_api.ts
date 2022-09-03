// /api/ws?param=JSON

// Mirakurun系のAPIを使ってtsを取得
// /api/channels/{type}/{channel}/services/{id}/stream
export type MirakLiveParam = {
    type: "mirakLive",
    channelType: "GR" | "BS" | "CS" | "SKY",
    channel: string,
    serviceId?: number,
};

// EPGStationのAPIを使ってtsを取得
export type EPGStationRecordedParam = {
    type: "epgStationRecorded"
    videoFileId: number,
};

export type BaseParam =  { demultiplexServiceId?: number, seek?: number };

export type Param = (MirakLiveParam | EPGStationRecordedParam) & BaseParam;

export type RequestMessage = {};

export type ComponentPMT = {
    pid: number,
    componentId: number,
    bxmlInfo?: AdditionalAribBXMLInfo,
    streamType: number,
    // STD-B10 第2部 付録J 表J-1参照
    dataComponentId?: number,
};

export type AdditionalAribBXMLInfo = {
    transmissionFormat: number,
    entryPointFlag: boolean,
    entryPointInfo?: AdditionalAribBXMLEntryPointInfo,
    additionalAribCarouselInfo?: AdditionalAribCarouselInfo,
};

export type AdditionalAribBXMLEntryPointInfo = {
    autoStartFlag: boolean,
    documentResolution: number,
    useXML: boolean,
    defaultVersionFlag: boolean,
    independentFlag: boolean,
    styleForTVFlag: boolean,
    bmlMajorVersion: number,
    bmlMinorVersion: number,
    bxmlMajorVersion?: number
    bxmlMinorVersion?: number,
};

export type AdditionalAribCarouselInfo = {
    dataEventId: number,
    eventSectionFlag: boolean,
    ondemandRetrievalFlag: boolean,
    fileStorableFlag: boolean,
    startPriority: number,
};

export type PMTMessage = {
    type: "pmt",
    components: ComponentPMT[],
};

import { MediaType as EMediaType } from "./entity_parser";

export type MediaType = EMediaType;
export type ModuleFile = {
    contentLocation: string | null,
    contentType: MediaType,
    dataBase64: string,
};

export type ModuleDownloadedMessage = {
    type: "moduleDownloaded",
    componentId: number,
    moduleId: number,
    files: ModuleFile[],
    version: number,
    dataEventId: number,
};

export type ModuleListEntry = {
    id: number,
    version: number,
    size: number,
};

export type ModuleListUpdatedMessage = {
    type: "moduleListUpdated",
    componentId: number,
    modules: ModuleListEntry[],
    dataEventId: number,
    returnToEntryFlag?: boolean,
};

export type ESEvent = ESImmediateEvent | ESNPTEvent | NPTReference;

export type ESImmediateEvent = {
    type: "immediateEvent",
    eventMessageGroupId: number,
    timeMode: 0,
    eventMessageType: number,
    eventMessageId: number,
    privateDataByte: number[],
};

export type ESNPTEvent = {
    type: "nptEvent",
    eventMessageGroupId: number,
    timeMode: 2,
    eventMessageNPT: number,
    eventMessageType: number,
    eventMessageId: number,
    privateDataByte: number[],
};

export type NPTReference = {
    type: "nptReference",
    postDiscontinuityIndicator: boolean,
    dsmContentId: number,
    STCReference: number,
    NPTReference: number,
    scaleNumerator: number,
    scaleDenominator: number,  
};

export type ESEventUpdatedMessage = {
    type: "esEventUpdated",
    componentId: number,
    events: ESEvent[],
    dataEventId: number,
};

export type ProgramInfoMessage = {
    type: "programInfo",
    originalNetworkId: number | null,
    transportStreamId: number | null,
    serviceId: number | null,
    eventId: number | null,
    eventName: string | null,
    startTimeUnixMillis: number | null,
    durationSeconds: number | null,
    networkId: number | null,
};

export type CurrentTime = {
    type: "currentTime",
    timeUnixMillis: number,
};

export type VideoStreamUrlMessage = {
    type: "videoStreamUrl",
    videoStreamUrl: string,
};

export type ErrorMessage = {
    type: "error",
    message: string,
};

export type BITExtendedBroadcaster = {
    originalNetworkId: number,
    broadcasterId: number,
};

export type BITService = {
    serviceType: number,
    serviceId: number,
};

export type BITBroadcaster = {
    broadcasterId: number,
    broadcasterName: string | null,
    services: BITService[],
    affiliations: number[],
    affiliationBroadcasters: BITExtendedBroadcaster[],
    terrestrialBroadcasterId?: number,
};

export type BITMessage = {
    type: "bit",
    originalNetworkId: number,
    broadcasters: BITBroadcaster[],
};

export type PCRMessage = {
    type: "pcr",
     // 33-bit
    pcrBase: number,
    pcrExtension: number,
};

// parsePESを指定したときのみ
export type PESMessage = {
    type: "pes",
    streamId: number,
     // 33-bit
    pts?: number,
    data: number[],
};

export type ResponseMessage = PMTMessage |
    ModuleDownloadedMessage |
    ModuleListUpdatedMessage |
    ProgramInfoMessage |
    CurrentTime |
    VideoStreamUrlMessage |
    ErrorMessage |
    ESEventUpdatedMessage |
    BITMessage |
    PCRMessage |
    PESMessage;
