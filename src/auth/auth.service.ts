import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import OpenAI from 'openai';

@Injectable()
export class AuthService {
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
        // In case of multipart message, find the part containing the message body
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

  parseEmail(content: string) {
    console.log(content);
    const parts = content.split('Subject:');
    const preSubject = parts[0];
    const postSubject = parts[1];

    const bodyStartIndex = postSubject.indexOf('\n\n');
    const subject = postSubject.substring(0, bodyStartIndex).trim();
    let body = postSubject.substring(bodyStartIndex).trim();

    body = body.replace('[Your Name]', 'Niket');

    return { subject, body };
  }

  async listRecentEmails(access_token: string) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        'http://localhost:3000/auth/google/callback',
      );

      oauth2Client.setCredentials({
        access_token: access_token,
      });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 1,
      });

      const messages = response.data.messages;
      if (!messages) {
        console.log('No messages found.');
        return;
      }

      console.log('Messages:');
      messages.forEach((message) => {
        gmail.users.messages.get(
          { userId: 'me', id: message.id, format: 'full' },
          async (err, res) => {
            if (err) {
              console.error('The API returned an error: ' + err);
              return;
            }

            const payload = res.data.payload;
            const headers = payload.headers;

            const fromHeader = headers.find(
              (header) => header.name.toLowerCase() === 'from',
            );
            const senderEmail = fromHeader
              ? fromHeader.value
              : 'Unknown Sender';
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

            // console.log(body);

            const completion = await openai.chat.completions.create({
              messages: [
                {
                  role: 'system',
                  content: `You are an ai email assistant that performs 2 tasks for the give email message ${body}
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
            console.log('ai response - ');
            // console.log(completion.choices[0].message);
            const contentAsString = String(
              completion.choices[0].message.content,
            );
            const email = this.parseEmail(contentAsString);
            console.log(email);
          },
        );
      });
    } catch (error) {
      console.error(`The API returned an error: ${error}`);
    }
  }

  googleLogin(req) {
    if (!req.user) {
      return 'No user from google';
    }

    this.listRecentEmails(req.user.accessToken);
  }
}
