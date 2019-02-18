import {inject, observer} from "mobx-react";
import * as React from "react";
import {withRouter} from "react-router";
import {Route, Switch} from 'react-router-dom';
import {LoginMask} from "./LoginMask";
import {RegisterMask} from "./RegisterMask";
import {Dashboard} from "./Dashboard";
import {UserStore} from "../stores/UserStore";
import CircularProgress from '@material-ui/core/CircularProgress';
import Grid from '@material-ui/core/Grid';

interface Props {
    userStore?: UserStore;
}

@withRouter
@inject("userStore")
@observer
export class Loaded extends React.Component<Props, {}> {
    render() {
        if (!this.props.userStore.loaded) {
            return (
                <Grid container spacing={16}>
                    <Grid item xs={12}>
                        <Grid container justify="center" spacing={32}>
                            <Grid item>
                                <CircularProgress size={40}/>
                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>
            );
        }
        return (
            <Switch>
                <Route exact path={"/login"} component={LoginMask}/>
                <Route exact path={"/register"} component={RegisterMask}/>
                <Route component={Dashboard}/>
            </Switch>
        );
    }
}