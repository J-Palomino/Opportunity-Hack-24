import express, { Request, Response } from 'express';
import { google, drive_v3 } from 'googleapis';
import { JWT } from 'google-auth-library';

import dotenv from 'dotenv';
import { Readable } from 'stream';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const FOLDER_ID = process.env.FOLDER_ID || '1NNo5q_AcQuQqv_rqWhcD0XhXoTpZRc4N';
const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID || 'Q7ROF37P8C';
const ALGOLIA_API_KEY = process.env.ALGOLIA_API_KEY || '8ad2b05f1f2ae9f5aeb8e14dc779f888';

// Initialize Google Drive client
const auth = new JWT({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});

const drive: drive_v3.Drive = google.drive({ version: 'v3', auth });

// Initialize Algolia client


app.get('/index-drive', async (req: Request, res: Response) => {
  try {
    const files = await listFiles(FOLDER_ID);

    for (const file of files) {
      try {
        const content = await downloadFile(file.id);
        
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
      }
    }

    res.send('Indexing complete');
  } catch (error) {
    console.error('Error in /index-drive:', error);
    res.status(500).send('Internal Server Error');
  }
});

async function listFiles(folderId: string): Promise<Array<{ id: string; name: string }>> {
  let files: Array<{ id: string; name: string }> = [];
  let pageToken: string | undefined;

  do {
    const response = await drive.files.list({
      q: `'${folderId}' in parents`,
      fields: 'nextPageToken, files(id, name)',
      pageToken: pageToken,
    });

    const batch = response.data.files;
    if (batch) {
      files = files.concat(batch.map(file => ({ id: file.id!, name: file.name! })));
    }
    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);

  return files;
}

async function downloadFile(fileId: string): Promise<string> {
  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );

  return new Promise((resolve, reject) => {
    let content = '';
    const stream: Readable = response.data as Readable;
    stream
      .on('data', (chunk) => {
        content += chunk;
      })
      .on('end', () => {
        resolve(content);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
