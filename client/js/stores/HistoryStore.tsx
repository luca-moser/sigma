import {action, observable} from 'mobx';

export class HistoryStore {
    @observable amount: number = 0;

    @action
    updateAmount = (amount: number) => {
        this.amount = amount;
    }

}

export var HistoryStoreInstance = new HistoryStore();