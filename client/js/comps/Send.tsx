import * as React from 'react';
import {inject, observer} from 'mobx-react';
import {ApplicationStore} from '../stores/AppStore';
import {createStyles, withStyles} from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import MenuItem from '@material-ui/core/MenuItem';
import Button from '@material-ui/core/Button';
import {FormState, SendStore, unitMap} from "../stores/SendStore";
import LinearProgress from '@material-ui/core/LinearProgress';


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
    appStore?: ApplicationStore;
    sendStore?: SendStore;
    classes?: any;
}

@inject("appStore")
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

    render() {
        let {classes} = this.props;
        let {unit, amount, link, form_state, sending} = this.props.sendStore;
        return (
            <div>
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
                    margin="normal"
                    fullWidth
                />

                <Button variant="outlined" color="primary" disabled={form_state !== FormState.Ok}
                        className={classes.button}>
                    Send
                </Button>

                {sending && <LinearProgress className={classes.progressBar}/>}
            </div>
        );
    }
}


export let Send = withStyles(styles)(send);