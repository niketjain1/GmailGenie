import { Injectable, Logger } from '@nestjs/common';
import { Auth, gmail_v1, google } from 'googleapis';
import OpenAI from 'openai';
import { z } from 'zod';
const base64url = require('base64url');
import Instructor from '@instructor-ai/instructor';

@Injectable()
export class GmailHelper {
  private oauth2Client: Auth.OAuth2Client;
  private gmail: gmail_v1.Gmail;
  private openai: OpenAI;
  private logger = new Logger(GmailHelper.name);

  constructor() {
    this.initializeOAuthClient();
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  private initializeOAuthClient = () => {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'http://localhost:3000/auth/google/callback',
    );
  };

  private initializeGmailClient = (access_token: string) => {
    this.oauth2Client.setCredentials({
      access_token: access_token,
    });

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
  };

  private fetchEmailDetails = async (
    emailId: string,
  ): Promise<{
    senderEmail: string;
    subject: string;
    body: string;
    threadId: string;
    messageId: string;
    isUnreadEmail: boolean;
  }> => {
    const response = await this.gmail.users.messages.get({
      userId: 'me',
      id: emailId,
      format: 'full',
    });

    const labels = response.data.labelIds || [];
    const isUnreadEmail = labels.includes('UNREAD');

    if (!isUnreadEmail) {
      return {
        senderEmail: '',
        subject: '',
        body: '',
        threadId: '',
        messageId: '',
        isUnreadEmail: false,
      };
    }
    const { headers, parts, body } = response.data.payload;
    const senderEmail =
      headers.find((header) => header.name.toLowerCase() === 'from')?.value ||
      'Unknown Sender';
    const subject =
      headers.find((header) => header.name.toLowerCase() === 'subject')
        ?.value || 'No Subject';

    let emailBody = '';
    if (body.size > 0) {
      emailBody = Buffer.from(body.data, 'base64').toString('utf-8');
    } else if (parts) {
      const part = parts.find((part) => part.mimeType === 'text/plain');
      if (part) {
        emailBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
    }
    console.log('parsed response');
    console.log({ senderEmail, subject, emailBody });
    const messageId =
      headers.find((header) => header.name.toLowerCase() === 'message-id')
        ?.value || '';

    // console.log('message id: ', messageId);

    return {
      senderEmail,
      subject,
      body: emailBody,
      threadId: response.data.threadId,
      messageId: messageId,
      isUnreadEmail: true,
    };
  };

  private makeBody = async (
    to: string,
    from: string,
    subject: string,
    message: string,
    messageId: string,
  ) => {
    const str = [
      'Content-Type: text/plain; charset="UTF-8"\n',
      'MIME-Version: 1.0\n',
      'Content-Transfer-Encoding: 7bit\n',
      `to: ${to}\n`,
      `from: ${from}\n`,
      `subject: ${subject}\n`,
      `References: ${messageId}\n`,
      `In-Reply-To: ${messageId}\n`,
      '\n',
      message,
    ].join('');

    return await base64url.fromBase64(Buffer.from(str).toString('base64'));
  };

  private sendEmail = async (
    subject: string,
    body: string,
    senderEmail: string,
    threadId: string,
    messageId: string,
  ) => {
    const raw = await this.makeBody(
      senderEmail,
      'niket.testing1@gmail.com',
      subject,
      body,
      messageId,
    );
    try {
      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: raw,
          threadId: threadId,
        },
      });
    } catch (error) {
      this.logger.error('Failed to send email: ', error);
    }
  };

  // TODO: Fix the prompt to make it more generic email response
  private generateEmailResponse = async (emailBody: string) => {
    const emailSchema = z.object({
      shouldSendEmail: z.boolean(),
      emailContent: z.string().describe('The content of the email'),
      labels: z.array(z.string()).describe('The labels of the email'),
    });

    try {
      const client = Instructor({
        client: this.openai,
        mode: 'FUNCTIONS',
      });

      const response = await client.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `
       Input:
    An email from a potential customer with the follwing content ${emailBody}.

    Expected Analysis:

    Identify the intent of the email and generate an appropriate response based on the following conditions:
    
    Response Logic:

      - If the emaii seems to be spam or irrelevant to the product or has gibberish response:
          set the shouldSendEmail flag to false. Set the label as Other.
      
      - If the email conveys only expressing interest in discussing the product and its use cases:
        set the shouldSendEmail flag to true, and generate an appropriate response and set the response in emailContent. Set the label Interested accordingly.

      - If the email does not express interest in the product:
          set the shouldSendEmail flag to true and generate a response that ask the user for the feedback and set the response in emailContent. Set the label as Not Interested.
    
      - If the email does not provide enough information about the user's intent:
          set the shouldSendEmail flag to true and generate a response that asks for more information. Set the label as More Information.

      `,
          },
        ],
        model: 'gpt-3.5-turbo',
        response_model: {
          schema: emailSchema,
          name: 'emailResponse',
        },
      });

      if (!response) {
        this.logger.warn(
          'Failed to generate email response due to an invalid API response',
        );
        return null;
      }

      response.emailContent = response.emailContent.replace(
        '[Your Name]',
        'Niket',
      );

      return response;
    } catch (error) {
      this.logger.error(`Error generating email response: ${error}`);
      throw error;
    }
  };

  async getEmailDetails(emailId: string, access_token: string) {
    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        'http://localhost:3000/auth/google/callback',
      );

      oauth2Client.setCredentials({
        access_token: access_token,
      });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      const response = await gmail.users.messages.get({
        userId: 'me',
        id: emailId,
        format: 'full',
      });

      const payload = response.data.payload;
      const headers = payload.headers;

      const fromHeader = headers.find(
        (header) => header.name.toLowerCase() === 'from',
      );
      const senderEmail = fromHeader ? fromHeader.value : 'Unknown Sender';
      const subjectHeader = headers.find(
        (header) => header.name.toLowerCase() === 'subject',
      );
      const subject = subjectHeader ? subjectHeader.value : 'No Subject';

      let body = '';
      if (payload.body.size > 0) {
        body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      } else if (payload.parts) {
        const part = payload.parts.find(
          (part) => part.mimeType === 'text/plain',
        );
        if (part) {
          body = Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
      }

      return { senderEmail, subject, body };
    } catch (error) {
      this.logger.error(`Failed to fetch email details: ${error}`);
      throw error;
    }
  }

  public processEmails = async (access_token: string) => {
    await this.initializeGmailClient(access_token);
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults: 5,
      });

      for (const message of response.data.messages) {
        const {
          senderEmail,
          subject,
          body,
          threadId,
          messageId,
          isUnreadEmail,
        } = await this.fetchEmailDetails(message.id);

        if (isUnreadEmail) {
          const emailResponse = await this.generateEmailResponse(body);

          console.log('email response');
          console.log(emailResponse);

          console.log(emailResponse.emailContent);

          if (emailResponse.shouldSendEmail) {
            await this.sendEmail(
              subject,
              emailResponse.emailContent,
              senderEmail,
              threadId,
              messageId,
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error processing emails: ${error}`);
      throw error;
    }
  };
}
