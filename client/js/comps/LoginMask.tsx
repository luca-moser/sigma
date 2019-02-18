import * as React from 'react';
import {inject, observer} from 'mobx-react';
import {createStyles, withStyles} from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import {LoginFormState, UserStore} from "../stores/UserStore";
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';
import {Link} from 'react-router-dom';

const styles = createStyles({
    button: {
        marginTop: 50,
        width: 200
    },
    root: {
        marginTop: 100,
    },
    paper: {
        position: 'relative',
        padding: 10,
        width: 600,
        boxSizing: "border-box",
    },
    registerLink: {
        textDecoration: 'none'
    }
});

interface Props {
    userStore?: UserStore;
    classes?: any;
}

@inject("userStore")
@observer
class loginmask extends React.Component<Props, {}> {

    updateEmail = (e) => {
        this.props.userStore.updateEmail(e.target.value);
    }

    updatePassword = (e) => {
        this.props.userStore.updatePassword(e.target.value);
    }

    render() {
        let {classes} = this.props;
        let {email, password, login_form_state} = this.props.userStore;
        return (

            <Grid container className={classes.root} spacing={16}>
                <Grid item xs={12}>
                    <Grid container justify="center" spacing={32}>
                        <Grid item>
                            <Paper className={classes.paper}>

                                <Typography variant="h5" gutterBottom>
                                    Login
                                </Typography>

                                <Typography component="p" gutterBottom>
                                    <Link className={classes.registerLink} to={'/register'}>
                                        No account? Register a new one.
                                    </Link>
                                </Typography>

                                <TextField
                                    label="Email"
                                    value={email}
                                    onChange={this.updateEmail}
                                    className={classes.textField}
                                    InputLabelProps={{shrink: true,}}
                                    margin="normal"
                                    fullWidth
                                />

                                <TextField
                                    label="Password"
                                    className={classes.textField}
                                    value={password}
                                    onChange={this.updatePassword}
                                    InputLabelProps={{shrink: true,}}
                                    type="password"
                                    margin="normal"
                                    fullWidth
                                />

                                <Button variant="outlined" color="primary"
                                        onClick={this.props.userStore.login}
                                        disabled={login_form_state !== LoginFormState.Ok}
                                        className={classes.button}>
                                    Login
                                </Button>
                            </Paper>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        );
    }
}


export let LoginMask = withStyles(styles)(loginmask);