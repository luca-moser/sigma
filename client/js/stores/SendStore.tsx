import {action, observable} from 'mobx';

export const unitMap = {
    "i": "Iotas",
    "Mi": "Megaiotas (1 million iotas)",
    "Gi": "Gigaiotas (1 billion iotas)",
    "Ti": "Terraiotas (1 trillion iotas)",
};

const defaultSize = "i";

export class SendStore {
    @observable amount: number = 0;
    @observable unit: string = defaultSize;
    @observable dest: string = "";

    @action
    updateAmount = (amount: number) => {
        this.amount = amount;
    }

    @action
    updateUnit = (unit: string) => {
        this.unit = unit;
    }

    @action
    updateDest = (dest: string) => {
        this.dest = dest;
    }

}

export var SendStoreInstance = new SendStore();