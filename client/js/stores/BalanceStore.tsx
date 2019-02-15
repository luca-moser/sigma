import {observable, runInAction} from 'mobx';
import {Message} from "../misc/Message";
import {createWebSocket} from "../misc/Utils";

enum RecType {
    Balance,
}

class BalanceUpdate {
    available: number;
    total: number;
}

export class BalanceStore {
    @observable available: number = 0;
    @observable total: number = 0;

    constructor() {
        this.connect();
    }

    connect() {
        let ws = createWebSocket("/stream/balance");
        ws.onmessage = (e: MessageEvent) => {
            let msg: Message = JSON.parse(e.data);
            switch (msg.type) {
                case RecType.Balance:
                    this.updateBalance(msg.data);
                    break;
                default:
            }
        };
    }

    updateBalance = (balance: BalanceUpdate) => {
        runInAction(() => {
            this.available = balance.available;
            this.total = balance.total;
        });
    }

}

export var BalanceStoreInstance = new BalanceStore();