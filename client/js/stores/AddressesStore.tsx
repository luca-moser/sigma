import * as React from "react";
import {action, computed, observable} from 'mobx';
import {createWebSocket} from "../misc/Utils";
import {Message} from "../misc/Message";
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import SvgIcon from '@material-ui/core/SvgIcon';
import HelpOutline from '@material-ui/icons/HelpOutline';
import IconButton from '@material-ui/core/IconButton';
import ScheduleOutlined from '@material-ui/icons/ScheduleOutlined';
import {default as dateformat} from 'dateformat';

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
    expected_amount: number;
}

export class AddressesStore {
    @observable addrs = new Map();
    @observable stream_connected: boolean;
    @observable generating: boolean = false;
    @observable generated_addr: Address = null;
    @observable generated_link: string = null;
    @observable expected_amount: number = 0;
    @observable help_dialog_open: boolean = false;
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

    disconnect = () => {
        if (!this.stream_connected) return;
        this.ws.close();
    }

    @action
    updateHelpDialogOpen = (open: boolean) => {
        this.help_dialog_open = open;
    }

    @action
    updateExpectedAmount = (exp: string) => {
        if (!exp) {
            exp = "0";
        }
        this.expected_amount = parseInt(exp);
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
        this.generated_link = link;
    }

    @action
    updateGenerating = (generating: boolean) => {
        this.generating = generating;
    }

    @action
    generateAddress = () => {
        if (!this.stream_connected) return;
        this.generating = true;
        this.ws.send(JSON.stringify(new Req(ReqType.NewAddress, this.expected_amount)));
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

    @computed get listItems(): Array<JSX.Element> {
        return Array.from(this.addrs)
            .sort(([key, value], [key2, value2]) => {
                return value.timeout_at < value2.timeout_at ? 1 : -1;
            })
            .map(([key, addr]) => {
                let a: Address = addr;
                let msg = "";
                if(a.expected_amount > 0){
                    msg = `usable for funding after receiving ${a.expected_amount} iotas or ${dateformat(a.timeout_at, "dd.mm.yyyy HH:MM:ss")}`;
                }else{
                    msg = `usable for funding after ${dateformat(a.timeout_at, "dd.mm.yyyy HH:MM:ss")}`;
                }
                return <ListItem disableGutters button key={key}>
                    <ListItemText
                        primary={`${a.address.substring(0, 15)}...`}
                        secondary={msg}
                    />
                </ListItem>
            });
    }
}

export var AddressesStoreInstance = new AddressesStore();