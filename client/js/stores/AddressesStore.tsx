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

class Address {
    address: string;
    timeout_at: string;
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
                case RecType.AddressInit:
                    this.resetItems(msg.data);
                    break;
                case RecType.AddressAdd:
                    this.addItem(msg.data);
                    break;
                default:
            }
        };
    }

    @action
    addItem = (addr: Address) => {
        this.addrs.set(addr.address, addr);
    }

    @action
    resetItems = (addrs: Array<Address>) => {
        let map = new Map();
        addrs.forEach(addr => {
            map.set(addr.address, addr);
        });
        this.addrs = observable.map(map);
    }

}

export var AddressesStoreInstance = new AddressesStore();