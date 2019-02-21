import * as React from 'react';
import {action, computed, observable, ObservableMap} from 'mobx';
import {createWebSocket} from "../misc/Utils";
import {Message} from "../misc/Message";
import * as css from "../comps/app.scss";
import SvgIcon from '@material-ui/core/SvgIcon';
import ChevronLeftOutlined from '@material-ui/icons/ChevronLeftOutlined';
import ChevronRightOutlined from '@material-ui/icons/ChevronRightOutlined';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import {default as dateformat} from 'dateformat';

enum RecType {
    Init,
    NewItem
}

export enum HistoryItemType {
    Receiving = 0,
    Received,
    Sending,
    Sent,
    Message,
}

export let itemTypeToString = {
    [HistoryItemType.Receiving]: "receiving",
    [HistoryItemType.Received]: "received",
    [HistoryItemType.Sending]: "sending",
    [HistoryItemType.Sent]: "sent",
    [HistoryItemType.Message]: "message",
};

class HistoryItem {
    bundle: string;
    amount: number;
    date: Date;
    type: HistoryItemType;
    message: string;
}

export class HistoryStore {
    @observable items = new Map();
    @observable stream_connected: boolean;
    ws: WebSocket;

    connect() {
        // TODO: close on logout
        this.ws = createWebSocket("/stream/history", {
            onAuthSuccess: () => {
                this.updateStreamConnected(true);
            },
            onAuthFailure: () => {
                this.updateStreamConnected(false);
            },
            onMessage: (msg: Message) => {
                console.log(msg);
                switch (msg.type) {
                    case RecType.Init:
                        this.setHistory(msg.data.items);
                        break;
                    case RecType.NewItem:
                        this.addHistoryItem(msg.data);
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

    @action
    updateStreamConnected = (connected: boolean) => {
        this.stream_connected = connected;
    }

    @action
    addHistoryItem = (data: any) => {
        let item = Object.assign(new HistoryItem(), data.item);
        item.date = Date.parse(data.item.date);
        item.bundle = data.bundle;
        this.items.set(item.bundle, item);
    }

    @action
    setHistory = (history: any) => {
        let bundleHashes = Object.keys(history);

        let items = new Map();
        bundleHashes.forEach(bundleHash => {
            let item = Object.assign(new HistoryItem(), history[bundleHash]);
            item.date = Date.parse(history[bundleHash].date);
            item.bundle = bundleHash;
            items.set(item.bundle, item);
        });
        this.items = observable(items);
    }

    @computed get listItems(): Array<JSX.Element> {
        return Array.from(this.items)
            .sort(([key, value], [key2, value2]) => {
                return value.date < value2.date ? 1 : -1;
            })
            .map(([key, item]) => {
                let styling;
                let send = false;
                let sign = "";
                switch (item.type) {
                    case HistoryItemType.Receiving:
                    case HistoryItemType.Received:
                        styling = css.receive;
                        sign = "+";
                        break;
                    case HistoryItemType.Sending:
                    case HistoryItemType.Sent:
                        send = true;
                        if (item.amount < 0) {
                            styling = css.sent;
                            sign = "-";
                        }
                        break;
                }
                return <ListItem disableGutters button className={styling} dense key={item.bundle}>
                    <ListItemIcon>
                        <SvgIcon>
                            {
                                send ?
                                    <ChevronRightOutlined/>
                                    :
                                    <ChevronLeftOutlined/>
                            }
                        </SvgIcon>
                    </ListItemIcon>
                    <ListItemText
                        classes={{
                            primary: styling,
                            secondary: styling
                        }}
                        primary={`${sign} ${item.amount} | ${item.bundle.substr(0, 40)}...`}
                        secondary={`${itemTypeToString[item.type]} - ${dateformat(item.date, "dd.mm.yyyy HH:MM:ss")}`}
                    />
                </ListItem>;
            });
    }

}

export var HistoryStoreInstance = new HistoryStore();