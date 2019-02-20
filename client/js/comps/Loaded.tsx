import {inject, observer} from "mobx-react";
import * as React from "react";
import {withRouter} from "react-router";
import {Route, Switch} from 'react-router-dom';
import {LoginMask} from "./LoginMask";
import {RegisterMask} from "./RegisterMask";
import {Dashboard} from "./Dashboard";
import {UserStore} from "../stores/UserStore";
import CircularProgress from '@material-ui/core/CircularProgress';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';

import * as css from './app.scss';

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
                <div className={css.container}>
                    <Grid container justify="center" spacing={32}>
                        <Grid item>
                            <Typography variant="h5" gutterBottom>
                                Loading <CircularProgress size={20}/>
                            </Typography>
                        </Grid>
                    </Grid>
                </div>
            );
        }
        return (
            <Switch>
                <Route exact path="/login" component={LoginMask}/>
                <Route exact path="/register" component={RegisterMask}/>
                <Route exact path="/activate/:userID/:code" component={RegisterMask}/>
                <Route component={Dashboard}/>
            </Switch>
        );
    }
}