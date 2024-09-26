const { getNewPage } = require('../../config/puppeteer');
const { calculatorUrl } = require('../../config/app');
const { betAmount, phaseStages } = require('../../config/betting');
const fs = require('fs');
const path = require('path');
const phasesFilePath = path.resolve(__dirname, '../../config/phases.js');
const initialStage = 8;

async function getPhases() {
    console.log('Starting phase data collection.');
    const page = await getNewPage();
    console.log('Page instance created.');

    try {
        console.log('Navigating to', calculatorUrl);
        await page.goto(calculatorUrl);
        console.log('Navigated to', calculatorUrl);

        console.log('Waiting for the button container to be visible.');
        await page.waitForSelector('.button-container');

        console.log('Finding and clicking button for ' + phaseStages + ' Stages.');
        await page.evaluate(stageCount => {
            const buttons = Array.from(document.querySelectorAll('.button-container button.custom-button'));
            const button = buttons.find(btn => btn.textContent.includes(stageCount + ' Stages'));
            if (button) {
                button.click();
            } else {
                throw new Error('Button for ' + stageCount + ' Stages not found');
            }
        }, phaseStages);

        console.log('Entering trade amount.');
        const currencySelector = '#currencySex';
        await page.waitForSelector(currencySelector);
        await page.type(currencySelector, betAmount.toString());

        console.log('Waiting for the last phase selector to be visible.');
        const phaseSelectorSuffix = phaseStages === initialStage ? '' : '' + phaseStages;
        const amountSelector = '#betAmount' + phaseStages + 'Sex' + phaseSelectorSuffix;
        await page.waitForSelector(amountSelector, { timeout: 60000 });

        const phaseData = [];
        console.log('Collecting phase data.');

        for (let i = 1; i <= phaseStages; i++) {
            const betAmountSelector = '#betAmount' + i + 'Sex' + phaseSelectorSuffix;
            const netProfitSelector = '#netProfit' + i + 'Sex' + phaseSelectorSuffix;

            const betAmountValue = await page.$eval(betAmountSelector, el => el.textContent);
            const netProfitValue = await page.$eval(netProfitSelector, el => el.textContent.replace('+', ''));

            phaseData.push({
                phase: i,
                betAmount: parseFloat(betAmountValue),
                netProfit: parseFloat(netProfitValue)
            });
        }

        console.log('Data for ' + phaseStages + ' stages collected.');

        console.log('Saving phase data to ' + phasesFilePath + '.');
        const fileContent = `
        /**
         * WARNING: This file is auto-generated.
         *
         * The phase data was collected from the betting calculator based on the current configuration ${phaseStages} stages and a trade amount of ${betAmount}.
         * This data includes:
         * - phase: The phase number (1-based index).
         * - betAmount: The amount of the bet in the respective phase.
         * - netProfit: The net profit from the bet in the respective phase.
         *
         * To change the settings or parameters, please modify the configuration in /config/betting.js.
         */
        
        module.exports = ${JSON.stringify(phaseData, null, 2)};
        `;
        //fs.writeFileSync(phasesFilePath, fileContent, 'utf8');
        console.log('Data successfully saved to ' + phasesFilePath + '.');
    } catch (error) {
        console.error('An error occurred:', error);
        throw error;
    } finally {
        console.log('Phase data collection completed.\n\n');
        return page;
    }
}

module.exports = { getPhases };