import {action, observable} from 'mobx';
import {createWebSocket} from "../misc/Utils";
import {Message} from "../misc/Message";

enum RecType {
    AddressInit,
    AddressAdd
}

enum ReqType {
    NewAddress
}

class Req {
    type: ReqType;
    data: any;

    constructor(t: ReqType, data?: any) {
        this.type = t;
        this.data = data;
    }
}

class Address {
    address: string;
    timeout_at: string;
    multi_use: boolean;
    expected_amount: boolean;
}

export class AddressesStore {
    @observable addrs = new Map();
    @observable stream_connected: boolean;
    @observable generating: boolean = false;
    @observable generated_addr: Address = null;
    @observable generated_link: string = null;
    ws: WebSocket;

    connect() {
        this.ws = createWebSocket("/stream/address", {
            onAuthSuccess: () => {
                this.updateStreamConnected(true);
            },
            onAuthFailure: () => {
                this.updateStreamConnected(false);
            },
            onMessage: (msg: Message) => {
                switch (msg.type) {
                    case RecType.AddressInit:
                        this.resetItems(msg.data);
                        break;
                    case RecType.AddressAdd:
                        this.addItem(msg.data.address);
                        this.updateGeneratedAddress(msg.data.address);
                        this.updateGeneratedLink(msg.data.link);
                        this.updateGenerating(false);
                        break;
                    default:
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
    updateGeneratedAddress = (addr: Address) => {
        this.generated_addr = addr;
    }

    @action
    updateGeneratedLink = (link: string) => {
        this.generated_link= link;
    }

    @action
    updateGenerating = (generating: boolean) => {
        this.generating = generating;
    }

    @action
    generateAddress = () => {
        if (!this.stream_connected) return;
        this.generating = true;
        this.ws.send(JSON.stringify(new Req(ReqType.NewAddress)));
    }

    @action
    addItem = (addr: Address) => {
        this.addrs.set(addr.address, addr);
    }

    @action
    resetItems = (addrs: Array<Address>) => {
        let map = new Map();
        addrs.forEach(addr => map.set(addr.address, addr));
        this.addrs = observable.map(map);
    }

}

export var AddressesStoreInstance = new AddressesStore();