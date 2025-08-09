// import { encrypt, decrypt } from '@msf/msf-reactjs-weblib-base'
import { decrypt, encrypt } from './encryption';

const AppSettings = {
    localStorageEncryptionEnabled: true
}

export const storeItemByKey = function (key: string, value:any) {
    if (AppSettings.localStorageEncryptionEnabled) {
        window.localStorage.setItem(encrypt(key), encrypt(value));
    }
    else {
        window.localStorage.setItem(key, value);
    }
}

export const getItemByKey = function (key: string) {
    if (AppSettings.localStorageEncryptionEnabled) {
        let val = window.localStorage.getItem(encrypt(key));
        if (!val) return val;
        return decrypt(val);
    } else {
        return window.localStorage.getItem(key);
    }
}

export const getItemFromSessionStorage = function (key:string) {

    if (AppSettings.localStorageEncryptionEnabled) {
        let val = window.sessionStorage.getItem(encrypt(key));
        if (!val) return val;
        return JSON.parse(decrypt(val));
    }
    // else {
    return JSON.parse(window.sessionStorage.getItem(key)!);
    // }
}

export const storeToSessionStorage = function (key: string, value:any) {
    if (AppSettings.localStorageEncryptionEnabled) {
        window.sessionStorage.setItem(encrypt(key), encrypt(JSON.stringify(value)));
    }
    else {
        window.sessionStorage.setItem(key, JSON.stringify(value));
    }
}

export const RemoveSessionStorage = function (key:string) {
    if (AppSettings.localStorageEncryptionEnabled) {
        window.sessionStorage.removeItem(encrypt(key));
    }
    else {
        window.sessionStorage.removeItem(key);
    }
}

export const clearSession = function () {
    window.sessionStorage.clear();
}

export const clearLocal = function () {
    window.localStorage.clear();
}
