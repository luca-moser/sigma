import {Dashboard} from "./Dashboard";

declare var __DEVELOPMENT__;
import * as React from 'react';
import {inject, observer} from 'mobx-react';
import {ApplicationStore} from '../stores/AppStore';
import DevTools from 'mobx-react-devtools';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';

interface Props {
    appStore?: ApplicationStore;
}

@inject("appStore")
@observer
export class App extends React.Component<Props, {}> {
    render() {
        return (
            <div>
                <AppBar position="static" color="default">
                    <Toolbar>
                        <Typography variant="h6" color="inherit">
                            Sigma Wallet Σ
                        </Typography>
                    </Toolbar>
                </AppBar>
                <Dashboard/>
                {__DEVELOPMENT__ ? <DevTools/> : <span/>}
            </div>
        );
    }
}