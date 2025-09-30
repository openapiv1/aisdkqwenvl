<a href="https://github.com/openapiv1/aisdkqwenvl">
  <h1 align="center">AI Qwen Computer Use Demo</h1>
</a>

<p align="center">
  An open-source AI chatbot app template demonstrating Qwen/Qwen2.5-VL-72B-Instruct's computer use capabilities, built with Next.js and Together AI.
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#deploy-your-own"><strong>Deploy Your Own</strong></a> ·
  <a href="#running-locally"><strong>Running Locally</strong></a> ·
  <a href="#authors"><strong>Authors</strong></a>
</p>
<br/>

## Features

- Real-time streaming responses powered by [Together AI](https://www.together.ai) using the Qwen/Qwen2.5-VL-72B-Instruct model.
- Complete computer control capabilities including screenshot, mouse clicks, keyboard input, scrolling, and bash command execution.
- Sandbox environment with [e2b](https://e2b.dev) for secure execution.
- [shadcn/ui](https://ui.shadcn.com/) components for a modern, responsive UI powered by [Tailwind CSS](https://tailwindcss.com).
- Built with the latest [Next.js](https://nextjs.org) App Router.

## Deploy Your Own

You can deploy your own version to Vercel by clicking the button below:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?project-name=AI+Qwen+Computer+Use+Demo&repository-name=ai-qwen-computer-use&repository-url=https%3A%2F%2Fgithub.com%2Fopenapiv1%2Faisdkqwenvl&demo-title=AI+Qwen+Computer+Use+Demo&demo-url=&demo-description=A+chatbot+application+built+with+Next.js+demonstrating+Qwen2.5-VL-72B-Instruct%27s+computer+use+capabilities&env=TOGETHER_API_KEY,E2B_API_KEY)

## Running Locally

1. Clone the repository and install dependencies:

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

2. Set up environment variables:

   The application uses hardcoded API keys for Together AI and E2B as specified in the requirements:
   - TOGETHER_API_KEY: `tgp_v1_JbghF6sk_yU7ks2yBrfWr3b4N183PD76xDU_K7f8GYk`
   - E2B_API_KEY: `e2b_8a5c7099485b881be08b594be7b7574440adf09c`

3. Run the development server:

   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) to view your new AI chatbot application.

## Available Actions

The AI can control the virtual desktop with the following actions:

- **screenshot** - Take a screenshot of the current desktop (always starts with this)
- **wait** - Wait for a specified duration (max 2 seconds)
- **left_click** - Click at coordinates [x, y]
- **double_click** - Double click at coordinates [x, y]
- **right_click** - Right click at coordinates [x, y]
- **mouse_move** - Move mouse to coordinates [x, y]
- **type** - Type text
- **key** - Press a key (like "Enter", "Tab", "Escape")
- **scroll** - Scroll with direction ("up"/"down") and amount
- **left_click_drag** - Drag from start_coordinate to coordinate
- **bash** - Execute bash commands

## Authors

This repository is maintained by the [Vercel](https://vercel.com) team and community contributors.

Contributions are welcome! Feel free to open issues or submit pull requests to enhance functionality or fix bugs.
