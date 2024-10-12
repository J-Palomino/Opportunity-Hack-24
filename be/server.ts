import express from 'express';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import algoliasearch from 'algoliasearch';
import dotenv from 'dotenv';

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

const drive = google.drive({ version: 'v3', auth });

// Initialize Algolia client
const algoliaClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_API_KEY);
const index = algoliaClient.initIndex('google_drive_files');

app.get('/index-drive', async (req, res) => {
  try {
    const files = await listFiles(FOLDER_ID);

    for (const file of files) {
      try {
        const content = await downloadFile(file.id);
        await index.saveObject({
          objectID: file.id,
          name: file.name,
          content: content,
        });
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

    pageToken = response.data.nextPageToken;
  } while (pageToken);

  return files;
}

async function downloadFile(fileId: string): Promise<string> {
  // Implement file download logic here
  // This is a placeholder function
  return 'File content placeholder';
}

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
