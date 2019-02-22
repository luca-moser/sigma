import {action, observable} from 'mobx';
import {createWebSocket, extractExpectedAmount, validMagnetLink} from "../misc/Utils";
import {Message} from "../misc/Message";

export enum SendRecType {
    SelectingInputs,
    PreparingTransfers,
    GettingTransactionsToApprove,
    AttachingToTangle,
    SentOff,
    SendError
}

export enum SendError {
    Empty,
    Unknown,
    InsufficientBalance = "insufficient balance",
    ConfRateBelowThreshold = "below set threshold",
    ConfRateLinkBelowThreshold = "CDR timeout",
    LinkExpired = "conditions expired",
    LinkTimeoutBelowThreshold = "conditions will have expired",
}

export let sendErrorToString = {
    [SendError.Unknown]: "unknown error",
    [SendError.InsufficientBalance]: "insufficient balance",
    [SendError.ConfRateBelowThreshold]: "network conf. rate is too low currently",
    [SendError.ConfRateLinkBelowThreshold]: "link will expire too soon, requesta new one from the recipient",
    [SendError.LinkExpired]: "the link has expired, request a new one from the recipient",
    [SendError.LinkTimeoutBelowThreshold]: "link will expire too soon, requesta new one from the recipient",
}

enum ReqType {
    Send
}

class SendReq {
    amount: number;
    link: string;

    constructor(amount: number, link: string) {
        this.amount = amount;
        this.link = link;
    }
}

class Req {
    type: ReqType;
    data: any;

    constructor(t: ReqType, data: any) {
        this.type = t;
        this.data = data;
    }
}

export let stateTypeToString = {
    [-1]: "",
    [SendRecType.SelectingInputs]: "selecting inputs",
    [SendRecType.PreparingTransfers]: "preparing transfers",
    [SendRecType.GettingTransactionsToApprove]: "getting tips",
    [SendRecType.AttachingToTangle]: "doing PoW",
    [SendRecType.SentOff]: "sent off",
};

export const unitMap = {
    "i": "Iotas",
    "Mi": "Megaiotas (1 million iotas)",
    "Gi": "Gigaiotas (1 billion iotas)",
    "Ti": "Terraiotas (1 trillion iotas)",
};

const defaultSize = "i";

export enum SendFormState {
    Empty,
    Ok,
    LinkInvalid = "invalid link",
    AmountInvalid = "invalid amount",
    MessageInvalid = "invalid message",
}

export class SendStore {
    @observable amount: number = 0;
    @observable unit: string = defaultSize;
    @observable link: string = "";
    @observable send_state: SendRecType = -1;
    @observable tail: string = "";
    @observable sending: boolean = false;
    @observable form_state = SendFormState.Empty;
    @observable send_error = SendError.Empty;

    @observable stream_connected: boolean;
    ws: WebSocket;

    connect() {
        this.ws = createWebSocket("/stream/send", {
            onAuthSuccess: () => {
                this.updateStreamConnected(true);
            },
            onAuthFailure: () => {
                this.updateStreamConnected(false);
            },
            onMessage: (msg: Message) => {
                switch (msg.type) {
                    case SendRecType.SentOff:
                        this.updateTail(msg.data[0].hash);
                        this.updateSendState(msg.type);
                        this.resetSending();
                        break;
                    case SendRecType.SendError:
                        let err: string = msg.data;
                        if (err.includes(SendError.InsufficientBalance)) {
                            this.updateSendError(SendError.InsufficientBalance);
                        } else if (err.includes(SendError.ConfRateBelowThreshold)) {
                            this.updateSendError(SendError.ConfRateBelowThreshold);
                        } else if (err.includes(SendError.ConfRateLinkBelowThreshold)) {
                            this.updateSendError(SendError.ConfRateLinkBelowThreshold);
                        } else if (err.includes(SendError.LinkExpired)) {
                            this.updateSendError(SendError.LinkExpired);
                        } else if (err.includes(SendError.LinkTimeoutBelowThreshold)) {
                            this.updateSendError(SendError.LinkTimeoutBelowThreshold);
                        } else {
                            console.error(msg.data);
                            this.updateSendError(SendError.Unknown);
                        }
                        this.resetSending();
                        break;
                    default:
                        this.updateSendState(msg.type);
                }
            },
            onClose: (e: CloseEvent) => {
                this.updateStreamConnected(false);
            },
            onError: (e: Event) => {
                this.updateStreamConnected(false);
            }
        });
    }

    disconnect = () => {
        if (!this.stream_connected) return;
        this.ws.close();
    }

    @action
    updateStreamConnected = (connected: boolean) => {
        this.stream_connected = connected;
    }

    @action
    send = () => {
        if (!this.stream_connected) return;
        this.sending = true;
        let msg = new Req(ReqType.Send, JSON.stringify(new SendReq(this.amount, this.link)));
        this.ws.send(JSON.stringify(msg));
    }

    @action
    updateSendError = (err: SendError) => {
        this.send_error = err;
    }

    @action
    resetSendError = () => {
        this.send_error = SendError.Empty;
    }

    @action
    resetSendState = () => {
        this.tail = "";
        this.send_state = -1;
    }

    @action
    resetSending = () => this.sending = false;

    @action
    updateTail = (tail: string) => this.tail = tail;

    @action
    updateSendState = (state: any) => this.send_state = state;

    @action
    updateFormState = () => {
        if (this.link.length === 0) {
            this.form_state = SendFormState.Empty;
            return;
        }
        if (!validMagnetLink(this.link)) {
            this.form_state = SendFormState.LinkInvalid;
            return;
        }
        if (this.amount < 0) {
            this.form_state = SendFormState.AmountInvalid;
            return;
        }
        this.form_state = SendFormState.Ok;
    }

    @action
    updateAmount = (amount: string) => {
        if (!amount) {
            return;
        }
        this.amount = parseInt(amount);
    }

    @action
    updateUnit = (unit: string) => {
        this.unit = unit;
    }

    @action
    updateLink = (Link: string) => {
        this.link = Link;
        this.updateFormState();
        if (
            this.form_state !== SendFormState.LinkInvalid
            &&
            this.form_state !== SendFormState.Empty
        ) {
            this.amount = extractExpectedAmount(this.link);
        }
    }


}

export var SendStoreInstance = new SendStore();