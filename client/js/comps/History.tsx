import * as React from 'react';
import {inject, observer} from 'mobx-react';
import Typography from '@material-ui/core/Typography';
import List from '@material-ui/core/List';
import {HistoryStore} from "../stores/HistoryStore";

import * as css from './app.scss';

interface Props {
    historyStore?: HistoryStore;
}

@inject("historyStore")
@observer
export class History extends React.Component<Props, {}> {
    render() {
        let {listItems, items} = this.props.historyStore;
        return (
            <div>
                <Typography variant="subtitle2" gutterBottom>
                    History {items.size === 0 ? '' : `(${items.size})`}
                </Typography>
                {
                    items.size === 0 ?
                        <Typography component="p" gutterBottom>
                            There are no history items to display yet.
                        </Typography>
                    :
                    <List className={css.history}>
                        {listItems}
                    </List>
                }
            </div>
        );
    }
}