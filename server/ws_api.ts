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

export type Param = (MirakLiveParam | EPGStationRecordedParam) & { demultiplexServiceId?: number };

export type RequestMessage = {};

export type ComponentPMT = {
    pid: number,
    componentId: number,
    bxmlInfo: AdditionalAribBXMLInfo,
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
};

export type ModuleListUpdatedMessage = {
    type: "moduleListUpdated",
    componentId: number,
    modules: number[],
};

export type ESEvent = ESImmediateEvent | ESNPTEvent;

export type ESImmediateEvent = {
    event_msg_group_id: number,
    time_mode: 0,
    event_msg_type: number,
    event_msg_id: number,
    private_data_byte: number[],
};

export type ESNPTEvent = {
    event_msg_group_id: number,
    time_mode: 2,
    event_msg_NPT: number,
    event_msg_type: number,
    event_msg_id: number,
    private_data_byte: number[],
};

export type ESEventUpdatedMessage = {
    type: "esEventUpdated",
    componentId: number,
    events: ESEvent[],
}

export type ProgramInfoMessage = {
    type: "programInfo",
    originalNetworkId: number | null,
    transportStreamId: number | null,
    serviceId: number | null,
    eventId: number | null,
    eventName: string | null,
    startTimeUnixMillis: number | null,
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

export type ResponseMessage = PMTMessage | ModuleDownloadedMessage | ModuleListUpdatedMessage | ProgramInfoMessage | CurrentTime | VideoStreamUrlMessage | ErrorMessage | ESEventUpdatedMessage | BITMessage;
