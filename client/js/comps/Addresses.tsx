import * as React from 'react';
import {inject, observer} from 'mobx-react';
import {ApplicationStore} from '../stores/AppStore';
import {createStyles, withStyles} from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import SvgIcon from '@material-ui/core/SvgIcon';
import {AddressesStore} from "../stores/AddressesStore";
import Button from '@material-ui/core/Button';
import Divider from '@material-ui/core/Divider';
import ListItem from '@material-ui/core/ListItem';
import List from '@material-ui/core/List';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import ScheduleOutlined from '@material-ui/icons/ScheduleOutlined';
import HelpOutline from '@material-ui/icons/HelpOutline';
import {default as dateformat} from 'dateformat';
import IconButton from '@material-ui/core/IconButton';
import Tooltip from '@material-ui/core/Tooltip';

const styles = createStyles({
    button: {
        width: 200,
    },
    splitDivider: {
        marginTop: 20,
        marginBottom: 20,
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
class addresses extends React.Component<Props, {}> {
    render() {
        let {classes} = this.props;
        let {amount} = this.props.addrsStore;
        let now = dateformat(new Date(), "dd.mm.yyyy HH:MM:ss");
        return (
            <div>
                <Typography variant="h5" gutterBottom>
                    Receive
                </Typography>

                <Button variant="outlined" className={classes.button}>
                    Generate Address
                </Button>

                <Divider className={classes.splitDivider}/>

                <Typography variant="h6" gutterBottom>
                    Deposit Addresses
                </Typography>

                <Typography component="p" gutterBottom>
                    Your owned deposit addresses which will be used to fund transfers.
                </Typography>

                <List dense>
                    <ListItem disableGutters button>
                        <ListItemIcon><SvgIcon><ScheduleOutlined/></SvgIcon></ListItemIcon>
                        <ListItemText
                            primary="FJGPWOBMGJSOELDOSJGEJIWPIJ..."
                            secondary={`valid until ${now}`}
                        />
                    </ListItem>
                    <ListItem disableGutters button>
                        <ListItemIcon><SvgIcon><ScheduleOutlined/></SvgIcon></ListItemIcon>
                        <ListItemText
                            primary="BLFOEPXXKDJEFsdFDVOIROETIS..."
                            secondary={`valid until ${now}`}
                        />
                    </ListItem>
                </List>
            </div>
        );
    }
}

export let Addresses = withStyles(styles)(addresses);