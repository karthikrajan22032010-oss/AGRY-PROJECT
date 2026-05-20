import fs from 'fs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const LOG_FILE = './alerts.log';

// Helper to log alerts locally
function logAlertToFile(msg) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${msg}\n`;
  console.error(`🚨 ALERT: ${msg}`);
  try {
    fs.appendFileSync(LOG_FILE, logMessage);
  } catch (err) {
    console.error('Failed to write to alerts.log:', err);
  }
}

// Function to send SMS alert
export async function sendSMSAlert(message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNum = process.env.TWILIO_FROM_NUMBER;
  const adminNum = process.env.ADMIN_PHONE_NUMBER;

  if (accountSid && authToken && fromNum && adminNum) {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          From: fromNum,
          To: adminNum,
          Body: message
        })
      });

      if (response.ok) {
        logAlertToFile(`SMS alert sent successfully via Twilio: "${message}"`);
      } else {
        const errText = await response.text();
        logAlertToFile(`Failed to send Twilio SMS. Status: ${response.status}. Error: ${errText}`);
      }
    } catch (e) {
      logAlertToFile(`Twilio API connection error: ${e.message}`);
    }
  } else {
    logAlertToFile(`[SMS SIMULATION] (To: ${adminNum || 'ADMIN_PHONE_NUMBER_MISSING'}, From: ${fromNum || 'TWILIO_FROM_NUMBER_MISSING'}): "${message}"`);
  }
}

// Track database connection state
let wasDbConnected = false;

// Monitor mongoose database events
export function initDbMonitoring() {
  mongoose.connection.on('connected', () => {
    wasDbConnected = true;
    console.log('🔌 Monitor: MongoDB connection detected.');
  });

  mongoose.connection.on('disconnected', () => {
    // Only alert if we were previously connected (to avoid alerts during intentional offline JSON fallback mode)
    if (wasDbConnected) {
      const alertMsg = 'CRITICAL: Agri-Opt database disconnected! Check MongoDB service immediately.';
      sendSMSAlert(alertMsg);
      wasDbConnected = false;
    }
  });

  mongoose.connection.on('error', (err) => {
    const alertMsg = `CRITICAL: Agri-Opt database connection error: ${err.message}`;
    sendSMSAlert(alertMsg);
  });
}

// Hook into process-level errors
const handleCrash = async (error) => {
  const errMsg = `CRITICAL: Agri-Opt backend server crashed! Error: ${error?.stack || error?.message || error}`;
  // Log locally and attempt to alert via SMS
  logAlertToFile(errMsg);
  try {
    await sendSMSAlert(errMsg);
  } catch (err) {
    console.error('Failed to send SMS crash notification:', err);
  }
  process.exit(1);
};

process.on('uncaughtException', handleCrash);
process.on('unhandledRejection', handleCrash);

console.log('🛡️ Uptime monitoring and alert script successfully initialized.');
