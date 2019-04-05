import {isValidChecksum} from '@iota/checksum';
import Curl from '@iota/curl';
import {tritsToTrytes, trytesToTrits, valueToTrits} from '@iota/converter';
import {padTrits} from '@iota/pad';
import {tokenKey} from "../stores/UserStore";
import {runInAction} from "mobx";
import {Message} from "./Message";

type OnMessageFunction = (e: Message) => void;
type OnAuthSuccess = () => void;
type OnAuthFailure = () => void;
type OnCloseFunction = (e: CloseEvent) => void;
type OnErrorFunction = (e: Event) => void;

export interface WSCallbacks {
    onAuthSuccess: OnAuthSuccess;
    onAuthFailure: OnAuthFailure;
    onMessage: OnMessageFunction;
    onClose: OnCloseFunction;
    onError: OnErrorFunction;
}

class AuthWSMsg {
    auth: boolean;
}

export function createWebSocket(endpoint, cbs?: WSCallbacks): WebSocket {
    let wsProtocol = location.protocol === 'https:' ? 'wss://' : 'ws://';
    let ws = new WebSocket(`${wsProtocol}${location.host}${endpoint}`);
    let authenticated = false;
    ws.onopen = () => runInAction(() => {
        let token = localStorage.getItem(tokenKey);
        ws.send(JSON.stringify({token}));
    });
    ws.onmessage = (e: MessageEvent) => {
        // first message is auth
        if (!authenticated) {
            let authMsg: AuthWSMsg = JSON.parse(e.data);
            if (authMsg.auth) {
                cbs.onAuthSuccess();
                authenticated = true;
            } else {
                cbs.onAuthFailure();
                ws.close();
            }
            return
        }
        cbs.onMessage(JSON.parse(e.data));
    };
    ws.onerror = (e: Event) => cbs.onError(e);
    ws.onclose = (e: CloseEvent) => cbs.onClose(e);
    return ws;
}

enum LinkKeys {
    Timeout = "timeout_at",
    MultiUse = "multi_use",
    ExpectedAmount = "expected_amount"
}

const wantedProtocol = "iota://";

export function validMagnetLink(link: string): boolean {
    if (!link) return false;
    if (link.substr(0, wantedProtocol.length) != wantedProtocol) {
        return false;
    }

    let url: URL;
    try {
        url = new URL(link);

        // generate checksum of address
        let addressAndCDAChecksum = url.pathname.replace(/\//g, "");
        let address = addressAndCDAChecksum.substring(0, 81);
        let addressTrits = trytesToTrits(address);
        let curl = new Curl();
        curl.absorb(addressTrits, 0, addressTrits.length);
        let addressChecksumTrits = new Int8Array(Curl.HASH_LENGTH);
        curl.squeeze(addressChecksumTrits, 0, Curl.HASH_LENGTH);

        // parse timeout
        let timeoutStr = url.searchParams.get(LinkKeys.Timeout);
        let timeoutInt = parseInt(timeoutStr);
        if (!timeoutInt) {
            console.error("timeout isn't a number");
            return false;
        }
        let timeoutTrits = valueToTrits(timeoutInt);
        let paddedTimeout = padTrits(27)(timeoutTrits);

        // must obviously be after now
        if (new Date(timeoutInt * 1000).getTime() < new Date().getTime()) {
            console.error("timeout already hit");
            return false;
        }

        let paddedExpectedAmount: Int8Array = null;
        let expectedAmount = url.searchParams.get(LinkKeys.ExpectedAmount);
        if (expectedAmount) {
            let expectedAmountInt = parseInt(expectedAmount);
            if (!expectedAmountInt && expectedAmountInt !== 0) {
                console.error("expected amount is not a number");
                return false;
            }
            paddedExpectedAmount = padTrits(81)(valueToTrits(expectedAmountInt));
        } else {
            // pad with empty trits
            paddedExpectedAmount = new Int8Array(81);
        }

        let multiUseTrits: Int8Array = new Int8Array(1);
        let multiUse = url.searchParams.get(LinkKeys.MultiUse);
        if (!multiUse || multiUse === 'false' || multiUse === '0') {
            multiUseTrits[0] = 0;
        } else {
            multiUseTrits[0] = 1;
        }

        curl.reset();

        let input = new Int8Array(Curl.HASH_LENGTH);
        input.set(addressChecksumTrits.slice(0, 134), 0);
        input.set(paddedTimeout, 134);
        input.set(multiUseTrits, 134 + paddedTimeout.length);
        input.set(paddedExpectedAmount, 134 + paddedTimeout.length + 1);
        curl.absorb(input, 0, Curl.HASH_LENGTH);

        let cdaChecksumTrits = new Int8Array(Curl.HASH_LENGTH);
        curl.squeeze(cdaChecksumTrits, 0, Curl.HASH_LENGTH);
        let cdaChecksum = tritsToTrytes(cdaChecksumTrits);

        let checksumInLink = addressAndCDAChecksum.slice(81, addressAndCDAChecksum.length);
        return checksumInLink === cdaChecksum.slice(81 - 9, 81);
    } catch (err) {
        console.error("error in parsing/validation", err);
        return false;
    }
}

export function extractExpectedAmount(link: string): number {
    let url: URL;
    try {
        url = new URL(link);
        let expectedAmountStr = url.searchParams.get(LinkKeys.ExpectedAmount);
        let expected = parseInt(expectedAmountStr);
        return expected ? expected : 0;
    } catch (err) {
        return 0;
    }
}

export enum FetchConst {
    ContentType = "Content-Type",
    Authorization = "Authorization",
    JSONContent = "application/json",
}

export function fetchOpts(payload: string, token?: string): RequestInit {
    let req = {
        method: "POST",
        headers: {
            [FetchConst.ContentType]: FetchConst.JSONContent,
        },
        body: payload,
    };
    if (token) {
        req.headers[FetchConst.Authorization] = `Bearer ${token}`;
    }
    return req;
}

const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

export function validateEmail(email: string) {
    return emailRegex.test(String(email).toLowerCase());
}

const whitespaceRegex = /^\S*$/;

export function hasNoWhitespace(s: string) {
    return whitespaceRegex.test(s);
}

export enum Routes {
    LOGIN = "/user/login",
    REGISTER = "/user/id"
}