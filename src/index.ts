import core = require('@actions/core');
import exec = require('@actions/exec');
import io = require('@actions/io');
import setup = require('./setup');
import fs = require('fs');

const IS_POST = !!core.getState('isPost');

const main = async () => {
    try {
        if (!IS_POST) {
            core.saveState('isPost', true);
            core.info(`Setup butler...`);
            try {
                await setup.Run();
                core.info(`Butler setup complete.`);
                const apiKey = core.getInput('api-key', { required: true });
                await exec.exec('butler', ['login'], { env: { BUTLER_API_KEY: apiKey } });
            } catch (error) {
                core.setFailed(error);
            }
        } else {
            await exec.exec('butler', ['logout']);
            let cacheDir = '';
            switch (process.platform) {
                case 'linux':
                    cacheDir = '~/.config/itch';
                    break;
                case 'darwin':
                    cacheDir = '~/Library/Application Support/itch';
                    break;
                case 'win32':
                    cacheDir = '%USERPROFILE%\\.config\\itch';
                    break;
            }
            try {
                if (!fs.existsSync(cacheDir)) { return; }
                await io.rmRF(cacheDir);
            } catch (error) {
                core.error(`Failed to remove ${cacheDir}`);
            }
        }
    } catch (error) {
        core.setFailed(error);
    }
}

main();
