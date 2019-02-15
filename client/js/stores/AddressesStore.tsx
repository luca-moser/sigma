import {observable} from 'mobx';
import {createWebSocket} from "../misc/Utils";
import {Message} from "../misc/Message";

enum RecType {
    Init,
    Add
}

class Address {
    hash: string;
    timeout: string;
    multi_use: boolean;
    expected_amount: boolean;
}

export class AddressesStore {
    @observable addrs = new Map();

    constructor() {
        this.connect();
    }

    connect() {
        let ws = createWebSocket("/stream/address");
        ws.onmessage = (e: MessageEvent) => {
            let msg: Message = JSON.parse(e.data);
            switch (msg.type) {
                case RecType.Init:
                    this.resetItems(msg.payload);
                    break;
                case RecType.Add:
                    this.addItem(msg.payload);
                    break;
                default:
            }
        };
    }

    addItem = (addr: Address) => {
        this.addrs.set(addr.hash, addr);
    }

    resetItems = (addrs: Array<Address>) => {
        let map = new Map();
        addrs.forEach(addr => {
            map.set(addr.hash, addr);
        });
        this.addrs = observable.map(map);
    }

}

export var AddressesStoreInstance = new AddressesStore();