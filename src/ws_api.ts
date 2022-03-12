export type ModuleLockRequestMessage = {
    type: "moduleLockRequest",
    componentId: number,
    moduleId: number,
    isEx: boolean,
};

export type RequestMessage = ModuleLockRequestMessage;

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
    contentLocation: string,
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

export type ModuleLockResponseMessage = {
    type: "moduleLockResponse",
    componentId: number,
    moduleId: number,
    isEx: boolean,
    status: number,
};

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

export type videoStreamUrlMessage = {
    type: "videoStreamUrl",
    videoStreamUrl: string,
};

export type ResponseMessage = PMTMessage | ModuleDownloadedMessage | ModuleListUpdatedMessage | ModuleLockResponseMessage | ProgramInfoMessage | CurrentTime | videoStreamUrlMessage;
