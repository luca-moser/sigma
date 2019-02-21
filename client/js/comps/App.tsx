declare var __DEVELOPMENT__;
import {Loaded} from "./Loaded";
import * as React from 'react';
import {inject, observer} from 'mobx-react';
import DevTools from 'mobx-react-devtools';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import {UserStore} from "../stores/UserStore";
import {Route, Switch} from 'react-router-dom';
import {withRouter} from "react-router";

import * as css from './app.scss';

interface Props {
    userStore?: UserStore;
}

@withRouter
@inject("userStore")
@observer
export class App extends React.Component<Props, {}> {

    logout = () => {
        this.props.userStore.logout();
    }

    render() {
        let {authenticated, username} = this.props.userStore;
        return (
            <div>
                <AppBar position="static" color="default">
                    <Toolbar>
                        <Typography variant="h6" color="inherit" className={css.title}>
                            Sigma Wallet <img className={css.titleLogo} src="/assets/img/logo.png"/>
                        </Typography>
                        {
                            authenticated &&
                            <React.Fragment>
                                <Typography component="p" color="inherit" className={css.loggedInUserInfo}>
                                    Logged in as {username}
                                </Typography>
                                <Button onClick={this.logout} className={css.logoutButton} color="inherit">Logout</Button>
                            </React.Fragment>
                        }
                    </Toolbar>
                </AppBar>

                <div style={{padding: 20}}>
                    <Loaded/>
                </div>
                {__DEVELOPMENT__ && <DevTools/>}
            </div>
        );
    }
}