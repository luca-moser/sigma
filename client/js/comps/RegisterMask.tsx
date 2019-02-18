import * as React from 'react';
import {inject, observer} from 'mobx-react';
import {createStyles, withStyles} from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import {RegisterFormState, UserStore} from "../stores/UserStore";
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';


const styles = createStyles({
    button: {
        marginTop: 50,
        width: 200
    },
    progressBar: {
        marginTop: 20
    }
});

interface Props {
    userStore?: UserStore;
    classes?: any;
}

@inject("userStore")
@observer
class registermask extends React.Component<Props, {}> {

    updateEmail = (e) => {
        this.props.userStore.updateEmail(e.target.value);
    }

    updateUsername = (e) => {
        this.props.userStore.updateUsername(e.target.value);
    }

    updatePassword = (e) => {
        this.props.userStore.updateRegisterPassword(e.target.value);
    }

    updatePasswordConf = (e) => {
        this.props.userStore.updateRegisterPasswordConf(e.target.value);
    }

    render() {
        let {classes} = this.props;
        let {register_email, register_username, register_password, register_password_conf, register_form_state} = this.props.userStore;
        return (

            <Grid container className={classes.root} spacing={16}>
                <Grid item xs={12}>
                    <Grid container className={classes.demo} justify="center" spacing={32}>
                        <Grid item>
                            <Paper className={classes.paper}>

                                <Typography variant="h5" gutterBottom>
                                    Login
                                </Typography>

                                <TextField
                                    label="Username"
                                    value={register_username}
                                    placeholder=""
                                    onChange={this.updateUsername}
                                    className={classes.textField}
                                    InputLabelProps={{shrink: true,}}
                                    margin="normal"
                                    fullWidth
                                />

                                <TextField
                                    label="Email"
                                    value={register_email}
                                    placeholder=""
                                    onChange={this.updateEmail}
                                    className={classes.textField}
                                    InputLabelProps={{shrink: true,}}
                                    margin="normal"
                                    fullWidth
                                />

                                <TextField
                                    label="Password"
                                    className={classes.textField}
                                    value={register_password}
                                    onChange={this.updatePassword}
                                    InputLabelProps={{shrink: true,}}
                                    type="password"
                                    margin="normal"
                                    fullWidth
                                />

                                <TextField
                                    label="Password Confirmation"
                                    className={classes.textField}
                                    value={register_password_conf}
                                    onChange={this.updatePassword}
                                    InputLabelProps={{shrink: true,}}
                                    type="password"
                                    margin="normal"
                                    fullWidth
                                />

                                <Button variant="outlined" color="primary"
                                        onClick={this.props.userStore.register}
                                        disabled={register_form_state !== RegisterFormState.Ok}
                                        className={classes.button}>
                                    Register
                                </Button>
                            </Paper>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        );
    }
}


export let RegisterMask = withStyles(styles)(registermask);