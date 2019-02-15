import {observable} from 'mobx';

export class BalanceStore {
    @observable avail_balance: number = 1200;
    @observable total_balance: number = 1400;

}

export var BalanceStoreInstance = new BalanceStore();