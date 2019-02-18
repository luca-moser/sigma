declare var module;
declare var require;
require("react-hot-loader/patch");

import './../css/reset.scss';
import './../css/main.scss';

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {BrowserRouter} from 'react-router-dom';
import {configure} from 'mobx';
import {Provider} from 'mobx-react';
import {AppContainer} from 'react-hot-loader'
import {App} from './comps/App';
import {AppStoreInstance as appStore} from "./stores/AppStore";
import {SendStoreInstance as sendStore} from "./stores/SendStore";
import {BalanceStoreInstance as balStore} from "./stores/BalanceStore";
import {AddressesStoreInstance as addrsStore} from "./stores/AddressesStore";
import {HistoryStoreInstance as historyStore} from "./stores/HistoryStore";
import {UserStoreInstance as userStore} from "./stores/UserStore";

configure({enforceActions: "observed"});

let stores = {appStore, sendStore, balStore, addrsStore, historyStore, userStore};

const render = Component => {
    ReactDOM.render(
        <AppContainer>
            <BrowserRouter>
                <Provider {...stores}>
                    <Component/>
                </Provider>
            </BrowserRouter>
        </AppContainer>,
        document.getElementById('app')
    )
}

render(App);

if (module.hot) {
    module.hot.accept()
}