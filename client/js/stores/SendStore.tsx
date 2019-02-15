import {action, observable, runInAction} from 'mobx';
import {createWebSocket, validMagnetLink} from "../misc/Utils";
import {Message} from "../misc/Message";

enum RecType {
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

export let stateTypeToString = new Map([
    [-1, ""],
    [RecType.SelectingInputs, "selecting inputs"],
    [RecType.PreparingTransfers, "preparing transfers"],
    [RecType.GettingTransactionsToApprove, "getting tips"],
    [RecType.AttachingToTangle, "doing PoW"],
    [RecType.SentOff, "sent off"],
]);

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
    @observable send_state: RecType = -1;
    @observable sending: boolean = false;
    @observable form_state = FormState.Empty;
    ws: WebSocket;
    stream_connected: boolean;

    constructor() {
        this.connect();
    }

    connect() {
        this.ws = createWebSocket("/stream/send");
        this.ws.onopen = () => runInAction(() => {
            this.stream_connected = true;
        });
        this.ws.onclose = () => runInAction(() => {
            this.stream_connected = false;
        });
        this.ws.onmessage = (e: MessageEvent) => {
            let msg: Message = JSON.parse(e.data);
            switch (msg.type) {
                case RecType.SentOff:
                    this.resetSending();
                    break;
                case RecType.Error:
                    this.resetSending();
                    break;
                default:
                    // simply update send_state
                    runInAction(() => {
                        this.send_state = msg.type;
                    });
            }
        };
    }

    @action
    send = () => {
        if (!this.stream_connected) return;
        this.sending = true;
        let req = new SendReq(this.amount, this.link);
        let msg = new Req(ReqType.Send, req);
        this.ws.send(JSON.stringify(msg));
    }

    resetSending = () => {
        runInAction(() => this.sending = false);
    }

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