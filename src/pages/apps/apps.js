const { ipcRenderer } = require('electron');

ipcRenderer.on('select-application', async (_, applications) => {
    const selectedApp = await selectApplication(applications);
    ipcRenderer.sendSync('selected-application', selectedApp);
});

async function selectApplication(applications) {
    return new Promise((resolve, reject) => {
        try {
            const gridContainer = document.getElementById('grid-container');
            applications.forEach(function (app) {
                const div = document.createElement('div');
                div.className = 'grid-item';
                const img = document.createElement('img');
                img.src = app.image;
                img.alt = app.appName;
                const p = document.createElement('p');
                p.innerText = app.appName;
                const b = document.createElement('button');
                b.innerText = 'Launch';

                div.appendChild(img);
                div.appendChild(p);
                div.appendChild(b);
                gridContainer.appendChild(div);

                b.onclick = function () {
                    resolve(app);
                }
            });
        } catch (error) {
            return reject(error);
        }
    })
}