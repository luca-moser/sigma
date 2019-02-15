import {Balance} from "./Balance";
import * as React from 'react';
import {inject, observer} from 'mobx-react';
import {ApplicationStore} from '../stores/AppStore';
import {createStyles, withStyles} from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';
import {Send} from "./Send";
import {Addresses} from "./Addresses";
import {History} from "./History";
import Divider from '@material-ui/core/Divider';

declare var __DEVELOPMENT__;

const styles = createStyles({
    root: {
        flexGrow: 1,
        marginTop: 100,
    },
    paper: {
        height: 500,
        width: 500,
        padding: 10,
        boxSizing: "border-box",
    },
    splitDivider: {
        marginTop: 20,
        marginBottom: 20,
    }
});

interface Props {
    appStore?: ApplicationStore;
    classes?: any;
}

@inject("appStore")
@observer
class dashboard extends React.Component<Props, {}> {
    render() {
        let {classes} = this.props;
        return (
            <Grid container className={classes.root} spacing={16}>
                <Grid item xs={12}>
                    <Grid container className={classes.demo} justify="center" spacing={32}>
                        <Grid item>
                            <Paper className={classes.paper}>
                                <Balance/>
                                <Divider className={classes.splitDivider}/>
                                <History/>
                            </Paper>
                        </Grid>
                        <Grid item>
                            <Paper className={classes.paper}>
                                <Send/>
                            </Paper>
                        </Grid>
                        <Grid item>
                            <Paper className={classes.paper}>
                                <Addresses/>
                            </Paper>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        );
    }
}


export let Dashboard = withStyles(styles)(dashboard);