import {action, observable} from 'mobx';
import {createWebSocket, validMagnetLink} from "../misc/Utils";
import {Message} from "../misc/Message";

export enum SendRecType {
    SelectingInputs,
    PreparingTransfers,
    GettingTransactionsToApprove,
    AttachingToTangle,
    SentOff,
    Error
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

export enum FormState {
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
    @observable form_state = FormState.Empty;

    @observable stream_connected: boolean;
    ws: WebSocket;

    constructor() {

    }

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
                    case SendRecType.Error:
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
            this.form_state = FormState.Empty;
            return;
        }
        if (!validMagnetLink(this.link)) {
            this.form_state = FormState.LinkInvalid;
            return;
        }
        this.form_state = FormState.Ok;
    }

    @action
    updateAmount = (amount: number) => {
        this.amount = amount;
    }

    @action
    updateUnit = (unit: string) => {
        this.unit = unit;
    }

    @action
    updateLink = (Link: string) => {
        this.link = Link;
        this.updateFormState();
    }


}

export var SendStoreInstance = new SendStore();