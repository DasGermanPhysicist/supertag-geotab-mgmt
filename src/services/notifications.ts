const NOTIFICATION_API = 'https://team-dominik-pilat-ll-dominik-0809cb6e.flowfuse.cloud/slack-geotab-34251fage7fm3u8fngu4nfi595';

export async function sendNotification(data: {
  email: string;
  macAddress: string;
  geotabSerialNumber?: string;
  type: 'pair' | 'unpair';
}) {
  try {
    const response = await fetch(NOTIFICATION_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Notification failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}