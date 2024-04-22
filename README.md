# Email-AI-Assistant

Email-AI-Assistant is a robust backend application designed to leverage the power of NestJS, Google's Gmail API, OpenAI, and BullMQ with Redis to automate email processing. This application simplifies managing and responding to emails for professionals and businesses, featuring automatic authentication via Google, retrieval of recent emails, and AI-driven response generation. The scheduler, powered by BullMQ, runs tasks every minute, ensuring prompt email interactions and operations.

## Features
- **Google OAuth Integration**: Secure user authentication via Google accounts.
- **Gmail Integration**: Read and respond to emails within the same thread directly through the user's Gmail account.
- **OpenAI Integration**: Automatically categorizes emails and generates suitable responses based on content context.
- **Automated Email Processing**: Tasks are scheduled and managed every minute using BullMQ and Redis.


## Prerequisites
Before you begin, ensure you have met the following requirements:

- Node.js (v14.x or newer)
- Docker (for Redis and optional deployment)
- Google Cloud Platform account with Gmail API and OAuth2 enabled

## Installation
Follow these steps to get your development env running:

1. Clone the repository
```bash
$ git clone https://github.com/niketjain1/email-ai-assistant.git
$ cd email-ai-assistant
```

2. Install dependecies
```bash
$ npm install
```

3. Set up environment variables
Create a `.env` file in the root directory and fill it with the necessary credentials:

```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
OPENAI_API_KEY=your-openai-api-key
REDIS_HOST=localhost
REDIS_PORT=6379
```
  ---
  **NOTE**
  
  To get the `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, go to google developer console and get the oath credentials
  
  ---

4. Run Redis using Docker (adjust if you have a different setup)
```bash
docker-compose up -d redis
```

## Usage
How to use the application:

1. Start the server
```bash
$ npm run start

or 

$ yarn start
```

2. Access the API
- Navigate to http://localhost:3000/auth/google/callback to authenticate via Google.
- After authentication, the app will read the incoming emails every 1 minute. To test the app send emails on the email id authenticated

#### Tech stack used:
- NestJS: Chosen for its robustness and scalability in building server-side applications.
- OpenAI: Provides advanced AI capabilities for analyzing and responding to email content.
- Redis & BullMQ: Used for managing job queues and ensuring timely task execution.


