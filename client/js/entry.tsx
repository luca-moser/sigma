declare var module;
declare var require;
require("react-hot-loader/patch");

import './../css/reset.scss';
import './../css/main.scss';

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {configure} from 'mobx';
import {Provider} from 'mobx-react';
import {AppContainer} from 'react-hot-loader'
import {App} from './comps/App';
import {AppStoreInstance as appStore} from "./stores/AppStore";
import {SendStoreInstance as sendStore} from "./stores/SendStore";
import {BalanceStoreInstance as balStore} from "./stores/BalanceStore";
import {AddressesStoreInstance as addrsStore} from "./stores/AddressesStore";
import {HistoryStoreInstance as historyStore} from "./stores/HistoryStore";

configure({enforceActions: true});

let stores = {appStore, sendStore, balStore, addrsStore, historyStore};

const render = Component => {
    ReactDOM.render(
        <AppContainer>
            <Provider {...stores}>
                <Component/>
            </Provider>
        </AppContainer>,
        document.getElementById('app')
    )
}

render(App);

if (module.hot) {
    module.hot.accept()
}