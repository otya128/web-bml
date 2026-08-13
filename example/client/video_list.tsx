import * as EPGStationAPI from "./api/epgstation";
import * as MirakAPI from "./api/mirakurun";
import * as ReactDOM from "react-dom";

type EPGRecords = EPGStationAPI.components["schemas"]["Records"];
type EPGRecordedItem = EPGStationAPI.components["schemas"]["RecordedItem"];
type MirakChannel = MirakAPI.definitions["Channel"];
type MirakService = MirakAPI.definitions["Service"];
async function fetchRecorded(): Promise<EPGRecords> {
    const res = await fetch("/api/recorded?isHalfWidth=true&offset=0&limit=1000&hasOriginalFile=true");
    const recordedJson = await res.json();
    return recordedJson as EPGRecords;
}

async function fetchChannels(): Promise<MirakChannel[]> {
    const res = await fetch("/api/channels");
    const channelsJson = await res.json();
    return channelsJson as MirakChannel[];
};

function Record({ record }: { record: EPGRecordedItem }) {
    const videoId = record.videoFiles?.find(file => file.type == "ts")?.id;
    const title = `${record.name.length === 0 ? "番組名なし" : record.name} ${new Date(record.startAt).toLocaleString()}`
    if (videoId == null) {
        return title;
    }
    return (
        <a href={`/videos/${videoId}`}>
            {title}
        </a>
    );
}

function Records({ records: { records } }: { records: EPGRecords }) {
    return (
        <ul>
            {records.map(record => <li key={record.id}><Record record={record} /></li>)}
        </ul>
    );
}

function Service({ channel, service }: { channel: MirakChannel, service: MirakService }) {
    return (
        <a href={`/channels/${encodeURIComponent(channel.type)}/${encodeURIComponent(channel.channel)}/services/${service.id}/stream`}>
            {service.name} ({service.serviceId.toString(16).padStart(4, "0")} {service.networkId.toString(16).padStart(4, "0")})
        </a>
    );
}

function Channel({ channel }: { channel: MirakChannel }) {
    if (channel.services == null) {
        return null;
    }
    return (
        <li>
            <a href={`/channels/${encodeURIComponent(channel.type)}/${encodeURIComponent(channel.channel)}/stream`}>
                {channel.channel} {channel.name}
            </a>
            <ul>
                {channel.services?.map(service => <li key={service.id}><Service key={service.id} channel={channel} service={service} /></li>)}
            </ul>
        </li>
    );
}

function Channels({ channels }: { channels: MirakChannel[] }) {
    return (
        <ul>
            {channels.map(channel => <Channel key={channel.channel} channel={channel} />)}
        </ul>
    );
}

async function VideoList() {
    try {
        var records = await fetchRecorded();
    } catch {
        records = { records: [], total: 0 };
    }
    try {
        var channels = await fetchChannels();
    } catch {
        channels = [];
    }
    return <div>
        <h2>
            チャンネル一覧
        </h2>
        <Channels channels={channels} />
        <h2>
            録画一覧
        </h2>
        <Records records={records} />
    </div>

}

async function main() {
    ReactDOM.render(await VideoList(), document.getElementById("ui-main"));
}

main();
