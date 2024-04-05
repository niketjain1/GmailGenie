import { Injectable } from "@nestjs/common";
import { google } from 'googleapis';
import OpenAI from "openai";


@Injectable()
export class AuthService {
  
  
  async listRecentEmails(access_token: string) {
    try {
      const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY});
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        "http://localhost:3000/auth/google/callback"
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
        gmail.users.messages.get( { userId: 'me', id: message.id }, async (err, res) => {
          if (err) {
            console.error('The API returned an error: ' + err);
            return;
          }
  
          // You can log the entire message object or parts of it
          console.log(`- Message ID: ${res.data.id} Snippet: ${res.data.snippet}`);
          const completion = await openai.chat.completions.create({
            messages: [{ role: "system", content: `You are an ai email assistant that performs 2 tasks for the give email message ${res.data.snippet}
            1. Categorizing the email based on the content and assign a label as follows -
              a. Interested
              b. Not Interested
              c. More information
              
            2. suggest an appropriate response based on the content of the email and send out a reply. For example -
            a. If the email mentions they are interested to know more, your reply should ask them if they are willing to hop on to a demo call by suggesting a time.
              
            ` 
          }],
            model: "gpt-3.5-turbo",
          });
          console.log(completion.choices[0]);
        });
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