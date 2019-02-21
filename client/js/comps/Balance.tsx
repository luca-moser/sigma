import * as React from 'react';
import {inject, observer} from 'mobx-react';
import {createStyles, withStyles} from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import {BalanceStore} from "../stores/BalanceStore";


interface Props {
    balStore?: BalanceStore;
}

@inject("balStore")
@observer
export class Balance extends React.Component<Props, {}> {
    render() {
        let {available, total} = this.props.balStore;
        return (
            <div>
                <Typography variant="h5" gutterBottom>
                    Balance
                </Typography>
                <Typography variant="subtitle1">
                    Total: {available} iotas (blocked: {total - available} iotas)
                </Typography>

            </div>
        );
    }
}