import {action, observable, runInAction} from 'mobx';
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
    @observable stream_connected: boolean;
    ws: WebSocket;

    connect() {
        this.ws = createWebSocket("/stream/balance", {
            onAuthSuccess: () => {
                this.updateStreamConnected(true);
            },
            onAuthFailure: () => {
                this.updateStreamConnected(false);
            },
            onMessage: (msg: Message) => {
                switch (msg.type) {
                    case RecType.Balance:
                        this.updateBalance(msg.data);
                        break;
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
    updateBalance = (balance: BalanceUpdate) => {
        this.available = balance.available;
        this.total = balance.total;
    }

}

export var BalanceStoreInstance = new BalanceStore();