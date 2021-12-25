const axios = require('axios');
const cheerio = require('cheerio');
const { app, BrowserWindow, session, ipcMain, nativeImage } = require('electron');
const request = require('request');
const path = require('path');

let win;
app.on('ready', () => {
    win = new BrowserWindow({
        width: 800,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,

        },
        titleBarOverlay: false
    });
    win.loadFile(path.join(__dirname, './pages/login/login.html'));
    win.setTitle('Login');
});


let DOMAIN;
let BASE_URL;
let BASE_URL_MY_APPS;


ipcMain.on('login', async (_, { email, password, domain, scheme }) => {
    DOMAIN = domain;
    BASE_URL = scheme + '://' + DOMAIN;
    BASE_URL_MY_APPS = BASE_URL + '/myapps';
    launchFlow(email, password).catch((e) => _.reply('login-error', e));
});

async function login(username, password) {
    return new Promise((res, rej) => {
        var options = {
            'method': 'POST',
            'url': BASE_URL_MY_APPS + '/FL_Login/Login',
            'headers': {
                'Connection': 'keep-alive',
                'Cache-Control': 'max-age=0',
                'Upgrade-Insecure-Requests': '1',
                'Origin': BASE_URL,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                'Sec-GPC': '1',
                'Sec-Fetch-Site': 'same-origin',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-User': '?1',
                'Sec-Fetch-Dest': 'document',
                'Referer': BASE_URL_MY_APPS,
                'Accept-Language': 'es-ES,es;q=0.9',
            },
            form: {
                'UserName': username,
                'Password': password,
            },
            followAllRedirects: true
        };

        const cookieJar = request.jar();

        request({ jar: cookieJar, ...options }, function (error, response) {
            if (error) return rej(error);
            const cookies = cookieJar.getCookies(options.url);
            if (!response.body.includes('LaunchApps')) return rej(new Error('Invalid response. Check credentials'));
            return res({ data: response.body, cookies });
        });
    });
}

async function launchFlow(username, password) {
    const { data: pageContent, cookies } = await login(username, password);

    await win.loadFile(path.join(__dirname, 'pages/apps/apps.html'));
    win.setTitle('Apps');

    const $ = cheerio.load(pageContent);
    const appIcons = $('.appIcons');
    const _appsLength = appIcons.children().length;
    const apps = appIcons.children().map(function () {
        const found = $(this).children().get().find((e) => e.attribs.class === 'appIconSpace app-btn-change');
        const imageEl = found.children.find((e) => e.name === 'img');

        const appName = $(this).attr('title');
        const cmdargs = $(this).attr('cmdargs');
        const onclick = $(this).attr('onclick');
        const image = $(imageEl).attr('src');

        return { appName, cmdargs, onclick, image: BASE_URL + image };
    }).get();

    win.webContents.send('select-application', apps);

    ipcMain.on('selected-application', (_, selectedApplication) => {
        launchApplication(selectedApplication, cookies);
    });
}


async function launchApplication(selectedApplication, cookies) {
    const params = new RegExp(/Applications\.LaunchApp\(\'(.*?)\',\s?\'(.*?)\',\s?\'(.*?)\',\s?\'(.*?)\',\s?\'(.*?)\'\)/, "gm").exec(selectedApplication.onclick).slice(1)

    const paramsObj = {
        cmdargs: params[0],
        protocolUrl: params[1],
        appname: params[2],
        apptype: params[3],
        appPath: params[4],
    }


    const id = Math.floor((Math.random() * 10000) + 1);
    const url = BASE_URL_MY_APPS + '/FL_Apps/FreezerLaunch?cmdargs=' + paramsObj.cmdargs + '&launchId=' + id + '&appname=' + paramsObj.appname + '&apptype=' + paramsObj.apptype + '&appPath=' + paramsObj.appPath;
    const image = await getNativeImageFromURL(selectedApplication.image);

    await win.close();

    const appWin = new BrowserWindow({
        width: 800,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        title: 'Loading...',
        center: true,
        fullscreenable: true
    });

    appWin.on('closed', () => {
        app.dock.setIcon(null);
    });

    appWin.webContents.on('dom-ready', () => {
        let css = '* { cursor: none !important; }';
        appWin.webContents.insertCSS(css);
    });

    appWin.setOverlayIcon(image, 'icon');
    app.dock.setIcon(image);

    await Promise.all(cookies.map((cookie) => session.defaultSession.cookies.set({ url: BASE_URL_MY_APPS, name: cookie.key, value: cookie.value })));
    await appWin.loadURL(url);
}

const getNativeImageFromURL = async (url) => {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return nativeImage.createFromBuffer(response.data);
}
