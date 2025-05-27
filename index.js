import fs from 'fs';
import "dotenv/config";
import axios from 'axios';
import { Wallet } from 'ethers';
import ora from 'ora';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import cfonts from 'cfonts';
import readline from 'readline';
import chalk from 'chalk';

function displayBanner() {
  const lines = [
    "                                                                                                         ",
    "                    XXXXXXX       XXXXXXX  iiii                         999999999          888888888     ",
    "                    X:::::X       X:::::X i::::i                      99:::::::::99      88:::::::::88   ",
    "                    X:::::X       X:::::X  iiii                     99:::::::::::::99  88:::::::::::::88 ",
    "                    X::::::X     X::::::X                          9::::::99999::::::98::::::88888::::::8",
    "xxxxxxx      xxxxxxxXXX:::::X   X:::::XXXiiiiiii nnnn  nnnnnnnn    9:::::9     9:::::98:::::8     8:::::8",
    " x:::::x    x:::::x    X:::::X X:::::X   i:::::i n:::nn::::::::nn  9:::::9     9:::::98:::::8     8:::::8",
    "  x:::::x  x:::::x      X:::::X:::::X     i::::i n::::::::::::::nn  9:::::99999::::::9 8:::::88888:::::8 ",
    "   x:::::xx:::::x        X:::::::::X      i::::i nn:::::::::::::::n  99::::::::::::::9  8:::::::::::::8  ",
    "    x::::::::::x         X:::::::::X      i::::i   n:::::nnnn:::::n    99999::::::::9  8:::::88888:::::8 ",
    "     x::::::::x         X:::::X:::::X     i::::i   n::::n    n::::n         9::::::9  8:::::8     8:::::8",
    "     x::::::::x        X:::::X X:::::X    i::::i   n::::n    n::::n        9::::::9   8:::::8     8:::::8",
    "    x::::::::::x    XXX:::::X   X:::::XXX i::::i   n::::n    n::::n       9::::::9    8:::::8     8:::::8",
    "   x:::::xx:::::x   X::::::X     X::::::Xi::::::i  n::::n    n::::n      9::::::9     8::::::88888::::::8",
    "  x:::::x  x:::::x  X:::::X       X:::::Xi::::::i  n::::n    n::::n     9::::::9       88:::::::::::::88 ",
    " x:::::x    x:::::x X:::::X       X:::::Xi::::::i  n::::n    n::::n    9::::::9          88:::::::::88   ",
    "xxxxxxx      xxxxxxxXXXXXXX       XXXXXXXiiiiiiii  nnnnnn    nnnnnn   99999999             888888888     ",
  ];

  const orange = chalk.hex('#FFA500');
  const yellow = chalk.yellowBright;
  const cyan = chalk.cyanBright;

  lines.forEach(line => {
    console.log(orange(line));
  });

  console.log();
  console.log(yellow('🚀 Welcome to KiteAi-Bot Script!'));
  console.log(cyan('🐦 Follow us on Twitter: @xXin98'));
  console.log();
}



function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

function logToFile(message) {
  try {
    const timestamp = new Date().toISOString();
    fs.appendFileSync('debug.log', `[${timestamp}] ${message}\n`, 'utf8');
  } catch (err) {
    console.error(chalk.red(`Failed to write to debug.log: ${err.message}`));
  }
}

function centerText(text, color = "cyanBright") {
  const terminalWidth = process.stdout.columns || 80;
  const padding = Math.max(0, Math.floor((terminalWidth - text.length) / 2));
  return " ".repeat(padding) + chalk[color](text);
}

function readProxiesFromFile(filename) {
  try {
    const content = fs.readFileSync(filename, 'utf8');
    return content.split('\n').map(line => line.trim()).filter(line => line !== '');
  } catch (err) {
    console.error(chalk.red("Failed to read proxy.txt file:", err.message));
    return [];
  }
}


let proxyUrl = null;
let agent = null;
let axiosInstance = axios.create();

