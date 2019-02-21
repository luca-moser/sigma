import {Balance} from "./Balance";
import * as React from 'react';
import {inject, observer} from 'mobx-react';
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';
import {Send} from "./Send";
import {History} from "./History";
import Divider from '@material-ui/core/Divider';
import {withAuth} from "./Authenticated";
import {UserStore} from "../stores/UserStore";
import Snackbar from '@material-ui/core/Snackbar';

import * as css from './app.scss';
import {BalanceStore} from "../stores/BalanceStore";
import {HistoryStore} from "../stores/HistoryStore";
import {SendStore} from "../stores/SendStore";
import {AddressesStore} from "../stores/AddressesStore";
import {Addresses} from "./Addresses";

interface Props {
    userStore?: UserStore;
    sendStore?: SendStore;
    balStore?: BalanceStore;
    historyStore?: HistoryStore;
    addrsStore?: AddressesStore;
}

@inject("userStore")
@inject("sendStore")
@inject("balStore")
@inject("addrsStore")
@inject("historyStore")
@observer
export class dashboard extends React.Component<Props, {}> {

    componentWillMount() {
        // connect websockets
        this.props.sendStore.connect();
        this.props.balStore.connect();
        this.props.addrsStore.connect();
        this.props.historyStore.connect();
    }

    handleActivationMessageClose = () => {
        this.props.userStore.updateAccountActivated(false);
    }

    render() {
        let {account_activated} = this.props.userStore;
        return (
            <React.Fragment>
                <Grid container className={css.dashboard} justify="center" spacing={32}>
                    <Grid item>
                        <Paper className={css.tile}>
                            <Balance/>
                            <Divider className={css.splitDivider}/>
                            <History/>
                        </Paper>
                    </Grid>
                    <Grid item>
                        <Paper className={css.tile}>
                            <Send/>
                        </Paper>
                    </Grid>
                    <Grid item>
                        <Paper className={css.tile}>
                            <Addresses/>
                        </Paper>
                    </Grid>
                </Grid>
                <Snackbar
                    open={account_activated}
                    onClose={this.handleActivationMessageClose}
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'center',
                    }}
                    autoHideDuration={5000}
                    message={<span>Account activated</span>}
                />
            </React.Fragment>
        );
    }
}


export let Dashboard = withAuth(dashboard);