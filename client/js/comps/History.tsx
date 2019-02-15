import * as React from 'react';
import {inject, observer} from 'mobx-react';
import {ApplicationStore} from '../stores/AppStore';
import {createStyles, withStyles} from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import SvgIcon from '@material-ui/core/SvgIcon';
import ChevronLeftOutlined from '@material-ui/icons/ChevronLeftOutlined';
import ChevronRightOutlined from '@material-ui/icons/ChevronRightOutlined';
import {AddressesStore} from "../stores/AddressesStore";
import ListItem from '@material-ui/core/ListItem';
import List from '@material-ui/core/List';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';

const styles = createStyles({
    button: {
        width: 200,
        marginBottom: 20,
    },
    receive: {
        color: "#22e87f",
    },
    sent: {
        color: "#e6096a",
    }
});

interface Props {
    appStore?: ApplicationStore;
    addrsStore?: AddressesStore;
    classes?: any;
}

@inject("appStore")
@inject("addrsStore")
@observer
class history extends React.Component<Props, {}> {
    render() {
        let {classes} = this.props;
        let {amount} = this.props.addrsStore;
        return (
            <div>
                <Typography variant="h5" gutterBottom>
                    History
                </Typography>
                <List>
                    <ListItem disableGutters button className={classes.receive}  dense>
                        <ListItemIcon><SvgIcon><ChevronLeftOutlined/></SvgIcon></ListItemIcon>
                        <ListItemText primary="+100i | DJNLCKBULVLHTOBRUIPBVRKTKFOEHEXIN9YF..." secondary="receive"/>
                    </ListItem>
                    <ListItem disableGutters button className={classes.sent} dense>
                        <ListItemIcon><SvgIcon><ChevronRightOutlined/></SvgIcon></ListItemIcon>
                        <ListItemText primary="-50i | OPLKPFEXLRGAGKUFYUPXJPULHHNKEL9SDFYLW..." secondary="sent"/>
                    </ListItem>
                </List>
            </div>
        );
    }
}

export let History = withStyles(styles)(history);