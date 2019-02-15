import {isValidChecksum} from '@iota/checksum';

export function createWebSocket(endpoint): WebSocket {
    let wsProtocol = location.protocol === 'https:' ? 'wss://' : 'ws://';
    return new WebSocket(`${wsProtocol}${location.host}${endpoint}`);
}

enum LinkKeys {
    Timeout = "t",
    MultiUse = "m",
    ExpectedAmount = "am"
}

const protocol = "iota://";

export function validMagnetLink(link: string): boolean {
    if (!link) return false;
    let url: URL;
    try {
        url = new URL(link);
        let address = url.pathname.replace(/\//g, "");
        console.log(address);
        if (!isValidChecksum(address)) {
            return false;
        }
    } catch (err) {
        return false;
    }
    if (link.substr(0, protocol.length) != protocol) {
        return false;
    }
    let timeoutStr = url.searchParams.get(LinkKeys.Timeout);
    let timeout = new Date(parseInt(timeoutStr) * 10000);
    if (timeout.getTime() < new Date().getTime()) {
        return false;
    }
    let expectedAmount = url.searchParams.get(LinkKeys.ExpectedAmount);
    if (!expectedAmount) return true;
    return parseInt(expectedAmount) >= 0;
}