import { Injectable } from '@nestjs/common';
import { Auth, gmail_v1, google } from 'googleapis';
import OpenAI from 'openai';
import { z } from 'zod';
const base64url = require('base64url');

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
    return {
      senderEmail,
      subject,
      body: emailBody,
      threadId: response.data.threadId,
    };
  };

  private makeBody = (
    to: string,
    from: string,
    subject: string,
    message: string,
  ) => {
    const str = [
      'Content-Type: text/plain; charset="UTF-8"\n',
      'MIME-Version: 1.0\n',
      'Content-Transfer-Encoding: 7bit\n',
      `to: ${to}\n`,
      `from: ${from}\n`,
      `subject: ${subject}\n`,
      `References: <CAONyCUGK6mQvEszYFyNqSqvD2+6RXaD-hRoNNtZBzUKyzTef=w@mail.gmail.com>\n`,
      `In-Reply-To: <CAONyCUGK6mQvEszYFyNqSqvD2+6RXaD-hRoNNtZBzUKyzTef=w@mail.gmail.com>\n`,
      message,
    ].join('');

    return base64url.fromBase64(Buffer.from(str).toString('base64'));
  };

  // TODO: remove after using instructor to do the same
  private parseEmail = (content: string) => {
    const parts = content.split('Subject:');
    const bodyStartIndex = parts[1].indexOf('\n\n');
    const subject = parts[1].substring(0, bodyStartIndex).trim();
    let body = parts[1]
      .substring(bodyStartIndex)
      .trim()
      .replace('[Your Name]', 'Niket');

    return { subject, body };
  };

  private sendEmail = async (
    subject: string,
    body: string,
    senderEmail: string,
    threadId: string,
  ) => {
    const raw = this.makeBody(
      senderEmail,
      'niket.testing1@gmail.com',
      subject,
      body,
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
    const completion = await this.openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are an ai email assistant that performs 2 tasks for the give email message ${emailBody}
      1. Categorizing the email based on the content and assign a label as follows -
        a. Interested
        b. Not Interested
        c. More information

      2. Suggest an appropriate response and create a draft email based on the content of the email and send out a reply. For example -
      a. If the email mentions they are interested to know more, your reply should ask them if they are willing to hop on to a demo call by suggesting a time.

      `,
        },
      ],
      model: 'gpt-3.5-turbo',
    });
    // console.log('ai response - ');
    // console.log(completion.choices[0].message);
    const contentAsString = String(completion.choices[0].message.content);
    return contentAsString;
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
        maxResults: 1,
      });
      console.log(response);
      for (const message of response.data.messages) {
        console.log('logging message');
        console.log(message);
        const { senderEmail, subject, body, threadId } =
          await this.fetchEmailDetails(message.id);
        const emailResponse = await this.generateEmailResponse(body);

        const email = this.parseEmail(emailResponse);
        console.log(email);

        this.sendEmail(subject, email.body, senderEmail, threadId);
      }
    } catch (error) {
      console.error(`Error processing emails: ${error}`);
    }
  };
}
