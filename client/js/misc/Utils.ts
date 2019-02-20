import {isValidChecksum} from '@iota/checksum';
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