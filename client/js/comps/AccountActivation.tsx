import * as React from 'react';
import {inject, observer} from 'mobx-react';
import {ActivationError, UserStore} from "../stores/UserStore";
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import {Route, Switch} from 'react-router-dom';
import {Redirect, withRouter} from "react-router";

import * as css from './app.scss';

declare var __DEVELOPMENT__;

interface Props {
    userStore?: UserStore;
    match?: {
        params: {
            userID: string,
            code: string,
        }
    }
}

@withRouter
@inject("userStore")
@observer
export class AccountActivation extends React.Component<Props, {}> {

    componentWillMount() {
        let {userID, code} = this.props.match.params;
        this.props.userStore.activateAccount(userID, code);
    }

    render() {
        let {acc_activation_error, acc_activation_error_text, authenticated} = this.props.userStore;
        if (authenticated) {
            return <Redirect to="/dashboard"/>
        }
        return (
            <div className={css.container}>
                <Grid className={css.container} container justify="center" spacing={32}>
                    <Grid item>
                        <Paper className={[css.defaultPaperBox].join(" ")}>
                            <Typography variant="h5" gutterBottom>
                                Account Activation
                            </Typography>

                            {
                                acc_activation_error !== ActivationError.None &&
                                <Typography component="p" gutterBottom>
                                    Couldn't activate account: {acc_activation_error_text}
                                </Typography>
                            }

                        </Paper>
                    </Grid>
                </Grid>
            </div>
        );
    }
}