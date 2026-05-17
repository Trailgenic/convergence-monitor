import twilio from 'twilio';

export async function sendSms(body: string) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER, TWILIO_TO_NUMBER } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER || !TWILIO_TO_NUMBER) {
    throw new Error('Missing Twilio env vars');
  }
  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  return client.messages.create({ body, from: TWILIO_FROM_NUMBER, to: TWILIO_TO_NUMBER });
}
