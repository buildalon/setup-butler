import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as io from '@actions/io';
import * as setup from './setup';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

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
