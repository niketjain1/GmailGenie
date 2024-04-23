# GmailGenie

GmailGenie is a robust backend application designed to leverage the power of NestJS, Google's Gmail API, OpenAI, and BullMQ with Redis to automate email processing. This application simplifies managing and responding to emails for professionals and businesses, featuring automatic authentication via Google, retrieval of recent emails, and AI-driven response generation. The scheduler, powered by BullMQ, runs tasks every minute, ensuring prompt email interactions and operations.

## Features

- **Google OAuth Integration**: Secure user authentication via Google accounts.
- **Gmail Integration**: Read and respond to emails within the same thread directly through the user's Gmail account.
- **OpenAI Integration**: Automatically categorizes emails and generates suitable responses based on content context.
- **Automated Email Processing**: Tasks are scheduled and managed every minute using BullMQ and Redis.

## Tech stack used:

- NestJS: Chosen for its robustness and scalability in building server-side applications.
- OpenAI: Provides advanced AI capabilities for analyzing and responding to email content. Used GPT-3.5-Turbo model.
- Instructor-js: Utilized for integrating and managing OpenAI API responses, enabling structured and reliable parsing of email content. The package helps streamline AI-driven email response generation by adhering to a predefined schema, ensuring consistency and clarity in how responses are handled and categorized.
- Redis & BullMQ: Used for managing job queues and ensuring timely task execution.

## Prerequisites

Before you begin, ensure you have met the following requirements:

- Node.js (v14.x or newer)
- Docker (for Redis and optional deployment)
- Google Cloud Platform account with Gmail API and OAuth2 enabled

## Installation

Follow these steps to get your development env running:

1. Clone the repository

```bash
$ git clone https://github.com/niketjain1/GmailGenie.git
$ cd GmailGenie
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

To get the `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, follow these steps:
**Google Developer Console Setup**:

- Go to [Google Developer Console](https://console.developers.google.com/).
- Create a new project.
- Go to `Credentials` and click `Create Credentials` -> `OAuth client ID`.
- Configure the consent screen with the necessary application details.
- Set the application type to `Web application`.
- Add authorized redirect URIs, e.g., `http://localhost:3000/auth/google/callback `.

2. **Get Your Client ID and Client Secret**:

   - Once the credentials are created, note down your `Client ID` and `Client Secret`.

3. **Configure Your Application**:

   - Use these credentials in your application's environment settings.

4. **Enable Gmail API**:
   - In the library section of the Google Developer Console, search for the Gmail API and enable it for your project.

---

4. Run Redis using Docker (adjust if you have a different setup)

```bash
docker run -d -p 6379:6379 redis
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
