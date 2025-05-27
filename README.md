# CoinSift-Bot

**CoinSift**  is a blockchain-based financial management platform designed for decentralized autonomous organizations (DAOs), crypto institutions, and on-chain businesses.
It integrates payments, accounting, and asset management into a secure, KYC-free interface, enabling
users to manage their finances efficiently and transparently. 


## Features

The script performs key functions such as:

- Automatic login to accounts using Ethereum private keys loaded from a .env file.

- Performing daily check-ins to claim available rewards on the Coinshift platform.

- Verifying tasks that users need to complete to earn points or bonuses.

- Proxy management to ensure stable API connections and enhance user privacy.

- Utilizes the axios library to interact with the Coinshift API, with support for proxy-enabled HTTP requests.

- Handles API responses and errors with color-coded logging using chalk for better readability in the terminal.

- Supports multi-account operations by looping through private keys stored in the environment file.

- Provides real-time feedback on login status, check-in success, and task completion.

## Installation

1. Make sure you have [Node.js](https://nodejs.org/) installed on your system.
2. Register [CoinSift]([https://github.com/username/repo](https://campaign.coinshift.xyz/?referral=6XbgULexPpYg))

3. Install Tools.
   ```bash
   wget https://github.com/xxin-han/setup/raw/main/setup.sh -O setup.sh && chmod +x setup.sh && ./setup.sh
   ```
4. Clone this repository:
   ```bash
   git clone https://github.com/xxin-han/shift_bot.git
   ```
5. Navigate to the project directory:
   ```bash
   cd shift_bot
   ```
6. Install the required dependencies:
   ```bash
   npm install
   ```
7. Fill the private key list on accounts.txt then save it ctrl + x + y + enter
   ```bash
   nano .env
   ```
8. If using Proxy list  then save it ctrl + x + y + enter
   ```bash
   nano proxy.txt
   ```
9. run command
   ```bash
   npm start
   ```
10. Stop command

   ctrl + c
