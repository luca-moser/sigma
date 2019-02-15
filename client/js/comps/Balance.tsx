import * as React from 'react';
import {inject, observer} from 'mobx-react';
import {ApplicationStore} from '../stores/AppStore';
import {createStyles, withStyles} from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import {BalanceStore} from "../stores/BalanceStore";

const styles = createStyles({});

interface Props {
    appStore?: ApplicationStore;
    balStore?: BalanceStore;
    classes?: any;
}

@inject("appStore")
@inject("balStore")
@observer
class balance extends React.Component<Props, {}> {
    render() {
        let {classes} = this.props;
        let {avail_balance, total_balance} = this.props.balStore;
        return (
            <div>
                <Typography variant="h5" gutterBottom>
                    Balance
                </Typography>
                <Typography variant="subtitle1">
                    Available balance: {avail_balance} iotas
                </Typography>
                <Typography variant="subtitle1">
                    Total balance: {total_balance} iotas
                </Typography>

            </div>
        );
    }
}


export let Balance = withStyles(styles)(balance);