async function setupProxy() {
  const useProxy = await askQuestion(chalk.cyan("\nDo you want to use a proxy? (Y/n): "));
  if (useProxy.toLowerCase() === 'y') {
    const proxies = readProxiesFromFile('proxy.txt');
    if (proxies.length > 0) {
      proxyUrl = proxies[0];
      if (proxyUrl.startsWith('http://') || proxyUrl.startsWith('https://')) {
        agent = new HttpsProxyAgent(proxyUrl);
      } else if (proxyUrl.startsWith('socks5://')) {
        agent = new SocksProxyAgent(proxyUrl);
      } else {
        console.log(chalk.red("Proxy format not recognized. Please use http/https or socks5."));
        return;
      }
      axiosInstance = axios.create({ httpAgent: agent, httpsAgent: agent });
      console.log(chalk.green(`Using proxy: ${proxyUrl}`));
    } else {
      console.log(chalk.red("proxy.txt is empty or not found. Continuing without proxy."));
    }
  } else {
    console.log(chalk.blue("Continuing without proxy."));
  }
}

function shortAddress(address) {
  return `${address.slice(0, 8)}...${address.slice(-4)}`;
}

function formatCountdown(ms) {
  if (ms <= 0) return "00:00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

async function liveCountdown(durationMs) {
  const endTime = Date.now() + durationMs;
  return new Promise(resolve => {
    const timer = setInterval(() => {
      const remaining = Math.max(endTime - Date.now(), 0);
      process.stdout.write(chalk.yellow(`\rNext cycle in ${formatCountdown(remaining)} ...`));
      if (remaining <= 0) {
        clearInterval(timer);
        process.stdout.write("\n");
        resolve();
      }
    }, 1000);
  });
}

async function requestWithRetry(fn, maxRetries = 30, delayMs = 2000, debug = false) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (err) {
      if (err.response && err.response.status === 429) {
        attempt++;
        if (debug) console.warn(chalk.yellow(`Attempt ${attempt}: Received 429, retrying in ${delayMs}ms...`));
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        throw err;
      }
    }
  }
  throw new Error("Max retry attempts reached");
}

