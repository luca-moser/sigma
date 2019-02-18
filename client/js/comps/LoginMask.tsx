import * as React from 'react';
import {inject, observer} from 'mobx-react';
import {withRouter} from "react-router";
import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import {LoginFormState, UserStore} from "../stores/UserStore";
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';
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

    render() {
        let {login_email, login_password, loginFormState, logging_in} = this.props.userStore;
        console.log(loginFormState);
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
                                InputLabelProps={{shrink: true,}}
                                margin="normal"
                                error={loginFormState === LoginFormState.InvalidEmail}
                                variant="outlined"
                                fullWidth
                            />

                            <TextField
                                label="Password"
                                value={login_password}
                                onChange={this.updatePassword}
                                InputLabelProps={{shrink: true,}}
                                error={loginFormState === LoginFormState.InvalidPassword}
                                type="password"
                                margin="normal"
                                variant="outlined"
                                fullWidth
                            />

                            <Button variant="outlined" color="primary"
                                    onClick={this.props.userStore.login}
                                    disabled={loginFormState !== LoginFormState.Ok || logging_in}
                                    className={css.loginButton}>
                                Login
                            </Button>
                        </Paper>
                    </Grid>
                </Grid>
            </div>
        );
    }
}