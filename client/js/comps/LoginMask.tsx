import * as React from 'react';
import {inject, observer} from 'mobx-react';
import {Redirect, withRouter} from "react-router";
import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import {LoginError, LoginFormState, UserStore} from "../stores/UserStore";
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';
import LinearProgress from '@material-ui/core/LinearProgress';
import {Link} from 'react-router-dom';

import * as css from './app.scss';

interface Props {
    userStore?: UserStore;
}

@withRouter
@inject("userStore")
@observer
export class LoginMask extends React.Component<Props, {}> {

    updateEmail = (e) => {
        this.props.userStore.updateLoginEmail(e.target.value);
    }

    updatePassword = (e) => {
        this.props.userStore.updateLoginPassword(e.target.value);
    }

    loginViaEnterKey = (e) => {
        if (e.key !== "Enter" || this.props.userStore.loginFormState !== LoginFormState.Ok) return;
        this.props.userStore.login();
    }

    render() {
        let {
            login_email, login_password, loginFormState, logging_in,
            login_error, login_error_text, authenticated
        } = this.props.userStore;
        if (authenticated) {
            return <Redirect to="/dashboard"/>;
        }
        return (
            <div className={css.container}>
                <Grid className={css.container} container justify="center" spacing={32}>
                    <Grid item>
                        <Paper className={[css.defaultPaperBox, css.loginMask].join(" ")}>

                            <Typography variant="h5" gutterBottom>
                                Login
                            </Typography>

                            <Typography component="p" gutterBottom>
                                <Link className={css.link} to={'/register'}>
                                    Don't have an account? Register a new one.
                                </Link>
                            </Typography>

                            <TextField
                                label="Email"
                                value={login_email}
                                onChange={this.updateEmail}
                                onKeyDown={this.loginViaEnterKey}
                                InputLabelProps={{shrink: true,}}
                                margin="normal"
                                error={
                                    loginFormState === LoginFormState.InvalidEmail ||
                                    login_error === LoginError.UserNotFound
                                }
                                variant="outlined"
                                fullWidth
                            />

                            <TextField
                                label="Password"
                                value={login_password}
                                onChange={this.updatePassword}
                                onKeyDown={this.loginViaEnterKey}
                                InputLabelProps={{shrink: true,}}
                                error={
                                    loginFormState === LoginFormState.InvalidPassword ||
                                    login_error === LoginError.WrongPassword
                                }
                                type="password"
                                margin="normal"
                                variant="outlined"
                                fullWidth
                            />

                            {
                                login_error !== LoginError.None &&
                                <Typography component="p" gutterBottom className={css.errorText}>
                                    {login_error_text}
                                </Typography>
                            }

                            <Button variant="outlined" color="primary"
                                    onClick={this.props.userStore.login}
                                    disabled={loginFormState !== LoginFormState.Ok || logging_in}
                                    className={css.loginButton}>
                                Login
                            </Button>

                            {logging_in && <LinearProgress className={css.progressBar}/>}
                        </Paper>
                    </Grid>
                </Grid>
            </div>
        );
    }
}