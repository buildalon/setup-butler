import core = require('@actions/core');
import exec = require('@actions/exec');
import io = require('@actions/io');
import setup = require('./setup');
import fs = require('fs');
import os = require('os');
import path = require('path');

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
            let configDir = '';
            switch (process.platform) {
                case 'darwin':
                    configDir = path.join(os.homedir(), 'Library', 'Application Support', 'itch');
                    break;
                default:
                    configDir = path.join(os.homedir(), '.config', 'itch');
                    break;
            }
            // only butler's own credentials: the itch config folder is shared with the itch app on self-hosted runners
            const credsPath = path.join(configDir, 'butler_creds');
            try {
                if (!fs.existsSync(credsPath)) { return; }
                await io.rmRF(credsPath);
            } catch (error) {
                core.error(`Failed to remove ${credsPath}`);
            }
        }
    } catch (error) {
        core.setFailed(error);
    }
}

main();
