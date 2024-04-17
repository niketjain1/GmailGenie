import { Injectable } from '@nestjs/common';
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

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'http://localhost:3000/auth/google/callback',
    );
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

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
  }> => {
    const response = await this.gmail.users.messages.get({
      userId: 'me',
      id: emailId,
      format: 'full',
    });
    console.log('response data');
    console.log(response.data);
    const { headers, parts, body } = response.data.payload;
    console.log('headers: ', headers);
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
    };
  };

  private makeBody = (
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
      message,
    ].join('');

    return base64url.fromBase64(Buffer.from(str).toString('base64'));
  };

  private sendEmail = async (
    subject: string,
    body: string,
    senderEmail: string,
    threadId: string,
    messageId: string,
  ) => {
    const raw = this.makeBody(
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
          // payload: {
          //   headers: [
          //     {
          //       name: 'References',
          //       value: threadId,
          //     },
          //     {
          //       name: 'In-Reply-To',
          //       value: senderEmail,
          //     },
          //   ],
          // },
        },
      });
      console.log(response.data);
    } catch (error) {
      console.error('Failed to send email: ', error);
    }
  };

  private generateEmailResponse = async (emailBody: string) => {
    const emailSchema = z.object({
      shouldSendEmail: z.boolean(),
      emailContent: z.object({
        subject: z.string().describe('The subject of the email'),
        body: z.string().describe('The body of the email'),
      }),
    });

    const client = Instructor({
      client: this.openai,
      mode: 'FUNCTIONS',
    });

    const response = await client.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `
        You are a marketing feedback generating email AI assistant. For the given email message ${emailBody}, determine if it specifically pertains to marketing feedback.
        If the email is related to seeking more information, showing interest in a product, or giving feedback about marketing content, set shouldSendEmail to true. 
        Otherwise, set it to false.

        Based on the email content:
        - If it's a marketing feedback email:
            1) Set shouldSendEmail to true.
            2) Suggest an appropriate response and create a draft email with a subject and body.
            Examples:
              a. If the email mentions they are interested to know more, your reply should ask them if they are willing 
              to hop on to a demo call by suggesting a time.
              b. If the email mentions not interested right now, your reply should be to give their valuable feedback etc.
        - If the email is not related to marketing feedback:
            Set shouldSendEmail to false and do not generate an email draft.
        For example, if the email message is a casual greeting like 'hello, how are you?', shouldSendEmail should be false.
      `,
        },
      ],
      model: 'gpt-3.5-turbo',
      response_model: {
        schema: emailSchema,
        name: 'emailResponse',
      },
    });

    response.emailContent.body = response.emailContent.body.replace(
      '[Your Name]',
      'Niket',
    );

    return response;
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
      console.error(`Failed to fetch email details: ${error}`);
      throw error;
    }
  }

  public processEmails = async (access_token: string) => {
    console.log(access_token);
    await this.initializeGmailClient(access_token);

    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults: 2,
      });
      console.log(response);
      for (const message of response.data.messages) {
        console.log('logging message');
        console.log(message);
        const { senderEmail, subject, body, threadId, messageId } =
          await this.fetchEmailDetails(message.id);

        const emailResponse = await this.generateEmailResponse(body);

        console.log('email response');
        console.log(emailResponse);

        if (emailResponse.shouldSendEmail) {
          this.sendEmail(
            subject,
            emailResponse.emailContent.body,
            senderEmail,
            threadId,
            messageId,
          );
        }
      }
    } catch (error) {
      console.error(`Error processing emails: ${error}`);
    }
  };
}
