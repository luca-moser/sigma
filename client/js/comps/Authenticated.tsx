import {inject, observer} from "mobx-react";
import * as React from "react";
import {UserStore} from "../stores/UserStore";
import {Redirect, withRouter} from "react-router";

interface Props {
    userStore?: UserStore;
}

export function withAuth(Wrapped) {
    @withRouter
    @inject("userStore")
    @observer
    class authenticated extends React.Component<Props, {}> {
        render() {
            if (!this.props.userStore.authenticated) {
                return <Redirect to="/login"/>;
            }
            return <Wrapped {...this.props} />;
        }
    }
    return authenticated;
}