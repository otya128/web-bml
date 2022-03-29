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
