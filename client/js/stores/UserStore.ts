import {action, computed, observable} from 'mobx';
import {FetchConst, fetchOpts, hasNoWhitespace, Routes, validateEmail} from "../misc/Utils";
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
    PasswordMismatch,
}

export enum RegisterError {
    None,
    Unknown,
    UsernameTaken = "username taken",
    EmailTaken = "email taken",
}

let registerErrorText = {
    [RegisterError.UsernameTaken]: "Username is already taken.",
    [RegisterError.EmailTaken]: "Email is already taken.",
}

export enum LoginError {
    None,
    Unknown,
    UserNotFound = "user not found",
    WrongPassword = "wrong password"
}

let loginErrorText = {
    [LoginError.UserNotFound]: "Account doesn't exist (unknown email).",
    [LoginError.WrongPassword]: "Wrong password.",
}

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
    @observable login_email: string = "";
    @observable login_password: string = "";
    @observable login_error = LoginError.None;
    @observable login_error_text: string = "";
    @observable logging_in: boolean = false;

    // register form
    @observable register_password: string = "";
    @observable register_password_conf: string = "";
    @observable register_username: string = "";
    @observable register_email: string = "";
    @observable register_error = RegisterError.None;
    @observable register_error_text: string = "";
    @observable registering: boolean = false;
    @observable registered: boolean = false;

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
        let credentials = JSON.stringify({email: this.login_email, password: this.login_password});
        try {
            this.updateLoggingIn(true);
            let res = await fetch(Routes.LOGIN, fetchOpts(credentials));
            if (res.status !== 200) {
                let errorText = await res.text();
                if (errorText.includes(LoginError.UserNotFound)) {
                    this.updateLoginError(LoginError.UserNotFound, loginErrorText[LoginError.UserNotFound]);
                } else if (errorText.includes(LoginError.WrongPassword)) {
                    this.updateLoginError(LoginError.WrongPassword, loginErrorText[LoginError.WrongPassword]);
                } else {
                    this.updateLoginError(LoginError.Unknown, errorText);
                }
                this.updateLoggingIn(false);
                return;
            }
            let data: LoginRes = await res.json();
            console.log("storing jwt token into local storage");
            localStorage.setItem(tokenKey, JSON.stringify(data.token));
            this.updateAuth(true);
        } catch (err) {
            this.updateLoginError(LoginError.Unknown, err);
        }
        this.updateLoggingIn(false);
    }

    register = async () => {
        let registration = JSON.stringify({
            username: this.register_username,
            email: this.register_email,
            password: this.register_password,
            // TODO: add
            recaptcha: "",
        });
        try {
            this.updateRegistering(true);
            let req = await fetch(Routes.REGISTER, fetchOpts(registration));
            if (req.status !== 200) {
                let errorText = await req.text();
                if (errorText.includes(RegisterError.UsernameTaken)) {
                    this.updateRegistrationError(RegisterError.UsernameTaken, registerErrorText[RegisterError.UsernameTaken]);
                } else if (errorText.includes(RegisterError.EmailTaken)) {
                    this.updateRegistrationError(RegisterError.EmailTaken, registerErrorText[RegisterError.EmailTaken]);
                } else {
                    this.updateRegistrationError(RegisterError.Unknown, errorText);
                }
                this.updateRegistering(false);
                return;
            }
            this.updateRegistered(true);
        } catch (err) {
            this.updateRegistrationError(RegisterError.Unknown, err);
        }
        this.updateRegistering(false);
    }

    @computed get loginFormState(): LoginFormState {
        if (!this.login_email && !this.login_password) {
            return LoginFormState.Empty;
        }
        if (!validateEmail(this.login_email)) {
            return LoginFormState.InvalidEmail;
        }
        if (!hasNoWhitespace(this.login_password) || this.login_password.length < 4) {
            return LoginFormState.InvalidPassword;
        }
        return LoginFormState.Ok;
    }

    @computed get registerFormState(): RegisterFormState {
        if (!this.register_username &&
            !this.register_password &&
            !this.register_password_conf &&
            !this.register_email) {
            return RegisterFormState.Empty;
        }
        if (!hasNoWhitespace(this.register_username) || this.register_username.length < 4) {
            return RegisterFormState.InvalidUsername;
        }
        if (!validateEmail(this.register_email)) {
            return RegisterFormState.InvalidEmail;
        }
        if (!hasNoWhitespace(this.register_password) || this.register_password.length < 4) {
            return RegisterFormState.InvalidPassword;
        }
        if (!hasNoWhitespace(this.register_password_conf) || this.register_password_conf.length < 4) {
            return RegisterFormState.InvalidPasswordConf;
        }
        if (this.register_password !== this.register_password_conf) {
            return RegisterFormState.PasswordMismatch;
        }
        return RegisterFormState.Ok;
    }

    @action
    updateLoginError = (err: LoginError, text: string) => {
        this.login_error = err;
        this.login_error_text = text;
    }

    @action
    updateRegistered = (registered: boolean) => this.registered = registered;

    @action
    updateRegistrationError = (err: RegisterError, text: string) => {
        this.register_error = err;
        this.register_error_text = text;
    }

    @action
    updateRegistering = (registering: boolean) => this.registering = registering;

    @action
    updateRegisterPassword = (pw: string) => this.register_password = pw;

    @action
    updateRegisterPasswordConf = (pw: string) => this.register_password_conf = pw;

    @action
    updateRegisterUsername = (username: string) => this.register_username = username;

    @action
    updateRegisterEmail = (email: string) => this.register_email = email;

    @action
    updateAuth = (auth: boolean) => this.authenticated = auth;

    @action
    updateLoggingIn = (doing: boolean) => this.logging_in = doing;

    @action
    updateLoaded = (loaded: boolean) => this.loaded = loaded;

    @action
    updateLoadError = (err: any) => this.load_error = err;

    @action
    updateLoginEmail = (email: string) => {
        this.login_email = email;
        this.login_error = LoginError.None;
    }

    @action
    updateLoginPassword = (password: string) => {
        this.login_password = password;
        this.login_error = LoginError.None;
    }

    @action
    updateUsername = (username: string) => this.username = username;

}

export var UserStoreInstance = new UserStore();