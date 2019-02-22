import * as React from 'react';
import {inject, observer} from 'mobx-react';
import {createStyles, withStyles} from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import {BalanceStore} from "../stores/BalanceStore";
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import SvgIcon from '@material-ui/core/SvgIcon';
import HelpOutline from '@material-ui/icons/HelpOutline';
import IconButton from '@material-ui/core/IconButton';
import Button from '@material-ui/core/Button';
import * as css from "./app.scss";


interface Props {
    balStore?: BalanceStore;
}

@inject("balStore")
@observer
export class Balance extends React.Component<Props, {}> {

    openHelpDialog = () => {
        this.props.balStore.updateHelpDialogOpen(true);
    }

    closeHelpDialog = () => {
        this.props.balStore.updateHelpDialogOpen(false);
    }

    render() {
        let {available, total, help_dialog_open} = this.props.balStore;
        return (
            <div>
                <Typography variant="h5" gutterBottom>
                    Balance
                </Typography>
                <Typography variant="subtitle1">
                    Total: {available} iotas (blocked: {total - available} iotas)
                    <IconButton aria-label="Delete" className={css.addrHelpOutlined} onClick={this.openHelpDialog}>
                        <SvgIcon><HelpOutline/></SvgIcon>
                    </IconButton>
                </Typography>
                <Dialog
                    open={help_dialog_open}
                    maxWidth={"md"}
                >
                    <DialogTitle>{"Balance | Help"}</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            Blocked funds become available once the lifetime of the corresponding
                            deposit address ends. If you want funds to become available immediately
                            after they arrive, you must define the expected amount.
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.closeHelpDialog} color="primary">
                            Ok
                        </Button>
                    </DialogActions>
                </Dialog>
            </div>
        );
    }
}