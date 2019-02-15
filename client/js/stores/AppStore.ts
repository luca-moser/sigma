import {observable} from 'mobx';

class CDA {
    timeout_at: Date;
    multi_use: boolean = false;
    expected_amount: number = 0;
    address: string;

    url(): string {
        let time = Math.round(new Date(this.timeout_at).getTime() / 1000);
        let am = this.expected_amount ? this.expected_amount : 0;
        return `iota://${this.address}/?t=${time}&m=${this.multi_use}&am=${am}`;
    }
}

export const MsgType = {
    Stop: 0,
    Promotion: 1,
    Reattachment: 2,
    Sending: 3,
    Sent: 4,
    ReceivingDeposit: 5,
    ReceivedDeposit: 6,
    ReceivedMessage: 7,
    Error: 8,
    Balance: 9,
};

class Msg {
    msg_type: number;
    data: any;
    ts: string;
}

export class ApplicationStore {
    @observable usable_balance: number = 0;
    @observable total_balance: number = 0;
    @observable generating = false;
    @observable loading_balance = true;
    @observable events: Array<Event> = [];
    ws: WebSocket;

    constructor() {
        this.connectWS();
    }

    connectWS = () => {
        this.ws = new WebSocket(`ws://${location.host}/account/live`);
        this.ws.onmessage = (e: MessageEvent) => {
            let obj: Msg = JSON.parse(e.data);
            switch (obj.msg_type) {

            }
        }
    }
}

export var AppStoreInstance = new ApplicationStore();