import {Loaded} from "./Loaded";
import * as React from 'react';
import {inject, observer} from 'mobx-react';
import DevTools from 'mobx-react-devtools';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import {UserStore} from "../stores/UserStore";
import {Route, Switch} from 'react-router-dom';
import {withRouter} from "react-router";

declare var __DEVELOPMENT__;

interface Props {
    userStore?: UserStore;
}

@withRouter
@inject("userStore")
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

                <Loaded/>
                {__DEVELOPMENT__ && <DevTools/> }
            </div>
        );
    }
}