import {action, observable} from 'mobx';
import {FetchConst, fetchOpts} from "../misc/Utils";
import jwtDecode from 'jwt-decode';

export enum LoginFormState {
    Empty,
    Ok,
    InvalidEmail,
    InvalidPassword
}

export enum RegisterFormState {
    Empty,
    Ok,
    InvalidUsername,
    InvalidEmail,
    InvalidPassword,
    InvalidPasswordConf,
}

const loginRoute = "/login";
const tokenKey = "token";

export class User {
    id: string;
    username: string;
    email: string;
    admin: boolean;
    confirmed: boolean;
    last_access: string;
    last_login: string;
}

class UserJWTClaims {
    user_id: string;
    username: string;
    auth: boolean;
    confirmed: boolean;
    admin: boolean;
}

class LoginRes {
    token: string;
    user: User;
}

export class UserStore {
    @observable authenticated: boolean = false;
    @observable loaded: boolean = false;
    @observable load_error: string = "";
    @observable username: string = "";

    // login form
    @observable email: string = "";
    @observable password: string = "";
    @observable login_form_state = LoginFormState.Empty;
    @observable login_error: string = "";
    @observable logging_in: boolean = false;

    // register form
    @observable register_password: string = "";
    @observable register_password_conf: string = "";
    @observable register_username: string = "";
    @observable register_email: string = "";
    @observable register_form_state = RegisterFormState.Empty;

    constructor() {
        this.verifyStoredToken();
    }

    verifyStoredToken = async () => {
        let token = localStorage.getItem(tokenKey);
        if (!token) {
            this.updateLoaded(true);
            return;
        }
        try {
            let req = await fetch(`/user/id`, {
                headers: {
                    [FetchConst.Authorization]: `Bearer ${token}`
                }
            });
            if (req.status !== 200) {
                // jwt token invalid
                localStorage.removeItem(tokenKey);
                this.updateLoaded(true);
                return;
            }
            let claims: UserJWTClaims = jwtDecode(token);
            this.updateUsername(claims.username);
            this.updateAuth(true);
        } catch (err) {
            this.updateLoadError(err);
        }
        this.updateLoaded(true);
    }

    login = async () => {
        let credentials = JSON.stringify({email: this.email, password: this.password});
        try {
            this.updateLoggingIn(true);
            let res = await fetch(loginRoute, fetchOpts(credentials));
            if (res.status !== 200) {
                let errorText = await res.text();
                this.updateLoginError(errorText);
                this.updateLoggingIn(false);
                return;
            }
            let data: LoginRes = await res.json();
            localStorage.setItem(tokenKey, JSON.stringify(data.token));
            this.updateAuth(true);
        } catch (err) {
            this.updateLoginError(err);
        }
        this.updateLoggingIn(false);
    }

    register = async () => {

    }

    @action
    updateRegisterPassword = (pw: string) => this.register_password = pw;

    @action
    updateRegisterPasswordConf = (pw: string) => this.register_password_conf = pw;

    @action
    updateRegisterUsername = (username: string) => this.register_username = username;

    @action
    updateRegisterEmail = (email: string) => this.register_email = email;

    @action
    updateLoginError = (err: any) => this.login_error = err;

    @action
    updateAuth = (auth: boolean) => this.authenticated = auth;

    @action
    updateLoggingIn = (doing: boolean) => this.logging_in = doing;

    @action
    updateLoaded = (loaded: boolean) => this.loaded = loaded;

    @action
    updateLoadError = (err: any) => this.load_error = err;

    @action
    updateUsername = (username: string) => this.username = username;

    @action
    updateEmail = (email: string) => this.email = email;

    @action
    updatePassword = (password: string) => this.password = password;

}

export var UserStoreInstance = new UserStore();