async function verifyTask(activityId, headers, privyIdToken) {
  const payload = {
    operationName: "VerifyActivity",
    variables: { data: { activityId } },
    query:
      "mutation VerifyActivity($data: VerifyActivityInput!) {" +
      "  verifyActivity(data: $data) {" +
      "    record {" +
      "      id" +
      "      activityId" +
      "      status" +
      "      __typename" +
      "    }" +
      "    __typename" +
      "  }" +
      "}"
  };

  const verifyHeaders = {
    ...headers,
    "privy-id-token": privyIdToken,
    "origin": "https://campaign.coinshift.xyz",
    "referer": "https://campaign.coinshift.xyz/",
    "x-apollo-operation-name": "VerifyActivity"
  };

  try {
    const response = await axiosInstance.post("https://api.deform.cc/", payload, { headers: verifyHeaders });
    if (response.data.errors) {
      return { success: false, error: response.data.errors[0].message };
    }

    const verifyData = response.data.data ? response.data.data.verifyActivity : null;
    if (!verifyData || !verifyData.record) {
      return { success: false, error: "No records found" };
    }

    const status = verifyData.record.status;
    return { success: status.toUpperCase() === "COMPLETED", error: null };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function performCheckIn(activityId, headers, privyIdToken) {
  const payload = {
    operationName: "VerifyActivity",
    variables: { data: { activityId } },
    query: `mutation VerifyActivity($data: VerifyActivityInput!) {
      verifyActivity(data: $data) {
        record {
          id
          activityId
          status
          properties
          createdAt
          rewardRecords {
            id
            status
            appliedRewardType
            appliedRewardQuantity
            appliedRewardMetadata
            error
            rewardId
            reward {
              id
              quantity
              type
              properties
              __typename
            }
            __typename
          }
          __typename
        }
        missionRecord {
          id
          missionId
          status
          createdAt
          rewardRecords {
            id
            status
            appliedRewardType
            appliedRewardQuantity
            appliedRewardMetadata
            error
            rewardId
            reward {
              id
              quantity
              type
              properties
              __typename
            }
            __typename
          }
          __typename
        }
        __typename
      }
    }`
  };

  const checkInHeaders = {
    ...headers,
    "privy-id-token": privyIdToken,
    "origin": "https://campaign.coinshift.xyz",
    "referer": "https://campaign.coinshift.xyz/",
    "x-apollo-operation-name": "VerifyActivity"
  };

  try {
    const response = await requestWithRetry(
      () => axiosInstance.post("https://api.deform.cc/", payload, { headers: checkInHeaders }),
      3,
      2000
    );
    return response.data;
  } catch (err) {
    console.error(chalk.red(`Error during check-in for activityId: ${activityId}: ${err.message}`));
    return null;
  }
}

async function doLogin(walletKey, debug = false) {
  try {
    return await requestWithRetry(async () => {
      const wallet = new Wallet(walletKey);
      const address = wallet.address;

      const privyHeaders = {
        "Host": "auth.privy.io",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
        "Content-Type": "application/json",
        "privy-app-id": "clphlvsh3034xjw0fvs59mrdc",
        "privy-ca-id": "e1e68f54-1300-435d-a880-e0af49fce2fc",
        "privy-client": "react-auth:2.4.1",
        "Origin": "https://campaign.coinshift.xyz",
        "Referer": "https://campaign.coinshift.xyz/"
      };

      const initResponse = await axiosInstance.post("https://auth.privy.io/api/v1/siwe/init", { address }, { headers: privyHeaders });
      const { nonce } = initResponse.data;
      const issuedAt = new Date().toISOString();
      const message = `campaign.coinshift.xyz wants you to sign in with your Ethereum account:
${address}

By signing, you are proving you own this wallet and logging in. This does not initiate a transaction or cost any fees.

URI: https://campaign.coinshift.xyz
Version: 1
Chain ID: 1
Nonce: ${nonce}
Issued At: ${issuedAt}
Resources:
- https://privy.io`;

      const signature = await wallet.signMessage(message);
      const authPayload = {
        message,
        signature,
        chainId: "eip155:1",
        walletClientType: "metamask",
        connectorType: "injected",
        mode: "login-or-sign-up"
      };
      const authResponse = await axiosInstance.post("https://auth.privy.io/api/v1/siwe/authenticate", authPayload, { headers: privyHeaders });
      const { token, user, identity_token } = authResponse.data;
      let displayName = "Unknown";
      if (user && user.linked_accounts) {
        const twitterAcc = user.linked_accounts.find(acc => acc.type === "twitter_oauth" && acc.name);
        if (twitterAcc) displayName = twitterAcc.name.split("|")[0].trim();
      }

      const userLoginPayload = {
        operationName: "UserLogin",
        variables: { data: { externalAuthToken: token } },
        query: `mutation UserLogin($data: UserLoginInput!) {
          userLogin(data: $data)
        }`
      };
      const deformLoginHeaders = {
        "content-type": "application/json",
        "origin": "https://campaign.coinshift.xyz",
        "x-apollo-operation-name": "UserLogin"
      };
      const userLoginResponse = await axiosInstance.post("https://api.deform.cc/", userLoginPayload, { headers: deformLoginHeaders });
      const userLoginToken = userLoginResponse.data.data.userLogin;

      return { userLoginToken, displayName, wallet, address, loginTime: Date.now(), privyIdToken: identity_token };
    }, 30, 2000, debug);
  } catch (err) {
    console.error(chalk.red(`Login failed for account ${shortAddress((new Wallet(walletKey)).address)}: ${err.message}`));
    return null;
  }
}

async function runCycleOnce(walletKey) {
  const loginSpinner = ora(chalk.cyan(" Login...")).start();
  const loginData = await doLogin(walletKey, false);
  if (!loginData) {
    loginSpinner.fail(chalk.red("Login failed after max attempts. Skipping account."));
    return;
  }
  loginSpinner.succeed(chalk.green(" Login Sukses"));

  const { userLoginToken, displayName, address, loginTime, privyIdToken } = loginData;

  const userMePayload = {
    operationName: "UserMe",
    variables: { campaignId: "d46c7bd0-b6bf-40ff-aa9c-54dfbc266b70" },
    query: `
      query UserMe($campaignId: String!) {
        userMe {
          campaignSpot(campaignId: $campaignId) {
            points
            records {
              id
              status
              createdAt
            }
          }
        }
      }`
  };
  const userMeHeaders = {
    "authorization": `Bearer ${userLoginToken}`,
    "content-type": "application/json",
    "x-apollo-operation-name": "UserMe",
    "privy-id-token": privyIdToken
  };
  let userMePoints = 0;
  try {
    const response = await axiosInstance.post("https://api.deform.cc/", userMePayload, { headers: userMeHeaders });
    userMePoints = response.data.data.userMe.campaignSpot.points || 0;
  } catch (err) {
    console.error(chalk.red("Error while fetching UserMe's XP:", err.response ? err.response.data : err.message));
  }

  const campaignPayload = {
    operationName: "Campaign",
    variables: { campaignId: "d46c7bd0-b6bf-40ff-aa9c-54dfbc266b70" },
    query: `
      fragment ActivityFields on CampaignActivity {
        id
        title
        createdAt
        records {
          id
          status
          createdAt
          __typename
        }
        __typename
      }
      query Campaign($campaignId: String!) {
        campaign(id: $campaignId) {
          activities {
            ...ActivityFields
            __typename
          }
          __typename
        }
      }`
  };
  const campaignHeaders = {
    "authorization": `Bearer ${userLoginToken}`,
    "content-type": "application/json",
    "x-apollo-operation-name": "Campaign",
    "privy-id-token": privyIdToken
  };
  let campaignData;
  try {
    const campaignResponse = await axiosInstance.post("https://api.deform.cc/", campaignPayload, { headers: campaignHeaders });
    campaignData = campaignResponse.data.data.campaign;
  } catch (err) {
    console.error(chalk.red("Error Campaign:", err.response ? err.response.data : err.message));
    throw err;
  }
  if (!campaignData) throw new Error("Campaign data not found.");

  let claimedTasks = [];
  let unclaimedTasks = [];
  campaignData.activities.forEach(act => {
    if (act.records && act.records.length > 0 && act.records.some(record => ["COMPLETED", "VERIFIED"].includes(record.status.toUpperCase()))) {
      claimedTasks.push(act);
    } else {
      unclaimedTasks.push(act);
    }
  });

  let checkinStatus = "Check-in not done yet.";
  const checkinActivityId = "304a9530-3720-45c8-a778-fbd3060d5cfd";
  const isDailyCheckinClaimed = claimedTasks.some(task => task.title.toLowerCase().includes("daily check-in"));
  if (isDailyCheckinClaimed) {
    checkinStatus = "Already check-in today";
    console.log(chalk.green("Already check-in today."));
  } else {
    const spinnerCheckin = ora(chalk.cyan(`Performing check-in for Daily Check-in`)).start();
    try {
      const checkInResponse = await performCheckIn(checkinActivityId, campaignHeaders, privyIdToken);
      spinnerCheckin.stop();
      if (!checkInResponse) {
        checkinStatus = "Failed to Check-in";
        console.log(chalk.red(`Check-in failed: No response from the server.`));
      } else if (
        checkInResponse?.data?.verifyActivity?.record?.status?.toUpperCase() === "COMPLETED"
      ) {
        checkinStatus = "Check-in Successful";
        console.log(chalk.green("Check-in was successful."));
      } else if (
        checkInResponse?.data?.errors?.some(err =>
          err.message?.toLowerCase().includes("already checked in") ||
          err.message?.toLowerCase().includes("already completed") ||
          err.message?.toLowerCase().includes("already verified") ||
          err.message?.toLowerCase().includes("cannot create new campaign spot record") ||
          err.extensions?.clientFacingMessage?.toLowerCase().includes("user needs to wait before trying again")
        )
      ) {
        checkinStatus = "Already check-in today";
        console.log(chalk.green("Already check-in today."));
      } else {
        checkinStatus = "Failed to Check-in";
        console.log(chalk.red(`Check-in failed. Response: ${JSON.stringify(checkInResponse)}`));
      }
    } catch (err) {
      spinnerCheckin.stop();
      checkinStatus = "Failed to Check-in";
      console.log(chalk.red(`Check-in failed: ${err.response ? JSON.stringify(err.response.data) : err.message}`));
    }
  }

console.log(chalk.magenta('\n==========================================================================='));
  console.log(chalk.blueBright.bold(`                         USER INFORMATION - ${shortAddress(address)}`));
  console.log(chalk.magenta('============================================================================'));
  console.log(chalk.cyanBright(`Name          : ${displayName}`));
  console.log(chalk.cyanBright(`Address       : ${shortAddress(address)}`));
  console.log(chalk.cyanBright(`XP            : ${userMePoints}`));
  console.log(chalk.cyanBright(`Daily Checkin : ${checkinStatus}`));
  console.log(chalk.cyanBright(`Proxy         : ${proxyUrl || "Tidak ada"}`));
  console.log(chalk.magenta('============================================================================'));

  console.log(chalk.magenta('\n----------------------------- Claimed Tasks ----------------------------\n'));
  if (claimedTasks.length === 0) {
    console.log(chalk.red('(There are no tasks that have been claimed.)\n'));
  } else {
    claimedTasks.forEach(task => {
      console.log(chalk.green(`[VERIFIED] Task: ${task.title} => Already Claimed`));
    });
    console.log('');
  }
  console.log(chalk.magenta('------------------------------------------------------------------------\n'));

  console.log(chalk.magenta('---------------------------- Unclaimed Tasks ---------------------------\n'));
  if (unclaimedTasks.length === 0) {
    console.log(chalk.red('(No unclaimed tasks.)\n'));
  } else {
    for (const task of unclaimedTasks) {
      const spinnerTask = ora(chalk.cyan(`Verifying: ${task.title}`)).start();
      const result = await verifyTask(task.id, campaignHeaders, privyIdToken);
      spinnerTask.stop();
      if (result.success) {
        console.log(chalk.green(`[VERIFIED] Task: ${task.title} => Claimed`));
      } else {
        console.log(chalk.red(`[UNVERIFIED] Task: ${task.title} (Error: ${result.error})`));
      }
      console.log(''); 
    }
  }
  console.log(chalk.magenta('------------------------------------------------------------------------\n'));
  console.log(chalk.yellow('================================================================================\n'));
}

async function mainLoopRoundRobin() {
  await setupProxy();

  function readPrivateKeysFromFile(filename) {
  try {
    const envContent = fs.readFileSync(filename, 'utf8');
    // Example expects keys as: PRIVATE_KEYS="key1,key2,key3"
    const match = envContent.match(/PRIVATE_KEYS\s*=\s*["'](.+)["']/);
    if (!match) return [];
    return match[1].split(',').map(k => k.trim()).filter(k => k.length > 0);
  } catch (err) {
    console.error(chalk.red(`Failed to read private keys from ${filename}: ${err.message}`));
    return [];
  }
}


  while (true) {
    const cycleStart = Date.now();
    for (const key of accounts) {
      console.log(chalk.cyan(`Processing account: ${shortAddress((new Wallet(key)).address)}\n`));
      try {
        await runCycleOnce(key);
      } catch (err) {
        console.error(chalk.red(`Account error ${shortAddress((new Wallet(key)).address)}: ${err.message}`));
      }
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    const cycleDuration = 24 * 60 * 60 * 1000 + 4 * 60 * 1000;
    const elapsed = Date.now() - cycleStart;
    const remaining = cycleDuration - elapsed;
    if (remaining > 0) {
      await liveCountdown(remaining);
    }
  }
}

function readPrivateKeysFromFile(filename) {
  try {
    const content = fs.readFileSync(filename, 'utf8');
    return content.split('\n').map(line => line.trim()).filter(line => line !== '');
  } catch (err) {
    console.error(chalk.red("Failed to read .env file:", err.message));
    process.exit(1);
  }
}

mainLoopRoundRobin().catch(err => console.error(chalk.red("Fatal error occurred:", err.message)));
