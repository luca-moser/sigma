import * as React from 'react';
import {inject, observer} from 'mobx-react';
import {createStyles, withStyles} from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import MenuItem from '@material-ui/core/MenuItem';
import Button from '@material-ui/core/Button';
import {FormState, SendRecType, SendStore, stateTypeToString, unitMap} from "../stores/SendStore";
import LinearProgress from '@material-ui/core/LinearProgress';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';

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
    sendStore?: SendStore;
    classes?: any;
}

@inject("sendStore")
@observer
class send extends React.Component<Props, {}> {

    updateUnit = (e) => {
        this.props.sendStore.updateUnit(e.target.value);
    }

    updateAmount = (e) => {
        this.props.sendStore.updateAmount(e.target.value);
    }

    updateDest = (e) => {
        this.props.sendStore.updateLink(e.target.value);
    }

    send = () => {
        this.props.sendStore.send();
    }

    resetSendState = () => {
        this.props.sendStore.resetSendState();
    }

    render() {
        let {classes} = this.props;
        let {unit, amount, link, form_state, sending, send_state, stream_connected, tail} = this.props.sendStore;
        return (
            <React.Fragment>
                <Typography variant="h5" gutterBottom>
                    Send
                </Typography>

                <Typography component="p" gutterBottom>
                    Use a magnet-link you received from the recipient in order to send her/him
                    some iotas.
                </Typography>

                <TextField
                    id="outlined-number"
                    label="Recipient Magnet-Link"
                    value={link}
                    placeholder="link"
                    onChange={this.updateDest}
                    helperText="The magnet-link of the recipient"
                    className={classes.textField}
                    InputLabelProps={{shrink: true,}}
                    disabled={!stream_connected || sending}
                    margin="normal"
                    fullWidth
                />

                <TextField
                    id="outlined-select-currency"
                    select
                    label="Unit"
                    className={classes.textField}
                    value={unit}
                    onChange={this.updateUnit}
                    SelectProps={{
                        MenuProps: {
                            className: classes.menu,
                        },
                    }}
                    disabled={!stream_connected || sending}
                    helperText="Please select the unit"
                    margin="normal"
                    fullWidth
                >
                    {Object.keys(unitMap).map(key => {
                        return <MenuItem key={key} value={key}>
                            {unitMap[key]}
                        </MenuItem>
                    })}
                </TextField>

                <TextField
                    id="outlined-number"
                    label="Amount"
                    value={amount}
                    onChange={this.updateAmount}
                    type="number"
                    helperText="The amount of iotas to send"
                    className={classes.textField}
                    InputLabelProps={{shrink: true,}}
                    disabled={!stream_connected || sending}
                    margin="normal"
                    fullWidth
                />

                <Button variant="outlined" color="primary"
                        disabled={form_state !== FormState.Ok || !stream_connected || sending}
                        className={classes.button} onClick={this.send}>
                    {sending ?
                        send_state === -1 ?  "WAITING" : <span>{stateTypeToString[send_state]}</span>
                        :
                        "Send"
                    }
                </Button>

                {sending && <LinearProgress className={classes.progressBar}/>}

                <Dialog
                    open={send_state === SendRecType.SentOff}
                    maxWidth={"md"}
                >
                    <DialogTitle >{"Transaction Sent"}</DialogTitle>
                    <DialogContent>
                        <DialogContentText id="alert-dialog-description">
                            Your transaction has been sent off with the tail {tail}.
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.resetSendState} color="primary">
                            Ok
                        </Button>
                    </DialogActions>
                </Dialog>
            </React.Fragment>
        );
    }
}


export let Send = withStyles(styles)(send);