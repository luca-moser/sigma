import * as React from 'react';
import {inject, observer} from 'mobx-react';
import {createStyles, withStyles} from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import {BalanceStore} from "../stores/BalanceStore";

const styles = createStyles({});

interface Props {
    balStore?: BalanceStore;
    classes?: any;
}

@inject("balStore")
@observer
class balance extends React.Component<Props, {}> {
    render() {
        let {classes} = this.props;
        let {available, total} = this.props.balStore;
        return (
            <div>
                <Typography variant="h5" gutterBottom>
                    Balance
                </Typography>
                <Typography variant="subtitle1">
                    Available balance: {available} iotas
                </Typography>
                <Typography variant="subtitle1">
                    Total balance: {total} iotas
                </Typography>

            </div>
        );
    }
}


export let Balance = withStyles(styles)(balance);