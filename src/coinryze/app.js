const TelegramBot = require('node-telegram-bot-api');
const { getBetPage } = require('./auth');
const { waitForElementToDisappear, selectTimeSpan, isCountdownVisible, selectType, getIssueNumber } = require('./utils');
const { webUrl } = require('../../config/app.js');
const phases = require('../../config/phases');

const botToken = '7054679703:AAE0eF8hHKN4gEXJuocdLzTEZie-1ZLFF3c';
const chatId = '@jesus232331';
const bot = new TelegramBot(botToken);

let totalProfit = 0;
let currentPhase = 1;
let stopBetting = false;
let lastBotBetIssueNumber = null;
const maxPhases = phases.length;

async function sendTelegramMessage(message) {
  try {
    await bot.sendMessage(chatId, message);
  } catch (error) {
    console.error('Error al enviar el mensaje a Telegram:', error);
  }
}

async function placeBet(page, betDetails) {
  let message = ''; // Variable para acumular los mensajes

  try {
    if (stopBetting) {
      message += 'Betting has been stopped. Exiting...\n';
      await sendTelegramMessage(message);
      process.exit(0);
    }
    
    const betTime = betDetails.betTime;
    const betType = betDetails.newBet.betType;
    const expectedIssueNumber = betDetails.newBet.issueNumber;
    const lastBetIssueNumber = betDetails.lastBet.issueNumber;
    const lastBetResult = betDetails.lastBet.result.toLowerCase();
    
    if (lastBotBetIssueNumber && lastBetIssueNumber === lastBotBetIssueNumber) {
      if (lastBetResult === 'win') {
        const ownAmount = phases.find(p => p.phase === currentPhase).netProfit;
        totalProfit += ownAmount;
        message += `💵 Bet won in phase ${currentPhase}.\n`;
        message += `👛 Acumulated Profit: +${totalProfit.toFixed(4)}.\n_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _\n\n`;
        currentPhase = 1;
      } else {
        message += `😭 Bet lost in phase ${currentPhase}.\n\n`;
        if (currentPhase < maxPhases) {
          currentPhase += 1;
          message += `🔜 Proceeding to phase ${currentPhase}.\n`;
        } else {
          message += 'Reached the last phase. Stopping further bets.\n';
          stopBetting = true;
          await sendTelegramMessage(message);
          return false;
        }
      }
    }
    
    message += `🚧 Placing bet for phase ${currentPhase}\n`;
    await selectTimeSpan(page, betTime);
    await waitForElementToDisappear(page, '.van-toast');
    
    const currentIssueNumber = await getIssueNumber(page);
    message += `🆔 Current Issue Number: ${currentIssueNumber}\n`;
    message += `🔥 Expected Issue Number: ${expectedIssueNumber}\n`;
    
    if (currentIssueNumber !== expectedIssueNumber) {
      message += 'Issue number does not match the expected period ID. Skipping bet.\n';
      await sendTelegramMessage(message);
      return false;
    }
    
    await selectType(page, betType);
    await waitForElementToDisappear(page, '.van-toast');
    
    const betAmount = phases.find(p => p.phase === currentPhase).betAmount;
    await page.waitForSelector('input.left-pla');
    await page.type('input.left-pla', `${betAmount}`, { delay: 100 });
    message += `💰 Entered bet amount: ${betAmount}\n`;
    
    const countdownVisible = await isCountdownVisible(page);
    if (!countdownVisible) {
      await page.waitForSelector('.all-in .all-in-cen span');
      const tradeButton = await page.$('.all-in .all-in-cen span');
      if (tradeButton) {
        await tradeButton.click();
        message += '➡️ Clicked trade button.\n';
      } else {
        message += 'Trade button not found.\n';
        await sendTelegramMessage(message);
        return false;
      }
      
      await page.waitForSelector('.popupCnt.van-popup.van-popup--bottom', { visible: true });
      const confirmButton = await page.$('.popupCnt .allIn span');
      if (confirmButton) {
        await confirmButton.click();
        message += '✅ Confirmed trade.\n';
      } else {
        message += 'Confirm button not found.\n';
        await sendTelegramMessage(message);
        return false;
      }
      
      await waitForElementToDisappear(page, '.van-toast');
      lastBotBetIssueNumber = currentIssueNumber;
    } else {
      message += 'Countdown is showing. Betting is not allowed at this time.\n';
      await sendTelegramMessage(message);
      return false;
    }
    
    // Enviar el mensaje acumulado a Telegram
    await sendTelegramMessage(message);

  } catch (error) {
    message += `An error occurred while placing the bet: ${error.message}\n`;
    await sendTelegramMessage(message);
    console.error('An error occurred while placing the bet:', error);
    return false;
  }
}

module.exports = { placeBet };