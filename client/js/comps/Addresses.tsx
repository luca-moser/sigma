import * as React from 'react';
import {inject, observer} from 'mobx-react';
import Typography from '@material-ui/core/Typography';
import {AddressesStore} from "../stores/AddressesStore";
import Button from '@material-ui/core/Button';
import Divider from '@material-ui/core/Divider';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import ScheduleOutlined from '@material-ui/icons/ScheduleOutlined';
import TextField from '@material-ui/core/TextField';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import SvgIcon from '@material-ui/core/SvgIcon';
import HelpOutline from '@material-ui/icons/HelpOutline';
import IconButton from '@material-ui/core/IconButton';
import {default as dateformat} from 'dateformat';
import copy from 'copy-to-clipboard';

import * as css from './app.scss';

interface Props {
    addrsStore?: AddressesStore;
}

@inject("addrsStore")
@observer
export class Addresses extends React.Component<Props, {}> {

    generateAddress = () => {
        this.props.addrsStore.generateAddress();
    }

    copyLink = () => {
        copy(this.props.addrsStore.generated_link);
    }

    updateExpectedAmount = (e) => {
        this.props.addrsStore.updateExpectedAmount(e.target.value);
    }

    openHelpDialog = () => {
        this.props.addrsStore.updateHelpDialogOpen(true);
    }

    closeHelpDialog = () => {
        this.props.addrsStore.updateHelpDialogOpen(false);
    }

    render() {
        let {
            addrs, generating, generated_addr, generated_link,
            expected_amount, help_dialog_open,
        } = this.props.addrsStore;
        let now = dateformat(new Date(), "dd.mm.yyyy HH:MM:ss");
        return (
            <div>
                <Typography variant="h5" gutterBottom>
                    Receive
                </Typography>

                <TextField
                    label="Expected amount (optional)"
                    value={expected_amount}
                    placeholder=""
                    type="number"
                    onChange={this.updateExpectedAmount}
                    InputLabelProps={{shrink: true,}}
                    margin="normal"
                    variant="outlined"
                    fullWidth
                />

                <Button variant="outlined"
                        className={css.button} onClick={this.generateAddress}
                        disabled={generating}
                >
                    Generate Address
                </Button>

                <IconButton aria-label="Delete" className={css.addrHelpOutlined} onClick={this.openHelpDialog}>
                    <SvgIcon><HelpOutline/></SvgIcon>
                </IconButton>

                {
                    generated_link !== null &&
                    <React.Fragment>
                        <Typography component="p" gutterBottom className={css.genLink}>
                            {generated_link}
                        </Typography>
                        <Button
                            className={css.linkCopyButton} onClick={this.copyLink}
                        >
                            Copy Magnet Link
                        </Button>
                    </React.Fragment>
                }

                <Dialog
                    open={help_dialog_open}
                    maxWidth={"md"}
                >
                    <DialogTitle>{"Address | Help"}</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            Generated addresses have a lifetime of 30 minutes. After the lifetime ends,
                            the funds on the deposit address become available for funding new transactions.
                        </DialogContentText>
                        <DialogContentText>
                            If you specify an amount, the funds will be available as soon
                            as they arrive at your deposit address.
                            Additionally, if you specify the amount, your depositor doesn't have to type in
                            the amount manually. You must supply depositors with the entire magnet-link.
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.closeHelpDialog} color="primary">
                            Ok
                        </Button>
                    </DialogActions>
                </Dialog>

                <Divider className={css.splitDivider}/>

                <AddressList/>
            </div>
        );
    }
}

@inject("addrsStore")
@observer
class AddressList extends React.Component<Props, {}> {

    render() {
        let {listItems, addrs} = this.props.addrsStore;
        return (
            <React.Fragment>
                <Typography variant="subtitle2" gutterBottom>
                    Deposit Addresses {addrs.size === 0 ? '' : `(${addrs.size})`}
                </Typography>

                {
                    addrs.size === 0 ?
                        <Typography component="p" gutterBottom>
                            No deposit addresses have been allocated yet.
                        </Typography>
                        :
                        <React.Fragment>
                            <Typography component="p" gutterBottom>
                                Your owned deposit addresses which will be used to fund transfers.
                            </Typography>
                            <List dense className={css.addrsList}>
                                {listItems}
                            </List>
                        </React.Fragment>
                }

            </React.Fragment>
        );
    }
}