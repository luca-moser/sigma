import {action, observable} from 'mobx';
import {createWebSocket} from "../misc/Utils";
import {Message} from "../misc/Message";

enum RecType {
    Init,
    NewHistoryItem
}

enum HistoryItemType {
    Receiving = 0,
    Received,
    Sending,
    Sent,
}

export let itemTypeToString = new Map([
    [HistoryItemType.Receiving, "receiving"],
    [HistoryItemType.Received, "received"],
    [HistoryItemType.Sending, "sending"],
    [HistoryItemType.Sent, "sent"],
]);

class HistoryItem {
    tail: string;
    bundle: string;
    amount: number;
    date: string;
    type: HistoryItemType;
}

export class HistoryStore {
    @observable items = new Map();

    constructor() {
        this.connect();
    }

    connect() {
        let ws = createWebSocket("/stream/history");
        ws.onmessage = (e: MessageEvent) => {
            let msg: Message = JSON.parse(e.data);
            switch (msg.type) {
                case RecType.Init:
                    this.resetItems(msg.data);
                    break;
                case RecType.NewHistoryItem:
                    this.addItem(msg.data);
                    break;
                default:
            }
        };
    }

    @action
    addItem = (item: HistoryItem) => {
        this.items.set(item.tail, item);
    }

    @action
    resetItems = (items: Array<HistoryItem>) => {
        let map = new Map();
        items.forEach(item => {
            map.set(item.tail, item);
        });
        this.items = observable.map(map);
    }

}

export var HistoryStoreInstance = new HistoryStore();