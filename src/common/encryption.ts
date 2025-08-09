import CryptoJS from 'crypto-js';
// let CryptoJS = require('crypto-js');
const apiConfig={
    encryptionKey: process.env.REACT_APP_SECRET_KEY
} as {encryptionKey:string}
console.log(process.env);

export const encrypt = (value:string) => {
    let wordArray = CryptoJS.enc.Utf8.parse(apiConfig.encryptionKey);
    let skey = CryptoJS.enc.Base64.stringify(wordArray);
    let ekey = CryptoJS.enc.Base64.parse(skey);
    let edata = CryptoJS.AES.encrypt(value, ekey, { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 });
    return edata.ciphertext.toString(CryptoJS.enc.Base64);
}

export const decrypt = (value:string) => {
    let wordArray = CryptoJS.enc.Utf8.parse(apiConfig.encryptionKey);
    let skey = CryptoJS.enc.Base64.stringify(wordArray);
    let ekey = CryptoJS.enc.Base64.parse(skey);
    let bytes = CryptoJS.AES.decrypt(value, ekey, { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 });
    return bytes.toString(CryptoJS.enc.Utf8);
}