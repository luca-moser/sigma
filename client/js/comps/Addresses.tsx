import * as React from 'react';
import {inject, observer} from 'mobx-react';
import Typography from '@material-ui/core/Typography';
import SvgIcon from '@material-ui/core/SvgIcon';
import {AddressesStore} from "../stores/AddressesStore";
import Button from '@material-ui/core/Button';
import Divider from '@material-ui/core/Divider';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import FileCopyOutlined from '@material-ui/icons/FileCopyOutlined';
import ScheduleOutlined from '@material-ui/icons/ScheduleOutlined';
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

    render() {
        let {addrs, generating, generated_addr, generated_link} = this.props.addrsStore;
        let now = dateformat(new Date(), "dd.mm.yyyy HH:MM:ss");
        return (
            <div>
                <Typography variant="h5" gutterBottom>
                    Receive
                </Typography>

                <Button variant="outlined"
                        className={css.button} onClick={this.generateAddress}
                        disabled={generating}
                >
                    Generate Address
                </Button>

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
        let {addrs} = this.props.addrsStore;

        let items = [];
        for (let [key, value] of addrs) {
            items.push(
                <ListItem disableGutters button key={key}>
                    <ListItemIcon><SvgIcon><ScheduleOutlined/></SvgIcon></ListItemIcon>
                    <ListItemText
                        primary={`${value.address.substring(0, 15)}...`}
                        secondary={`usable for funding after ${dateformat(value.timeout_at, "dd.mm.yyyy HH:MM:ss")}`}
                    />
                </ListItem>
            )
        }

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
                                {items}
                            </List>
                        </React.Fragment>
                }

            </React.Fragment>
        );
    }
}