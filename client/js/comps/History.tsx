import * as React from 'react';
import {inject, observer} from 'mobx-react';
import {ApplicationStore} from '../stores/AppStore';
import {createStyles, withStyles} from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import SvgIcon from '@material-ui/core/SvgIcon';
import ChevronLeftOutlined from '@material-ui/icons/ChevronLeftOutlined';
import ChevronRightOutlined from '@material-ui/icons/ChevronRightOutlined';
import ListItem from '@material-ui/core/ListItem';
import List from '@material-ui/core/List';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import {HistoryStore} from "../stores/HistoryStore";

const styles = createStyles({
    button: {
        width: 200,
        marginBottom: 20,
    },
    receive: {
        color: "#008040",
    },
    sent: {
        color: "#e6096a",
    },
});

interface Props {
    historyStore?: HistoryStore;
    classes?: any;
}

@inject("historyStore")
@observer
class history extends React.Component<Props, {}> {
    render() {
        let {classes} = this.props;
        let {items} = this.props.historyStore;
        return (
            <div>
                <Typography variant="h5" gutterBottom>
                    History
                </Typography>
                <List>
                    <ListItem disableGutters button className={classes.receive} dense>
                        <ListItemIcon><SvgIcon><ChevronLeftOutlined/></SvgIcon></ListItemIcon>
                        <ListItemText classes={{
                            primary: classes.receive,
                            secondary: classes.receive
                        }} primary="+100i | DJNLCKBULVLHTOBRUIPBVRKTKFOEHEXIN9YF..." secondary="receive"/>
                    </ListItem>
                    <ListItem disableGutters button className={classes.sent} dense>
                        <ListItemIcon><SvgIcon><ChevronRightOutlined/></SvgIcon></ListItemIcon>
                        <ListItemText classes={{
                            primary: classes.sent,
                            secondary: classes.sent
                        }} primary="-50i | OPLKPFEXLRGAGKUFYUPXJPULHHNKEL9SDFYLW..." secondary="sent"/>
                    </ListItem>
                </List>
            </div>
        );
    }
}

export let History = withStyles(styles)(history);