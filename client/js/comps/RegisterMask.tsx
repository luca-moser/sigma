import * as React from 'react';
import {inject, observer} from 'mobx-react';
import {withRouter} from "react-router";
import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import {RegisterFormState, UserStore} from "../stores/UserStore";
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
export class RegisterMask extends React.Component<Props, {}> {

    updateEmail = (e) => {
        this.props.userStore.updateRegisterEmail(e.target.value);
    }

    updateUsername = (e) => {
        this.props.userStore.updateRegisterUsername(e.target.value);
    }

    updatePassword = (e) => {
        this.props.userStore.updateRegisterPassword(e.target.value);
    }

    updatePasswordConf = (e) => {
        this.props.userStore.updateRegisterPasswordConf(e.target.value);
    }

    render() {
        let {
            register_email, register_username, register_password,
            register_password_conf, registerFormState
        } = this.props.userStore;

        return (
            <div className={css.container}>
                <Grid container justify="center" spacing={32}>
                    <Grid item>
                        <Paper className={[css.defaultPaperBox, css.loginMask].join(" ")}>

                            <Typography variant="h5" gutterBottom>
                                Register
                            </Typography>

                            <Typography component="p" gutterBottom>
                                <Link className={css.link} to={'/login'}>
                                    Already have an account? Login.
                                </Link>
                            </Typography>

                            <TextField
                                label="Username"
                                value={register_username}
                                placeholder=""
                                helperText="no whitespace, min. 4 characters"
                                onChange={this.updateUsername}
                                error={registerFormState === RegisterFormState.InvalidUsername}
                                InputLabelProps={{shrink: true,}}
                                margin="normal"
                                variant="outlined"
                                fullWidth
                            />

                            <TextField
                                label="Email"
                                value={register_email}
                                placeholder=""
                                onChange={this.updateEmail}
                                error={registerFormState === RegisterFormState.InvalidEmail}
                                InputLabelProps={{shrink: true,}}
                                margin="normal"
                                variant="outlined"
                                fullWidth
                            />

                            <TextField
                                label="Password"
                                helperText="no whitespace, min. 4 characters"
                                value={register_password}
                                onChange={this.updatePassword}
                                error={
                                    registerFormState === RegisterFormState.InvalidPassword ||
                                    registerFormState === RegisterFormState.PasswordMismatch
                                }
                                InputLabelProps={{shrink: true,}}
                                type="password"
                                margin="normal"
                                variant="outlined"
                                fullWidth
                            />

                            <TextField
                                label="Password Confirmation"
                                value={register_password_conf}
                                onChange={this.updatePasswordConf}
                                error={
                                    registerFormState === RegisterFormState.InvalidPasswordConf ||
                                    registerFormState === RegisterFormState.PasswordMismatch
                                }
                                helperText={registerFormState === RegisterFormState.PasswordMismatch ? 'mismatch' : ''}
                                InputLabelProps={{shrink: true,}}
                                type="password"
                                margin="normal"
                                variant="outlined"
                                fullWidth
                            />

                            <Button variant="outlined" color="primary"
                                    onClick={this.props.userStore.register}
                                    disabled={registerFormState !== RegisterFormState.Ok}
                                    className={css.loginButton}>
                                Register
                            </Button>
                        </Paper>
                    </Grid>
                </Grid>
            </div>
        );
    }
}