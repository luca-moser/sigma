import {action, observable} from 'mobx';

export class AddressesStore {
    @observable amount: number = 0;

    @action
    updateAmount = (amount: number) => {
        this.amount = amount;
    }

}

export var AddressesStoreInstance = new AddressesStore();